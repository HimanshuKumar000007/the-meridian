# The Meridian — Universal Content Model & Local Data Architecture
**Phase 4 Architecture Documentation**

---

## 1. Architectural Overview

The Meridian follows a decoupled repository architecture designed to maintain visual stability while evolving its data tier. In Phase 4, the platform operates entirely on **local, in-memory mock data** governed by strict TypeScript contracts. **No remote database (e.g., Supabase) or external APIs are connected.**

```
+--------------------------------------------------------------------------+
|                                FRONTEND UI                               |
|   Homepage (Hero, Top Stories, Categories, Most Read, Trending Bar)      |
|   Universal Story Page (/story/[slug])                                    |
|   Universal Category Page (/[category], /[category]/[subcategory])        |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                       NEWS REPOSITORY ABSTRACTION                        |
|                  interface NewsRepository (Async Contract)               |
+--------------------------------------------------------------------------+
                                     |
                 +-------------------+-------------------+
                 |                                       |
                 v                                       v
+---------------------------------+     +----------------------------------+
|   MockNewsRepository (Phase 4)   |     |  SupabaseNewsRepository (Phase 5)|
|   - In-memory data store         |     |  - PostgreSQL / Supabase client  |
|   - Synchronous accessors        |     |  - Real-time updates / RLS       |
|   - Hot-swappable providers      |     |  - Edge caching                  |
|   - Normalized test dataset      |     |  - Implements same interface     |
+---------------------------------+     +----------------------------------+
```

### Key Guarantees
1. **Frontend Isolation**: React components (`App.tsx`, `StoryPage.tsx`, `CategoryPage.tsx`) interact exclusively through the repository interface or normalized helpers. No component accesses raw arrays or external database drivers directly.
2. **Provider Swappability**: Backing data sources can be swapped at runtime using `repo.setStoriesProvider()` or by swapping the singleton instance, leaving UI code completely unmodified.
3. **Pure TypeScript Validation**: Data models are verified at runtime via standalone validators in [`src/data/validation.ts`](file:///d:/the-meridian-—-global-news-platform/src/data/validation.ts).

---

## 2. Universal Content Model

All core domain entities are declared in [`src/types/story.ts`](file:///d:/the-meridian-—-global-news-platform/src/types/story.ts) and [`src/types/category.ts`](file:///d:/the-meridian-—-global-news-platform/src/types/category.ts).

### 2.1 NewsStory

The canonical entity representing an editorial piece across all surfaces:

```typescript
export interface NewsStory {
  id: string;                                // Unique identifier (e.g., 'story-hero', 'ai-1')
  slug: string;                              // URL-safe slug (e.g., 'quantum-coherence-breakthrough')
  title: string;                             // Editorial headline
  dek?: string;                              // Subtitle / deck providing immediate context
  summary: string;                           // Concise excerpt used in cards and search

  category: string;                          // Primary category name (e.g., 'AI', 'Technology')
  subcategory?: string;                      // Specific subcategory (e.g., 'Quantum Systems')

  status?: StoryEditorialStatus;             // Presentation badge: 'Developing' | 'Updated' | 'Live' | ...
  lifecycleStatus?: StoryLifecycleStatus;    // Workflow: 'draft' | 'published' | 'developing' | 'archived'

  author: StoryAuthor;                       // Bylined reporter or bureau
  heroImage?: StoryHeroImage;                // Primary visual asset with credit & caption
  image?: string;                            // Backward-compatible fallback image URL
  alt?: string;                              // Image accessibility label

  quickSummary?: string[];                   // 3-5 key takeaway bullet points
  content: ArticleBlock[];                   // Ordered structured article body blocks
  facts?: Fact[];                            // Key factual metadata table entries
  updates?: StoryUpdate[];                   // Live coverage timeline entries
  sources?: StorySource[];                   // Primary citations and source attributions
  corrections?: StoryCorrection[];           // Formal transparency corrections

  relatedStoryIds?: string[];                // IDs for related coverage cross-linking
  relatedSlugs?: string[];                   // Slugs for related coverage cross-linking

  publishedAt: string;                       // ISO 8601 publication timestamp
  updatedAt?: string;                        // ISO 8601 last modified timestamp
  timeDisplay: string;                       // Human-readable relative time (e.g., "Updated 25m ago")
  readTime: string;                          // Estimated reading duration (e.g., "6 min read")

  viewCount?: number;                        // Reader engagement metrics
  trendingScore?: number;                    // Algorithm score for trending velocity
  rank?: number;                             // Editorial priority rank (1-5 for Most Read)
  featured?: boolean;                        // Flag for top placement
  isLive?: boolean;                          // Flag for active wire dispatches
  isBreaking?: boolean;                      // Flag for emergency alerts
}
```

### 2.2 Article Content Blocks (Discriminated Union)

Articles are structured as an ordered sequence of typed blocks:

| Block Type | Fields | Description |
|---|---|---|
| `paragraph` | `text`, `lead?` | Standard narrative text; `lead=true` renders larger opening typography. |
| `heading` | `level` (2 or 3), `text`, `id?` | Editorial section dividers with anchor IDs. |
| `list` | `items`, `ordered?` | Bulleted or numbered item lists. |
| `quote` | `quote`, `attribution?`, `role?` | Pull quotes and prominent statements. |
| `image` | `url`, `alt`, `caption?`, `credit?` | Mid-article photojournalism or diagrams. |
| `callout` | `title?`, `text` | Key context, editorial backgrounders, and caveats. |

### 2.3 Sub-Entities: Sources, Updates, and Facts

* **`StorySource`**: Represents journalistic citations. Includes `name`, `url`, `sourceType` (`'official' | 'publisher' | 'press_release' | 'public_feed' | 'other'`), `publishedAt`, and `isPrimary`.
* **`StoryUpdate`**: Represents chronological updates for breaking news and live wires. Includes `timestamp`, `time`, `title`, `body`, `source`, `sourceUrl`, and `isMajor`.
* **`Fact`**: Structured key-value facts powering the sidebar Fact Sheet. Includes `label`, `value`, and `order`.
* **`StoryCorrection`**: Formal public corrections displaying date and explanatory notes.

### 2.4 Taxonomy & Categories

Categories and subcategories are declared in [`src/types/category.ts`](file:///d:/the-meridian-—-global-news-platform/src/types/category.ts):

```typescript
export interface NewsCategory {
  id: string;
  slug: string;                              // e.g., 'ai', 'technology', 'gaming'
  name: string;                              // e.g., 'Artificial Intelligence'
  shortName?: string;                        // e.g., 'AI'
  description: string;                       // Meta description & header subtitle
  longDescription?: string;                  // Extended category essay
  featuredTopic?: string;                    // Pinned topical focus
  subcategories: CategorySubcategory[];      // Navigation filter tabs
}
```

The 11 official categories supported:
1. **AI** (`/ai`)
2. **Technology** (`/technology`)
3. **Gaming** (`/gaming`)
4. **Science** (`/science`)
5. **Space** (`/space`)
6. **Business** (`/business`)
7. **World** (`/world`)
8. **Entertainment** (`/entertainment`)
9. **Cybersecurity** (`/cybersecurity`)
10. **Apps** (`/apps`)
11. **Hardware** (`/hardware`)

---

## 3. The NewsRepository Abstraction

The interface contract in [`src/types/repository.ts`](file:///d:/the-meridian-—-global-news-platform/src/types/repository.ts) defines all querying operations:

```typescript
export interface NewsRepository {
  // Story Queries
  getStoryBySlug(slug: string): Promise<NewsStory | null>;
  getStoryById(id: string): Promise<NewsStory | null>;
  getLatestStories(limit?: number): Promise<NewsStory[]>;
  getFeaturedStories(limit?: number): Promise<NewsStory[]>;
  getTrendingStories(limit?: number): Promise<NewsStory[]>;
  getMostReadStories(limit?: number): Promise<NewsStory[]>;
  getStoriesByCategory(categorySlug: string, options?: CategoryStoryQueryOptions): Promise<NewsStory[]>;
  searchStories(query: string): Promise<NewsStory[]>;

  // Sub-Entity Queries
  getStoryUpdates(storyId: string): Promise<StoryUpdate[]>;
  getStorySources(storyId: string): Promise<StorySource[]>;

  // Category Queries
  getCategoryBySlug(slug: string): Promise<NewsCategory | null>;
  getAllCategories(): Promise<NewsCategory[]>;

  // Page Aggregations
  getHomepageData(): Promise<HomepageData>;
  getCategoryPageData(categorySlug: string, subcategorySlug?: string, sortMode?: CategorySortMode): Promise<CategoryPageData | null>;
}
```

### MockNewsRepository Implementation
Implemented in [`src/data/repositories/MockNewsRepository.ts`](file:///d:/the-meridian-—-global-news-platform/src/data/repositories/MockNewsRepository.ts):
- Provides both **asynchronous methods** (satisfying the `NewsRepository` interface) and **synchronous accessors** (`getStoryBySlugSync`, `getHomepageDataSync`, etc.) for synchronous React rendering without hydration flashes.
- Supports provider hot-swapping via `setStoriesProvider(newStories)` and `setCategoriesProvider(newCategories)`.

---

## 4. Runtime Validation & Data Sanitization

[`src/data/validation.ts`](file:///d:/the-meridian-—-global-news-platform/src/data/validation.ts) provides pure TypeScript validation without external dependencies:

* `validateNewsStory(story)`: Asserts required fields (`id`, `slug`, `title`, `summary`, `category`, `publishedAt`, `author.name`, `content`), confirms content blocks conform to the discriminated union, and verifies source URLs.
* `validateNewsCategory(category)`: Checks category identifiers, slugs, and valid subcategory structures.
* `sanitizeBlockText(text)`: Scans for raw `<script>` tags, javascript pseudo-protocols, or malicious inline event attributes to guard against injection before rendering.

---

## 5. Phase 5 Remote Database Migration Blueprint

When moving from Phase 4 to Phase 5 (Real Database), the migration proceeds in 3 discrete steps with **zero UI changes**:

### Step 1: PostgreSQL / Supabase Schema (Draft DDL)

```sql
-- Categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT NOT NULL,
  long_description TEXT,
  featured_topic TEXT,
  display_order INT DEFAULT 0
);

-- Subcategories table
CREATE TABLE subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  UNIQUE(category_id, slug)
);

-- Authors table
CREATE TABLE authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  role TEXT NOT NULL,
  bio TEXT,
  avatar TEXT
);

-- Stories table
CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  dek TEXT,
  summary TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  subcategory_id TEXT REFERENCES subcategories(id),
  author_id TEXT REFERENCES authors(id),
  status TEXT DEFAULT 'Analysis',
  lifecycle_status TEXT DEFAULT 'published',
  hero_image JSONB,
  quick_summary JSONB,
  facts JSONB,
  content JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  read_time TEXT NOT NULL,
  view_count INT DEFAULT 0,
  trending_score FLOAT DEFAULT 0.0,
  rank INT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_live BOOLEAN DEFAULT FALSE,
  is_breaking BOOLEAN DEFAULT FALSE
);

-- Story Updates table (for live reporting)
CREATE TABLE story_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT REFERENCES stories(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT,
  body TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  is_major BOOLEAN DEFAULT FALSE
);

-- Story Sources table
CREATE TABLE story_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  source_type TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  note TEXT
);
```

### Step 2: Implement `SupabaseNewsRepository`
Create `src/data/repositories/SupabaseNewsRepository.ts` that implements `NewsRepository`. Each method maps database rows into `NewsStory` instances:

```typescript
export class SupabaseNewsRepository implements NewsRepository {
  constructor(private client: SupabaseClient) {}

  async getStoryBySlug(slug: string): Promise<NewsStory | null> {
    const { data } = await this.client
      .from('stories')
      .select('*, author:authors(*), category:categories(*), updates:story_updates(*)')
      .eq('slug', slug)
      .single();
    return data ? mapRowToNewsStory(data) : null;
  }
  // ... implement remaining interface methods
}
```

### Step 3: Swap Singleton Instance
In `src/data/newsRepository.ts`:

```typescript
// During development / offline:
// export const newsRepository: NewsRepository = new MockNewsRepository();

// In production with database:
export const newsRepository: NewsRepository = new SupabaseNewsRepository(supabaseClient);
```

All 3 phases of frontend UI (Homepage, Story Page, Category Page) remain 100% unchanged.

---

## 6. Verification & Quality Assurance

To verify the content model and repository layer:
* **Linting / Typecheck**: `npm run lint` (`tsc --noEmit`) — 0 errors.
* **Production Build**: `npm run build` (`vite build`) — 0 errors, compiles client bundle in ~1.1s.
* **Automated Test Suite**: `npx tsx test_phase4.ts` — 28 automated tests passing across:
  - Story schema validation
  - Category taxonomy validation
  - Slug lookups and 404 safety
  - Feed queries (latest, featured, trending, most read)
  - Category and subcategory filtering
  - Sub-entity updates and source retrieval
  - Page-level bundle providers (`getHomepageData`, `getCategoryPageData`)
  - Provider decoupling and hot-swappability
