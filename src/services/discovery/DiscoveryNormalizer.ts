/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsSource, RawParsedItem, DiscoveryItem } from '../../types/discovery';
import { normalizeSourceUrl } from './normalizeUrl';
import { generateDiscoveryFingerprint, generateContentHash } from './fingerprint';

/**
 * Normalizes raw date strings into ISO 8601 timestamps.
 */
export function normalizeDate(rawDate?: string | null): string | null {
  if (!rawDate) return null;

  try {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // Return null on parsing failure
  }

  return null;
}

/**
 * Resolves relative URLs against the source base URL.
 */
export function resolveAbsoluteUrl(rawUrl: string, baseUrl: string): string {
  if (!rawUrl) return '';

  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    return resolved.href;
  } catch {
    return trimmed;
  }
}

/**
 * Discovery Normalizer transforms heterogeneous raw items into canonical DiscoveryItem records.
 */
export class DiscoveryNormalizer {
  /**
   * Normalizes a raw parsed feed item into a universal DiscoveryItem.
   */
  public normalizeItem(rawItem: RawParsedItem, source: NewsSource): DiscoveryItem | null {
    const title = (rawItem.title || '').trim();
    const rawLink = (rawItem.link || '').trim();

    // Must have at least a title or a link to be a valid discovery candidate
    if (!title && !rawLink) {
      return null;
    }

    const resolvedSourceUrl = resolveAbsoluteUrl(rawLink, source.baseUrl) || source.baseUrl;
    const canonicalUrl = normalizeSourceUrl(resolvedSourceUrl) || source.baseUrl;
    const sourceUrl = resolvedSourceUrl;

    // Published date normalization (fallback to now if missing/invalid)
    const nowIso = new Date().toISOString();
    const publishedAt = normalizeDate(rawItem.pubDate) || nowIso;
    const sourceUpdatedAt = normalizeDate(rawItem.updatedDate);

    // Generate deterministic fingerprint and content hash
    const fingerprint = generateDiscoveryFingerprint({
      title: title || canonicalUrl,
      canonicalUrl,
      sourceIdentity: source.id,
    });

    const contentHash = generateContentHash({
      title,
      description: rawItem.description,
      publishedAt,
    });

    // Category hints derived from source configuration & item categories
    const primaryCategory = source.categories && source.categories.length > 0 ? source.categories[0] : 'general';
    const subcategoryHint = source.categories && source.categories.length > 1
      ? source.categories[1]
      : (rawItem.categories && rawItem.categories.length > 0 ? rawItem.categories[0].toLowerCase().trim() : undefined);

    // Deterministic unique discovery candidate ID
    const id = `disc-${source.slug}-${fingerprint.slice(0, 16)}`;

    // Bounded metadata payload (preserving essential fields for downstream processing without bloating DB)
    const rawPayload: Record<string, any> = {
      rawTitle: rawItem.title,
      rawLink: rawItem.link,
      rawGuid: rawItem.guid,
      sourceCategories: rawItem.categories,
      author: rawItem.author,
      sourceCountry: source.country,
      sourceLanguage: source.language,
    };

    return {
      id,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      externalId: rawItem.guid || canonicalUrl,
      sourceUrl,
      canonicalUrl,
      fingerprint,
      title,
      description: rawItem.description || null,
      publishedAt,
      sourceUpdatedAt,
      discoveredAt: nowIso,
      lastSeenAt: nowIso,
      status: 'new',
      categoryHint: primaryCategory,
      subcategoryHint: subcategoryHint || null,
      author: rawItem.author || null,
      imageUrl: rawItem.imageUrl ? resolveAbsoluteUrl(rawItem.imageUrl, source.baseUrl) : null,
      rawPayload,
      contentHash,
      firstSeenAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }
}
