/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * FallbackMediaService: Intentional, Branded Editorial Fallback Graphics
 */

import type { MediaAsset } from '../../types/media';

export class FallbackMediaService {
  /**
   * Generates a clean, branded SVG editorial placeholder graphic for a given category.
   */
  public generateFallbackSvg(category: string, title?: string): string {
    const catUpper = (category || 'WORLD').toUpperCase();
    const sanitizedTitle = (title || 'The Meridian Editorial Report')
      .slice(0, 70)
      .replace(/[<>&"']/g, '');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090D16" />
      <stop offset="50%" stop-color="#111827" />
      <stop offset="100%" stop-color="#0B0F19" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1F2937" stroke-width="0.75" opacity="0.6"/>
    </pattern>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#60A5FA" />
    </linearGradient>
  </defs>

  <rect width="1200" height="675" fill="url(#bg)" />
  <rect width="1200" height="675" fill="url(#grid)" />

  <g transform="translate(100, 120)">
    <!-- Brand Crest / Monogram -->
    <path d="M 0 0 L 24 40 L 48 0 L 48 60 L 36 60 L 36 22 L 24 42 L 12 22 L 12 60 L 0 60 Z" fill="#93C5FD" />
    <text x="70" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="#F3F4F6">THE MERIDIAN</text>
    <text x="70" y="54" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" letter-spacing="2" fill="#6B7280">GLOBAL NEWS PLATFORM // VERIFIED DISPATCH</text>

    <!-- Category Pill -->
    <rect x="0" y="140" width="160" height="32" rx="4" fill="#1E293B" stroke="#334155" stroke-width="1" />
    <text x="80" y="161" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#60A5FA" text-anchor="middle">${catUpper}</text>

    <!-- Editorial Accent Line -->
    <rect x="0" y="195" width="80" height="3" fill="url(#accent)" />

    <!-- Article Reference -->
    <text x="0" y="240" font-family="Georgia, serif" font-size="34" font-weight="600" fill="#E5E7EB" width="1000">
      ${sanitizedTitle}
    </text>

    <!-- Footer Notice -->
    <text x="0" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#9CA3AF">
      Cover visual unavailable. Editorial coverage continues unimpeded.
    </text>
  </g>
</svg>`;
  }

  /**
   * Produces a fully formed MediaAsset object representing the safe fallback.
   */
  public createFallbackAsset(storyId: string, category: string, title?: string): MediaAsset {
    const svg = this.generateFallbackSvg(category, title);
    const base64 = Buffer.from(svg).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64}`;
    const now = new Date().toISOString();

    return {
      id: `fallback-${storyId}`,
      storyId,
      assetType: 'illustration',
      sourceType: 'fallback',
      storageUrl: dataUrl,
      rightsStatus: 'verified',
      provenanceStatus: 'verified',
      validationStatus: 'fallback',
      credit: 'The Meridian Editorial Graphics',
      caption: 'Editorial graphic representation.',
      altText: `The Meridian coverage graphic for ${title || category}`,
      width: 1200,
      height: 675,
      aspectRatio: '16:9',
      format: 'svg',
      mimeType: 'image/svg+xml',
      isIllustrative: true,
      isPrimary: true,
      sortOrder: 0,
      derivatives: {
        desktop: { url: dataUrl, width: 1200, height: 675, format: 'svg' },
        tablet: { url: dataUrl, width: 800, height: 450, format: 'svg' },
        mobile: { url: dataUrl, width: 400, height: 225, format: 'svg' },
        thumbnail: { url: dataUrl, width: 200, height: 112, format: 'svg' },
        openGraph: { url: dataUrl, width: 1200, height: 630, format: 'svg' },
      },
      metadata: {
        category,
        fallbackVersion: 'v1.0',
      },
      createdAt: now,
      updatedAt: now,
    };
  }
}
