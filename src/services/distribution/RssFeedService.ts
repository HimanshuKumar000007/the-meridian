/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story } from '../../types/story';
import { getSiteUrl, getCanonicalUrl, SEO_CONFIG } from '../../config/seoConfig';

export class RssFeedService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : getSiteUrl();
  }

  public static generateRssXml(publishedStories: Story[]): string {
    return new RssFeedService().generateRssXml(publishedStories);
  }

  /**
   * Generates a valid RSS 2.0 XML feed string strictly containing published stories.
   * Internal draft/held stories and private pipeline metadata are strictly omitted.
   */
  public generateRssXml(publishedStories: Story[]): string {
    const buildDate = new Date().toUTCString();

    const itemsXml = publishedStories
      .filter((s) => {
        const isPublished = (s.status === 'published' || s.lifecycleStatus === 'published');
        return isPublished && Boolean(s.slug);
      })
      .map((s) => {
        const storyUrl = getCanonicalUrl(`/story/${s.slug}`);
        const pubDate = new Date(
          s.published_at || s.publishedAt || Date.now()
        ).toUTCString();
        const authorName = s.author?.name || 'The Meridian Editorial Staff';
        const categoryName = s.category || 'News';
        const cleanTitle = (s.title || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const cleanSummary = (s.summary || s.dek || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
        const heroImgUrl = s.heroMedia?.storageUrl || s.hero_image_url || s.image || s.heroImage?.url;
        const enclosureXml = heroImgUrl
          ? `\n      <enclosure url="${heroImgUrl.replace(/&/g, '&amp;')}" type="image/jpeg" length="0" />`
          : '';

        return `    <item>
      <title>${cleanTitle}</title>
      <link>${storyUrl}</link>
      <guid isPermaLink="true">${storyUrl}</guid>
      <description>${cleanSummary}</description>
      <category>${categoryName}</category>
      <author>${authorName}</author>
      <pubDate>${pubDate}</pubDate>${enclosureXml}
    </item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SEO_CONFIG.siteName} — Global News Platform</title>
    <link>${this.baseUrl}</link>
    <description>${SEO_CONFIG.defaultDescription}</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${this.baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
  }
}
