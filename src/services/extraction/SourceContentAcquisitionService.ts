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
  /** Timeout for source recovery when RSS text is short (< DEEP_RECOVERY_THRESHOLD_CHARS). Default: 8000ms. */
  sourceRecoveryTimeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
const DEFAULT_MAX_CHARACTERS = 15000; // ~3000 words max context for LLM
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Minimum combined RSS+title character count for "immediately sufficient" source text.
 * Items below this threshold will attempt bounded source recovery (deep fetch) even if
 * they exceed the bare minimum of 120 chars.
 *
 * Rationale: Items with only 120–799 chars (~20–130 words) give the LLM too little
 * material to produce a factual 700-word article without fabrication. Source recovery
 * provides the full article body, reducing NVIDIA inference time and improving quality.
 *
 * Items >= 800 chars (roughly 130+ words) skip source recovery as they carry enough
 * context for a complete extraction without a network round-trip.
 */
const DEEP_RECOVERY_THRESHOLD_CHARS = 800;

/**
 * Default timeout for the bounded source recovery fetch (separate from the main timeout).
 * Must leave sufficient budget for NVIDIA extraction + downstream stages.
 * Budget allocation (90s orchestrator):
 *   - Discovery: ~10s
 *   - Source recovery: <= 8s  ← this timeout
 *   - NVIDIA extraction: <= 35s
 *   - Validation + lifecycle + margin: ~35s
 */
const DEFAULT_SOURCE_RECOVERY_TIMEOUT_MS = 8000;

/**
 * Universal Source Content Acquisition & HTML Sanitizer Service.
 * Safely fetches source URLs, strips boilerplate/markup, and extracts clean article text.
 * Implements Deep Source Recovery for short RSS items.
 */
export class SourceContentAcquisitionService {
  private timeoutMs: number;
  private sourceRecoveryTimeoutMs: number;
  private maxSizeBytes: number;
  private maxCharacters: number;
  private userAgent: string;
  private fetchCache = new Map<string, Promise<AcquiredSourceContent>>();

  constructor(options: AcquisitionOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.sourceRecoveryTimeoutMs = options.sourceRecoveryTimeoutMs ?? DEFAULT_SOURCE_RECOVERY_TIMEOUT_MS;
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
   *    If >= DEEP_RECOVERY_THRESHOLD_CHARS (800) → return existing metadata immediately.
   *       These items carry enough context for full NVIDIA extraction without a network round-trip.
   *    If >= 120 but < DEEP_RECOVERY_THRESHOLD_CHARS → attempt bounded source recovery with
   *       sourceRecoveryTimeoutMs budget. If recovery yields richer text → use it.
   *       If recovery is too slow, blocked, or fails → fall back to existing RSS text safely.
   *       EXCEPTION: if the RSS text ends with a paywall/truncation sentinel ("Read more" etc.)
   *       AND recovery also fails → return fetchStatus='blocked' so ExtractionEngine can
   *       dead-letter immediately without a NVIDIA call (saves one wasted orchestrator window).
   *    If < 120 chars → Deep Source Recovery (existing behavior).
   *       If deep fetch succeeds and yields substantive text (>= 120 chars) → enrich.
   *       If deep fetch fails, times out, or is blocked → retain safe fallback metadata (< 120 chars).
   *
   * SAFETY INVARIANTS:
   * - Never bypasses robots.txt, CAPTCHA, authentication, or paywalls
   * - Never invents or replaces content
   * - All recovery attempts have hard timeouts via AbortController
   * - Source recovery timeout is bounded to leave adequate budget for NVIDIA extraction
   */
  public async acquireContent(item: DiscoveryItem): Promise<AcquiredSourceContent> {
    const startTime = Date.now();
    const existingRaw = (item.description || (item.rawPayload as any)?.content || '').trim();
    const existingCombined = [item.title, existingRaw].filter(Boolean).join('\n\n').trim();

    /**
     * Gated-source detection: identify RSS items whose content is deliberately truncated
     * by the publisher's feed. These items end with a paywall/truncation sentinel phrase
     * and will never yield a full article from the RSS metadata alone.
     *
     * Common sentinels: "Read more", "Continue reading", "… [Read more]", "Read the full article"
     * When detected AND recovery also fails → return fetchStatus='blocked' so the extraction
     * engine can dead-letter without wasting the NVIDIA API budget.
     *
     * Only applied to items < 800 chars (Tier 1 items are already substantive enough).
     */
    // Paywalled publishers that trigger anti-scraping blocks or LLM copyright refusals
    const PAYWALLED_DOMAINS = /(?:nytimes\.com|nyt\.com|wsj\.com|bloomberg\.com|ft\.com)/i;
    const isPaywalledDomain = PAYWALLED_DOMAINS.test(item.canonicalUrl || item.sourceUrl || item.sourceSlug || '');

    if (isPaywalledDomain) {
      return {
        url: item.sourceUrl,
        canonicalUrl: item.canonicalUrl || item.sourceUrl,
        title: item.title,
        description: item.description || '',
        author: item.author || null,
        heroImage: item.imageUrl || null,
        publishedDate: item.publishedAt || null,
        articleText: '',
        wordCount: 0,
        isTruncated: true,
        fetchStatus: 'blocked',
        statusCode: 403,
        durationMs: 0,
        error: 'SOURCE_PAYWALLED: Domain disallowed by copyright syndication policy',
      };
    }

    const GATED_SENTINELS = /(?:read\s+more|continue\s+reading|read\s+the\s+full\s+(?:article|story|post)|more\s+at\s+\S+|subscribe\s+to\s+read|sign\s+in\s+to\s+read|click\s+to\s+read|\.{3,}\s*$|\[\.\.\.\]|…)$/i;
    const isGatedSource =
      existingCombined.length < DEEP_RECOVERY_THRESHOLD_CHARS &&
      GATED_SENTINELS.test(existingRaw.trim());

    // TIER 1: RSS text is fully sufficient (>= 800 chars / ~130+ words) → skip remote fetch
    if (existingCombined.length >= DEEP_RECOVERY_THRESHOLD_CHARS) {
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

    // TIER 2: RSS text is short (120–799 chars) → attempt bounded enrichment fetch
    // Goal: recover full article text to improve NVIDIA extraction quality and reduce inference time.
    // If recovery fails/times out, fall back safely to existing RSS text.
    // If item is a gated source AND recovery fails → return 'blocked' for immediate dead-letter.
    if (existingCombined.length >= 120) {

      const targetUrl = item.canonicalUrl || item.sourceUrl;

      // Security: validate URL before any fetch attempt
      if (!this.isSafeUrl(targetUrl)) {
        // URL is unsafe → return existing sufficient RSS text with security note
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
          error: 'SOURCE_RECOVERY_SKIPPED: URL_BLOCKED_UNSAFE — falling back to RSS text',
        };
      }

      // Attempt bounded enrichment fetch with sourceRecoveryTimeoutMs budget
      const cacheKey = `enrich:${targetUrl}`;
      if (this.fetchCache.has(cacheKey)) {
        return this.fetchCache.get(cacheKey)!;
      }

      const enrichPromise = this.performBoundedEnrichmentFetch(
        item,
        targetUrl,
        existingCombined,
        startTime,
        isGatedSource
      );
      this.fetchCache.set(cacheKey, enrichPromise);
      return enrichPromise;

    }

    // TIER 3: RSS text is very short (< 120 chars) → Deep Source Recovery (existing behavior)
    const targetUrl = item.canonicalUrl || item.sourceUrl;

    // Check if target URL is safe (TEST CASE 8: malicious/unsafe URL → blocked)
    if (!this.isSafeUrl(targetUrl)) {
      return this.buildFallbackContent(
        item,
        'URL_BLOCKED_UNSAFE: Target URL disallowed by security policy',
        Date.now() - startTime,
        400,
        'fallback_metadata'
      );
    }

    // Deduplication check (TEST CASE 7: duplicate fetch attempt → deduplicated)
    if (this.fetchCache.has(targetUrl)) {
      return this.fetchCache.get(targetUrl)!;
    }

    const fetchPromise = this.performDeepFetch(item, targetUrl, startTime);
    this.fetchCache.set(targetUrl, fetchPromise);
    return fetchPromise;
  }

  /**
   * Bounded enrichment fetch for Tier 2 items (120–799 chars of RSS text).
   * Uses sourceRecoveryTimeoutMs to cap the fetch. If successful and yields more text
   * than the existing RSS snippet, the enriched content is returned. Otherwise the
   * existing RSS text is returned as a safe fallback.
   *
   * @param isGatedSource - When true (RSS ends with "Read more" etc.), failed recovery returns
   *   fetchStatus='blocked' so ExtractionEngine can dead-letter in 1 attempt without a NVIDIA call.
   *   When false, failed recovery returns fetchStatus='sufficient_metadata' (safe fallback).
   *
   * This path never discards existing sufficient content — it only enriches.
   */
  private async performBoundedEnrichmentFetch(
    item: DiscoveryItem,
    targetUrl: string,
    existingText: string,
    startTime: number,
    isGatedSource: boolean = false
  ): Promise<AcquiredSourceContent> {
    const failStatus = isGatedSource ? 'blocked' : 'sufficient_metadata';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.sourceRecoveryTimeoutMs);

    try {
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
      const recoveryDurationMs = Date.now() - startTime;

      if (!response.ok) {
        // Recovery blocked or unavailable → fallback (blocked if gated, sufficient_metadata otherwise)
        const wordCount = existingText.split(/\s+/).filter(Boolean).length;
        return {
          url: item.sourceUrl,
          canonicalUrl: item.canonicalUrl || item.sourceUrl,
          title: item.title,
          description: item.description || '',
          author: item.author || null,
          heroImage: item.imageUrl || null,
          publishedDate: item.publishedAt || null,
          articleText: existingText,
          wordCount,
          isTruncated: false,
          fetchStatus: failStatus,
          statusCode: response.status,
          durationMs: recoveryDurationMs,
          error: `SOURCE_RECOVERY_FAILED: HTTP ${response.status}${isGatedSource ? ' (gated source — content_gated)' : ' — using existing RSS text'}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('xml')) {
        // Unsupported content type → fallback
        const wordCount = existingText.split(/\s+/).filter(Boolean).length;
        return {
          url: item.sourceUrl,
          canonicalUrl: item.canonicalUrl || item.sourceUrl,
          title: item.title,
          description: item.description || '',
          author: item.author || null,
          heroImage: item.imageUrl || null,
          publishedDate: item.publishedAt || null,
          articleText: existingText,
          wordCount,
          isTruncated: false,
          fetchStatus: failStatus,
          statusCode: response.status,
          durationMs: recoveryDurationMs,
          error: `SOURCE_RECOVERY_FAILED: Unsupported Content-Type ${contentType}${isGatedSource ? ' (gated source)' : ' — using existing RSS text'}`,
        };
      }

      const rawHtml = await response.text();
      if (rawHtml.length > this.maxSizeBytes) {
        // Oversized response → fallback
        const wordCount = existingText.split(/\s+/).filter(Boolean).length;
        return {
          url: item.sourceUrl,
          canonicalUrl: item.canonicalUrl || item.sourceUrl,
          title: item.title,
          description: item.description || '',
          author: item.author || null,
          heroImage: item.imageUrl || null,
          publishedDate: item.publishedAt || null,
          articleText: existingText,
          wordCount,
          isTruncated: false,
          fetchStatus: failStatus,
          statusCode: response.status,
          durationMs: recoveryDurationMs,
          error: `SOURCE_RECOVERY_FAILED: Response too large (${rawHtml.length} bytes)${isGatedSource ? ' (gated source)' : ' — using existing RSS text'}`,
        };
      }

      const extracted = this.extractAndCleanHtml(rawHtml, targetUrl);

      // Detect anti-bot / CAPTCHA / access-denied responses
      const isUnusable =
        !extracted.articleText ||
        extracted.articleText.length < 50 ||
        /access denied|please enable javascript|404 not found|sign in to read|blocked by security|robot check/i.test(
          extracted.articleText.slice(0, 200)
        );

      if (isUnusable) {
        // Anti-bot / CAPTCHA / empty → fallback
        const wordCount = existingText.split(/\s+/).filter(Boolean).length;
        return {
          url: item.sourceUrl,
          canonicalUrl: item.canonicalUrl || item.sourceUrl,
          title: item.title,
          description: item.description || '',
          author: item.author || null,
          heroImage: item.imageUrl || null,
          publishedDate: item.publishedAt || null,
          articleText: existingText,
          wordCount,
          isTruncated: false,
          fetchStatus: failStatus,
          statusCode: response.status,
          durationMs: recoveryDurationMs,
          error: `SOURCE_RECOVERY_FAILED: UNRELATED_OR_EMPTY_HTML${isGatedSource ? ' (gated source — CAPTCHA or JS gate)' : ' — using existing RSS text'}`,
        };
      }

      // Enrichment succeeded — prefer recovered text if it's richer than existing RSS snippet
      let fullArticleText = extracted.articleText;
      if (item.title && !fullArticleText.includes(item.title)) {
        fullArticleText = `${item.title}\n\n${fullArticleText}`;
      }

      // If recovered text is not meaningfully richer, keep existing text
      if (fullArticleText.length <= existingText.length) {
        const wordCount = existingText.split(/\s+/).filter(Boolean).length;
        return {
          url: item.sourceUrl,
          canonicalUrl: extracted.canonicalUrl || targetUrl,
          title: extracted.title || item.title,
          description: extracted.description || item.description || '',
          author: extracted.author || item.author || null,
          heroImage: extracted.heroImage || item.imageUrl || null,
          publishedDate: extracted.publishedDate || item.publishedAt || null,
          articleText: existingText,
          wordCount,
          isTruncated: false,
          // If gated and recovered text is not richer, treat as blocked — the source is confirmed gated
          fetchStatus: isGatedSource ? 'blocked' : 'sufficient_metadata',
          statusCode: response.status,
          durationMs: recoveryDurationMs,
          error: isGatedSource
            ? 'SOURCE_RECOVERY_FAILED: Recovered text not richer (gated source — confirmed truncated feed)'
            : 'SOURCE_RECOVERY_SKIPPED: Recovered text not richer than RSS — using RSS text',
        };
      }

      const isTruncated = fullArticleText.length > this.maxCharacters;
      const finalArticleText = isTruncated ? fullArticleText.slice(0, this.maxCharacters) : fullArticleText;
      const wordCount = finalArticleText.split(/\s+/).filter(Boolean).length;

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
        fetchStatus: 'deep_fetch_success',
        statusCode: response.status,
        durationMs: recoveryDurationMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const recoveryDurationMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');

      // Recovery timed out or network failure → fallback
      const wordCount = existingText.split(/\s+/).filter(Boolean).length;
      return {
        url: item.sourceUrl,
        canonicalUrl: item.canonicalUrl || item.sourceUrl,
        title: item.title,
        description: item.description || '',
        author: item.author || null,
        heroImage: item.imageUrl || null,
        publishedDate: item.publishedAt || null,
        articleText: existingText,
        wordCount,
        isTruncated: false,
        fetchStatus: isGatedSource ? 'blocked' : 'sufficient_metadata',
        statusCode: isTimeout ? 408 : undefined,
        durationMs: recoveryDurationMs,
        error: isTimeout
          ? `SOURCE_RECOVERY_TIMEOUT: Bounded fetch timed out after ${this.sourceRecoveryTimeoutMs}ms${isGatedSource ? ' (gated source)' : ' — using existing RSS text'}`
          : `SOURCE_RECOVERY_FAILED: ${err.message || 'Network error'}${isGatedSource ? ' (gated source)' : ' — using existing RSS text'}`,
      };
    }
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
