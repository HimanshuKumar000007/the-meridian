/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Approved Source Registry: Curated catalog of verified, legitimate news sources
 * Implements 14 canonical fields:
 * sourceId, sourceName, category, sourceType, feedUrl, active, authorityLevel,
 * allowedUsage, discoveryRole, evidenceRole, pollingCadence, status,
 * lastSuccess, lastFailure, errorCount
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApprovedSource,
  AllowedSourceUsage,
  AuthorityLevel,
  DiscoveryRole,
  EvidenceRole,
  SourceRegistryStatus,
} from './types';

export function createApprovedSource(src: {
  sourceId: string;
  sourceName: string;
  category: string;
  sourceType: 'rss' | 'atom' | 'official_feed';
  feedUrl: string;
  active: boolean;
  authorityLevel: AuthorityLevel;
  allowedUsage: AllowedSourceUsage;
  discoveryRole: DiscoveryRole;
  evidenceRole: EvidenceRole;
  pollingCadence?: number;
  status?: SourceRegistryStatus;
  lastSuccess?: string | null;
  lastFailure?: string | null;
  errorCount?: number;
  failureReason?: string | null;
  isOfficial?: boolean;
  priority?: number;
  categoryHints?: string[];
}): ApprovedSource {
  return {
    sourceId: src.sourceId,
    sourceName: src.sourceName,
    category: src.category,
    sourceType: src.sourceType,
    feedUrl: src.feedUrl,
    active: src.active,
    authorityLevel: src.authorityLevel,
    allowedUsage: src.allowedUsage,
    discoveryRole: src.discoveryRole,
    evidenceRole: src.evidenceRole,
    pollingCadence: src.pollingCadence ?? 10,
    status: src.status ?? (src.active ? 'healthy' : 'deactivated'),
    lastSuccess: src.lastSuccess ?? null,
    lastFailure: src.lastFailure ?? null,
    errorCount: src.errorCount ?? 0,

    // DB-aligned snake_case aliases & legacy helpers
    source_id: src.sourceId,
    source_name: src.sourceName,
    source_type: src.sourceType,
    feed_url: src.feedUrl,
    is_active: src.active,
    authority_level: src.authorityLevel,
    allowed_usage: src.allowedUsage,
    discovery_role: src.discoveryRole,
    evidence_role: src.evidenceRole,
    polling_cadence: src.pollingCadence ?? 10,
    polling_cadence_minutes: src.pollingCadence ?? 10,
    priority: src.priority ?? (src.authorityLevel === 'primary_official' ? 1 : 2),
    is_official: src.isOfficial ?? (src.authorityLevel === 'primary_official'),
    category_hints: src.categoryHints ?? [src.category.toLowerCase()],
    consecutive_failures: src.errorCount ?? 0,
    failure_reason: src.failureReason ?? null,
    last_success_at: src.lastSuccess ?? null,
    last_error_at: src.lastFailure ?? null,
  };
}

/**
 * Curated catalog of approved candidate sources with empirically verified statuses.
 */
export const APPROVED_SOURCES_CATALOG: ApprovedSource[] = [
  // ==========================================
  // 1. AI Category
  // ==========================================
  createApprovedSource({
    sourceId: 'src-openai-news',
    sourceName: 'OpenAI News & Research',
    category: 'AI',
    sourceType: 'rss',
    feedUrl: 'https://openai.com/news/rss.xml',
    active: true,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'primary_evidence',
    pollingCadence: 10,
    status: 'healthy',
    categoryHints: ['ai', 'technology'],
  }),
  createApprovedSource({
    sourceId: 'src-nvidia-ai-blog',
    sourceName: 'NVIDIA Blog',
    category: 'AI',
    sourceType: 'rss',
    feedUrl: 'https://blogs.nvidia.com/feed/',
    active: true,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'primary_evidence',
    pollingCadence: 10,
    status: 'healthy',
    categoryHints: ['ai', 'technology'],
  }),
  createApprovedSource({
    sourceId: 'src-techcrunch-ai',
    sourceName: 'TechCrunch AI',
    category: 'AI',
    sourceType: 'rss',
    feedUrl: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'lead_only',
    evidenceRole: 'lead_only',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['ai', 'technology'],
  }),
  createApprovedSource({
    sourceId: 'src-arstechnica-tech-lab',
    sourceName: 'Ars Technica Tech Lab',
    category: 'AI',
    sourceType: 'rss',
    feedUrl: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'technical_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['ai', 'technology'],
  }),
  createApprovedSource({
    sourceId: 'src-deepmind-blog',
    sourceName: 'Google DeepMind',
    category: 'AI',
    sourceType: 'rss',
    feedUrl: 'https://deepmind.google/blog/rss.xml',
    active: false,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'unusable_for_synthesis',
    pollingCadence: 30,
    status: 'deactivated',
    failureReason: 'Google deprecated RSS feed endpoint (returns HTML only)',
    categoryHints: ['ai', 'technology'],
  }),
  createApprovedSource({
    sourceId: 'src-anthropic-news',
    sourceName: 'Anthropic News',
    category: 'AI',
    sourceType: 'rss',
    feedUrl: 'https://www.anthropic.com/news/rss.xml',
    active: false,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'unusable_for_synthesis',
    pollingCadence: 30,
    status: 'deactivated',
    failureReason: 'HTTP 404 at candidate endpoint',
    categoryHints: ['ai', 'technology'],
  }),
  createApprovedSource({
    sourceId: 'src-microsoft-ai-blog',
    sourceName: 'Microsoft AI Blog',
    category: 'AI',
    sourceType: 'rss',
    feedUrl: 'https://blogs.microsoft.com/ai/feed/',
    active: false,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'unusable_for_synthesis',
    pollingCadence: 30,
    status: 'deactivated',
    failureReason: 'HTTP 410 Gone at candidate endpoint',
    categoryHints: ['ai', 'technology'],
  }),

  // ==========================================
  // 2. TECHNOLOGY Category
  // ==========================================
  createApprovedSource({
    sourceId: 'src-arstechnica-tech',
    sourceName: 'Ars Technica — Technology Lab',
    category: 'TECHNOLOGY',
    sourceType: 'rss',
    feedUrl: 'https://feeds.arstechnica.com/arstechnica/index',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'technical_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['technology', 'ai'],
  }),
  createApprovedSource({
    sourceId: 'src-the-verge-tech',
    sourceName: 'The Verge — Tech Dispatches',
    category: 'TECHNOLOGY',
    sourceType: 'atom',
    feedUrl: 'https://www.theverge.com/rss/index.xml',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['technology'],
  }),
  createApprovedSource({
    sourceId: 'src-wired-tech',
    sourceName: 'WIRED',
    category: 'TECHNOLOGY',
    sourceType: 'rss',
    feedUrl: 'https://www.wired.com/feed/rss',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['technology', 'science'],
  }),
  createApprovedSource({
    sourceId: 'src-mit-tech-review',
    sourceName: 'MIT Technology Review',
    category: 'TECHNOLOGY',
    sourceType: 'rss',
    feedUrl: 'https://www.technologyreview.com/feed/',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'technical_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 30,
    status: 'healthy',
    categoryHints: ['technology', 'ai'],
  }),
  createApprovedSource({
    sourceId: 'src-apple-newsroom',
    sourceName: 'Apple Newsroom',
    category: 'TECHNOLOGY',
    sourceType: 'rss',
    feedUrl: 'https://www.apple.com/newsroom/rss-feed.rss',
    active: true,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'primary_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['technology'],
  }),
  createApprovedSource({
    sourceId: 'src-microsoft-blog',
    sourceName: 'Microsoft Official Blog',
    category: 'TECHNOLOGY',
    sourceType: 'rss',
    feedUrl: 'https://blogs.microsoft.com/feed/',
    active: true,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'primary_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['technology'],
  }),
  createApprovedSource({
    sourceId: 'src-techcrunch-main',
    sourceName: 'TechCrunch Main',
    category: 'TECHNOLOGY',
    sourceType: 'rss',
    feedUrl: 'https://techcrunch.com/feed/',
    active: false,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'lead_only',
    evidenceRole: 'lead_only',
    pollingCadence: 15,
    status: 'deactivated',
    failureReason: 'Socket hangup / unreachable during verification',
    categoryHints: ['technology'],
  }),

  // ==========================================
  // 3. SCIENCE Category
  // ==========================================
  createApprovedSource({
    sourceId: 'src-science-aaas',
    sourceName: 'Science / AAAS News',
    category: 'SCIENCE',
    sourceType: 'rss',
    feedUrl: 'https://www.science.org/rss/news_current.xml',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'research_papers',
    evidenceRole: 'primary_evidence',
    pollingCadence: 20,
    status: 'healthy',
    categoryHints: ['science'],
  }),
  createApprovedSource({
    sourceId: 'src-nasa-breaking',
    sourceName: 'NASA News Releases & Missions',
    category: 'SCIENCE',
    sourceType: 'rss',
    feedUrl: 'https://www.nasa.gov/news-release/feed/',
    active: true,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'primary_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['science', 'space'],
  }),
  createApprovedSource({
    sourceId: 'src-esa-space-news',
    sourceName: 'ESA Space News',
    category: 'SCIENCE',
    sourceType: 'rss',
    feedUrl: 'https://www.esa.int/rssfeed/Our_Activities/Space_News',
    active: true,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'primary_evidence',
    pollingCadence: 20,
    status: 'healthy',
    categoryHints: ['science', 'space'],
  }),
  createApprovedSource({
    sourceId: 'src-sciencedaily-top',
    sourceName: 'ScienceDaily Top News',
    category: 'SCIENCE',
    sourceType: 'rss',
    feedUrl: 'https://www.sciencedaily.com/rss/top/science.xml',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'lead_only',
    evidenceRole: 'lead_only',
    pollingCadence: 20,
    status: 'healthy',
    categoryHints: ['science'],
  }),
  createApprovedSource({
    sourceId: 'src-arxiv-ai',
    sourceName: 'arXiv cs.AI',
    category: 'SCIENCE',
    sourceType: 'rss',
    feedUrl: 'http://export.arxiv.org/rss/cs.AI',
    active: true,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'research_papers',
    evidenceRole: 'primary_evidence',
    pollingCadence: 60,
    status: 'healthy',
    categoryHints: ['science', 'ai'],
  }),
  createApprovedSource({
    sourceId: 'src-phys-org',
    sourceName: 'Phys.org — Physical Sciences',
    category: 'SCIENCE',
    sourceType: 'rss',
    feedUrl: 'https://phys.org/rss-feed/',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'technical_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 20,
    status: 'healthy',
    categoryHints: ['science'],
  }),
  createApprovedSource({
    sourceId: 'src-nature-main',
    sourceName: 'Nature — Latest Science News',
    category: 'SCIENCE',
    sourceType: 'rss',
    feedUrl: 'https://www.nature.com/nature.rss',
    active: false,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'research_papers',
    evidenceRole: 'unusable_for_synthesis',
    pollingCadence: 30,
    status: 'deactivated',
    failureReason: 'Redirects to HTML content without XML feed',
    categoryHints: ['science'],
  }),
  createApprovedSource({
    sourceId: 'src-scientific-american',
    sourceName: 'Scientific American',
    category: 'SCIENCE',
    sourceType: 'rss',
    feedUrl: 'https://www.scientificamerican.com/feed/',
    active: false,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'unusable_for_synthesis',
    pollingCadence: 30,
    status: 'deactivated',
    failureReason: 'HTTP 404 at candidate endpoint',
    categoryHints: ['science'],
  }),

  // ==========================================
  // 4. GAMING Category
  // ==========================================
  createApprovedSource({
    sourceId: 'src-gamespot-news',
    sourceName: 'GameSpot News',
    category: 'GAMING',
    sourceType: 'rss',
    feedUrl: 'https://www.gamespot.com/feeds/news/',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['gaming'],
  }),
  createApprovedSource({
    sourceId: 'src-pc-gamer',
    sourceName: 'PC Gamer',
    category: 'GAMING',
    sourceType: 'rss',
    feedUrl: 'https://www.pcgamer.com/rss/',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['gaming'],
  }),
  createApprovedSource({
    sourceId: 'src-polygon-main',
    sourceName: 'Polygon',
    category: 'GAMING',
    sourceType: 'rss',
    feedUrl: 'https://www.polygon.com/rss/index.xml',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['gaming'],
  }),
  createApprovedSource({
    sourceId: 'src-vgc-news',
    sourceName: 'Video Games Chronicle (VGC)',
    category: 'GAMING',
    sourceType: 'rss',
    feedUrl: 'https://www.videogameschronicle.com/feed/',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['gaming'],
  }),
  createApprovedSource({
    sourceId: 'src-playstation-blog',
    sourceName: 'PlayStation Blog',
    category: 'GAMING',
    sourceType: 'rss',
    feedUrl: 'https://blog.playstation.com/feed/',
    active: true,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'primary_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['gaming'],
  }),
  createApprovedSource({
    sourceId: 'src-xbox-wire',
    sourceName: 'Xbox Wire',
    category: 'GAMING',
    sourceType: 'rss',
    feedUrl: 'https://news.xbox.com/en-us/feed/',
    active: true,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'primary_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['gaming'],
  }),
  createApprovedSource({
    sourceId: 'src-eurogamer',
    sourceName: 'Eurogamer Dispatches',
    category: 'GAMING',
    sourceType: 'rss',
    feedUrl: 'https://www.eurogamer.net/feed',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'lead_only',
    evidenceRole: 'lead_only',
    pollingCadence: 30,
    status: 'healthy',
    categoryHints: ['gaming'],
  }),
  createApprovedSource({
    sourceId: 'src-ign-articles',
    sourceName: 'IGN Articles',
    category: 'GAMING',
    sourceType: 'rss',
    feedUrl: 'https://www.ign.com/rss/articles',
    active: false,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'unusable_for_synthesis',
    pollingCadence: 15,
    status: 'deactivated',
    failureReason: 'HTTP 404 at candidate endpoint',
    categoryHints: ['gaming'],
  }),
  createApprovedSource({
    sourceId: 'src-nintendo-news',
    sourceName: 'Nintendo Newsroom',
    category: 'GAMING',
    sourceType: 'rss',
    feedUrl: 'https://www.nintendo.com/whatsnew/feed/',
    active: false,
    authorityLevel: 'primary_official',
    allowedUsage: 'official_record',
    discoveryRole: 'primary',
    evidenceRole: 'unusable_for_synthesis',
    pollingCadence: 30,
    status: 'deactivated',
    failureReason: 'HTTP 404 at candidate endpoint',
    categoryHints: ['gaming'],
  }),

  // ==========================================
  // 5. SPACE Category
  // ==========================================
  createApprovedSource({
    sourceId: 'src-space-com',
    sourceName: 'Space.com All',
    category: 'SPACE',
    sourceType: 'rss',
    feedUrl: 'https://www.space.com/feeds/all',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['space'],
  }),
  createApprovedSource({
    sourceId: 'src-arstechnica-space',
    sourceName: 'Ars Technica Science & Space',
    category: 'SPACE',
    sourceType: 'rss',
    feedUrl: 'https://feeds.arstechnica.com/arstechnica/science',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'technical_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['space', 'science'],
  }),

  // ==========================================
  // 6. BUSINESS Category
  // ==========================================
  createApprovedSource({
    sourceId: 'src-cnbc-rss',
    sourceName: 'CNBC Markets & Business',
    category: 'BUSINESS',
    sourceType: 'rss',
    feedUrl: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['business'],
  }),
  createApprovedSource({
    sourceId: 'src-techcrunch-startups',
    sourceName: 'TechCrunch Startups & VC',
    category: 'BUSINESS',
    sourceType: 'rss',
    feedUrl: 'https://techcrunch.com/category/startups/feed/',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'lead_only',
    evidenceRole: 'lead_only',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['business'],
  }),

  // ==========================================
  // 7. BACKSTOP Category (Discovery Only)
  // ==========================================
  createApprovedSource({
    sourceId: 'src-gdelt-gal',
    sourceName: 'GDELT Article List RSS',
    category: 'BACKSTOP',
    sourceType: 'rss',
    feedUrl: 'https://data.gdeltproject.org/gdeltv3/gal/feed.rss',
    active: true,
    authorityLevel: 'lead_only',
    allowedUsage: 'story_lead',
    discoveryRole: 'backstop',
    evidenceRole: 'unusable_for_synthesis',
    pollingCadence: 15,
    status: 'healthy',
    categoryHints: ['ai', 'technology', 'science', 'gaming', 'space', 'business'],
  }),

  // ==========================================
  // Additional Test & Global Reporting Fixtures
  // ==========================================
  createApprovedSource({
    sourceId: 'src-bbc-world',
    sourceName: 'BBC News — World',
    category: 'TECHNOLOGY',
    sourceType: 'rss',
    feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 15,
    categoryHints: ['world', 'technology'],
  }),
  createApprovedSource({
    sourceId: 'src-nyt-world',
    sourceName: 'The New York Times — World',
    category: 'TECHNOLOGY',
    sourceType: 'rss',
    feedUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    active: true,
    authorityLevel: 'high_journalism',
    allowedUsage: 'story_lead',
    discoveryRole: 'independent_reporting',
    evidenceRole: 'corroborating_evidence',
    pollingCadence: 10,
    categoryHints: ['world', 'technology'],
  }),
];

export class ApprovedSourceRegistry {
  private sourcesMap: Map<string, ApprovedSource>;

  constructor(initialSources: ApprovedSource[] = APPROVED_SOURCES_CATALOG) {
    this.sourcesMap = new Map();
    for (const src of initialSources) {
      this.sourcesMap.set(src.sourceId, { ...src });
    }
  }

  /**
   * Optionally syncs and loads all registered feeds from public.research_source_registry in Supabase.
   */
  public async loadFromDatabase(client: SupabaseClient): Promise<number> {
    try {
      const { data, error } = await client
        .from('research_source_registry')
        .select('*');

      if (error || !data || data.length === 0) {
        return this.sourcesMap.size;
      }

      for (const row of data) {
        const approved = createApprovedSource({
          sourceId: row.source_id,
          sourceName: row.source_name,
          category: row.category,
          sourceType: row.source_type,
          feedUrl: row.feed_url,
          active: row.active,
          authorityLevel: row.authority_level,
          allowedUsage: row.allowed_usage,
          discoveryRole: row.discovery_role,
          evidenceRole: row.evidence_role,
          pollingCadence: row.polling_cadence,
          status: row.status,
          lastSuccess: row.last_success,
          lastFailure: row.last_failure,
          errorCount: row.error_count ?? 0,
          failureReason: row.failure_reason,
        });
        this.sourcesMap.set(approved.sourceId, approved);
      }

      return this.sourcesMap.size;
    } catch {
      return this.sourcesMap.size;
    }
  }

  public getApprovedSources(filter?: { activeOnly?: boolean; priority?: number }): ApprovedSource[] {
    const list = Array.from(this.sourcesMap.values());
    return list.filter((s) => {
      if (filter?.activeOnly && !s.active) return false;
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
      if (s.feedUrl.trim().toLowerCase() === norm || s.feed_url.trim().toLowerCase() === norm) {
        return s;
      }
    }
    return undefined;
  }

  public getOfficialSources(): ApprovedSource[] {
    return Array.from(this.sourcesMap.values()).filter((s) => s.is_official && s.active);
  }

  public getSourcesByCategory(category: string): ApprovedSource[] {
    const norm = category.trim().toLowerCase();
    return this.getApprovedSources({ activeOnly: true }).filter((s) =>
      s.category.toLowerCase() === norm ||
      (s.category_hints && s.category_hints.some((c) => c.toLowerCase() === norm))
    );
  }

  public registerSource(source: ApprovedSource): void {
    this.sourcesMap.set(source.sourceId, { ...source });
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
      src.lastSuccess = now;
      src.last_success_at = now;
      src.errorCount = 0;
      src.consecutive_failures = 0;
      src.last_error = null;
      src.status = 'healthy';
    } else {
      src.lastFailure = now;
      src.last_error_at = now;
      src.errorCount = (src.errorCount || 0) + 1;
      src.consecutive_failures = src.errorCount;
      src.last_error = status.error || 'FETCH_FAILURE';
      if (src.errorCount >= 5) {
        src.status = 'failing';
      } else if (src.errorCount >= 2) {
        src.status = 'degraded';
      }
    }
  }
}
