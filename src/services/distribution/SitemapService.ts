/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story } from '../../types/story';
import { getSiteUrl, getCanonicalUrl } from '../../config/seoConfig';
import { CATEGORY_DEFINITIONS } from '../../data/categoryDatabase';

export interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export class SitemapService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : getSiteUrl();
  }

  public static generateSitemapXml(publishedStories: Story[], customAuthors: string[] = []): string {
    return new SitemapService().generateSitemapXml(publishedStories, customAuthors);
  }

  /**
   * Generates a valid XML sitemap string for published stories, categories, and publisher transparency pages.
   * Internal draft/held stories and private pipeline metadata are strictly omitted.
   */
  public generateSitemapXml(publishedStories: Story[], customAuthors: string[] = []): string {
    const now = new Date().toISOString();

    // 1. Core Editorial Routes
    const categoryRoutes: SitemapUrlEntry[] = CATEGORY_DEFINITIONS.map((c) => ({
      loc: getCanonicalUrl(`/${c.slug}`),
      lastmod: now,
      changefreq: ['ai', 'technology', 'world', 'business'].includes(c.slug) ? 'hourly' : 'daily',
      priority: ['ai', 'technology'].includes(c.slug) ? 0.9 : 0.8,
    }));

    const coreRoutes: SitemapUrlEntry[] = [
      { loc: getCanonicalUrl('/'), lastmod: now, changefreq: 'hourly', priority: 1.0 },
      ...categoryRoutes,
    ];

    // 2. Publisher Transparency & Accountability Routes
    const transparencyRoutes: SitemapUrlEntry[] = [
      { loc: getCanonicalUrl('/about'), lastmod: now, changefreq: 'monthly', priority: 0.6 },
      { loc: getCanonicalUrl('/contact'), lastmod: now, changefreq: 'monthly', priority: 0.6 },
      { loc: getCanonicalUrl('/editorial-policy'), lastmod: now, changefreq: 'monthly', priority: 0.7 },
      { loc: getCanonicalUrl('/corrections'), lastmod: now, changefreq: 'daily', priority: 0.7 },
      { loc: getCanonicalUrl('/privacy'), lastmod: now, changefreq: 'monthly', priority: 0.5 },
      { loc: getCanonicalUrl('/terms'), lastmod: now, changefreq: 'monthly', priority: 0.5 },
    ];

    // 3. Author Profiles
    const defaultAuthorSlugs = [
      'helen-vance',
      'julian-foster',
      'sarah-lin',
      'marcus-bell',
      'alina-thorne',
      'victoria-sterling',
      'claire-delacroix',
      'kenji-takahashi',
      'meridian-desk',
    ];
    const authorSlugs = Array.from(new Set([...defaultAuthorSlugs, ...customAuthors]));
    const authorRoutes: SitemapUrlEntry[] = authorSlugs.map((slug) => ({
      loc: getCanonicalUrl(`/author/${slug}`),
      lastmod: now,
      changefreq: 'weekly',
      priority: 0.5,
    }));

    // 4. Published Stories Only
    const storyEntries: SitemapUrlEntry[] = publishedStories
      .filter((s) => {
        const isPublished = (s.status === 'published' || s.lifecycleStatus === 'published');
        return isPublished && Boolean(s.slug);
      })
      .map((s) => ({
        loc: getCanonicalUrl(`/story/${s.slug}`),
        lastmod: s.updated_at || s.updatedAt || s.published_at || s.publishedAt || now,
        changefreq: 'daily',
        priority: 0.8,
      }));

    const allEntries = [...coreRoutes, ...transparencyRoutes, ...authorRoutes, ...storyEntries];

    const urlsXml = allEntries
      .map(
        (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq || 'daily'}</changefreq>
    <priority>${(e.priority || 0.5).toFixed(1)}</priority>
  </url>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
  }

  /**
   * Generates a standard XML sitemap index for horizontal scalability
   */
  public generateSitemapIndexXml(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
    const entriesXml = sitemaps
      .map(
        (s) => `  <sitemap>
    <loc>${s.loc}</loc>
    ${s.lastmod ? `<lastmod>${s.lastmod}</lastmod>` : ''}
  </sitemap>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entriesXml}
</sitemapindex>`;
  }
}
