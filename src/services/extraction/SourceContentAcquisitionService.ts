/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DiscoveryItem } from '../../types/discovery';
import type { AcquiredSourceContent } from '../../types/extraction';

export interface AcquisitionOptions {
  timeoutMs?: number;
  maxSizeBytes?: number;
  maxCharacters?: number;
  userAgent?: string;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
const DEFAULT_MAX_CHARACTERS = 15000; // ~3000 words max context for LLM
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Universal Source Content Acquisition & HTML Sanitizer Service.
 * Safely fetches source URLs, strips boilerplate/markup, and extracts clean article text.
 * Implements Deep Source Recovery for short RSS items.
 */
export class SourceContentAcquisitionService {
  private timeoutMs: number;
  private maxSizeBytes: number;
  private maxCharacters: number;
  private userAgent: string;
  private fetchCache = new Map<string, Promise<AcquiredSourceContent>>();

  constructor(options: AcquisitionOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    this.maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHARACTERS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  /**
   * Clear the in-memory URL deduplication cache.
   */
  public clearCache(): void {
    this.fetchCache.clear();
  }

  /**
   * Validates target URL against SSRF and unsafe schemes/targets.
   */
  public isSafeUrl(targetUrl?: string): boolean {
    if (!targetUrl || typeof targetUrl !== 'string') return false;
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      const hostname = parsed.hostname.toLowerCase();

      // Block localhost, link-local, loopback, internal domains
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.lan') ||
        hostname.endsWith('.corp') ||
        hostname.endsWith('.onion')
      ) {
        return false;
      }

      // Check IPv4 private/reserved ranges
      const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (ipv4Match) {
        const [_, a, b] = ipv4Match.map(Number);
        if (a === 10) return false;
        if (a === 127) return false;
        if (a === 169 && b === 254) return false;
        if (a === 192 && b === 168) return false;
        if (a === 172 && b >= 16 && b <= 31) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Acquire clean content for a given discovery candidate.
   * Flow:
   * 1. Check existing source text length:
   *    If >= 120 chars -> return existing metadata immediately (no extra fetch).
   * 2. If < 120 chars -> attempt deep fetch of original article.
   *    If deep fetch succeeds and yields substantive text (>= 120 chars) -> enrich.
   *    If deep fetch fails, times out, or is blocked -> retain safe fallback metadata (< 120 chars).
   */
  public async acquireContent(item: DiscoveryItem): Promise<AcquiredSourceContent> {
    const startTime = Date.now();
    const existingRaw = (item.description || (item.rawPayload as any)?.content || '').trim();
    const existingCombined = [item.title, existingRaw].filter(Boolean).join('\n\n').trim();

    // 1. If RSS text is already sufficient (>= 120 chars), skip remote fetch
    // TEST CASE 1: RSS text >= 120 -> no extra fetch required
    if (existingCombined.length >= 120) {
      const wordCount = existingCombined.split(/\s+/).filter(Boolean).length;
      return {
        url: item.sourceUrl,
        canonicalUrl: item.canonicalUrl || item.sourceUrl,
        title: item.title,
        description: item.description || '',
        author: item.author || null,
        heroImage: item.imageUrl || null,
        publishedDate: item.publishedAt || null,
        articleText: existingCombined,
        wordCount,
        isTruncated: false,
        fetchStatus: 'sufficient_metadata',
        statusCode: 200,
        durationMs: 0,
      };
    }

    // 2. RSS text is short (< 120 chars) -> Deep Source Recovery
    const targetUrl = item.canonicalUrl || item.sourceUrl;

    // Check if target URL is safe (TEST CASE 8: malicious/unsafe URL -> blocked)
    if (!this.isSafeUrl(targetUrl)) {
      return this.buildFallbackContent(
        item,
        'URL_BLOCKED_UNSAFE: Target URL disallowed by security policy',
        Date.now() - startTime,
        400,
        'fallback_metadata'
      );
    }

    // Deduplication check (TEST CASE 7: duplicate fetch attempt -> deduplicated)
    if (this.fetchCache.has(targetUrl)) {
      return this.fetchCache.get(targetUrl)!;
    }

    const fetchPromise = this.performDeepFetch(item, targetUrl, startTime);
    this.fetchCache.set(targetUrl, fetchPromise);
    return fetchPromise;
  }

  private async performDeepFetch(
    item: DiscoveryItem,
    targetUrl: string,
    startTime: number
  ): Promise<AcquiredSourceContent> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Mode': 'navigate',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        // TEST CASE 4: RSS text < 120 + source blocked
        // TEST CASE 3: RSS text < 120 + source unavailable
        const isBlocked = response.status === 401 || response.status === 403;
        const errorReason = isBlocked
          ? `SOURCE_BLOCKED: HTTP ${response.status} ${response.statusText}`
          : `SOURCE_UNAVAILABLE: HTTP ${response.status} ${response.statusText}`;

        return this.buildFallbackContent(item, errorReason, durationMs, response.status);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('xml')) {
        return this.buildFallbackContent(
          item,
          `Unsupported Content-Type: ${contentType}`,
          durationMs,
          response.status
        );
      }

      const rawHtml = await response.text();
      if (rawHtml.length > this.maxSizeBytes) {
        return this.buildFallbackContent(
          item,
          `Raw HTML size exceeded limit (${rawHtml.length} bytes)`,
          durationMs,
          response.status
        );
      }

      const extracted = this.extractAndCleanHtml(rawHtml, targetUrl);

      // TEST CASE 5: source returns unrelated / spam / empty HTML -> reject as unusable
      const isUnusable =
        !extracted.articleText ||
        extracted.articleText.length < 50 ||
        /access denied|please enable javascript|404 not found|sign in to read|blocked by security|robot check/i.test(
          extracted.articleText.slice(0, 200)
        );

      if (isUnusable) {
        return this.buildFallbackContent(
          item,
          'UNRELATED_OR_EMPTY_HTML: Source content unusable or missing',
          durationMs,
          response.status
        );
      }

      let fullArticleText = extracted.articleText;
      if (item.title && !fullArticleText.includes(item.title)) {
        fullArticleText = `${item.title}\n\n${fullArticleText}`;
      }

      const wordCount = fullArticleText.split(/\s+/).filter(Boolean).length;
      const isTruncated = fullArticleText.length > this.maxCharacters;
      const finalArticleText = isTruncated
        ? fullArticleText.slice(0, this.maxCharacters)
        : fullArticleText;

      // TEST CASE 2: RSS text < 120 + original article available -> sourceText becomes sufficient (>= 120)
      return {
        url: targetUrl,
        canonicalUrl: extracted.canonicalUrl || targetUrl,
        title: extracted.title || item.title,
        description: extracted.description || item.description || '',
        author: extracted.author || item.author || null,
        heroImage: extracted.heroImage || item.imageUrl || null,
        publishedDate: extracted.publishedDate || item.publishedAt || null,
        articleText: finalArticleText,
        wordCount,
        isTruncated,
        fetchStatus: finalArticleText.length >= 120 ? 'deep_fetch_success' : 'fallback_metadata',
        statusCode: response.status,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      // TEST CASE 6: source fetch timeout -> safe fallback
      const errorMsg = isTimeout
        ? `FETCH_TIMEOUT: Request timed out after ${this.timeoutMs}ms`
        : `FETCH_FAILED: ${err.message || 'Network error'}`;

      return this.buildFallbackContent(item, errorMsg, durationMs, isTimeout ? 408 : undefined);
    }
  }

  /**
   * Sanitizes raw HTML and extracts article text and metadata.
   */
  public extractAndCleanHtml(
    html: string,
    fallbackUrl: string
  ): {
    title: string;
    description: string;
    author: string | null;
    heroImage: string | null;
    publishedDate: string | null;
    canonicalUrl: string | null;
    articleText: string;
  } {
    // 1. Extract Metadata
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const finalTitle = ogTitleMatch ? this.cleanText(ogTitleMatch[1]) : title;

    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? this.cleanText(descMatch[1]) : '';

    const authorMatch =
      html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i);
    const author = authorMatch ? this.cleanText(authorMatch[1]) : null;

    const imgMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    const heroImage = imgMatch ? imgMatch[1].trim() : null;

    const pubDateMatch =
      html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*name=["']pubdate["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
    const publishedDate = pubDateMatch ? pubDateMatch[1].trim() : null;

    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : fallbackUrl;

    // Check JSON-LD articleBody if present
    let jsonLdArticleBody = '';
    try {
      const ldScripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
      for (const scriptTag of ldScripts) {
        const jsonContent = scriptTag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
        const data = JSON.parse(jsonContent);
        const candidates = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
        for (const itemObj of candidates) {
          if (
            itemObj &&
            typeof itemObj.articleBody === 'string' &&
            itemObj.articleBody.length >= 100
          ) {
            jsonLdArticleBody = this.cleanText(itemObj.articleBody);
            break;
          }
        }
        if (jsonLdArticleBody) break;
      }
    } catch {
      // JSON-LD parsing optional
    }

    // 2. Remove Unwanted Sections
    let cleaned = html
      // Remove head
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      // Remove navigational elements and menus
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      // Remove iframes and embedded media players
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      // Remove cookie consent banners and ad wrappers
      .replace(/<div[^>]*(?:cookie|consent|banner|newsletter|advert|ads-)[^>]*>[\s\S]*?<\/div>/gi, '');

    // 3. Prefer <article> or [role="main"] if present
    const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const bodyContent = articleMatch ? articleMatch[1] : (mainMatch ? mainMatch[1] : cleaned);

    // 4. Extract meaningful paragraphs, headings, and lists
    const blockMatches = bodyContent.match(/<(p|h1|h2|h3|h4|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi) || [];

    const extractedParagraphs: string[] = [];
    for (const block of blockMatches) {
      const cleanBlock = this.cleanText(block.replace(/<[^>]+>/g, ' '));
      // Filter out tiny snippets, buttons, copyright notices, tracking labels, navigation noise
      if (
        cleanBlock.length >= 35 &&
        !/cookie|subscribe|sign in|log in|all rights reserved|privacy policy|terms of (?:service|use)|share on|\(opens in a new window\)/i.test(
          cleanBlock
        )
      ) {
        extractedParagraphs.push(cleanBlock);
      }
    }

    let articleText = extractedParagraphs.join('\n\n');
    if (!articleText || articleText.length < 100) {
      if (jsonLdArticleBody && jsonLdArticleBody.length >= 100) {
        articleText = jsonLdArticleBody;
      } else {
        // Fallback: strip all tags from bodyContent
        const fallbackClean = this.cleanText(bodyContent.replace(/<[^>]+>/g, ' '));
        if (fallbackClean.length > 50) {
          articleText = fallbackClean;
        }
      }
    }

    return {
      title: finalTitle,
      description,
      author,
      heroImage,
      publishedDate,
      canonicalUrl,
      articleText,
    };
  }

  /**
   * Cleans text entities, replaces HTML escapes, and condenses whitespace.
   */
  private cleanText(raw: string): string {
    return raw
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, ' — ')
      .replace(/&ndash;/g, ' – ')
      .replace(/&nbsp;/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Builds fallback content from discovery candidate metadata when remote fetching fails.
   */
  private buildFallbackContent(
    item: DiscoveryItem,
    errorReason: string,
    durationMs: number,
    statusCode?: number,
    customStatus?: 'fallback_metadata' | 'insufficient_input' | 'blocked'
  ): AcquiredSourceContent {
    const articleText = [item.title, item.description].filter(Boolean).join('\n\n');
    const wordCount = articleText.split(/\s+/).filter(Boolean).length;

    return {
      url: item.sourceUrl,
      canonicalUrl: item.canonicalUrl || item.sourceUrl,
      title: item.title,
      description: item.description || '',
      author: item.author || null,
      heroImage: item.imageUrl || null,
      publishedDate: item.publishedAt || null,
      articleText,
      wordCount,
      isTruncated: false,
      fetchStatus:
        customStatus ||
        (articleText.length >= 80 ? 'fallback_metadata' : 'insufficient_input'),
      statusCode,
      durationMs,
      error: errorReason,
    };
  }
}
