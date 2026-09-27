/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story } from '../../types/story';

export interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export class SitemapService {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://themeridian.news') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Generates a valid XML sitemap string for published stories and static core routes.
   * Internal draft/held stories are strictly omitted.
   */
  public generateSitemapXml(publishedStories: Story[]): string {
    const staticRoutes: SitemapUrlEntry[] = [
      { loc: `${this.baseUrl}/`, lastmod: new Date().toISOString(), changefreq: 'hourly', priority: 1.0 },
      { loc: `${this.baseUrl}/technology`, lastmod: new Date().toISOString(), changefreq: 'hourly', priority: 0.9 },
      { loc: `${this.baseUrl}/ai`, lastmod: new Date().toISOString(), changefreq: 'hourly', priority: 0.9 },
      { loc: `${this.baseUrl}/gaming`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: 0.8 },
      { loc: `${this.baseUrl}/science`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: 0.8 },
      { loc: `${this.baseUrl}/business`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: 0.8 },
      { loc: `${this.baseUrl}/world`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: 0.8 },
    ];

    const storyEntries: SitemapUrlEntry[] = publishedStories
      .filter(
        (s) => (s.status === 'published' || s.lifecycleStatus === 'published') && s.slug
      )
      .map((s) => ({
        loc: `${this.baseUrl}/story/${s.slug}`,
        lastmod: s.updated_at || s.updatedAt || s.published_at || s.publishedAt || new Date().toISOString(),
        changefreq: 'daily',
        priority: 0.8,
      }));

    const allEntries = [...staticRoutes, ...storyEntries];

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
}
