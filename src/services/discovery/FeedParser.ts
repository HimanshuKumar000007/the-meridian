/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { XMLParser } from 'fast-xml-parser';
import type { RawParsedItem } from '../../types/discovery';

/**
 * Strips dangerous HTML markup and scripts from feed values.
 */
export function sanitizeFeedText(raw: any): string {
  if (raw === null || raw === undefined) return '';

  let text = typeof raw === 'string' ? raw : String(raw);

  // If object contains CDATA property
  if (typeof raw === 'object' && raw.__cdata) {
    text = String(raw.__cdata);
  }

  // Strip scripts, iframes, and dangerous tags
  text = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '') // remove inline event handlers
    .replace(/javascript\s*:/gi, '');

  // Strip remaining HTML tags for plain text summaries/titles
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Extracts first image URL from feed item media tags, enclosures, or content.
 */
function extractImageUrl(item: any): string | null {
  // 1. media:content (single or array)
  const mediaContent = item['media:content'] || item.mediaContent;
  if (mediaContent) {
    if (Array.isArray(mediaContent) && mediaContent[0]?.['@_url']) {
      return mediaContent[0]['@_url'];
    }
    if (mediaContent['@_url']) {
      return mediaContent['@_url'];
    }
  }

  // 2. media:thumbnail
  const mediaThumb = item['media:thumbnail'] || item.mediaThumbnail;
  if (mediaThumb) {
    if (Array.isArray(mediaThumb) && mediaThumb[0]?.['@_url']) {
      return mediaThumb[0]['@_url'];
    }
    if (mediaThumb['@_url']) {
      return mediaThumb['@_url'];
    }
  }

  // 3. enclosure (with image MIME type)
  const enclosure = item.enclosure;
  if (enclosure) {
    const url = enclosure['@_url'];
    const type = enclosure['@_type'] || '';
    if (url && (type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif)/i.test(url))) {
      return url;
    }
  }

  // 4. Fallback search inside description / content:encoded for <img src="...">
  const rawHtml = item['content:encoded'] || item.content || item.description || '';
  if (typeof rawHtml === 'string') {
    const imgMatch = rawHtml.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  return null;
}

/**
 * Resolves link property from varied RSS / Atom structures.
 */
function extractLink(rawLink: any): string {
  if (!rawLink) return '';

  if (typeof rawLink === 'string') return rawLink.trim();

  // Atom link tag with attributes: <link rel="alternate" href="..." />
  if (Array.isArray(rawLink)) {
    // Look for rel="alternate" or first with @_href
    const altLink = rawLink.find((l) => l['@_rel'] === 'alternate' && l['@_href']);
    if (altLink && altLink['@_href']) return String(altLink['@_href']).trim();

    const anyHref = rawLink.find((l) => l['@_href']);
    if (anyHref && anyHref['@_href']) return String(anyHref['@_href']).trim();
  }

  if (typeof rawLink === 'object' && rawLink['@_href']) {
    return String(rawLink['@_href']).trim();
  }

  return '';
}

/**
 * Resolves author name from author objects or strings.
 */
function extractAuthor(item: any): string | null {
  const authorField = item.author || item['dc:creator'] || item.creator;
  if (!authorField) return null;

  if (typeof authorField === 'string') {
    return sanitizeFeedText(authorField);
  }

  if (typeof authorField === 'object') {
    if (authorField.name) return sanitizeFeedText(authorField.name);
    if (authorField['#text']) return sanitizeFeedText(authorField['#text']);
  }

  if (Array.isArray(authorField) && authorField[0]) {
    return extractAuthor({ author: authorField[0] });
  }

  return null;
}

/**
 * Universal Feed Parser supporting RSS 2.0 and Atom 1.0 specifications.
 */
export class FeedParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
      parseTagValue: false, // keep raw string values to preserve date formats
      cdataPropName: '__cdata',
    });
  }

  /**
   * Parses XML feed string into normalized raw item representations.
   */
  public parse(xmlContent: string): RawParsedItem[] {
    if (!xmlContent || typeof xmlContent !== 'string' || xmlContent.trim() === '') {
      return [];
    }

    try {
      const parsed = this.parser.parse(xmlContent);

      // Check for RSS 2.0 / RSS 1.0 (<rss><channel><item> or <rdf:RDF><item>)
      if (parsed.rss?.channel?.item || parsed['rdf:RDF']?.item) {
        const rawItems = parsed.rss?.channel?.item || parsed['rdf:RDF']?.item;
        return this.parseRssItems(rawItems);
      }

      // Check for Atom 1.0 (<feed><entry>)
      if (parsed.feed?.entry) {
        return this.parseAtomEntries(parsed.feed.entry);
      }

      // Check alternative feed wrapper
      if (parsed.feed?.item) {
        return this.parseRssItems(parsed.feed.item);
      }

      return [];
    } catch (err: any) {
      console.warn('[FeedParser] Failed to parse XML feed:', err?.message || err);
      return [];
    }
  }

  private parseRssItems(rawItems: any): RawParsedItem[] {
    const list = Array.isArray(rawItems) ? rawItems : [rawItems];
    const results: RawParsedItem[] = [];

    for (const item of list) {
      if (!item || typeof item !== 'object') continue;

      const title = sanitizeFeedText(item.title);
      const link = extractLink(item.link);
      const guid = item.guid
        ? (typeof item.guid === 'object' ? item.guid['#text'] || item.guid.__cdata : String(item.guid))
        : undefined;

      const description = sanitizeFeedText(
        item['content:encoded'] || item.description || ''
      );

      const pubDate = item.pubDate || item['dc:date'] || item.date;
      const updatedDate = item['atom:updated'] || item.lastBuildDate;
      const author = extractAuthor(item);
      const imageUrl = extractImageUrl(item);

      // Categories
      const catField = item.category;
      let categories: string[] = [];
      if (catField) {
        if (Array.isArray(catField)) {
          categories = catField.map((c) => sanitizeFeedText(typeof c === 'object' ? c['#text'] : c)).filter(Boolean);
        } else {
          const single = sanitizeFeedText(typeof catField === 'object' ? catField['#text'] : catField);
          if (single) categories = [single];
        }
      }

      if (title || link) {
        results.push({
          title,
          link,
          guid: guid ? String(guid).trim() : undefined,
          description: description || undefined,
          pubDate: pubDate ? String(pubDate).trim() : undefined,
          updatedDate: updatedDate ? String(updatedDate).trim() : undefined,
          author: author || undefined,
          imageUrl: imageUrl || undefined,
          categories,
          raw: item,
        });
      }
    }

    return results;
  }

  private parseAtomEntries(rawEntries: any): RawParsedItem[] {
    const list = Array.isArray(rawEntries) ? rawEntries : [rawEntries];
    const results: RawParsedItem[] = [];

    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;

      const title = sanitizeFeedText(entry.title);
      const link = extractLink(entry.link);
      const guid = entry.id ? String(entry.id).trim() : undefined;

      const description = sanitizeFeedText(
        entry.content || entry.summary || ''
      );

      const pubDate = entry.published || entry.issued;
      const updatedDate = entry.updated;
      const author = extractAuthor(entry);
      const imageUrl = extractImageUrl(entry);

      // Categories
      const catField = entry.category;
      let categories: string[] = [];
      if (catField) {
        if (Array.isArray(catField)) {
          categories = catField
            .map((c) => (c['@_term'] ? String(c['@_term']) : sanitizeFeedText(c['#text'] || c)))
            .filter(Boolean);
        } else {
          const val = catField['@_term'] ? String(catField['@_term']) : sanitizeFeedText(catField['#text'] || catField);
          if (val) categories = [val];
        }
      }

      if (title || link) {
        results.push({
          title,
          link,
          guid,
          description: description || undefined,
          pubDate: pubDate ? String(pubDate).trim() : undefined,
          updatedDate: updatedDate ? String(updatedDate).trim() : undefined,
          author: author || undefined,
          imageUrl: imageUrl || undefined,
          categories,
          raw: entry,
        });
      }
    }

    return results;
  }
}
