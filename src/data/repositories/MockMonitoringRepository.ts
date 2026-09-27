/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MonitoringRepository } from './MonitoringRepository';
import type { MonitoringAlert, MonitoringSnapshot } from '../../types/monitoring';

export class MockMonitoringRepository implements MonitoringRepository {
  private alerts: MonitoringAlert[] = [];
  private snapshots: MonitoringSnapshot[] = [];

  public async saveAlert(alert: MonitoringAlert): Promise<void> {
    const existingIdx = this.alerts.findIndex((a) => a.id === alert.id);
    if (existingIdx !== -1) {
      this.alerts[existingIdx] = { ...alert, updatedAt: new Date().toISOString() };
    } else {
      this.alerts.unshift({ ...alert });
    }
  }

  public async updateAlert(id: string, updates: Partial<MonitoringAlert>): Promise<void> {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) {
      Object.assign(alert, updates, { updatedAt: new Date().toISOString() });
    }
  }

  public async getActiveAlert(code: string, service: string): Promise<MonitoringAlert | null> {
    const found = this.alerts.find(
      (a) => a.code === code && a.service === service && a.status !== 'resolved'
    );
    return found ? { ...found } : null;
  }

  public async getActiveAlerts(): Promise<MonitoringAlert[]> {
    return this.alerts
      .filter((a) => a.status !== 'resolved')
      .map((a) => ({ ...a }));
  }

  public async getAllAlerts(limit = 100): Promise<MonitoringAlert[]> {
    return this.alerts.slice(0, limit).map((a) => ({ ...a }));
  }

  public async resolveAlert(id: string): Promise<void> {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) {
      const now = new Date().toISOString();
      alert.status = 'resolved';
      alert.resolvedAt = now;
      alert.updatedAt = now;
    }
  }

  public async saveSnapshot(snapshot: MonitoringSnapshot): Promise<void> {
    this.snapshots.unshift({ ...snapshot });
  }

  public async getLatestSnapshot(): Promise<MonitoringSnapshot | null> {
    return this.snapshots[0] ? { ...this.snapshots[0] } : null;
  }

  public async getRecentSnapshots(limit = 10): Promise<MonitoringSnapshot[]> {
    return this.snapshots.slice(0, limit).map((s) => ({ ...s }));
  }

  public async cleanupOldRecords(retentionDays = 30): Promise<{ deletedSnapshots: number; deletedAlerts: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 86400 * 1000).toISOString();
    const initialSnapshots = this.snapshots.length;
    const initialAlerts = this.alerts.length;

    this.snapshots = this.snapshots.filter((s) => s.createdAt >= cutoff);
    this.alerts = this.alerts.filter((a) => !(a.status === 'resolved' && a.resolvedAt && a.resolvedAt < cutoff));

    return {
      deletedSnapshots: initialSnapshots - this.snapshots.length,
      deletedAlerts: initialAlerts - this.alerts.length,
    };
  }

  public clear(): void {
    this.alerts = [];
    this.snapshots = [];
  }
}
