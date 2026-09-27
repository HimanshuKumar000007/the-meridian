/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DiscoveryItem, DiscoveryDedupeResult } from '../../types/discovery';

/**
 * Universal Discovery Deduplication Service.
 * Evaluates candidate items against the discovery index to differentiate
 * between brand-new stories, post-publication updates, and exact duplicates (no-ops).
 */
export class DiscoveryDeduplicator {
  /**
   * Evaluates a candidate against an existing collection of items.
   * Can look up by fingerprint or canonicalUrl.
   */
  public evaluateCandidate(
    candidate: DiscoveryItem,
    existingItems: Map<string, DiscoveryItem>
  ): DiscoveryDedupeResult {
    // 1. Check by fingerprint (exact title + source + canonical URL hash)
    let existing = existingItems.get(candidate.fingerprint);

    // 2. Fallback check by canonical URL (handles title tweaks on same URL)
    if (!existing && candidate.canonicalUrl) {
      existing = existingItems.get(`url:${candidate.canonicalUrl}`);
    }

    // 3. Fallback check by external ID if present
    if (!existing && candidate.externalId) {
      existing = existingItems.get(`ext:${candidate.sourceId}:${candidate.externalId}`);
    }

    // Case A: Not seen before -> Brand NEW
    if (!existing) {
      return {
        action: 'new',
        item: {
          ...candidate,
          status: 'new',
        },
        reason: 'No matching fingerprint or canonical URL in queue',
      };
    }

    // Case B: Same item, check for content update
    const isContentChanged = candidate.contentHash !== existing.contentHash;
    const isTimestampUpdated = Boolean(
      candidate.sourceUpdatedAt &&
      existing.sourceUpdatedAt &&
      new Date(candidate.sourceUpdatedAt).getTime() > new Date(existing.sourceUpdatedAt).getTime()
    );

    if (isContentChanged || isTimestampUpdated) {
      // Possible update detected
      const updatedItem: DiscoveryItem = {
        ...existing,
        title: candidate.title || existing.title,
        description: candidate.description || existing.description,
        sourceUpdatedAt: candidate.sourceUpdatedAt || candidate.lastSeenAt,
        lastSeenAt: candidate.lastSeenAt,
        contentHash: candidate.contentHash,
        imageUrl: candidate.imageUrl || existing.imageUrl,
        status: 'possible_update',
        updatedAt: new Date().toISOString(),
      };

      return {
        action: 'possible_update',
        item: updatedItem,
        existingItem: existing,
        reason: isContentChanged
          ? 'Content hash changed (title or description modified)'
          : 'Source updated timestamp is newer',
      };
    }

    // Case C: Exact duplicate (NO-OP) -> Update last_seen_at only
    const noopItem: DiscoveryItem = {
      ...existing,
      lastSeenAt: candidate.lastSeenAt,
    };

    return {
      action: 'no_op',
      item: noopItem,
      existingItem: existing,
      reason: 'Identical fingerprint and content hash (no change)',
    };
  }

  /**
   * Helper to build a lookup index map from an array of existing DiscoveryItems.
   */
  public buildLookupIndex(items: DiscoveryItem[]): Map<string, DiscoveryItem> {
    const map = new Map<string, DiscoveryItem>();

    for (const item of items) {
      // Index by fingerprint
      if (item.fingerprint) {
        map.set(item.fingerprint, item);
      }
      // Index by canonical URL
      if (item.canonicalUrl) {
        map.set(`url:${item.canonicalUrl}`, item);
      }
      // Index by external ID
      if (item.sourceId && item.externalId) {
        map.set(`ext:${item.sourceId}:${item.externalId}`, item);
      }
    }

    return map;
  }
}
