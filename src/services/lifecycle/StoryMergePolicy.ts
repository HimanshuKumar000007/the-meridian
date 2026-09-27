/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtractedNewsCandidate, ExtractedFact } from '../../types/extraction';
import type { Story, StorySource, Fact } from '../../types/story';
import type { MeaningfulChangeCheckResult } from '../../types/lifecycle';
import { StoryMatchingEngine } from './StoryMatchingEngine';

export class StoryMergePolicy {
  private matchingEngine: StoryMatchingEngine;

  constructor(matchingEngine?: StoryMatchingEngine) {
    this.matchingEngine = matchingEngine || new StoryMatchingEngine();
  }

  /**
   * Compares candidate against existing story to determine if changes are meaningful
   */
  public evaluateChanges(
    story: Story,
    existingFacts: Fact[],
    existingSources: StorySource[],
    candidate: ExtractedNewsCandidate
  ): MeaningfulChangeCheckResult {
    const changedFields: string[] = [];
    const newFacts: ExtractedFact[] = [];
    const newSources: Array<{ name: string; url: string }> = [];

    // 1. Check for New Sources
    const existingNormalizedUrls = new Set(
      existingSources.map((s) => this.matchingEngine.normalizeUrl(s.url))
    );

    for (const src of candidate.sources || []) {
      const norm = this.matchingEngine.normalizeUrl(src.url);
      if (norm && !existingNormalizedUrls.has(norm)) {
        newSources.push(src);
      }
    }

    // 2. Check for New Verified Facts
    const existingFactSignatures = new Set(
      existingFacts.map((f) => `${f.label.toLowerCase().trim()}:${f.value.toLowerCase().trim()}`)
    );

    for (const candidateFact of candidate.facts || []) {
      const sig = `${candidateFact.label.toLowerCase().trim()}:${candidateFact.value.toLowerCase().trim()}`;
      if (!existingFactSignatures.has(sig)) {
        newFacts.push(candidateFact);
      }
    }

    if (newFacts.length > 0) {
      changedFields.push('facts');
    }

    // 3. Check for Date Changes
    let newDate: string | null = null;
    const storyDate = story.published_at || story.publishedAt;
    if (candidate.eventDate && storyDate && candidate.eventDate !== storyDate) {
      const d1 = new Date(candidate.eventDate).getTime();
      const d2 = new Date(storyDate).getTime();
      if (!isNaN(d1) && !isNaN(d2) && Math.abs(d1 - d2) > 1000 * 60 * 60 * 24) {
        newDate = candidate.eventDate;
        changedFields.push('eventDate');
      }
    }

    // 4. Check for Substantive Timeline Developments
    let isTimelineDevelopment = false;
    if (candidate.timelineCandidates && candidate.timelineCandidates.length > 0) {
      isTimelineDevelopment = true;
      changedFields.push('timeline');
    }

    // Determine if the change is meaningful for an ACTION_UPDATE
    const isMeaningful = newFacts.length > 0 || newDate !== null || isTimelineDevelopment;

    let reason = 'Candidate contains no meaningful new factual information.';
    if (newFacts.length > 0) {
      reason = `Discovered ${newFacts.length} new verified fact(s): ${newFacts.map((f) => f.label).join(', ')}`;
    } else if (newDate) {
      reason = `Event date updated to ${newDate}`;
    } else if (isTimelineDevelopment) {
      reason = `New timeline development recorded: ${candidate.timelineCandidates[0].title}`;
    } else if (newSources.length > 0) {
      reason = `Attached ${newSources.length} additional verifying source(s) without content modification`;
    }

    return {
      isMeaningful,
      changedFields,
      newFacts,
      newSources,
      newDate,
      reason,
    };
  }
}
