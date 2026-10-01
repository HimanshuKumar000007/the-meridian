/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * EvidenceSufficiencyEvaluator: Pre-NVIDIA gate evaluating whether verified factual evidence
 * is sufficient to support a legitimate, substantive 700+ word article without fabrication.
 */

import type { UnifiedEvidenceSet, SufficiencyEvaluation } from './types';

export const MIN_REQUIRED_FACTS = 4;
export const MIN_DIMENSIONS_COUNT = 3;

export class EvidenceSufficiencyEvaluator {
  /**
   * Evaluates the completeness and factual density of a UnifiedEvidenceSet.
   */
  public evaluate(evidence: UnifiedEvidenceSet): SufficiencyEvaluation {
    const reasons: string[] = [];
    const missingDimensions: string[] = [];

    // 1. Check accessible sources
    if (evidence.accessibleSourcesCount === 0) {
      reasons.push(
        `All consulted sources (${evidence.sourcesConsulted.length}) were blocked, paywalled, or inaccessible.`
      );
      return {
        isSufficient: false,
        score: 0.0,
        reasons,
        missingDimensions: ['who', 'what', 'when', 'where', 'number'],
        eligibleForNvidia: false,
        recommendedAction: 'HOLD_BLOCKED_SOURCES',
        metrics: {
          totalFacts: 0,
          dimensionsCovered: 0,
          accessibleSources: 0,
          hasOfficialCorroboration: false,
        },
      };
    }

    // 2. Count distinct dimensions represented
    const dimensionsPresent = new Set(evidence.facts.map((f) => f.dimension));
    const requiredCheckDimensions: Array<'who' | 'what' | 'when' | 'number'> = [
      'who',
      'what',
      'when',
      'number',
    ];

    for (const dim of requiredCheckDimensions) {
      if (!dimensionsPresent.has(dim)) {
        missingDimensions.push(dim);
      }
    }

    const totalFacts = evidence.facts.length;
    const dimensionsCovered = dimensionsPresent.size;

    // 3. Evaluate fact count
    if (totalFacts < MIN_REQUIRED_FACTS) {
      reasons.push(
        `Factual evidence count (${totalFacts}) is below minimum requirement (${MIN_REQUIRED_FACTS}) for a substantive article.`
      );
    }

    // 4. Evaluate core dimensions
    if (!dimensionsPresent.has('what')) {
      reasons.push('Missing foundational "what" dimension (no core event claim verified).');
    }
    if (!dimensionsPresent.has('when')) {
      reasons.push('Missing temporal anchor ("when" dimension not verified).');
    }
    if (!dimensionsPresent.has('who') && evidence.namedEntities.length === 0) {
      reasons.push('Missing key entities or actors ("who" dimension unverified).');
    }

    // 5. Calculate sufficiency score (0.0 to 1.0)
    let score = 0.0;
    score += Math.min(0.4, (totalFacts / 8) * 0.4); // up to 0.4 for fact count
    score += Math.min(0.3, (dimensionsCovered / 5) * 0.3); // up to 0.3 for dimensions
    score += Math.min(0.2, (evidence.accessibleSourcesCount / 2) * 0.2); // up to 0.2 for multiple sources
    if (evidence.quotes.length > 0 || evidence.officialStatements.length > 0) {
      score += 0.1; // bonus for quotes/official records
    }

    score = Number(Math.min(1.0, score).toFixed(2));

    const isSufficient =
      totalFacts >= MIN_REQUIRED_FACTS &&
      dimensionsPresent.has('what') &&
      dimensionsPresent.has('when') &&
      score >= 0.50;

    if (!isSufficient && reasons.length === 0) {
      reasons.push(`Evidence sufficiency score (${score}) is below operational threshold (0.50).`);
    }

    return {
      isSufficient,
      score,
      reasons,
      missingDimensions,
      eligibleForNvidia: isSufficient,
      recommendedAction: isSufficient
        ? 'PROCEED_TO_SYNTHESIS'
        : 'HOLD_INSUFFICIENT_EVIDENCE',
      metrics: {
        totalFacts,
        dimensionsCovered,
        accessibleSources: evidence.accessibleSourcesCount,
        hasOfficialCorroboration: evidence.officialStatements.length > 0,
      },
    };
  }
}
