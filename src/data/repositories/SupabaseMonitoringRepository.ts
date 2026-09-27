/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MonitoringRepository } from './MonitoringRepository';
import type { MonitoringAlert, MonitoringSnapshot } from '../../types/monitoring';
import { getSupabaseServiceClient, isServiceRoleConfigured } from '../../lib/supabase';
import { MONITORING_CONFIG } from '../../config/monitoringConfig';

export class SupabaseMonitoringRepository implements MonitoringRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else if (isServiceRoleConfigured()) {
      this.client = getSupabaseServiceClient();
    } else {
      throw new Error('[SupabaseMonitoringRepository] Privileged server client required for monitoring repository.');
    }
  }

  public async saveAlert(alert: MonitoringAlert): Promise<void> {
    try {
      const { error } = await this.client.from('monitoring_alerts').upsert({
        id: alert.id,
        code: alert.code,
        severity: alert.severity,
        service: alert.service,
        status: alert.status,
        message: alert.message,
        first_detected_at: alert.firstDetectedAt,
        last_detected_at: alert.lastDetectedAt,
        occurrence_count: alert.occurrenceCount,
        resolved_at: alert.resolvedAt || null,
        metadata: alert.metadata || {},
        created_at: alert.createdAt,
        updated_at: alert.updatedAt,
      });

      if (error) {
        console.error('[SupabaseMonitoringRepository] Error saving alert:', error.message);
      }
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception saving alert:', err.message);
    }
  }

  public async updateAlert(id: string, updates: Partial<MonitoringAlert>): Promise<void> {
    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.message !== undefined) payload.message = updates.message;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.severity !== undefined) payload.severity = updates.severity;
      if (updates.lastDetectedAt !== undefined) payload.last_detected_at = updates.lastDetectedAt;
      if (updates.occurrenceCount !== undefined) payload.occurrence_count = updates.occurrenceCount;
      if (updates.resolvedAt !== undefined) payload.resolved_at = updates.resolvedAt;
      if (updates.metadata !== undefined) payload.metadata = updates.metadata;

      const { error } = await this.client
        .from('monitoring_alerts')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('[SupabaseMonitoringRepository] Error updating alert:', error.message);
      }
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception updating alert:', err.message);
    }
  }

  public async getActiveAlert(code: string, service: string): Promise<MonitoringAlert | null> {
    try {
      const { data, error } = await this.client
        .from('monitoring_alerts')
        .select('*')
        .eq('code', code)
        .eq('service', service)
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapAlertRow(data);
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception getting active alert:', err.message);
      return null;
    }
  }

  public async getActiveAlerts(): Promise<MonitoringAlert[]> {
    try {
      const { data, error } = await this.client
        .from('monitoring_alerts')
        .select('*')
        .neq('status', 'resolved')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => this.mapAlertRow(row));
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception getting active alerts:', err.message);
      return [];
    }
  }

  public async getAllAlerts(limit = 100): Promise<MonitoringAlert[]> {
    try {
      const { data, error } = await this.client
        .from('monitoring_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((row) => this.mapAlertRow(row));
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception getting all alerts:', err.message);
      return [];
    }
  }

  public async resolveAlert(id: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await this.client
        .from('monitoring_alerts')
        .update({
          status: 'resolved',
          resolved_at: now,
          updated_at: now,
        })
        .eq('id', id);

      if (error) {
        console.error('[SupabaseMonitoringRepository] Error resolving alert:', error.message);
      }
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception resolving alert:', err.message);
    }
  }

  public async saveSnapshot(snapshot: MonitoringSnapshot): Promise<void> {
    try {
      const { error } = await this.client.from('monitoring_snapshots').insert({
        id: snapshot.id,
        system_status: snapshot.systemStatus,
        service_statuses: snapshot.serviceStatuses,
        queue_depths: snapshot.queueDepths,
        latest_runs: snapshot.latestRuns,
        latency_metrics: snapshot.latencyMetrics,
        alert_summary: snapshot.alertSummary,
        created_at: snapshot.createdAt,
      });

      if (error) {
        console.error('[SupabaseMonitoringRepository] Error saving snapshot:', error.message);
      }
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception saving snapshot:', err.message);
    }
  }

  public async getLatestSnapshot(): Promise<MonitoringSnapshot | null> {
    try {
      const { data, error } = await this.client
        .from('monitoring_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapSnapshotRow(data);
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception getting latest snapshot:', err.message);
      return null;
    }
  }

  public async getRecentSnapshots(limit = 10): Promise<MonitoringSnapshot[]> {
    try {
      const { data, error } = await this.client
        .from('monitoring_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((row) => this.mapSnapshotRow(row));
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception getting recent snapshots:', err.message);
      return [];
    }
  }

  public async cleanupOldRecords(retentionDays?: number): Promise<{ deletedSnapshots: number; deletedAlerts: number }> {
    try {
      const snapDays = retentionDays || MONITORING_CONFIG.retention.snapshotRetentionDays;
      const alertDays = retentionDays || MONITORING_CONFIG.retention.resolvedAlertsRetentionDays;

      const snapCutoff = new Date(Date.now() - snapDays * 86400 * 1000).toISOString();
      const alertCutoff = new Date(Date.now() - alertDays * 86400 * 1000).toISOString();

      const { count: deletedSnapshots } = await this.client
        .from('monitoring_snapshots')
        .delete({ count: 'exact' })
        .lt('created_at', snapCutoff);

      const { count: deletedAlerts } = await this.client
        .from('monitoring_alerts')
        .delete({ count: 'exact' })
        .eq('status', 'resolved')
        .lt('resolved_at', alertCutoff);

      return {
        deletedSnapshots: deletedSnapshots || 0,
        deletedAlerts: deletedAlerts || 0,
      };
    } catch (err: any) {
      console.error('[SupabaseMonitoringRepository] Exception cleaning up old records:', err.message);
      return { deletedSnapshots: 0, deletedAlerts: 0 };
    }
  }

  private mapAlertRow(row: any): MonitoringAlert {
    return {
      id: row.id,
      code: row.code,
      severity: row.severity,
      service: row.service,
      status: row.status,
      message: row.message,
      firstDetectedAt: row.first_detected_at,
      lastDetectedAt: row.last_detected_at,
      occurrenceCount: row.occurrence_count,
      resolvedAt: row.resolved_at || null,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSnapshotRow(row: any): MonitoringSnapshot {
    return {
      id: row.id,
      systemStatus: row.system_status,
      serviceStatuses: row.service_statuses || {},
      queueDepths: row.queue_depths || {
        discovery: 0,
        extraction: 0,
        validation: 0,
        lifecycle: 0,
        publication: 0,
        oldestPendingItemAge: {},
      },
      latestRuns: row.latest_runs || {},
      latencyMetrics: row.latency_metrics || { dbPingMs: 0 },
      alertSummary: row.alert_summary || {
        totalActive: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      createdAt: row.created_at,
    };
  }
}
