/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MonitoringConfig {
  scheduler: {
    expectedIntervalMinutes: number;
    warningThresholdMinutes: number;
    warnThresholdMinutes: number;
    criticalThresholdMinutes: number;
  };
  queues: {
    oldestItemAgeWarnSec: number;
    oldestItemAgeCriticalSec: number;
    queueGrowthObservationCount: number;
    extractionMaxPendingWarn: number;
    extractionMaxPendingCritical: number;
    validationMaxPendingWarn: number;
    validationMaxPendingCritical: number;
  };
  sources: {
    consecutiveFailuresWarn: number;
    multipleFailuresDegradedCount: number;
    staleSourceHoursThreshold: number;
  };
  nvidia: {
    errorRateWarnPercent: number;
    errorRateCriticalPercent: number;
    latencyWarnMs: number;
  };
  database: {
    pingLatencyWarnMs: number;
    pingLatencyCriticalMs: number;
  };
  publishing: {
    anomalyHourlyPublicationThreshold: number;
    maxPerHourAnomalyThreshold: number;
    consecutiveFailuresWarn: number;
  };
  retention: {
    snapshotRetentionDays: number;
    resolvedAlertsRetentionDays: number;
    snapshotsDays: number;
    resolvedAlertsDays: number;
  };
  auth: {
    headerKey: string;
    cronHeaderKey: string;
  };
}

export const MONITORING_CONFIG: MonitoringConfig = {
  scheduler: {
    expectedIntervalMinutes: 10,
    warningThresholdMinutes: 20,
    warnThresholdMinutes: 20,
    criticalThresholdMinutes: 60,
  },
  queues: {
    oldestItemAgeWarnSec: 3600, // 1 hour
    oldestItemAgeCriticalSec: 7200, // 2 hours
    queueGrowthObservationCount: 3,
    extractionMaxPendingWarn: 100,
    extractionMaxPendingCritical: 500,
    validationMaxPendingWarn: 50,
    validationMaxPendingCritical: 200,
  },
  sources: {
    consecutiveFailuresWarn: 3,
    multipleFailuresDegradedCount: 5,
    staleSourceHoursThreshold: 24,
  },
  nvidia: {
    errorRateWarnPercent: 20,
    errorRateCriticalPercent: 50,
    latencyWarnMs: 8000,
  },
  database: {
    pingLatencyWarnMs: 1500,
    pingLatencyCriticalMs: 5000,
  },
  publishing: {
    anomalyHourlyPublicationThreshold: 20,
    maxPerHourAnomalyThreshold: 20,
    consecutiveFailuresWarn: 2,
  },
  retention: {
    snapshotRetentionDays: 30,
    resolvedAlertsRetentionDays: 90,
    snapshotsDays: 30,
    resolvedAlertsDays: 90,
  },
  auth: {
    headerKey: 'x-monitoring-secret',
    cronHeaderKey: 'x-cron-secret',
  },
};

export function getMonitoringSecret(): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.MONITORING_SECRET || process.env.CRON_SECRET || 'meridian-monitoring-secret-dev';
  }
  return 'meridian-monitoring-secret-dev';
}
