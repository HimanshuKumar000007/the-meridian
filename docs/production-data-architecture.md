# Production Data Architecture & Supabase Foundation
**The Meridian — Global News Platform**

## 1. Architectural Overview

```text
The Meridian Frontend (Vite + React + Tailwind)
        │
        ▼
Universal Repository Abstraction (newsRepository)
        │
   ┌────┴─────────────────────────────┐
   ▼                                  ▼
SupabaseNewsRepository        MockNewsRepository
   │                                  │
   ▼                                  ▼
Live Supabase Database         In-Memory Mock Datasets
(dzbggkymgdtsyvrvrrjw)         (Fallback / Offline)
        │
        ▼
Vercel Production Deployment
(github.com/HimanshuKumar000007/the-meridian)
```

The data layer separates the presentation components from the storage engine:
- The UI layer (`App.tsx`, `StoryPage.tsx`, `CategoryPage.tsx`, `SearchModal.tsx`) consumes only the `NewsRepository` abstraction interface.
- No direct SQL or proprietary database calls are made in visual UI components.
- The `SupabaseNewsRepository` coordinates with `@supabase/supabase-js` to fetch live data from Supabase, applying row-level mapping to transform relational tables into immutable TypeScript domain types (`NewsStory`, `NewsCategory`, `HomepageData`).
- When offline or when `VITE_USE_MOCK_DATA=true` is set, the repository falls back to `MockNewsRepository` with 100% zero downtime and identical UI parity.

---

## 2. Project Isolation & Security Protocol

- **Strict Separation**: This deployment belongs strictly to **The Meridian** (`dzbggkymgdtsyvrvrrjw` in region `ap-northeast-1`). It has zero connection, shared tables, or shared credentials with HireOrbitAI.
- **Client Key Security**: Only the public `anon` key (`VITE_SUPABASE_ANON_KEY`) is bundled into the frontend. The `service_role` administrative key is never exposed to the client or committed to Git.
- **Git Hygiene**: Local `.env` and `.env.local` files containing environment secrets are strictly ignored by `.gitignore`.

---

## 3. Database Schema Specification

The relational schema resides in PostgreSQL with 9 normalized tables:

| Table | Purpose | Primary Key | Foreign Keys / Key Constraints |
| :--- | :--- | :--- | :--- |
| `categories` | Universal category definitions | `id VARCHAR(64)` | Unique `slug` |
| `subcategories` | Editorial topic tags per category | `id VARCHAR(64)` | FK `category_id -> categories(id)` |
| `authors` | Verified journalists & correspondents | `id VARCHAR(64)` | Unique `slug`, `name` |
| `stories` | Published articles and dispatches | `id VARCHAR(64)` | Unique `slug`, FK `category_id`, FK `author_id` |
| `story_sources` | Primary documents and citations | `id VARCHAR(64)` | FK `story_id -> stories(id)` ON DELETE CASCADE |
| `story_updates` | Real-time timestamps and changelogs | `id VARCHAR(64)` | FK `story_id -> stories(id)` ON DELETE CASCADE |
| `story_facts` | Key fast-fact bullet points | `id VARCHAR(64)` | FK `story_id -> stories(id)` ON DELETE CASCADE |
| `story_corrections` | Editorial transparency notices | `id VARCHAR(64)` | FK `story_id -> stories(id)` ON DELETE CASCADE |
| `story_relationships` | Cross-story editorial links | `id VARCHAR(64)` | FK `story_id`, FK `related_story_id` |

---

## 4. Row Level Security (RLS) & Permissions

All 9 tables enforce PostgreSQL Row Level Security:
- **Anonymous Public Access**:
  - `SELECT` permission is granted to `anon` and `authenticated` roles on all tables.
  - Policy: `stories_public_read` restricts public read to stories where `status = 'published'` and `published_at <= NOW()`.
- **Mutation Protection**:
  - Direct `INSERT`, `UPDATE`, and `DELETE` requests from the anonymous public role are strictly denied by RLS policies.
  - Mutations are restricted to verified backend services using service credentials.

---

## 5. Domain Mapper (`storyMapper.ts`)

PostgreSQL rows returned by Supabase PostgREST queries are mapped to domain models:
- Transforms snake_case database columns (`hero_image_url`, `published_at`, `view_count`) into camelCase domain properties (`heroImage.url`, `publishedAt`, `viewCount`).
- Reconstructs JSONB arrays into strongly-typed `ArticleBlock[]` content trees (`paragraph`, `heading`, `quote`, `list`, `image`).
- Resolves author relations into `StoryAuthor` objects.
- Normalizes sub-entity arrays (`sources`, `updates`, `facts`, `corrections`, `relationships`).

---

## 6. Verification & Test Suite

The data architecture is verified by automated integration suites:
- `test_phase4.ts`: Comprehensive verification covering Supabase connection, Homepage query, Story query, Category query, Live search, and Mock switchability.
- `test_supabase_repo.ts`: Live integration test verifying queries against Supabase tables.

To run verification locally:
```bash
npx tsx test_phase4.ts
```

---

## 7. Vercel Production Deployment

- **Repository**: `https://github.com/HimanshuKumar000007/the-meridian`
- **Branch**: `main`
- **Build Command**: `vite build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_SUPABASE_URL`: Supabase project endpoint URL.
  - `VITE_SUPABASE_ANON_KEY`: Public anonymous API key.
