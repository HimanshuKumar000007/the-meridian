/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  MonitoringAlert,
  ServiceHealth,
  QueueDepthMetrics,
  LatencyMetrics,
  AlertSeverity,
  NotificationReadyAlert,
} from '../../types/monitoring';
import type { MonitoringRepository } from '../../data/repositories/MonitoringRepository';
import { MONITORING_CONFIG } from '../../config/monitoringConfig';

export interface AlertCondition {
  code: string;
  service: string;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, any>;
}

export class AlertEngine {
  private repository: MonitoringRepository;

  constructor(repository: MonitoringRepository) {
    this.repository = repository;
  }

  /**
   * Evaluate health metrics against configured thresholds and identify alert conditions
   */
  public evaluateConditions(
    services: Record<string, ServiceHealth>,
    queues: QueueDepthMetrics,
    latencies: LatencyMetrics
  ): AlertCondition[] {
    const conditions: AlertCondition[] = [];

    // 1. Database Health
    const db = services.supabase;
    if (db && db.status === 'failed') {
      conditions.push({
        code: db.errorCode || 'DB_CONNECTION_FAILED',
        service: 'supabase',
        severity: 'critical',
        message: db.message || 'Database connection unavailable.',
        metadata: { responseTimeMs: db.responseTimeMs },
      });
    }

    // 2. Scheduler Staleness
    const scheduler = services.scheduler;
    if (scheduler && scheduler.errorCode === 'SCHEDULER_STALE') {
      conditions.push({
        code: 'SCHEDULER_STALE',
        service: 'scheduler',
        severity: scheduler.status === 'failed' ? 'critical' : 'warning',
        message: scheduler.message || 'Scheduler runs delayed beyond expected threshold.',
        metadata: scheduler.metadata,
      });
    }

    // 3. Stuck Locks
    const locks = services.locks;
    if (locks && locks.errorCode === 'LOCK_STUCK') {
      conditions.push({
        code: 'LOCK_STUCK',
        service: 'locks',
        severity: 'warning',
        message: locks.message || 'Expired or stuck distributed lock detected.',
        metadata: locks.metadata,
      });
    }

    // 4. Source Failures
    const discovery = services.discovery;
    if (discovery && discovery.errorCode === 'SOURCE_HTTP_ERROR') {
      conditions.push({
        code: 'SOURCE_HTTP_ERROR',
        service: 'discovery',
        severity: discovery.status === 'failed' ? 'critical' : 'warning',
        message: discovery.message || 'News discovery sources are failing.',
        metadata: discovery.metadata,
      });
    }

    // 5. Queue Backlog & Oldest Item Age
    const oldestExtSec = queues.oldestPendingItemAge.extractionSec || 0;
    if (oldestExtSec >= MONITORING_CONFIG.queues.oldestItemAgeCriticalSec) {
      conditions.push({
        code: 'QUEUE_GROWING',
        service: 'extraction',
        severity: 'critical',
        message: `Extraction queue backlog critical: oldest candidate pending for ${Math.floor(oldestExtSec / 60)} minutes.`,
        metadata: { oldestPendingSec: oldestExtSec, queueDepth: queues.extraction },
      });
    } else if (queues.extraction >= MONITORING_CONFIG.queues.extractionMaxPendingWarn) {
      conditions.push({
        code: 'QUEUE_GROWING',
        service: 'extraction',
        severity: 'warning',
        message: `Extraction queue depth elevated: ${queues.extraction} candidates pending.`,
        metadata: { queueDepth: queues.extraction },
      });
    }

    // 6. Publication Rate Anomaly
    const publishing = services.publishing;
    if (publishing && publishing.errorCode === 'PUBLICATION_RATE_ANOMALY') {
      conditions.push({
        code: 'PUBLICATION_RATE_ANOMALY',
        service: 'publishing',
        severity: 'critical',
        message: publishing.message || 'Publication rate anomaly detected.',
        metadata: publishing.metadata,
      });
    }

    // 7. Website Unavailability
    const website = services.website;
    if (website && website.status === 'failed') {
      conditions.push({
        code: 'SITE_UNAVAILABLE',
        service: 'website',
        severity: 'critical',
        message: website.message || 'Public homepage is unavailable.',
        metadata: { responseTimeMs: website.responseTimeMs },
      });
    }

    // 8. Media Processing Health
    const media = services.media;
    if (media && media.errorCode) {
      conditions.push({
        code: media.errorCode,
        service: 'media',
        severity: media.status === 'failed' ? 'critical' : 'warning',
        message: media.message || 'Media engine alert condition detected.',
        metadata: media.metadata,
      });
    } else if (queues.media !== undefined && queues.media > 25) {
      conditions.push({
        code: 'MEDIA_QUEUE_GROWING',
        service: 'media',
        severity: queues.media > 50 ? 'critical' : 'warning',
        message: `Media processing queue backlog elevated (${queues.media} pending items).`,
        metadata: { queueDepth: queues.media },
      });
    }

    return conditions;
  }

  /**
   * Deduplicate new conditions against existing active alerts, and resolve cleared alerts
   */
  public async processAlerts(conditions: AlertCondition[]): Promise<{
    activeAlerts: MonitoringAlert[];
    newAlerts: MonitoringAlert[];
    resolvedAlerts: MonitoringAlert[];
    notificationReady: NotificationReadyAlert[];
  }> {
    const existingActive = await this.repository.getActiveAlerts();
    const newAlerts: MonitoringAlert[] = [];
    const notificationReady: NotificationReadyAlert[] = [];
    const nowIso = new Date().toISOString();

    const seenConditionKeys = new Set<string>();

    // 1. Process active conditions
    for (const cond of conditions) {
      const key = `${cond.code}:${cond.service}`;
      seenConditionKeys.add(key);

      const existing = existingActive.find(
        (a) => a.code === cond.code && a.service === cond.service && a.status !== 'resolved'
      );

      if (existing) {
        // Deduplicate: increment count and update timestamp
        await this.repository.updateAlert(existing.id, {
          lastDetectedAt: nowIso,
          occurrenceCount: (existing.occurrenceCount || 1) + 1,
          message: cond.message,
          severity: cond.severity,
          metadata: cond.metadata || {},
        });
      } else {
        // Create new alert
        const alertId = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newAlert: MonitoringAlert = {
          id: alertId,
          code: cond.code,
          severity: cond.severity,
          service: cond.service,
          status: 'open',
          message: cond.message,
          firstDetectedAt: nowIso,
          lastDetectedAt: nowIso,
          occurrenceCount: 1,
          metadata: cond.metadata || {},
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        await this.repository.saveAlert(newAlert);
        newAlerts.push(newAlert);

        // Prepare notification-ready payload
        notificationReady.push({
          id: newAlert.id,
          code: newAlert.code,
          severity: newAlert.severity,
          service: newAlert.service,
          detectedAt: newAlert.firstDetectedAt,
          message: newAlert.message,
          occurrenceCount: newAlert.occurrenceCount,
          metadata: newAlert.metadata,
        });
      }
    }

    // 2. Resolve alerts that are no longer triggering
    const resolvedAlerts: MonitoringAlert[] = [];
    for (const active of existingActive) {
      const key = `${active.code}:${active.service}`;
      if (!seenConditionKeys.has(key)) {
        await this.repository.resolveAlert(active.id);
        resolvedAlerts.push({
          ...active,
          status: 'resolved',
          resolvedAt: nowIso,
        });
      }
    }

    const currentActive = await this.repository.getActiveAlerts();

    return {
      activeAlerts: currentActive,
      newAlerts,
      resolvedAlerts,
      notificationReady,
    };
  }
}
