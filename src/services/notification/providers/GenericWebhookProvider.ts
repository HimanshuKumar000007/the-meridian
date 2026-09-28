/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Generic Webhook Provider: Standard HTTP POST with Review Payload
 */

import type { ReviewNotificationPayload } from '../../../types/notification';
import type { NotificationProvider, ProviderSendResult } from './NotificationProvider';
import { WebhookSecretSanitizer } from '../WebhookSecretSanitizer';

export class GenericWebhookProvider implements NotificationProvider {
  public readonly type = 'webhook';

  constructor(
    private readonly webhookUrl: string,
    private readonly timeoutMs: number = 5000,
    private readonly maxRetries: number = 2
  ) {}

  public formatMessageText(payload: ReviewNotificationPayload): string {
    return [
      'The Meridian — Review Required',
      '',
      'Story:',
      payload.headline,
      '',
      'Source:',
      payload.source,
      '',
      'Reason:',
      payload.reason,
      '',
      'Category:',
      payload.category,
      '',
      'Story ID:',
      payload.storyId,
      '',
      'Review URL:',
      payload.reviewUrl,
      '',
      'Timestamp:',
      payload.timestamp,
    ].join('\n');
  }

  public async send(payload: ReviewNotificationPayload): Promise<ProviderSendResult> {
    const started = Date.now();
    const formattedText = this.formatMessageText(payload);
    const body = JSON.stringify({
      event: 'needs_review',
      text: formattedText,
      story: {
        id: payload.storyId,
        headline: payload.headline,
        source: payload.source,
        reason: payload.reason,
        category: payload.category,
        reviewUrl: payload.reviewUrl,
        timestamp: payload.timestamp,
        validationId: payload.validationId,
        extractionId: payload.extractionId,
        issues: payload.issues || [],
      },
    });

    let attempts = 0;
    let lastError: string | undefined;
    let lastStatusCode: number | undefined;

    while (attempts <= this.maxRetries) {
      attempts++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TheMeridian-ReviewNotifier/1.0',
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        lastStatusCode = response.status;

        if (response.ok) {
          return {
            success: true,
            statusCode: response.status,
            durationMs: Date.now() - started,
            retries: attempts - 1,
          };
        }

        // 4xx errors (client errors) should not be retried
        if (response.status >= 400 && response.status < 500) {
          const respText = await response.text().catch(() => '');
          lastError = `HTTP ${response.status}: ${respText.substring(0, 200)}`;
          break;
        }

        // 5xx errors can be retried if attempts remain
        const respText = await response.text().catch(() => '');
        lastError = `HTTP ${response.status}: ${respText.substring(0, 200)}`;
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
        lastError = isTimeout
          ? `Request timed out after ${this.timeoutMs}ms`
          : err.message || String(err);
      }

      // Backoff if retrying
      if (attempts <= this.maxRetries) {
        const backoffMs = Math.min(1000, 250 * Math.pow(2, attempts - 1));
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }

    const sanitizedError = WebhookSecretSanitizer.sanitizeMessage(
      lastError || 'Unknown webhook failure',
      this.webhookUrl
    );

    return {
      success: false,
      statusCode: lastStatusCode,
      durationMs: Date.now() - started,
      retries: attempts - 1,
      error: sanitizedError,
    };
  }
}
