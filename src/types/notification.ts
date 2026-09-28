/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Operator Review Notification Types
 */

export type ReviewNotificationProviderType = 'webhook' | 'slack' | 'discord';

export interface ReviewNotificationIssue {
  code: string;
  field?: string;
  message: string;
  severity?: string;
}

export interface ReviewNotificationPayload {
  storyId: string;
  headline: string;
  source: string;
  reason: string;
  category: string;
  reviewUrl: string;
  timestamp: string;
  validationId?: string;
  extractionId?: string;
  validationStatus?: string;
  issues?: ReviewNotificationIssue[];
  stateHash?: string;
}

export interface ReviewNotificationConfig {
  enabled: boolean;
  provider: ReviewNotificationProviderType;
  webhookUrl?: string;
  timeoutMs: number;
  maxRetries: number;
  baseUrl: string;
}

export type NotificationSkipReason =
  | 'DISABLED'
  | 'MISSING_URL'
  | 'DUPLICATE_REVIEW_STATE'
  | 'NON_REVIEW_STATUS'
  | 'INVALID_CONFIG';

export interface NotificationSendResult {
  notified: boolean;
  success: boolean;
  provider: string;
  statusCode?: number;
  durationMs: number;
  retries: number;
  error?: string;
  skipReason?: NotificationSkipReason;
  storyId?: string;
  stateHash?: string;
}
