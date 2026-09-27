/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized SEO & Site Identity Configuration for The Meridian.
 * Single source of truth for canonical domains, site name, publisher identity, and metadata.
 */

export function getSiteUrl(): string {
  let url = '';
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SITE_URL) {
    url = import.meta.env.VITE_SITE_URL;
  } else if (typeof process !== 'undefined' && process.env) {
    url = process.env.VITE_SITE_URL || process.env.SITE_URL || '';
  }

  if (!url || url.trim() === '') {
    url = 'https://themeridian.news';
  }

  // Ensure HTTPS and strip trailing slashes
  url = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  } else if (url.startsWith('http://')) {
    url = url.replace(/^http:\/\//i, 'https://');
  }

  return url;
}

export const SEO_CONFIG = {
  siteName: 'The Meridian',
  publisherName: 'The Meridian',
  publisherLegalName: 'The Meridian Publishing Consortium',
  get siteUrl(): string {
    return getSiteUrl();
  },
  defaultTitle: 'The Meridian — Global News, Technology, AI & World Affairs',
  titleTemplate: '%s — The Meridian',
  defaultDescription:
    'Independent global journalism delivering rigorous reporting and timely analysis on artificial intelligence, science, business, technology, gaming, and world affairs.',
  defaultSocialImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&h=630&q=85',
  logoUrl: '/favicon.svg',
  locale: 'en_US',
  twitterHandle: '@TheMeridianNews',
  themeColor: '#141517',
  backgroundColor: '#FAF9F6',
  editorialEmail: 'editorial@themeridian.news',
  correctionsEmail: 'corrections@themeridian.news',
  tipsEmail: 'tips@themeridian.news',
};

/**
 * Deterministically constructs a canonical URL for any internal route.
 * Always uses HTTPS, the canonical site hostname, strips trailing slashes,
 * and eliminates non-functional tracking queries (utm_*, fbclid, gclid).
 */
export function getCanonicalUrl(path: string = '/', queryParams?: URLSearchParams | Record<string, string>): string {
  const baseUrl = getSiteUrl();
  let cleanPath = (path || '/').trim();
  const extractedQuery = new URLSearchParams();

  // Strip origin if full URL was accidentally passed
  if (/^https?:\/\//i.test(cleanPath)) {
    try {
      const parsed = new URL(cleanPath);
      cleanPath = parsed.pathname;
      parsed.searchParams.forEach((v, k) => extractedQuery.set(k, v));
    } catch {
      cleanPath = '/';
    }
  }

  // Strip hash from path
  const hashIdx = cleanPath.indexOf('#');
  if (hashIdx !== -1) cleanPath = cleanPath.slice(0, hashIdx);

  // Extract query string from path if present
  const qIdx = cleanPath.indexOf('?');
  if (qIdx !== -1) {
    const rawSearch = cleanPath.slice(qIdx + 1);
    const parsedParams = new URLSearchParams(rawSearch);
    parsedParams.forEach((v, k) => extractedQuery.set(k, v));
    cleanPath = cleanPath.slice(0, qIdx);
  }

  // Normalize path slashes
  cleanPath = cleanPath.replace(/\/+/g, '/');
  if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // Handle explicit queryParams argument if passed
  if (queryParams) {
    const entries = queryParams instanceof URLSearchParams ? Array.from(queryParams.entries()) : Object.entries(queryParams);
    for (const [key, val] of entries) {
      extractedQuery.set(key, val);
    }
  }

  // Filter out non-functional tracking params
  const functionalParams = new URLSearchParams();
  for (const [key, val] of extractedQuery.entries()) {
    const k = key.toLowerCase();
    if (
      !k.startsWith('utm_') &&
      k !== 'fbclid' &&
      k !== 'gclid' &&
      k !== 'msclkid' &&
      k !== 'mc_cid' &&
      k !== 'mc_eid' &&
      k !== 'ref' &&
      k !== 'source' &&
      val !== undefined &&
      val !== null &&
      val !== ''
    ) {
      functionalParams.append(key, val);
    }
  }

  const queryString = functionalParams.toString();
  return queryString ? `${baseUrl}${cleanPath}?${queryString}` : `${baseUrl}${cleanPath}`;
}

export const sanitizeUrlForCanonical = getCanonicalUrl;
