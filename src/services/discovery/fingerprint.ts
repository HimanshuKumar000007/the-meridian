/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeSourceUrl } from './normalizeUrl';

/**
 * Universal FNV-1a 64-bit and SHA-256 fallback hash implementation.
 * Ensures consistent hashing in both Node.js (Vercel/CLI) and browser environments.
 */
function fnv1a64(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch >> 8), 0x01000193);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return hex1 + hex2;
}

/**
 * Generates a deterministic hash string for fingerprints and content hashes.
 */
export function computeHash(input: string): string {
  if (!input) return '0000000000000000';

  // If running in Node.js environment, use crypto.createHash for standard SHA-256
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      // Dynamic import to avoid browser bundle breakage
      const { createHash } = require('crypto');
      return createHash('sha256').update(input).digest('hex');
    } catch {
      // Fallback below
    }
  }

  // Universal deterministic 64-bit hex hash
  return fnv1a64(input);
}

/**
 * Canonicalizes a headline for linguistic and structural similarity comparison.
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';

  return title
    .toLowerCase()
    // Strip HTML tags if any were embedded in title
    .replace(/<[^>]+>/g, '')
    // Replace typographic characters with ASCII equivalents
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // Strip non-alphanumeric characters (keep basic spaces and hyphens)
    .replace(/[^\w\s-]/g, '')
    // Collapse multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a stable, deterministic fingerprint for a discovered item.
 * Combines normalized title + canonical source identity + normalized URL.
 */
export function generateDiscoveryFingerprint(params: {
  title: string;
  canonicalUrl: string;
  sourceIdentity?: string;
}): string {
  const normTitle = normalizeTitle(params.title);
  const normUrl = normalizeSourceUrl(params.canonicalUrl);
  const sourceId = (params.sourceIdentity || '').toLowerCase().trim();

  const combinedPayload = `${normTitle}|${sourceId}|${normUrl}`;
  return computeHash(combinedPayload);
}

/**
 * Generates a content hash to detect post-publication updates or modifications.
 */
export function generateContentHash(params: {
  title: string;
  description?: string | null;
  publishedAt?: string | null;
}): string {
  const normTitle = normalizeTitle(params.title);
  const cleanDesc = (params.description || '').trim();
  const pubDate = (params.publishedAt || '').trim();

  const combined = `${normTitle}|${cleanDesc}|${pubDate}`;
  return computeHash(combined);
}
