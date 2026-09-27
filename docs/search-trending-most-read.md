# Phase 11 — Universal Search, Trending & Most Read Engine
The Meridian — Global News Platform

## 1. Overview & Architectural Scope
Phase 11 implements the universal search, trending, and most-read audience discovery engine for The Meridian.
The engine operates entirely on PostgreSQL-native full-text search, trigram matching, deterministic time-decay metrics, and server-side RPC functions.

**Key Scope Boundaries:**
- Zero NVIDIA / AI search calls (100% deterministic, cheap, scalable).
- Zero external search vendors (no Algolia, Elastic, OpenSearch, Typesense).
- Strictly filters `status = 'published'` for all public queries (draft, ready, held, and archived stories are completely inaccessible).
- Story views are recorded via secure database stored procedures (`record_story_view`) with an anti-inflation 30-minute debounce window.
- Direct public updates to `stories.view_count` or `stories.trending_score` are strictly prohibited by PostgreSQL RLS.

---

## 2. Search Architecture & Technology
The search engine utilizes PostgreSQL's native `tsvector` and `pg_trgm` (trigram) extensions:
1. **Generated Column (`search_vector`)**:
   ```sql
   ALTER TABLE stories ADD COLUMN search_vector tsvector 
   GENERATED ALWAYS AS (
     setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
     setweight(to_tsvector('english', coalesce(dek, '')), 'B') ||
     setweight(to_tsvector('english', coalesce(summary, '')), 'C')
   ) STORED;
   ```
2. **GIN Search Indexes**:
   - `idx_stories_search_vector`: GIN index on `stories(search_vector)`.
   - `idx_stories_title_trgm`: GIN index on `stories(title gin_trgm_ops)` for typo tolerance and compound word matching.

### Search Ranking Priority:
1. **Exact Title Match**: `lower(title) = lower(query)` (+50.0 boost, highest precedence).
2. **Title Substring Match**: `lower(title) LIKE '%' || query || '%'` (+25.0 boost).
3. **Compound Word Match**: Spaces stripped e.g. "open ai" -> "openai" (+20.0 boost).
4. **Full-Text Ranking**: `ts_rank_cd(search_vector, websearch_to_tsquery('english', query)) * 15.0`.
5. **Trigram Word Similarity**: `word_similarity(query, title) * 15.0` (handles typos such as "crystats" -> "Cryostats").
6. **Tie-Breaker**: Publication recency (`published_at DESC`).
Popularity/views never overpower an exact title match.

---

## 3. Trending Engine Algorithm
Trending is distinct from lifetime Most Read. It captures recent attention and view velocity using a deterministic time-decay model:

$$\text{Trending Score} = \frac{V}{(T + 2.0)^{1.5}}$$

Where:
- $V = \max(\text{view\_count}, 1)$
- $T = \text{hours elapsed since publication } (\ge 0)$

### Recency vs. Velocity Property:
- A breaking story published **30 minutes ago** with **60 views** yields a score of $\approx 15.2$.
- An older story published **48 hours ago** with **300 views** yields a score of $\approx 0.85$.
The fresh breaking story easily trends above the older high-view story.

---

## 4. Most Read Engine Algorithm
- Ordered strictly by `view_count DESC, published_at DESC`.
- Only `status = 'published'` stories participate.
- Supports category-specific rankings (e.g. `/ai`, `/gaming`, `/business`).
- Transparently reflects verified database metrics without fabricating artificial counts.

---

## 5. View-Count Architecture & Deduplication
1. **Story Page Mount**:
   When `/story/[slug]` opens, a lightweight client hook generates/retrieves an anonymous session token from `sessionStorage` (`sess_<random>_<timestamp>`).
2. **Server-Side Debounce & Atomic Update**:
   Calls `POST /api/story/view` which executes the PostgreSQL `record_story_view(p_story_id, p_session_hash)` stored procedure:
   - Verifies the story exists and `status = 'published'`.
   - Checks `story_view_events` for a matching `(story_id, session_hash)` within the last **30 minutes**.
   - If debounced: returns `{ recorded: false, reason: 'deduplicated_window' }`.
   - If new: inserts audit row into `story_view_events`, increments `view_count = view_count + 1`, and updates `trending_score` dynamically.
3. **Security & RLS**:
   - `story_view_events` has RLS enabled.
   - Public/anonymous roles have **NO SELECT or UPDATE** grants on `story_view_events`.
   - Clients cannot execute `UPDATE stories SET view_count = 999999`.

---

## 6. Privacy & Data Retention
- **Zero PII**: No IP addresses, user identifiers, email addresses, or locations are logged.
- **Anonymous Hash**: Only ephemeral session hashes are recorded.
- **Retention Procedure**: `cleanup_story_view_events(p_retention_days INT DEFAULT 30)` safely truncates raw audit logs older than 30 days while preserving aggregated `view_count` on the `stories` table.

---

## 7. Public API Endpoints
- `GET /api/search?q=query&category=ai&sort=relevance&limit=20&offset=0`
  Returns `{ results: SearchResult[], total, query, options, page, totalPages, hasMore }`.
- `GET /api/search?q=query&suggest=true&limit=6`
  Returns `{ suggestions: SearchSuggestion[] }` (5–8 maximum, published only).
- `GET /api/trending?limit=5&category=ai`
  Returns `{ stories: Story[], count }`.
- `GET /api/most-read?limit=5&category=tech`
  Returns `{ stories: Story[], count, window }`.
- `POST /api/story/view`
  Body: `{ storyId: string, sessionHash: string }`.
  Returns `{ recorded: boolean, viewCount, trendingScore }`.
