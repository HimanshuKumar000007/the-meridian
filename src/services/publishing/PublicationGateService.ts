/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto';
import type {
  PublicationDecisionResult,
  PublicationGateInput,
  PublicationReason,
} from '../../types/publishing';
import { PublicationPolicyService } from './PublicationPolicyService';
import {
  countArticleBodyWords,
  extractArticleBodyProse,
  detectFillerText,
  MIN_ARTICLE_BODY_WORDS,
} from '../../utils/wordCount';

export class PublicationGateService {
  private policyService: PublicationPolicyService;

  constructor(policyService?: PublicationPolicyService) {
    this.policyService = policyService || new PublicationPolicyService();
  }

  /**
   * Generates a deterministic SHA-256 hash of the canonical publishable content.
   */
  public static computeContentHash(story: any): string {
    const blocks = story.content || story.contentBlocks || [];
    const bodyProse = extractArticleBodyProse(blocks);
    const payload = JSON.stringify({
      title: (story.title || '').trim(),
      summary: (story.summary || story.dek || '').trim(),
      category: (story.category || '').toLowerCase().trim(),
      bodyProse: bodyProse.trim(),
      content: blocks.map((b: any) => ({
        type: b.type,
        text: b.text || b.quote || b.content || '',
        level: b.level,
        items: b.items,
      })),
      facts: (story.facts || []).map((f: any) => ({
        label: f.label,
        value: f.value,
      })),
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Evaluates all publication gates for an incoming candidate.
   */
  public evaluate(input: PublicationGateInput): PublicationDecisionResult {
    const blockingIssues: string[] = [];
    const publishableFields: string[] = [];
    const { story, lifecycleDecision, validation, extraction } = input;

    // ----------------------------------------------------
    // 1. HARD VALIDATION STATUS GATE
    // ----------------------------------------------------
    if (validation.status === 'rejected') {
      return {
        decision: 'REJECT',
        reason: 'VALIDATION_REJECTED',
        blockingIssues: ['Candidate was rejected by validation engine (unverified/hallucinated content).'],
        publishableFields: [],
        publicationVersion: story.published_version || 1,
      };
    }

    if (validation.status === 'insufficient_evidence') {
      return {
        decision: 'HOLD',
        reason: 'LOW_EVIDENCE',
        blockingIssues: ['Candidate has insufficient source evidence (<120 characters or missing facts).'],
        publishableFields: [],
        publicationVersion: story.published_version || 1,
      };
    }

    if (validation.status === 'needs_review' && !input.force) {
      return {
        decision: 'HOLD',
        reason: 'VALIDATION_REVIEW',
        blockingIssues: ['Validation requires human editorial review before publication.'],
        publishableFields: [],
        publicationVersion: story.published_version || 1,
      };
    }

    // Critical issue check
    const hasCriticalIssues = (validation.issues || []).some(
      (iss) => iss.severity === 'critical'
    );
    if (hasCriticalIssues && !input.force) {
      return {
        decision: 'REJECT',
        reason: 'VALIDATION_REJECTED',
        blockingIssues: [
          'Validation contains one or more critical issues: ' +
            validation.issues
              .filter((i) => i.severity === 'critical')
              .map((i) => i.message)
              .join('; '),
        ],
        publishableFields: [],
        publicationVersion: story.published_version || 1,
      };
    }

    // ----------------------------------------------------
    // 2. LIFECYCLE ACTION GATE
    // ----------------------------------------------------
    if (lifecycleDecision.action === 'REJECT') {
      return {
        decision: 'REJECT',
        reason: 'LIFECYCLE_HOLD_OR_REJECT',
        blockingIssues: [`Lifecycle action is REJECT: ${lifecycleDecision.reason}`],
        publishableFields: [],
        publicationVersion: story.published_version || 1,
      };
    }

    if (lifecycleDecision.action === 'HOLD' && !input.force) {
      return {
        decision: 'HOLD',
        reason: 'LIFECYCLE_HOLD_OR_REJECT',
        blockingIssues: [`Lifecycle action is HOLD: ${lifecycleDecision.reason}`],
        publishableFields: [],
        publicationVersion: story.published_version || 1,
      };
    }

    // ----------------------------------------------------
    // 3. REQUIRED FIELDS CHECK
    // ----------------------------------------------------
    if (!story.title || story.title.trim().length < 10) {
      blockingIssues.push('Title is missing or under 10 characters.');
    } else {
      publishableFields.push('title');
    }

    const summaryText = story.summary || story.dek || '';
    if (!summaryText || summaryText.trim().length < 25) {
      blockingIssues.push('Summary/dek is missing or under 25 characters.');
    } else {
      publishableFields.push('summary');
    }

    if (!story.category || story.category.trim().length === 0) {
      blockingIssues.push('Category is missing.');
    } else {
      publishableFields.push('category');
    }

    if (!story.slug || story.slug.trim().length < 3) {
      blockingIssues.push('Slug is missing or invalid.');
    } else {
      publishableFields.push('slug');
    }

    const pubDate = story.published_at || story.publishedAt;
    if (!pubDate || isNaN(Date.parse(pubDate))) {
      blockingIssues.push('Published timestamp is missing or malformed.');
    } else {
      publishableFields.push('publishedAt');
    }

    if (blockingIssues.length > 0) {
      return {
        decision: 'HOLD',
        reason: 'MISSING_REQUIRED_FIELD',
        blockingIssues,
        publishableFields,
        publicationVersion: story.published_version || 1,
      };
    }

    // ----------------------------------------------------
    // 4. ARTICLE BODY INTEGRITY & PROTECTION
    // ----------------------------------------------------
    if (!story.content || !Array.isArray(story.content) || story.content.length === 0) {
      return {
        decision: 'HOLD',
        reason: 'MALFORMED_CONTENT',
        blockingIssues: ['Story content blocks are empty or not an array.'],
        publishableFields,
        publicationVersion: story.published_version || 1,
      };
    }

    // Check for substantive block
    const hasSubstantiveBlock = story.content.some((b) => {
      const pText = b.text || b.content || '';
      if (b.type === 'paragraph' && typeof pText === 'string' && pText.trim().length >= 40) return true;
      const qText = b.quote || b.text || b.content || '';
      if (b.type === 'quote' && typeof qText === 'string' && qText.trim().length >= 30) return true;
      const cText = b.text || b.content || '';
      if (b.type === 'callout' && typeof cText === 'string' && cText.trim().length >= 40) return true;
      return false;
    });

    if (!hasSubstantiveBlock) {
      return {
        decision: 'HOLD',
        reason: 'MALFORMED_CONTENT',
        blockingIssues: ['Story content lacks at least one substantive article block (>=40 chars).'],
        publishableFields,
        publicationVersion: story.published_version || 1,
      };
    }

    // Check against raw HTML or boilerplate injection
    const rawContentStr = JSON.stringify(story.content);
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(rawContentStr)) {
      return {
        decision: 'REJECT',
        reason: 'MALFORMED_CONTENT',
        blockingIssues: ['Raw script tags detected in article content.'],
        publishableFields,
        publicationVersion: story.published_version || 1,
      };
    }

    publishableFields.push('content');

    // ----------------------------------------------------
    // 4b. 700-WORD MINIMUM ARTICLE BODY POLICY GATE
    // ----------------------------------------------------
    const bodyWordCount = countArticleBodyWords(story.content);
    if (bodyWordCount < MIN_ARTICLE_BODY_WORDS) {
      return {
        decision: 'HOLD',
        reason: 'INSUFFICIENT_ARTICLE_LENGTH',
        blockingIssues: [
          `Article body has ${bodyWordCount} words, which is below the ${MIN_ARTICLE_BODY_WORDS}-word minimum policy (requires >= ${MIN_ARTICLE_BODY_WORDS} substantive words).`,
        ],
        publishableFields,
        publicationVersion: story.published_version || 1,
        metadata: {
          wordCount: bodyWordCount,
          minRequired: MIN_ARTICLE_BODY_WORDS,
        },
      };
    }

    // Check for repetitive filler or padding in article body
    const fillerCheck = detectFillerText(story.content);
    if (fillerCheck.hasFiller) {
      return {
        decision: 'HOLD',
        reason: 'MALFORMED_CONTENT',
        blockingIssues: [
          fillerCheck.reason || 'Article body contains repetitive filler or unnatural phrase looping.',
        ],
        publishableFields,
        publicationVersion: story.published_version || 1,
      };
    }

    // ----------------------------------------------------
    // 5. SOURCE ATTRIBUTION CHECK
    // ----------------------------------------------------
    const allSources = input.sources || story.sources || [];
    const hasValidSource =
      allSources.some(
        (s) => s.name && s.name.trim().length > 0 && s.url && /^https?:\/\//i.test(s.url)
      ) ||
      (extraction.sources &&
        extraction.sources.some(
          (s) => s.name && s.name.trim().length > 0 && s.url && /^https?:\/\//i.test(s.url)
        ));

    if (!hasValidSource) {
      return {
        decision: 'HOLD',
        reason: 'MISSING_SOURCE',
        blockingIssues: ['No valid primary source with HTTP/HTTPS URL found.'],
        publishableFields,
        publicationVersion: story.published_version || 1,
      };
    }
    publishableFields.push('sources');

    // ----------------------------------------------------
    // 6. IMAGE SAFETY
    // ----------------------------------------------------
    if (story.image && !/^https?:\/\//i.test(story.image)) {
      blockingIssues.push(`Hero image URL '${story.image}' is invalid. Will rely on fallback.`);
    }

    // ----------------------------------------------------
    // 7. SCHEDULING CHECK
    // ----------------------------------------------------
    if (input.scheduledFor) {
      const scheduleTime = Date.parse(input.scheduledFor);
      if (!isNaN(scheduleTime) && scheduleTime > Date.now()) {
        return {
          decision: 'HOLD',
          reason: 'SCHEDULED_FUTURE',
          blockingIssues: [
            `Story is scheduled for future publication at ${new Date(scheduleTime).toISOString()}`,
          ],
          publishableFields,
          publicationVersion: story.published_version || 1,
        };
      }
    }

    // ----------------------------------------------------
    // 8. PUBLICATION POLICY EVALUATION
    // ----------------------------------------------------
    const policyResult = this.policyService.evaluate(input);
    if (!policyResult.allowed) {
      return {
        decision: 'HOLD',
        reason: policyResult.reason,
        blockingIssues: policyResult.blockingIssues,
        publishableFields,
        publicationVersion: story.published_version || 1,
      };
    }

    // ----------------------------------------------------
    // 9. CONTENT HASH & POST-VALIDATION INTEGRITY CHECK
    // ----------------------------------------------------
    const contentHash = PublicationGateService.computeContentHash(story);

    if (validation && (validation as any).contentHash) {
      if ((validation as any).contentHash !== contentHash) {
        return {
          decision: 'HOLD',
          reason: 'CONTENT_HASH_MISMATCH',
          blockingIssues: [
            'Story content has been modified after validation. Content hash does not match validated hash.',
          ],
          publishableFields,
          publicationVersion: story.published_version || 1,
        };
      }
    }

    const targetVersion =
      lifecycleDecision.action === 'UPDATE'
        ? (story.published_version || 1) + 1
        : story.published_version || 1;

    return {
      decision: 'PUBLISH',
      reason:
        lifecycleDecision.action === 'CREATE'
          ? 'AUTO_PUBLISH_VALID_CREATE'
          : 'AUTO_PUBLISH_VALID_UPDATE',
      blockingIssues: [],
      publishableFields,
      publicationVersion: targetVersion,
      contentHash,
    };
  }
}
