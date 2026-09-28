/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * NotificationConfigService: Centralized Operator Review Notification Configuration
 */

import type { ReviewNotificationConfig, ReviewNotificationProviderType } from '../../types/notification';
import { WebhookSecretSanitizer } from './WebhookSecretSanitizer';

export class NotificationConfigService {
  private parseBool(val: string | undefined, defaultVal = false): boolean {
    if (val === undefined || val === '') return defaultVal;
    const lower = val.trim().toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }

  private parseInt(val: string | undefined, defaultVal: number, min = 100, max = 60000): number {
    if (!val) return defaultVal;
    const num = parseInt(val, 10);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(num, max));
  }

  public getConfig(): ReviewNotificationConfig {
    const rawProvider = (process.env.REVIEW_NOTIFICATION_PROVIDER || 'webhook').toLowerCase().trim();
    const provider: ReviewNotificationProviderType =
      rawProvider === 'slack' ? 'slack' : rawProvider === 'discord' ? 'discord' : 'webhook';

    const enabled = this.parseBool(process.env.REVIEW_NOTIFICATIONS_ENABLED, false);
    const webhookUrl = (
      process.env.REVIEW_NOTIFICATION_WEBHOOK_URL ||
      process.env.DISCORD_WEBHOOK_URL
    )?.trim();
    const timeoutMs = this.parseInt(process.env.REVIEW_NOTIFICATION_TIMEOUT_MS, 5000, 500, 30000);
    const maxRetries = this.parseInt(process.env.REVIEW_NOTIFICATION_MAX_RETRIES, 2, 0, 5);
    const baseUrl = (process.env.REVIEW_NOTIFICATION_BASE_URL || process.env.SITE_URL || 'https://the-meridian.news')
      .trim()
      .replace(/\/+$/, '');

    return {
      enabled,
      provider,
      webhookUrl: webhookUrl || undefined,
      timeoutMs,
      maxRetries,
      baseUrl,
    };
  }

  /**
   * Returns a safe summary of configuration without printing secrets.
   */
  public getSafeSummary(): Record<string, any> {
    const config = this.getConfig();
    return {
      enabled: config.enabled,
      provider: config.provider,
      configuredUrl: WebhookSecretSanitizer.sanitizeUrl(config.webhookUrl),
      hasWebhookUrl: Boolean(config.webhookUrl),
      timeoutMs: config.timeoutMs,
      maxRetries: config.maxRetries,
      baseUrl: config.baseUrl,
    };
  }
}
