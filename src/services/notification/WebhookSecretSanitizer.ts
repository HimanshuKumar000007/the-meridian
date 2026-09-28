/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Webhook Secret Sanitizer: Strict Redaction for Logs, Errors & URLs
 */

export class WebhookSecretSanitizer {
  /**
   * Sanitizes a webhook URL so sensitive tokens or query secrets are never printed.
   * - Discord: https://discord.com/api/webhooks/123/token -> .../123/[REDACTED]
   * - Slack: https://hooks.slack.com/services/T00/B00/token -> .../T00/B00/[REDACTED]
   * - Query parameters: ?token=xyz -> ?token=[REDACTED]
   */
  public static sanitizeUrl(url?: string | null): string {
    if (!url || url.trim() === '') {
      return '[NOT_CONFIGURED]';
    }

    try {
      const parsed = new URL(url);

      // Redact Discord webhook token: /api/webhooks/{id}/{token}
      if (parsed.hostname.includes('discord.com')) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 3 && parts[1] === 'webhooks') {
          parts[parts.length - 1] = '[REDACTED]';
          parsed.pathname = '/' + parts.join('/');
          return parsed.toString();
        }
      }

      // Redact Slack webhook token: /services/{T}/{B}/{token}
      if (parsed.hostname.includes('slack.com')) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 4 && parts[0] === 'services') {
          parts[parts.length - 1] = '[REDACTED]';
          parsed.pathname = '/' + parts.join('/');
          return parsed.toString();
        }
      }

      // Redact query parameter secrets: token, secret, key, auth
      const sensitiveKeys = ['token', 'secret', 'key', 'auth', 'webhook_secret'];
      for (const paramKey of parsed.searchParams.keys()) {
        if (sensitiveKeys.some((s) => paramKey.toLowerCase().includes(s))) {
          parsed.searchParams.set(paramKey, '[REDACTED]');
        }
      }

      return parsed.toString();
    } catch {
      // If not a valid URL, ensure string is redacted rather than printing raw secret
      return '[REDACTED_INVALID_URL]';
    }
  }

  /**
   * Sanitizes arbitrary error messages or strings by masking any configured secret URL or tokens.
   */
  public static sanitizeMessage(message: string, secretUrl?: string): string {
    let sanitized = message;

    if (secretUrl && secretUrl.length > 5) {
      sanitized = sanitized.replaceAll(secretUrl, this.sanitizeUrl(secretUrl));
      // Also redact the raw token portion of Discord/Slack URLs if present
      try {
        const parsed = new URL(secretUrl);
        const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
        if (lastSegment && lastSegment.length > 8) {
          sanitized = sanitized.replaceAll(lastSegment, '[REDACTED]');
        }
      } catch {
        // Ignore parse error
      }
    }

    return sanitized;
  }
}
