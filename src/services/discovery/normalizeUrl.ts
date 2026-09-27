/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Common marketing and tracking query parameters to discard during canonicalization.
 */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'mc_eid',
  'mc_cid',
  '_ga',
  '_gl',
  'ref',
  'ref_src',
  'source',
  'yclid',
  'ncid',
  'igshid',
  'xtor',
  'cmpid',
  'rss',
  'at_medium',
  'at_campaign',
]);

/**
 * Universal Source URL Normalizer.
 * Transforms diverse tracking URLs and redirect variants into stable canonical addresses.
 */
export function normalizeSourceUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);

    // 1. Lowercase protocol and hostname
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // 2. Remove standard default ports
    if ((parsed.protocol === 'http:' && parsed.port === '80') ||
        (parsed.protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }

    // 3. Remove fragment/hash (#section, #comments, etc.)
    parsed.hash = '';

    // 4. Strip tracking parameters while preserving legitimate parameters
    const cleanedParams = new URLSearchParams();
    const sortedKeys = Array.from(parsed.searchParams.keys()).sort();

    for (const key of sortedKeys) {
      const lowerKey = key.toLowerCase();
      if (!TRACKING_PARAMS.has(lowerKey) && !lowerKey.startsWith('utm_')) {
        const values = parsed.searchParams.getAll(key);
        for (const val of values) {
          cleanedParams.append(key, val);
        }
      }
    }

    // 5. Clean path: collapse multiple slashes, strip trailing slash unless root '/'
    let cleanPath = parsed.pathname.replace(/\/+/g, '/');
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    parsed.pathname = cleanPath;

    // 6. Reconstruct URL
    const queryString = cleanedParams.toString();
    const searchPart = queryString ? `?${queryString}` : '';

    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${searchPart}`;
  } catch {
    // If URL parsing fails, perform safe regex cleaning
    let fallback = trimmed.split('#')[0]; // remove fragment
    fallback = fallback.replace(/\?(utm_[^&]+&?)+/gi, '?');
    fallback = fallback.replace(/\?$/, '');
    if (fallback.endsWith('/') && fallback.length > 8) {
      fallback = fallback.slice(0, -1);
    }
    return fallback;
  }
}
