/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MonitoringAlert, MonitoringSnapshot } from '../../types/monitoring';

export interface MonitoringRepository {
  saveAlert(alert: MonitoringAlert): Promise<void>;
  updateAlert(id: string, updates: Partial<MonitoringAlert>): Promise<void>;
  getActiveAlert(code: string, service: string): Promise<MonitoringAlert | null>;
  getActiveAlerts(): Promise<MonitoringAlert[]>;
  getAllAlerts(limit?: number): Promise<MonitoringAlert[]>;
  resolveAlert(id: string): Promise<void>;
  saveSnapshot(snapshot: MonitoringSnapshot): Promise<void>;
  getLatestSnapshot(): Promise<MonitoringSnapshot | null>;
  getRecentSnapshots(limit?: number): Promise<MonitoringSnapshot[]>;
  cleanupOldRecords(retentionDays?: number): Promise<{ deletedSnapshots: number; deletedAlerts: number }>;
}
