/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * ImageDiscoveryService: Discovers and normalizes image candidates from source metadata
 */

import type { ImageCandidate, ImageSourceType, ImageRightsStatus, ImageProvenanceStatus } from '../../types/media';

export class ImageDiscoveryService {
  /**
   * Resolves a potentially relative URL against a base URL.
   */
  private resolveUrl(url: string, baseUrl?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    try {
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
      }
      if (baseUrl) {
        return new URL(trimmed, baseUrl).toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extracts all image candidates from an HTML document string and source context.
   */
  public extractFromHtml(
    html: string,
    context: {
      sourceUrl?: string;
      sourceName?: string;
      sourceType?: ImageSourceType;
      storyId?: string;
    } = {}
  ): ImageCandidate[] {
    if (!html || typeof html !== 'string') return [];

    const candidates: ImageCandidate[] = [];
    const seenUrls = new Set<string>();
    const now = new Date().toISOString();

    const addCandidate = (
      rawUrl: string,
      tag: string,
      alt?: string,
      caption?: string,
      credit?: string,
      width?: number,
      height?: number,
      license?: string
    ) => {
      const resolved = this.resolveUrl(rawUrl, context.sourceUrl);
      if (!resolved || seenUrls.has(resolved)) return;
      seenUrls.add(resolved);

      // Determine rights: publisher content is NOT automatically licensed!
      const rightsStatus: ImageRightsStatus = license ? 'licensed' : 'unknown';
      const provenanceStatus: ImageProvenanceStatus = context.sourceUrl ? 'partially_verified' : 'unknown';

      candidates.push({
        id: `cand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        storyId: context.storyId,
        sourceUrl: context.sourceUrl,
        originalUrl: resolved,
        sourceName: context.sourceName,
        sourceType: context.sourceType || 'publisher',
        rightsStatus,
        provenanceStatus,
        validationStatus: 'candidate',
        isIllustrative: false,
        isPrimary: candidates.length === 0, // first detected is tentatively primary
        altText: alt ? alt.trim() : undefined,
        caption: caption ? caption.trim() : undefined,
        credit: credit ? credit.trim() : undefined,
        width,
        height,
        retrievedAt: now,
        relevanceScore: 0.50, // default neutral, evaluated in validation stage
        metadata: {
          sourceTag: tag,
          license: license || undefined,
        },
      });
    };

    // 1. OpenGraph Images: <meta property="og:image" content="...">
    const ogImageMatches = html.matchAll(/<meta\s+[^>]*property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["'][^>]*>/gi);
    for (const match of ogImageMatches) {
      if (match[1]) addCandidate(match[1], 'og:image');
    }
    // Also check name="og:image" variation
    const ogNameMatches = html.matchAll(/<meta\s+[^>]*name=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi);
    for (const match of ogNameMatches) {
      if (match[1]) addCandidate(match[1], 'og:image');
    }

    // 2. Twitter Card Images: <meta name="twitter:image" content="...">
    const twitterMatches = html.matchAll(/<meta\s+[^>]*name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["'][^>]*>/gi);
    for (const match of twitterMatches) {
      if (match[1]) addCandidate(match[1], 'twitter:image');
    }

    // 3. JSON-LD Structured Data: <script type="application/ld+json">
    const jsonLdMatches = html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const parseItem = (item: any) => {
          if (!item) return;
          if (typeof item.image === 'string') {
            addCandidate(item.image, 'json-ld');
          } else if (Array.isArray(item.image)) {
            for (const img of item.image) {
              if (typeof img === 'string') addCandidate(img, 'json-ld');
              else if (img?.url) addCandidate(img.url, 'json-ld', img.caption);
            }
          } else if (item.image?.url) {
            addCandidate(item.image.url, 'json-ld', item.image.caption, item.image.caption, item.image.author?.name);
          }
          if (typeof item.thumbnailUrl === 'string') {
            addCandidate(item.thumbnailUrl, 'json-ld');
          }
        };

        if (Array.isArray(parsed)) {
          parsed.forEach(parseItem);
        } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          parsed['@graph'].forEach(parseItem);
        } else {
          parseItem(parsed);
        }
      } catch {
        // Gracefully ignore JSON-LD parse errors
      }
    }

    // 4. Article Hero Image from DOM: <article> or <figure>
    const figureMatches = html.matchAll(/<figure[^>]*>[\s\S]*?<img\s+[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>[\s\S]*?(?:<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?[\s\S]*?<\/figure>/gi);
    for (const match of figureMatches) {
      const src = match[1];
      const alt = match[2];
      const figcaption = match[3] ? match[3].replace(/<[^>]+>/g, '').trim() : undefined;
      if (src) addCandidate(src, 'hero', alt, figcaption);
    }

    return candidates;
  }

  /**
   * Extracts candidates from RSS / Atom feed item media extensions.
   */
  public extractFromFeedItem(
    item: any,
    context: {
      sourceUrl?: string;
      sourceName?: string;
      sourceType?: ImageSourceType;
      storyId?: string;
    } = {}
  ): ImageCandidate[] {
    const candidates: ImageCandidate[] = [];
    const seen = new Set<string>();
    const now = new Date().toISOString();

    const add = (url: string, tag: string, credit?: string) => {
      const resolved = this.resolveUrl(url, context.sourceUrl);
      if (!resolved || seen.has(resolved)) return;
      seen.add(resolved);

      candidates.push({
        id: `cand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        storyId: context.storyId,
        sourceUrl: context.sourceUrl,
        originalUrl: resolved,
        sourceName: context.sourceName,
        sourceType: context.sourceType || 'publisher',
        rightsStatus: 'unknown',
        provenanceStatus: 'partially_verified',
        validationStatus: 'candidate',
        isIllustrative: false,
        isPrimary: candidates.length === 0,
        retrievedAt: now,
        credit,
        relevanceScore: 0.60,
        metadata: { sourceTag: tag },
      });
    };

    if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
      add(item.enclosure.url, 'enclosure');
    }
    if (item['media:content']?.url) {
      add(item['media:content'].url, 'media:content', item['media:credit']);
    }
    if (item['media:thumbnail']?.url) {
      add(item['media:thumbnail'].url, 'media:thumbnail');
    }

    return candidates;
  }
}
