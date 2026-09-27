/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HealthCheckResult,
  ReadinessCheckResult,
  MonitoringSnapshot,
  SystemStatus,
  ServiceHealth,
  NotificationReadyAlert,
  MonitoringAlert,
} from '../../types/monitoring';
import { HealthCheckService } from './HealthCheckService';
import { AlertEngine } from './AlertEngine';
import type { MonitoringRepository } from '../../data/repositories/MonitoringRepository';
import { SupabaseMonitoringRepository } from '../../data/repositories/SupabaseMonitoringRepository';
import { MockMonitoringRepository } from '../../data/repositories/MockMonitoringRepository';
import { MONITORING_CONFIG } from '../../config/monitoringConfig';
import { isServiceRoleConfigured, getSupabaseServiceClient } from '../../lib/supabase';

export interface MonitoringServiceOptions {
  client?: SupabaseClient;
  repository?: MonitoringRepository;
  healthChecker?: HealthCheckService;
  baseUrl?: string;
  skipNetworkFetch?: boolean;
}

export class MonitoringService {
  private client?: SupabaseClient;
  private repository: MonitoringRepository;
  private healthChecker: HealthCheckService;
  private alertEngine: AlertEngine;

  constructor(options: MonitoringServiceOptions = {}) {
    if (options.client) {
      this.client = options.client;
    } else if (isServiceRoleConfigured()) {
      try {
        this.client = getSupabaseServiceClient();
      } catch {
        // Fallback gracefully
      }
    }

    if (options.repository) {
      this.repository = options.repository;
    } else if (this.client) {
      this.repository = new SupabaseMonitoringRepository(this.client);
    } else {
      this.repository = new MockMonitoringRepository();
    }

    this.healthChecker =
      options.healthChecker ||
      new HealthCheckService({
        client: this.client,
        baseUrl: options.baseUrl,
        skipNetworkFetch: options.skipNetworkFetch,
      });

    this.alertEngine = new AlertEngine(this.repository);
  }

  /**
   * Determine overall system status from individual service statuses
   */
  public determineSystemStatus(services: Record<string, ServiceHealth>): SystemStatus {
    // Critical infrastructure failure
    if (services.supabase?.status === 'failed' || services.website?.status === 'failed') {
      return 'failed';
    }

    // Check if any non-disabled service has failed or degraded
    const serviceList = Object.values(services);
    const hasFailed = serviceList.some((s) => s.status === 'failed');
    if (hasFailed) {
      return 'degraded';
    }

    const hasDegraded = serviceList.some((s) => s.status === 'degraded');
    if (hasDegraded) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Run full system health check, evaluate alert thresholds, and optionally persist snapshot
   */
  public async runHealthCheck(options: {
    persistSnapshot?: boolean;
    dryRun?: boolean;
    pruneOldData?: boolean;
  } = {}): Promise<HealthCheckResult> {
    try {
      const { services, queues, latencies } = await this.healthChecker.checkAllServices();
      const status = this.determineSystemStatus(services);
      const checkedAt = new Date().toISOString();

      let activeAlerts: MonitoringAlert[] = [];
      let newAlerts: MonitoringAlert[] = [];
      let resolvedAlerts: MonitoringAlert[] = [];
      let notificationReady: NotificationReadyAlert[] = [];

      // Alert evaluation
      const conditions = this.alertEngine.evaluateConditions(services, queues, latencies);

      if (options.dryRun) {
        // In dry-run, do not persist to repository
        activeAlerts = conditions.map((cond, idx) => ({
          id: `dry-alert-${idx + 1}`,
          code: cond.code,
          severity: cond.severity,
          service: cond.service,
          status: 'open',
          message: cond.message,
          firstDetectedAt: checkedAt,
          lastDetectedAt: checkedAt,
          occurrenceCount: 1,
          metadata: cond.metadata || {},
          createdAt: checkedAt,
          updatedAt: checkedAt,
        }));
      } else {
        const alertResult = await this.alertEngine.processAlerts(conditions);
        activeAlerts = alertResult.activeAlerts;
        newAlerts = alertResult.newAlerts;
        resolvedAlerts = alertResult.resolvedAlerts;
        notificationReady = alertResult.notificationReady;
      }

      const result: HealthCheckResult = {
        status,
        checkedAt,
        services,
        queues,
        latencies,
        alerts: {
          activeCount: activeAlerts.length,
          openIncidents: activeAlerts,
        },
      };

      // Persist snapshot if requested and not in dry-run
      if (options.persistSnapshot && !options.dryRun) {
        try {
          await this.createSnapshot(result);
        } catch (snapErr) {
          console.warn('[MonitoringService] Non-fatal snapshot error:', snapErr);
        }
      }

      // Cleanup old data if requested
      if (options.pruneOldData && !options.dryRun) {
        try {
          await this.pruneOldData();
        } catch (pruneErr) {
          console.warn('[MonitoringService] Non-fatal retention pruning error:', pruneErr);
        }
      }

      return result;
    } catch (err: any) {
      // Non-fatal observability fallback
      console.error('[MonitoringService] Error running health check:', err);
      const nowIso = new Date().toISOString();
      return {
        status: 'failed',
        checkedAt: nowIso,
        services: {
          monitoring: {
            service: 'monitoring',
            status: 'failed',
            lastCheckedAt: nowIso,
            lastFailureAt: nowIso,
            responseTimeMs: 0,
            consecutiveFailures: 1,
            errorCode: 'DB_CONNECTION_FAILED',
            message: err?.message || 'Monitoring health check execution error',
          },
        },
        queues: {
          discovery: 0,
          extraction: 0,
          validation: 0,
          lifecycle: 0,
          publication: 0,
          oldestPendingItemAge: {},
        },
        latencies: { dbPingMs: 0 },
        alerts: {
          activeCount: 1,
          openIncidents: [
            {
              id: `alert-internal-fail-${Date.now()}`,
              code: 'DB_CONNECTION_FAILED',
              severity: 'critical',
              service: 'monitoring',
              status: 'open',
              message: err?.message || 'Monitoring engine error',
              firstDetectedAt: nowIso,
              lastDetectedAt: nowIso,
              occurrenceCount: 1,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
          ],
        },
      };
    }
  }

  /**
   * Fast readiness check for deployment and ingress readiness probes
   */
  public async getReadiness(): Promise<ReadinessCheckResult> {
    const checkedAt = new Date().toISOString();
    const criticalIssues: string[] = [];

    let dbReady = false;
    let storageReady = false;
    let schedulerReady = true;

    try {
      const dbHealth = await this.healthChecker.checkSupabaseHealth();
      dbReady = dbHealth.status !== 'failed';
      storageReady = dbHealth.status !== 'failed';
      if (!dbReady) {
        criticalIssues.push(dbHealth.message || 'Database connection probe failed.');
      }
    } catch (err: any) {
      dbReady = false;
      storageReady = false;
      criticalIssues.push(`Database connection exception: ${err?.message}`);
    }

    try {
      const schedulerHealth = await this.healthChecker.checkSchedulerHealth();
      schedulerReady = schedulerHealth.status !== 'failed';
      if (!schedulerReady) {
        criticalIssues.push(schedulerHealth.message || 'Scheduler stale beyond critical threshold.');
      }
    } catch {
      // Scheduler staleness is non-fatal for readiness unless DB completely fails
    }

    const ready = dbReady && storageReady;

    return {
      ready,
      checkedAt,
      databaseReady: dbReady,
      storageReady,
      schedulerReady,
      services: {
        supabase: {
          status: dbReady ? 'healthy' : 'failed',
          ready: dbReady,
          reason: dbReady ? undefined : 'Database unreachable',
        },
        storage: {
          status: storageReady ? 'healthy' : 'failed',
          ready: storageReady,
          reason: storageReady ? undefined : 'Storage tables unreachable',
        },
        scheduler: {
          status: schedulerReady ? 'healthy' : 'degraded',
          ready: schedulerReady,
          reason: schedulerReady ? undefined : 'Scheduler execution delayed',
        },
      },
      criticalIssues,
    };
  }

  /**
   * Persist a monitoring snapshot into repository
   */
  public async createSnapshot(healthResult: HealthCheckResult): Promise<MonitoringSnapshot> {
    const criticalCount = healthResult.alerts.openIncidents.filter((a) => a.severity === 'critical').length;
    const warningCount = healthResult.alerts.openIncidents.filter((a) => a.severity === 'warning').length;
    const infoCount = healthResult.alerts.openIncidents.filter((a) => a.severity === 'info').length;

    const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const snapshot: MonitoringSnapshot = {
      id: snapshotId,
      systemStatus: healthResult.status,
      serviceStatuses: healthResult.services,
      queueDepths: healthResult.queues,
      latestRuns: {
        checkedAt: healthResult.checkedAt,
        pipelineLatency: healthResult.latencies,
      },
      latencyMetrics: healthResult.latencies,
      alertSummary: {
        totalActive: healthResult.alerts.activeCount,
        criticalCount,
        warningCount,
        infoCount,
      },
      createdAt: healthResult.checkedAt,
    };

    await this.repository.saveSnapshot(snapshot);
    return snapshot;
  }

  /**
   * Prune expired snapshots and resolved alerts past retention windows
   */
  public async pruneOldData(): Promise<{ deletedSnapshots: number; deletedAlerts: number }> {
    return this.repository.cleanupOldRecords(MONITORING_CONFIG.retention.snapshotsDays);
  }

  public getRepository(): MonitoringRepository {
    return this.repository;
  }

  public getHealthChecker(): HealthCheckService {
    return this.healthChecker;
  }
}
