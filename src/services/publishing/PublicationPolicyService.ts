/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  PublicationPolicyConfig,
  PublicationGateInput,
  PublicationReason,
} from '../../types/publishing';

export const DEFAULT_PUBLICATION_POLICY: PublicationPolicyConfig = {
  safeAutomaticCategories: [
    'technology',
    'gaming',
    'apps',
    'hardware',
    'science',
    'space',
    'ai',
  ],
  reviewRequiredCategories: [
    'politics',
    'elections',
    'war',
    'crime',
    'health',
    'financial-markets',
    'business',
    'disasters',
  ],
  automatedPublishingEnabled:
    process.env.AUTOMATED_PUBLISHING_ENABLED !== 'false' &&
    process.env.AUTOMATED_PUBLISHING_ENABLED !== '0',
  categorySwitches: {
    technology: true,
    gaming: true,
    apps: true,
    hardware: true,
    science: true,
    space: true,
    ai: true,
    politics: false,
    elections: false,
    war: false,
    crime: false,
    health: false,
    'financial-markets': false,
    business: false,
    disasters: false,
  },
  blockedSources: [],
  maxBacklogAgeHours: 72, // 3 days max age for automated publishing (backlog safety)
  defaultBatchLimit: 5,
  requireHeroImage: false, // fallback images are allowed
};

export class PublicationPolicyService {
  private config: PublicationPolicyConfig;

  constructor(customConfig?: Partial<PublicationPolicyConfig>) {
    this.config = {
      ...DEFAULT_PUBLICATION_POLICY,
      ...customConfig,
      categorySwitches: {
        ...DEFAULT_PUBLICATION_POLICY.categorySwitches,
        ...(customConfig?.categorySwitches || {}),
      },
    };
  }

  public getConfig(): PublicationPolicyConfig {
    return { ...this.config };
  }

  public setGlobalKillSwitch(enabled: boolean): void {
    this.config.automatedPublishingEnabled = enabled;
  }

  public setCategorySwitch(category: string, enabled: boolean): void {
    this.config.categorySwitches[category.toLowerCase()] = enabled;
  }

  public blockSource(sourceNameOrUrl: string): void {
    this.config.blockedSources.push(sourceNameOrUrl.toLowerCase());
  }

  /**
   * Evaluate whether a candidate story passes publication policy rules.
   */
  public evaluate(input: PublicationGateInput): {
    allowed: boolean;
    reason: PublicationReason;
    blockingIssues: string[];
  } {
    const blockingIssues: string[] = [];

    // 1. Global Kill Switch Check
    if (!this.config.automatedPublishingEnabled && !input.force) {
      return {
        allowed: false,
        reason: 'KILL_SWITCH_DISABLED',
        blockingIssues: ['Automated publishing is globally disabled (KILL_SWITCH_DISABLED).'],
      };
    }

    const { story, validation, extraction } = input;
    const rawCategory = (story.category || extraction.category || '').toLowerCase().trim();
    const cleanCategory = rawCategory === 'tech' ? 'technology' : rawCategory;

    // 2. Blocked Sources Check
    const sources = input.sources || story.sources || [];
    const primarySource = sources.find((s) => s.isPrimary || s.is_primary) || sources[0];
    if (primarySource) {
      const sourceName = (primarySource.name || '').toLowerCase();
      const sourceUrl = (primarySource.url || '').toLowerCase();
      const isBlocked = this.config.blockedSources.some(
        (b) => sourceName.includes(b) || (sourceUrl && sourceUrl.includes(b))
      );
      if (isBlocked) {
        return {
          allowed: false,
          reason: 'SOURCE_DISABLED',
          blockingIssues: [`Source '${primarySource.name}' is blocked by publication policy.`],
        };
      }
    }

    // 3. Sensitive Topic & Review-Required Category Inspection
    const isSafe = this.config.safeAutomaticCategories.includes(cleanCategory);
    const isReviewRequired =
      this.config.reviewRequiredCategories.includes(cleanCategory) || !isSafe;

    if (isReviewRequired && !input.force) {
      return {
        allowed: false,
        reason: 'SENSITIVE_TOPIC',
        blockingIssues: [
          `Category '${cleanCategory}' is designated review-required and requires manual editorial sign-off.`,
        ],
      };
    }

    // 4. Sensitive Keywords Inspection
    const fullText = [
      story.title || '',
      story.summary || '',
      story.dek || '',
      ...(story.quickSummary || []),
      ...(extraction.sourceEvidence || []).map((c: any) => c.claim || ''),
    ]
      .join(' ')
      .toLowerCase();

    // 4a. Political / Electoral Story Block
    const politicalPatterns = [
      /\belection\b/i,
      /\bpredicted winner\b/i,
      /\blikely winner\b/i,
      /\bpolling lead\b/i,
      /\bvoter fraud\b/i,
      /\bunverified allegations\b/i,
      /\bpresidential debate\b/i,
      /\bballot stuffing\b/i,
    ];
    if (politicalPatterns.some((pattern) => pattern.test(fullText)) && !input.force) {
      blockingIssues.push('Political/electoral claims detected. Routed to HOLD for human review.');
      return {
        allowed: false,
        reason: 'SENSITIVE_TOPIC',
        blockingIssues,
      };
    }

    // 4b. Health / Medical Claims Block
    const healthPatterns = [
      /\bmiracle cure\b/i,
      /\bcures cancer\b/i,
      /\bclinical diagnosis\b/i,
      /\bguaranteed treatment\b/i,
      /\bunproven therapy\b/i,
      /\bmedical breakthrough cures\b/i,
    ];
    if (healthPatterns.some((pattern) => pattern.test(fullText)) && !input.force) {
      blockingIssues.push('Unverified medical/treatment claims detected. Routed to HOLD for editorial review.');
      return {
        allowed: false,
        reason: 'SENSITIVE_TOPIC',
        blockingIssues,
      };
    }

    // 4c. Financial Risk / Investment Advice Block
    const financialPatterns = [
      /\bguaranteed returns\b/i,
      /\binvestment advice\b/i,
      /\bbuy this stock now\b/i,
      /\b100x return\b/i,
      /\bmarket crash imminent\b/i,
      /\brisk-free profit\b/i,
    ];
    if (financialPatterns.some((pattern) => pattern.test(fullText)) && !input.force) {
      blockingIssues.push('Financial advice or guaranteed returns detected. Routed to HOLD for human review.');
      return {
        allowed: false,
        reason: 'SENSITIVE_TOPIC',
        blockingIssues,
      };
    }

    // 4d. High-Risk Disasters / Casualties / War Block
    const disasterPatterns = [
      /\bcasualties\b/i,
      /\bdeath toll\b/i,
      /\bmass shooting\b/i,
      /\bterrorist attack\b/i,
      /\bhostage situation\b/i,
      /\bwar crimes\b/i,
      /\bfatal crash\b/i,
    ];
    if (disasterPatterns.some((pattern) => pattern.test(fullText)) && !input.force) {
      blockingIssues.push('High-risk sensitive event (casualties/disaster/war) detected. Routed to HOLD.');
      return {
        allowed: false,
        reason: 'SENSITIVE_TOPIC',
        blockingIssues,
      };
    }

    // 5. Validation Sensitive Flags Check
    if (validation.sensitiveTopicFlags && validation.sensitiveTopicFlags.length > 0 && !input.force) {
      blockingIssues.push(
        `Validator flagged sensitive topics: ${validation.sensitiveTopicFlags.join(', ')}`
      );
      return {
        allowed: false,
        reason: 'SENSITIVE_TOPIC',
        blockingIssues,
      };
    }

    // 6. Category-Level Switch Check (for safe categories disabled on-demand)
    if (this.config.categorySwitches[cleanCategory] === false && !input.force) {
      return {
        allowed: false,
        reason: 'CATEGORY_DISABLED',
        blockingIssues: [
          `Automated publishing for category '${cleanCategory}' is explicitly disabled.`,
        ],
      };
    }

    // 7. Backlog Safety / Recency Cutoff Check
    if (story.published_at || extraction.eventDate) {
      const pubDate = new Date(story.published_at || extraction.eventDate || Date.now());
      const ageHours = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
      if (ageHours > this.config.maxBacklogAgeHours && !input.force) {
        blockingIssues.push(
          `Story date is ${Math.round(ageHours)}h old (exceeds ${this.config.maxBacklogAgeHours}h safety cutoff). Requires manual release.`
        );
        return {
          allowed: false,
          reason: 'PUBLICATION_POLICY_BLOCK',
          blockingIssues,
        };
      }
    }

    return {
      allowed: true,
      reason: input.lifecycleDecision.action === 'CREATE' ? 'AUTO_PUBLISH_VALID_CREATE' : 'AUTO_PUBLISH_VALID_UPDATE',
      blockingIssues: [],
    };
  }
}
