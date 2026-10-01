/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Approved Source Registry: Curated catalog of verified, legitimate news sources
 */

import { INITIAL_NEWS_SOURCES } from '../../data/sources/initialSources';
import type { ApprovedSource } from './types';

/**
 * Curated catalog of approved sources enriched with editorial usage permissions
 * and official authority flags.
 * Uses only real, legitimately accessible public RSS/Atom feeds.
 */
export const APPROVED_SOURCES_CATALOG: ApprovedSource[] = [
  // 1. General & World Affairs
  {
    source_id: 'src-bbc-world',
    source_name: 'BBC News — World',
    feed_url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 15,
    priority: 1,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['world'],
    consecutive_failures: 0,
  },
  {
    source_id: 'src-nyt-world',
    source_name: 'The New York Times — World',
    feed_url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 20,
    priority: 1,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['world'],
    consecutive_failures: 0,
  },
  {
    source_id: 'src-nyt-tech',
    source_name: 'The New York Times — Technology',
    feed_url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 20,
    priority: 1,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['technology'],
    consecutive_failures: 0,
  },

  // 2. Official Agency & Institutional Feeds
  {
    source_id: 'src-nasa-breaking',
    source_name: 'NASA News Releases & Missions',
    feed_url: 'https://www.nasa.gov/news-release/feed/',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 20,
    priority: 1,
    allowed_usage: 'official_record',
    is_official: true,
    category_hints: ['space', 'science'],
    consecutive_failures: 0,
  },
  {
    source_id: 'src-openai-news',
    source_name: 'OpenAI News & Research',
    feed_url: 'https://openai.com/news/rss.xml',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 10,
    priority: 1,
    allowed_usage: 'official_record',
    is_official: true,
    category_hints: ['ai', 'technology'],
    consecutive_failures: 0,
  },

  // 3. Science & Fundamental Research
  {
    source_id: 'src-nature-news',
    source_name: 'Nature — Latest Science News',
    feed_url: 'https://www.nature.com/nature.rss',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 30,
    priority: 1,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['science'],
    consecutive_failures: 0,
  },
  {
    source_id: 'src-phys-org',
    source_name: 'Phys.org — Physical Sciences',
    feed_url: 'https://phys.org/rss-feed/',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 30,
    priority: 2,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['science'],
    consecutive_failures: 0,
  },

  // 4. Technology & Computing
  {
    source_id: 'src-ars-technica',
    source_name: 'Ars Technica — Technology Lab',
    feed_url: 'https://feeds.arstechnica.com/arstechnica/index',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 15,
    priority: 1,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['technology', 'ai'],
    consecutive_failures: 0,
  },
  {
    source_id: 'src-the-verge-tech',
    source_name: 'The Verge — Tech Dispatches',
    feed_url: 'https://www.theverge.com/rss/technology/index.xml',
    source_type: 'atom',
    is_active: true,
    polling_cadence_minutes: 20,
    priority: 2,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['technology'],
    consecutive_failures: 0,
  },
  {
    source_id: 'src-mit-tech-review-ai',
    source_name: 'MIT Technology Review — AI',
    feed_url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 30,
    priority: 2,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['ai', 'technology'],
    consecutive_failures: 0,
  },

  // 5. Gaming & Interactive Media
  {
    source_id: 'src-eurogamer',
    source_name: 'Eurogamer Dispatches',
    feed_url: 'https://www.eurogamer.net/feed',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 30,
    priority: 2,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['gaming', 'technology'],
    consecutive_failures: 0,
  },
  {
    source_id: 'src-game-developer',
    source_name: 'Game Developer — Industry & Engine Tech',
    feed_url: 'https://www.gamedeveloper.com/rss.xml',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 30,
    priority: 2,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['gaming', 'technology'],
    consecutive_failures: 0,
  },
  {
    source_id: 'src-space-news',
    source_name: 'SpaceNews Dispatches',
    feed_url: 'https://spacenews.com/feed/',
    source_type: 'rss',
    is_active: true,
    polling_cadence_minutes: 30,
    priority: 2,
    allowed_usage: 'story_lead',
    is_official: false,
    category_hints: ['space'],
    consecutive_failures: 0,
  },
];

export class ApprovedSourceRegistry {
  private sourcesMap: Map<string, ApprovedSource>;

  constructor(initialSources: ApprovedSource[] = APPROVED_SOURCES_CATALOG) {
    this.sourcesMap = new Map();
    for (const src of initialSources) {
      this.sourcesMap.set(src.source_id, { ...src });
    }
  }

  public getApprovedSources(filter?: { activeOnly?: boolean; priority?: number }): ApprovedSource[] {
    const list = Array.from(this.sourcesMap.values());
    return list.filter((s) => {
      if (filter?.activeOnly && !s.is_active) return false;
      if (filter?.priority && s.priority !== filter.priority) return false;
      return true;
    });
  }

  public getSourceById(id: string): ApprovedSource | undefined {
    return this.sourcesMap.get(id);
  }

  public getSourceByFeedUrl(feedUrl: string): ApprovedSource | undefined {
    const norm = feedUrl.trim().toLowerCase();
    for (const s of this.sourcesMap.values()) {
      if (s.feed_url.trim().toLowerCase() === norm) {
        return s;
      }
    }
    return undefined;
  }

  public getOfficialSources(): ApprovedSource[] {
    return Array.from(this.sourcesMap.values()).filter((s) => s.is_official && s.is_active);
  }

  public getSourcesByCategory(category: string): ApprovedSource[] {
    const norm = category.trim().toLowerCase();
    return this.getApprovedSources({ activeOnly: true }).filter((s) =>
      s.category_hints.some((c) => c.toLowerCase() === norm)
    );
  }

  public registerSource(source: ApprovedSource): void {
    this.sourcesMap.set(source.source_id, { ...source });
  }

  public updateSourceHealth(
    sourceId: string,
    status: {
      success: boolean;
      error?: string | null;
      timestamp?: string;
    }
  ): void {
    const src = this.sourcesMap.get(sourceId);
    if (!src) return;

    const now = status.timestamp || new Date().toISOString();
    src.last_polled_at = now;

    if (status.success) {
      src.last_success_at = now;
      src.consecutive_failures = 0;
      src.last_error = null;
    } else {
      src.last_error_at = now;
      src.consecutive_failures = (src.consecutive_failures || 0) + 1;
      src.last_error = status.error || 'FETCH_FAILURE';
    }
  }
}
