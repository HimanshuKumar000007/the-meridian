/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * OperatorNotificationService: Operator Alerting for Editorial Review Candidates
 */

import { createHash } from 'crypto';
import type {
  ReviewNotificationPayload,
  ReviewNotificationConfig,
  NotificationSendResult,
  ReviewNotificationIssue,
} from '../../types/notification';
import { NotificationConfigService } from './NotificationConfigService';
import {
  type ReviewNotificationStateRepository,
  MemoryReviewNotificationStateRepository,
} from './ReviewNotificationStateRepository';
import type { NotificationProvider } from './providers/NotificationProvider';
import { GenericWebhookProvider } from './providers/GenericWebhookProvider';
import { SlackWebhookProvider } from './providers/SlackWebhookProvider';
import { DiscordWebhookProvider } from './providers/DiscordWebhookProvider';
import { WebhookSecretSanitizer } from './WebhookSecretSanitizer';

export interface OperatorNotificationServiceOptions {
  configService?: NotificationConfigService;
  stateRepository?: ReviewNotificationStateRepository;
  customProvider?: NotificationProvider;
}

export class OperatorNotificationService {
  private readonly configService: NotificationConfigService;
  private readonly stateRepository: ReviewNotificationStateRepository;
  private readonly customProvider?: NotificationProvider;

  constructor(options: OperatorNotificationServiceOptions = {}) {
    this.configService = options.configService || new NotificationConfigService();
    this.stateRepository = options.stateRepository || new MemoryReviewNotificationStateRepository();
    this.customProvider = options.customProvider;
  }

  /**
   * Computes a deterministic hash of the candidate's review state.
   * If the storyId, status, review reason, or issues change, this hash changes.
   */
  public computeStateHash(input: {
    storyId: string;
    validationStatus?: string;
    reason?: string;
    issues?: ReviewNotificationIssue[];
  }): string {
    const status = input.validationStatus || 'needs_review';
    const reason = (input.reason || '').trim();
    const sortedIssues = (input.issues || [])
      .map((i) => `${i.code}:${i.field || ''}:${i.message || ''}`)
      .sort()
      .join('|');

    return createHash('sha256')
      .update(`${input.storyId}::${status}::${reason}::${sortedIssues}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Generates standard review URL for the site operator.
   */
  public generateReviewUrl(storyId: string, validationId?: string): string {
    const config = this.configService.getConfig();
    const targetId = validationId || storyId;
    return `${config.baseUrl}/review/${targetId}`;
  }

  /**
   * Instantiates the configured notification provider.
   */
  private resolveProvider(config: ReviewNotificationConfig): NotificationProvider | null {
    if (this.customProvider) {
      return this.customProvider;
    }

    if (!config.webhookUrl) {
      return null;
    }

    switch (config.provider) {
      case 'slack':
        return new SlackWebhookProvider(config.webhookUrl, config.timeoutMs, config.maxRetries);
      case 'discord':
        return new DiscordWebhookProvider(config.webhookUrl, config.timeoutMs, config.maxRetries);
      case 'webhook':
      default:
        return new GenericWebhookProvider(config.webhookUrl, config.timeoutMs, config.maxRetries);
    }
  }

  /**
   * Notifies the operator when a candidate is routed to needs_review.
   * Strictly fail-safe: failures never throw and never abort pipeline processing.
   */
  public async notifyReviewRequired(input: {
    storyId: string;
    headline: string;
    source: string;
    reason: string;
    category: string;
    reviewUrl?: string;
    timestamp?: string;
    validationId?: string;
    extractionId?: string;
    validationStatus?: string;
    issues?: ReviewNotificationIssue[];
    force?: boolean;
  }): Promise<NotificationSendResult> {
    const started = Date.now();
    const status = input.validationStatus || 'needs_review';

    // 1. Only stories routed to needs_review trigger operator notifications
    if (status !== 'needs_review') {
      return {
        notified: false,
        success: true,
        provider: 'none',
        durationMs: Date.now() - started,
        retries: 0,
        skipReason: 'NON_REVIEW_STATUS',
        storyId: input.storyId,
      };
    }

    const config = this.configService.getConfig();

    // 2. Disabled check
    if (!config.enabled) {
      return {
        notified: false,
        success: true,
        provider: config.provider,
        durationMs: Date.now() - started,
        retries: 0,
        skipReason: 'DISABLED',
        storyId: input.storyId,
      };
    }

    // 3. Webhook URL check
    if (!config.webhookUrl && !this.customProvider) {
      return {
        notified: false,
        success: true,
        provider: config.provider,
        durationMs: Date.now() - started,
        retries: 0,
        skipReason: 'MISSING_URL',
        storyId: input.storyId,
      };
    }

    const stateHash = this.computeStateHash({
      storyId: input.storyId,
      validationStatus: status,
      reason: input.reason,
      issues: input.issues,
    });

    // 4. Idempotency Check: Prevent duplicate spam for the same review state
    if (!input.force) {
      const lastState = await this.stateRepository.getLastNotifiedState(input.storyId);
      if (lastState && lastState === stateHash) {
        return {
          notified: false,
          success: true,
          provider: config.provider,
          durationMs: Date.now() - started,
          retries: 0,
          skipReason: 'DUPLICATE_REVIEW_STATE',
          storyId: input.storyId,
          stateHash,
        };
      }
    }

    const provider = this.resolveProvider(config);
    if (!provider) {
      return {
        notified: false,
        success: false,
        provider: config.provider,
        durationMs: Date.now() - started,
        retries: 0,
        skipReason: 'INVALID_CONFIG',
        error: 'Unable to resolve notification provider.',
        storyId: input.storyId,
        stateHash,
      };
    }

    const reviewUrl = input.reviewUrl || this.generateReviewUrl(input.storyId, input.validationId);
    const timestamp = input.timestamp || new Date().toISOString();

    const payload: ReviewNotificationPayload = {
      storyId: input.storyId,
      headline: input.headline,
      source: input.source,
      reason: input.reason,
      category: input.category,
      reviewUrl,
      timestamp,
      validationId: input.validationId,
      extractionId: input.extractionId,
      validationStatus: status,
      issues: input.issues || [],
      stateHash,
    };

    try {
      const sendResult = await provider.send(payload);

      if (sendResult.success) {
        // Record notified state on success for idempotency
        await this.stateRepository.recordNotifiedState({
          storyId: input.storyId,
          stateHash,
          provider: provider.type,
          notifiedAt: timestamp,
          metadata: {
            headline: input.headline,
            reason: input.reason,
            validationId: input.validationId,
          },
        });

        return {
          notified: true,
          success: true,
          provider: provider.type,
          statusCode: sendResult.statusCode,
          durationMs: Date.now() - started,
          retries: sendResult.retries,
          storyId: input.storyId,
          stateHash,
        };
      }

      // Provider returned failure
      return {
        notified: true,
        success: false,
        provider: provider.type,
        statusCode: sendResult.statusCode,
        durationMs: Date.now() - started,
        retries: sendResult.retries,
        error: sendResult.error,
        storyId: input.storyId,
        stateHash,
      };
    } catch (unhandledErr: any) {
      // Fail-safe guarantee: catch any unexpected error and sanitize log
      const safeError = WebhookSecretSanitizer.sanitizeMessage(
        unhandledErr?.message || String(unhandledErr),
        config.webhookUrl
      );
      console.warn('[OperatorNotificationService] Fail-safe caught notification error:', safeError);

      return {
        notified: true,
        success: false,
        provider: provider.type,
        durationMs: Date.now() - started,
        retries: 0,
        error: safeError,
        storyId: input.storyId,
        stateHash,
      };
    }
  }
}
