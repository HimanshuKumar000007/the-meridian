/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Slack Webhook Provider: Formatted Block Kit Operator Review Notifications
 */

import type { ReviewNotificationPayload } from '../../../types/notification';
import type { NotificationProvider, ProviderSendResult } from './NotificationProvider';
import { WebhookSecretSanitizer } from '../WebhookSecretSanitizer';

export class SlackWebhookProvider implements NotificationProvider {
  public readonly type = 'slack';

  constructor(
    private readonly webhookUrl: string,
    private readonly timeoutMs: number = 5000,
    private readonly maxRetries: number = 2
  ) {}

  public formatPayload(payload: ReviewNotificationPayload) {
    return {
      text: `The Meridian — Review Required: ${payload.headline}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ The Meridian — Review Required',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Story:*\n${payload.headline}`,
            },
            {
              type: 'mrkdwn',
              text: `*Source:*\n${payload.source}`,
            },
            {
              type: 'mrkdwn',
              text: `*Category:*\n${payload.category}`,
            },
            {
              type: 'mrkdwn',
              text: `*Story ID:*\n\`${payload.storyId}\``,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Reason:*\n${payload.reason}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Review URL:*\n<${payload.reviewUrl}|${payload.reviewUrl}>`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Timestamp:* ${payload.timestamp} | The Meridian Automated Pipeline Gate`,
            },
          ],
        },
      ],
    };
  }

  public async send(payload: ReviewNotificationPayload): Promise<ProviderSendResult> {
    const started = Date.now();
    const body = JSON.stringify(this.formatPayload(payload));

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

        if (response.status >= 400 && response.status < 500) {
          const respText = await response.text().catch(() => '');
          lastError = `HTTP ${response.status}: ${respText.substring(0, 200)}`;
          break;
        }

        const respText = await response.text().catch(() => '');
        lastError = `HTTP ${response.status}: ${respText.substring(0, 200)}`;
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
        lastError = isTimeout
          ? `Request timed out after ${this.timeoutMs}ms`
          : err.message || String(err);
      }

      if (attempts <= this.maxRetries) {
        const backoffMs = Math.min(1000, 250 * Math.pow(2, attempts - 1));
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }

    const sanitizedError = WebhookSecretSanitizer.sanitizeMessage(
      lastError || 'Unknown Slack webhook failure',
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
