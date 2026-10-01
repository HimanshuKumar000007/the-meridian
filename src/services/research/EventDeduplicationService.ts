/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * EventDeduplicationService: Cross-source story clustering & event-level deduplication.
 * Reuses existing StoryMatchingEngine tokenization and Jaccard similarity.
 */

import { StoryClusteringService } from '../lifecycle/StoryClusteringService';
import type { StoryLead, EventCluster } from './types';
import { ApprovedSourceRegistry } from './ApprovedSourceRegistry';

export class EventDeduplicationService {
  private clusteringService: StoryClusteringService;
  private registry: ApprovedSourceRegistry;
  private clusters: Map<string, EventCluster> = new Map();

  constructor(
    clusteringService?: StoryClusteringService,
    registry?: ApprovedSourceRegistry
  ) {
    this.clusteringService = clusteringService || new StoryClusteringService();
    this.registry = registry || new ApprovedSourceRegistry();
  }

  /**
   * Tokenize text and compute Jaccard similarity.
   */
  public computeTitleSimilarity(titleA: string, titleB: string): number {
    const tokensA = this.clusteringService.tokenize(titleA);
    const tokensB = this.clusteringService.tokenize(titleB);
    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    let intersection = 0;
    for (const t of setA) {
      if (setB.has(t)) intersection++;
    }
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Checks whether two items fall within the same temporal event window (e.g. 36 hours).
   */
  public isWithinEventWindow(dateA: string, dateB: string, maxWindowHours = 36): boolean {
    const tA = new Date(dateA).getTime();
    const tB = new Date(dateB).getTime();
    if (isNaN(tA) || isNaN(tB)) return true; // Graceful fallback
    const diffHours = Math.abs(tA - tB) / (1000 * 60 * 60);
    return diffHours <= maxWindowHours;
  }

  /**
   * Evaluates an incoming story lead against all active event clusters.
   * If related, joins the existing cluster. If new, forms a new EventCluster.
   */
  public ingestLead(lead: StoryLead): { isNewEvent: boolean; cluster: EventCluster } {
    let bestMatch: EventCluster | null = null;
    let highestScore = 0;

    // Check existing clusters
    for (const cluster of this.clusters.values()) {
      // 1. Same category compatibility
      const categoryMatch =
        !lead.categoryHint ||
        !cluster.category ||
        lead.categoryHint.toLowerCase() === cluster.category.toLowerCase();

      if (!categoryMatch) continue;

      // 2. Publication date temporal consistency
      if (!this.isWithinEventWindow(lead.publishedAt, cluster.firstSeenAt)) {
        continue;
      }

      // 3. Exact URL match inside cluster
      if (cluster.sourceUrls.includes(lead.canonicalUrl)) {
        bestMatch = cluster;
        highestScore = 1.0;
        break;
      }

      // 4. Title similarity score
      const simScore = this.computeTitleSimilarity(lead.title, cluster.canonicalTitle);
      if (simScore >= 0.40 && simScore > highestScore) {
        highestScore = simScore;
        bestMatch = cluster;
      }
    }

    const sourceObj = this.registry.getSourceById(lead.sourceId);
    const isOfficial = Boolean(sourceObj?.is_official);

    // CASE 1: MATCH FOUND -> Group into existing event cluster
    if (bestMatch && highestScore >= 0.40) {
      // Avoid duplicate lead entries inside the cluster
      const leadExists = bestMatch.leads.some(
        (l) => l.canonicalUrl === lead.canonicalUrl || l.fingerprint === lead.fingerprint
      );

      if (!leadExists) {
        bestMatch.leads.push(lead);
        if (!bestMatch.sourceIds.includes(lead.sourceId)) {
          bestMatch.sourceIds.push(lead.sourceId);
        }
        if (!bestMatch.sourceUrls.includes(lead.canonicalUrl)) {
          bestMatch.sourceUrls.push(lead.canonicalUrl);
        }
        if (isOfficial) {
          bestMatch.hasOfficialSource = true;
        }
        bestMatch.lastUpdatedAt = new Date().toISOString();
      }

      return { isNewEvent: false, cluster: bestMatch };
    }

    // CASE 2: BRAND NEW EVENT -> Create new EventCluster
    const clusterId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const rawCategory = (lead.categoryHint || '').trim().toLowerCase();
    const approvedCategories = ['ai', 'technology', 'science', 'gaming', 'space', 'business'];
    const clusterCategory = approvedCategories.includes(rawCategory) ? rawCategory : 'technology';

    const newCluster: EventCluster = {
      clusterId,
      canonicalTitle: lead.title,
      category: clusterCategory,
      firstSeenAt: lead.publishedAt || new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      leads: [lead],
      sourceIds: [lead.sourceId],
      sourceUrls: [lead.canonicalUrl],
      hasOfficialSource: isOfficial,
      entities: [],
    };

    this.clusters.set(clusterId, newCluster);
    return { isNewEvent: true, cluster: newCluster };
  }

  /**
   * Retrieves an event cluster by ID.
   */
  public getCluster(clusterId: string): EventCluster | undefined {
    return this.clusters.get(clusterId);
  }

  /**
   * Retrieves all registered event clusters.
   */
  public getAllClusters(): EventCluster[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Ingest a batch of leads and return all resulting clusters.
   */
  public ingestBatch(leads: StoryLead[]): EventCluster[] {
    const touchedClusters = new Set<string>();
    for (const lead of leads) {
      const res = this.ingestLead(lead);
      touchedClusters.add(res.cluster.clusterId);
    }
    return Array.from(touchedClusters)
      .map((id) => this.clusters.get(id))
      .filter((c): c is EventCluster => Boolean(c));
  }
}
