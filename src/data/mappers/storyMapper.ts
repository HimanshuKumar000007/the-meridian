/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsStory, ArticleBlock, Fact, StorySource, StoryUpdate, StoryCorrection, StoryAuthor, StoryHeroImage, SourceType, StoryEditorialStatus } from '../../types/story';

export interface DatabaseAuthorRow {
  id: string;
  name: string;
  slug?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  role: string;
}

export interface DatabaseCategoryRow {
  id: string;
  slug: string;
  name: string;
  display_name?: string | null;
  description: string;
}

export interface DatabaseSubcategoryRow {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
}

export interface DatabaseSourceRow {
  id: string;
  story_id: string;
  name: string;
  url?: string | null;
  source_type: string;
  published_at?: string | null;
  accessed_at?: string | null;
  author?: string | null;
  is_primary?: boolean | null;
  display_order?: number | null;
}

export interface DatabaseUpdateRow {
  id: string;
  story_id: string;
  timestamp: string;
  title?: string | null;
  body: string;
  source_id?: string | null;
  is_major?: boolean | null;
}

export interface DatabaseFactRow {
  id: string;
  story_id: string;
  label: string;
  value: string;
  display_order?: number | null;
}

export interface DatabaseCorrectionRow {
  id: string;
  story_id: string;
  summary?: string | null;
  body: string;
  created_at: string;
}

export interface DatabaseRelationshipRow {
  id: string;
  story_id: string;
  related_story_id: string;
  relationship_type: string;
  score?: number | null;
}

export interface DatabaseStoryRow {
  id: string;
  slug: string;
  title: string;
  dek?: string | null;
  summary: string;
  summary_points?: string[] | null;
  category_id: string;
  subcategory_id?: string | null;
  author_id: string;
  status: string;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  hero_image_caption?: string | null;
  hero_image_credit?: string | null;
  content?: ArticleBlock[] | null;
  published_at: string;
  updated_at?: string | null;
  first_seen_at?: string | null;
  last_checked_at?: string | null;
  is_featured?: boolean | null;
  view_count?: number | null;
  trending_score?: number | null;
  created_at?: string | null;

  // Joined relations
  author?: DatabaseAuthorRow | null;
  category?: DatabaseCategoryRow | null;
  subcategory?: DatabaseSubcategoryRow | null;
  sources?: DatabaseSourceRow[] | null;
  updates?: DatabaseUpdateRow[] | null;
  facts?: DatabaseFactRow[] | null;
  corrections?: DatabaseCorrectionRow[] | null;
  relationships?: DatabaseRelationshipRow[] | null;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 5) return 'Just now';
    if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
    if (diffHours < 24) return `Updated ${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function calculateReadTime(content: ArticleBlock[] | null | undefined, summary: string): string {
  if (!content || !Array.isArray(content) || content.length === 0) {
    const words = summary.split(/\s+/).length;
    return `${Math.max(2, Math.ceil(words / 40))} min read`;
  }

  let totalWords = 0;
  for (const block of content) {
    if (block.type === 'paragraph' && block.text) {
      totalWords += block.text.split(/\s+/).length;
    } else if (block.type === 'quote' && block.quote) {
      totalWords += block.quote.split(/\s+/).length;
    } else if (block.type === 'list' && Array.isArray(block.items)) {
      totalWords += block.items.join(' ').split(/\s+/).length;
    }
  }

  const minutes = Math.max(2, Math.ceil(totalWords / 180));
  return `${minutes} min read`;
}

export function mapDatabaseStoryToNewsStory(row: DatabaseStoryRow): NewsStory {
  const author: StoryAuthor = row.author
    ? {
        id: row.author.id,
        name: row.author.name,
        slug: row.author.slug || undefined,
        role: row.author.role,
        bio: row.author.bio || undefined,
        avatar: row.author.avatar_url || undefined,
      }
    : {
        id: row.author_id,
        name: 'The Meridian Staff',
        role: 'Editorial Bureau',
      };

  const heroImage: StoryHeroImage | undefined = row.hero_image_url
    ? {
        url: row.hero_image_url,
        alt: row.hero_image_alt || row.title,
        caption: row.hero_image_caption || undefined,
        credit: row.hero_image_credit || 'The Meridian / Editorial Desk',
      }
    : undefined;

  const categoryName = row.category?.name || 'General';
  const subcategoryName = row.subcategory?.name || undefined;

  const sources: StorySource[] | undefined = row.sources && row.sources.length > 0
    ? row.sources.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url || undefined,
        sourceType: (s.source_type as SourceType) || 'other',
        publishedAt: s.published_at || undefined,
        accessedAt: s.accessed_at || undefined,
        author: s.author || undefined,
        isPrimary: Boolean(s.is_primary),
      }))
    : undefined;

  const updates: StoryUpdate[] | undefined = row.updates && row.updates.length > 0
    ? row.updates.map((u) => ({
        id: u.id,
        timestamp: u.timestamp,
        time: new Date(u.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        title: u.title || undefined,
        body: u.body,
        text: u.body,
        isMajor: Boolean(u.is_major),
      }))
    : undefined;

  const facts: Fact[] | undefined = row.facts && row.facts.length > 0
    ? row.facts.map((f, i) => ({
        id: f.id,
        label: f.label,
        value: f.value,
        order: f.display_order ?? i + 1,
      }))
    : undefined;

  const corrections: StoryCorrection[] | undefined = row.corrections && row.corrections.length > 0
    ? row.corrections.map((c) => ({
        id: c.id,
        date: new Date(c.created_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        text: c.body,
      }))
    : undefined;

  const relatedStoryIds: string[] | undefined = row.relationships && row.relationships.length > 0
    ? row.relationships.map((r) => r.related_story_id)
    : undefined;

  // Determine presentation status
  let editorialStatus: StoryEditorialStatus = 'Analysis';
  if (row.status === 'developing') editorialStatus = 'Developing';
  else if (row.status === 'updated') editorialStatus = 'Updated';
  else if (updates && updates.length > 0) editorialStatus = 'Updated';

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    dek: row.dek || undefined,
    summary: row.summary,
    category: categoryName,
    subcategory: subcategoryName,
    status: editorialStatus,
    lifecycleStatus: (row.status as any) || 'published',
    published_version: (row as any).published_version || 1,
    publishedVersion: (row as any).published_version || 1,
    author,
    image: row.hero_image_url || '',
    alt: row.hero_image_alt || row.title,
    caption: row.hero_image_caption || undefined,
    credit: row.hero_image_credit || undefined,
    heroImage,
    quickSummary: row.summary_points || undefined,
    content: row.content || [],
    facts,
    updates,
    sources,
    corrections,
    relatedStoryIds,
    relatedSlugs: relatedStoryIds,
    publishedAt: row.published_at,
    updatedAt: row.updated_at || undefined,
    timeDisplay: formatRelativeTime(row.updated_at || row.published_at),
    readTime: calculateReadTime(row.content, row.summary),
    featured: Boolean(row.is_featured),
    isLive: row.status === 'developing',
    isBreaking: false,
    viewCount: row.view_count || 0,
    trendingScore: row.trending_score || 0,
  };
}
