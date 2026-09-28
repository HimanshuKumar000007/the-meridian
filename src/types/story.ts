/**
 * @license
 */

import type { MediaAsset } from './media';

/**
 * Editorial presentation status for visual badges
 */
export type StoryEditorialStatus =
  | 'Developing'
  | 'Updated'
  | 'Live'
  | 'Analysis'
  | 'Explainer'
  | 'Announcement'
  | 'Review';

/**
 * Backend lifecycle status for editorial workflow & future database
 */
export type StoryLifecycleStatus =
  | 'draft'
  | 'ready'
  | 'held'
  | 'published'
  | 'developing'
  | 'updated'
  | 'archived';

// Alias for backward compatibility
export type StoryStatus = StoryEditorialStatus | StoryLifecycleStatus;

export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
  lead?: boolean;
}

export interface HeadingBlock {
  type: 'heading';
  level: 2 | 3;
  text: string;
  id?: string;
}

export interface ListBlock {
  type: 'list';
  items: string[];
  ordered?: boolean;
}

export interface QuoteBlock {
  type: 'quote';
  quote: string;
  attribution?: string;
  role?: string;
}

export interface ImageBlock {
  type: 'image';
  url: string;
  alt: string;
  caption?: string;
  credit?: string;
}

export interface CalloutBlock {
  type: 'callout';
  title?: string;
  text: string;
}

export type ArticleBlock =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | QuoteBlock
  | ImageBlock
  | CalloutBlock;

export interface Fact {
  id?: string;
  label: string;
  value: string;
  order?: number;
}

export type SourceType =
  | 'official'
  | 'publisher'
  | 'press_release'
  | 'public_feed'
  | 'other';

export interface StorySource {
  id?: string;
  name: string;
  url?: string;
  sourceType?: SourceType;
  publishedAt?: string;
  accessedAt?: string;
  author?: string;
  isPrimary?: boolean;
  is_primary?: boolean;
  time?: string; // Display formatted time
  note?: string;
}

export interface StoryUpdate {
  id?: string;
  timestamp?: string; // ISO 8601 string
  time?: string; // Formatted display time (e.g. "12:42 PM")
  title?: string;
  body?: string; // Standardized update text body
  text?: string; // Backward compatibility alias for body
  sourceId?: string;
  source?: string;
  sourceUrl?: string;
  isMajor?: boolean;
  is_major?: boolean;
}

export interface StoryCorrection {
  id?: string;
  date: string;
  text: string;
}

export interface StoryAuthor {
  id?: string;
  name: string;
  slug?: string;
  role: string;
  bio?: string;
  avatar?: string;
  email?: string;
}

export interface StoryHeroImage {
  url: string;
  alt: string;
  caption?: string;
  credit?: string;
}

export interface NewsStorySummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  subcategory?: string;
  image?: string;
  alt?: string;
  publishedAt: string;
  timeDisplay: string;
  readTime: string;
}

export interface NewsStory {
  id: string;
  slug: string;
  title: string;
  dek?: string; // Secondary editorial deck
  summary: string;

  category: string;
  subcategory?: string;

  // Editorial & Lifecycle Status
  status?: StoryStatus;
  lifecycleStatus?: StoryLifecycleStatus;

  author: StoryAuthor;

  // Media & Presentation
  image?: string;
  alt?: string;
  caption?: string;
  credit?: string;
  heroImage?: StoryHeroImage;
  heroMediaId?: string;
  heroMedia?: MediaAsset;
  mediaGallery?: MediaAsset[];

  quickSummary?: string[]; // 3-5 concise bullet points

  content: ArticleBlock[];

  facts?: Fact[];

  updates?: StoryUpdate[];

  sources?: StorySource[];

  corrections?: StoryCorrection[];

  relatedStoryIds?: string[];
  relatedSlugs?: string[];
  relatedStories?: NewsStorySummary[];

  // Timestamps
  createdAt?: string;
  firstSeenAt?: string;
  publishedAt: string;
  updatedAt?: string;
  lastCheckedAt?: string;
  timeDisplay: string;

  // Reading & Engagement Metrics
  readTime: string;
  viewCount?: number;
  trendingScore?: number;

  featured?: boolean;
  isLive?: boolean;
  isBreaking?: boolean;
  rank?: number;

  // Database-aligned & Lifecycle fields
  cluster_id?: string;
  content_version?: number;
  published_version?: number;
  publishedVersion?: number;
  summary_points?: string[];
  published_at?: string;
  updated_at?: string;
  created_at?: string;
  hero_image?: StoryHeroImage;
  hero_image_url?: string;
  hero_image_alt?: string;
  hero_image_caption?: string;
  hero_image_credit?: string;
  hero_media_id?: string;
  reading_time_minutes?: number;
  reading_time?: number;
  importance_score?: number;
}

export type Story = NewsStory;

