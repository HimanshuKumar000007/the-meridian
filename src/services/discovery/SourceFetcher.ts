/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsSource, SourceFetchResult } from '../../types/discovery';

export interface FetcherOptions {
  timeoutMs?: number;
  maxRetries?: number;
  maxSizeBytes?: number;
  userAgent?: string;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max feed size
const DEFAULT_USER_AGENT = 'TheMeridianBot/1.0 (+https://themeridian.news/compliance; news-discovery)';

/**
 * Universal Source Fetcher with timeouts, retries, exponential backoff,
 * bounded payload size, and conditional HTTP caching (ETag / Last-Modified).
 */
export class SourceFetcher {
  private timeoutMs: number;
  private maxRetries: number;
  private maxSizeBytes: number;
  private userAgent: string;

  constructor(options: FetcherOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  /**
   * Fetches the feed for a given source safely.
   */
  public async fetchSource(source: NewsSource): Promise<SourceFetchResult> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError = '';

    while (attempt <= this.maxRetries) {
      attempt++;
      try {
        const result = await this.performSingleFetch(source);
        return {
          ...result,
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        lastError = err?.message || String(err);

        // Do not retry on 404, 401, 403, or client abort
        if (err?.name === 'AbortError') {
          lastError = `Request timed out after ${this.timeoutMs}ms`;
        }

        if (attempt <= this.maxRetries) {
          // Exponential backoff: 300ms, 600ms
          const backoffMs = 300 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    return {
      status: 'failure',
      error: lastError || 'Unknown fetch error after retries',
      durationMs: Date.now() - startTime,
    };
  }

  private async performSingleFetch(source: NewsSource): Promise<Omit<SourceFetchResult, 'durationMs'>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain;q=0.9, */*;q=0.8',
    };

    // Conditional HTTP caching headers if available
    if (source.etag) {
      headers['If-None-Match'] = source.etag;
    }
    if (source.lastModified) {
      headers['If-Modified-Since'] = source.lastModified;
    }

    try {
      const response = await fetch(source.feedUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      // Handle 304 Not Modified
      if (response.status === 304) {
        return {
          status: 'not_modified',
          statusCode: 304,
          etag: response.headers.get('etag') || source.etag,
          lastModified: response.headers.get('last-modified') || source.lastModified,
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      // Check Content-Length if present
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > this.maxSizeBytes) {
        throw new Error(`Feed response exceeded size limit of ${this.maxSizeBytes} bytes`);
      }

      const bodyText = await response.text();
      if (bodyText.length > this.maxSizeBytes) {
        throw new Error(`Feed body exceeded size limit of ${this.maxSizeBytes} bytes`);
      }

      return {
        status: 'success',
        statusCode: response.status,
        body: bodyText,
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
