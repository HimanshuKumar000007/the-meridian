/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Discord Webhook Provider: Formatted Rich Embed Operator Review Notifications
 */

import type { ReviewNotificationPayload } from '../../../types/notification';
import type { NotificationProvider, ProviderSendResult } from './NotificationProvider';
import { WebhookSecretSanitizer } from '../WebhookSecretSanitizer';

export class DiscordWebhookProvider implements NotificationProvider {
  public readonly type = 'discord';

  constructor(
    private readonly webhookUrl: string,
    private readonly timeoutMs: number = 5000,
    private readonly maxRetries: number = 2
  ) {}

  public formatPayload(payload: ReviewNotificationPayload) {
    return {
      content: '🚨 **The Meridian — Review Required**',
      embeds: [
        {
          title: payload.headline,
          url: payload.reviewUrl,
          color: 0xf59e0b, // Amber / review required warning color
          fields: [
            {
              name: 'Source',
              value: payload.source,
              inline: true,
            },
            {
              name: 'Category',
              value: payload.category,
              inline: true,
            },
            {
              name: 'Story ID',
              value: `\`${payload.storyId}\``,
              inline: true,
            },
            {
              name: 'Reason',
              value: payload.reason,
              inline: false,
            },
            {
              name: 'Review URL',
              value: `[Open Editorial Review](${payload.reviewUrl})`,
              inline: false,
            },
          ],
          timestamp: payload.timestamp,
          footer: {
            text: 'The Meridian Pipeline Quality Gate',
          },
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

        // Discord returns 204 No Content or 200 OK on success
        if (response.ok || response.status === 204) {
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
      lastError || 'Unknown Discord webhook failure',
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
