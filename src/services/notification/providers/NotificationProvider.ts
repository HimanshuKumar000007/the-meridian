/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Notification Provider Interface
 */

import type { ReviewNotificationPayload, ReviewNotificationProviderType } from '../../../types/notification';

export interface ProviderSendResult {
  success: boolean;
  statusCode?: number;
  durationMs: number;
  retries: number;
  error?: string;
}

export interface NotificationProvider {
  readonly type: ReviewNotificationProviderType;
  send(payload: ReviewNotificationPayload): Promise<ProviderSendResult>;
}
