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

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
const DEFAULT_MAX_CHARACTERS = 15000; // ~3000 words max context for LLM
const DEFAULT_USER_AGENT = 'TheMeridian/1.0 (+https://themeridian.news; bot)';

/**
 * Universal Source Content Acquisition & HTML Sanitizer Service.
 * Safely fetches source URLs, strips boilerplate/markup, and extracts clean article text.
 */
export class SourceContentAcquisitionService {
  private timeoutMs: number;
  private maxSizeBytes: number;
  private maxCharacters: number;
  private userAgent: string;

  constructor(options: AcquisitionOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    this.maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHARACTERS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  /**
   * Acquire clean content for a given discovery candidate.
   * If remote fetching fails or returns paywalled/unreachable content,
   * falls back gracefully to the discovery item's metadata.
   */
  public async acquireContent(item: DiscoveryItem): Promise<AcquiredSourceContent> {
    const startTime = Date.now();
    const targetUrl = item.canonicalUrl || item.sourceUrl;

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return this.buildFallbackContent(item, 'Missing or invalid URL', Date.now() - startTime);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        return this.buildFallbackContent(
          item,
          `HTTP ${response.status} ${response.statusText}`,
          durationMs,
          response.status
        );
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

      // Check Content-Length header if provided
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > this.maxSizeBytes) {
        return this.buildFallbackContent(
          item,
          `Response exceeded size limit (${contentLengthHeader} bytes)`,
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

      // If extracted text is too sparse, combine with discovery item description
      if (extracted.articleText.length < 150 && item.description && item.description.length > 50) {
        extracted.articleText = `${item.title}\n\n${item.description}\n\n${extracted.articleText}`.trim();
      }

      const wordCount = extracted.articleText.split(/\s+/).filter(Boolean).length;
      const isTruncated = extracted.articleText.length > this.maxCharacters;
      const finalArticleText = isTruncated
        ? extracted.articleText.slice(0, this.maxCharacters)
        : extracted.articleText;

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
        fetchStatus: finalArticleText.length >= 100 ? 'success' : 'fallback_metadata',
        statusCode: response.status,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      const errorMsg = isTimeout ? `Request timed out after ${this.timeoutMs}ms` : err.message || 'Fetch failed';

      return this.buildFallbackContent(item, errorMsg, durationMs);
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
      // Filter out tiny snippets, buttons, copyright notices, tracking labels
      if (
        cleanBlock.length >= 35 &&
        !/cookie|subscribe|sign in|all rights reserved|privacy policy|terms of service|share on/i.test(cleanBlock)
      ) {
        extractedParagraphs.push(cleanBlock);
      }
    }

    let articleText = extractedParagraphs.join('\n\n');
    if (!articleText || articleText.length < 100) {
      // Fallback: strip all tags from bodyContent
      const fallbackClean = this.cleanText(bodyContent.replace(/<[^>]+>/g, ' '));
      if (fallbackClean.length > 50) {
        articleText = fallbackClean;
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
    statusCode?: number
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
      fetchStatus: articleText.length >= 80 ? 'fallback_metadata' : 'insufficient_input',
      statusCode,
      durationMs,
      error: errorReason,
    };
  }
}
