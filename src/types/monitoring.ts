/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HealthStatus = 'healthy' | 'degraded' | 'failed' | 'unknown' | 'disabled';
export type SystemStatus = 'healthy' | 'degraded' | 'failed';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export type OperationalErrorCode =
  | 'DB_CONNECTION_FAILED'
  | 'DB_TIMEOUT'
  | 'SOURCE_TIMEOUT'
  | 'SOURCE_HTTP_ERROR'
  | 'SOURCE_PARSE_ERROR'
  | 'NVIDIA_TIMEOUT'
  | 'NVIDIA_RATE_LIMIT'
  | 'NVIDIA_AUTH_ERROR'
  | 'EXTRACTION_SCHEMA_ERROR'
  | 'VALIDATION_FAILURE'
  | 'LIFECYCLE_FAILURE'
  | 'PUBLICATION_FAILURE'
  | 'SCHEDULER_STALE'
  | 'LOCK_STUCK'
  | 'QUEUE_GROWING'
  | 'PUBLICATION_RATE_ANOMALY'
  | 'SITE_UNAVAILABLE'
  | 'FEED_MALFORMED';

export interface ServiceHealth {
  service: string;
  status: HealthStatus;
  lastCheckedAt: string;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  responseTimeMs: number;
  consecutiveFailures: number;
  errorCode?: string | null;
  message?: string | null;
  metadata?: Record<string, any>;
}

export interface MonitoringAlert {
  id: string;
  code: OperationalErrorCode | string;
  severity: AlertSeverity;
  service: string;
  status: AlertStatus;
  message: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  occurrenceCount: number;
  resolvedAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface QueueDepthMetrics {
  discovery: number;
  extraction: number;
  validation: number;
  lifecycle: number;
  publication: number;
  oldestPendingItemAge: {
    discoverySec?: number;
    extractionSec?: number;
    validationSec?: number;
    lifecycleSec?: number;
    publicationSec?: number;
  };
}

export interface LatencyMetrics {
  dbPingMs: number;
  homepageMs?: number;
  storyPageMs?: number;
  categoryPageMs?: number;
  searchMs?: number;
  sitemapMs?: number;
  rssMs?: number;
  stageDurations?: Record<string, number>;
}

export interface PipelineLagMetrics {
  discoveryToExtractionMs?: number;
  extractionToValidationMs?: number;
  validationToLifecycleMs?: number;
  lifecycleToPublicationMs?: number;
  discoveryToPublicationMs?: number;
}

export interface MonitoringSnapshot {
  id: string;
  systemStatus: SystemStatus;
  serviceStatuses: Record<string, ServiceHealth>;
  queueDepths: QueueDepthMetrics;
  latestRuns: Record<string, any>;
  latencyMetrics: LatencyMetrics;
  alertSummary: {
    totalActive: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
  createdAt: string;
}

export interface HealthCheckResult {
  status: SystemStatus;
  checkedAt: string;
  services: Record<string, ServiceHealth>;
  queues: QueueDepthMetrics;
  latencies: LatencyMetrics;
  alerts: {
    activeCount: number;
    openIncidents: MonitoringAlert[];
  };
}

export interface ReadinessCheckResult {
  ready: boolean;
  checkedAt: string;
  databaseReady: boolean;
  storageReady: boolean;
  schedulerReady: boolean;
  services: Record<string, { status: HealthStatus; ready: boolean; reason?: string }>;
  criticalIssues: string[];
}

export interface NotificationReadyAlert {
  id: string;
  code: string;
  severity: AlertSeverity;
  service: string;
  detectedAt: string;
  message: string;
  occurrenceCount: number;
  metadata?: Record<string, any>;
}
