/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * MultiSourceEvidenceAggregator: Consolidates multi-source evidence and detects factual conflicts.
 */

import type {
  EventCluster,
  UnifiedEvidenceSet,
  FactClaim,
  SourceConsultation,
} from './types';
import { FactResearchService } from './FactResearchService';

export class MultiSourceEvidenceAggregator {
  private researchService: FactResearchService;

  constructor(researchService?: FactResearchService) {
    this.researchService = researchService || new FactResearchService();
  }

  /**
   * Researches all leads within an EventCluster and aggregates into a UnifiedEvidenceSet.
   */
  public async aggregateClusterEvidence(cluster: EventCluster): Promise<UnifiedEvidenceSet> {
    const allFacts: FactClaim[] = [];
    const entitiesMap = new Map<string, number>();
    const allQuotes: Array<{ quote: string; speaker: string; attributionUrl: string }> = [];
    const allNumbers: Array<{ label: string; value: string; evidence: string }> = [];
    const allStatements: Array<{ statement: string; organization: string; url: string }> = [];
    const sourcesConsulted: SourceConsultation[] = [];

    // Research each lead in the cluster
    for (const lead of cluster.leads) {
      const researchResult = await this.researchService.researchLead(lead);
      sourcesConsulted.push(researchResult.consultation);

      // Collect facts
      allFacts.push(...researchResult.facts);

      // Collect entities & frequencies
      for (const ent of researchResult.entities) {
        entitiesMap.set(ent, (entitiesMap.get(ent) || 0) + 1);
      }

      // Collect quotes
      allQuotes.push(...researchResult.quotes);

      // Collect numbers
      allNumbers.push(...researchResult.numbers);
    }

    // Corroboration & Conflict Analysis
    const { conflicts, factsWithConflictFlags } = this.detectFactualConflicts(allFacts, cluster);

    // Count accessible vs blocked
    const accessibleCount = sourcesConsulted.filter((s) => s.status === 'accessible').length;
    const blockedCount = sourcesConsulted.filter(
      (s) => s.status === 'blocked' || s.status === 'paywalled' || s.status === 'unsafe_url'
    ).length;

    // Build named entity objects with frequency
    const namedEntities = Array.from(entitiesMap.entries())
      .map(([name, frequency]) => ({
        name,
        type: 'entity',
        frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return {
      clusterId: cluster.clusterId,
      eventTitle: cluster.canonicalTitle,
      category: cluster.category,
      facts: factsWithConflictFlags,
      namedEntities,
      numbersAndMetrics: allNumbers,
      quotes: allQuotes,
      officialStatements: allStatements,
      sourcesConsulted,
      accessibleSourcesCount: accessibleCount,
      blockedSourcesCount: blockedCount,
      hasConflicts: conflicts.length > 0,
      conflicts,
      assembledAt: new Date().toISOString(),
    };
  }

  /**
   * Identifies contradictory quantitative claims, dates, or opposing statements across sources.
   * Never silently picks one; explicitly flags the disagreement.
   */
  public detectFactualConflicts(
    facts: FactClaim[],
    cluster: EventCluster
  ): { conflicts: string[]; factsWithConflictFlags: FactClaim[] } {
    const conflicts: string[] = [];
    const factsWithConflictFlags = [...facts];

    // Check for differing numbers/metrics reported for the same event
    const numberFacts = facts.filter((f) => f.dimension === 'number' && f.value);
    const seenValues = new Map<string, string>(); // value -> sourceName

    for (const nf of numberFacts) {
      if (!nf.value) continue;
      const cleanVal = nf.value.trim().toLowerCase();

      // Look for diverging figures that mention similar units (e.g. $10M vs $15M)
      for (const [existingVal, existingSource] of seenValues.entries()) {
        if (existingSource !== nf.supportingSource && existingVal !== cleanVal) {
          // If both are dollar amounts or both are percentages, flag conflict
          const isBothCurrency = existingVal.startsWith('$') && cleanVal.startsWith('$');
          const isBothPercent = existingVal.includes('%') && cleanVal.includes('%');

          if (isBothCurrency || isBothPercent) {
            const conflictMsg = `Discrepancy in reported metric: ${existingSource} reports "${existingVal}" while ${nf.supportingSource} reports "${cleanVal}".`;
            conflicts.push(conflictMsg);
            nf.isConflict = true;
            nf.conflictReason = conflictMsg;
          }
        }
      }

      seenValues.set(cleanVal, nf.supportingSource);
    }

    // Check for conflicting headline statements (e.g. approved vs rejected / delayed)
    const whatFacts = facts.filter((f) => f.dimension === 'what');
    const hasApproval = whatFacts.some((f) => /\b(approved|cleared|passes|wins)\b/i.test(f.claim));
    const hasRejection = whatFacts.some((f) => /\b(rejected|blocked|delays|fails)\b/i.test(f.claim));

    if (hasApproval && hasRejection) {
      const conflictMsg = 'Source disagreement: contradictory outcome reported across sources (approval vs rejection/delay).';
      conflicts.push(conflictMsg);
      for (const f of whatFacts) {
        f.isConflict = true;
        f.conflictReason = conflictMsg;
      }
    }

    return {
      conflicts,
      factsWithConflictFlags,
    };
  }
}
