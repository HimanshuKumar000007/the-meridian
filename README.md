# The Meridian — Global News Platform

A premium, authoritative, global digital newspaper and reporting platform built with React 19, TypeScript, and Tailwind CSS.

---

## 🌟 Overview

**The Meridian** is designed to provide thoughtful, restrained, and deeply credible editorial coverage across science, frontier artificial intelligence, high-performance computing, geopolitics, and global enterprise.

### Completed Phases

- **Phase 1 — Premium Editorial Homepage**
  - Hero / Lead News layout with primary featured dispatch and live news wire
  - Top Stories responsive 4-card grid
  - Category sections for AI & Technology, Gaming, Science & Space, Business, and World News
  - Editorial Most Read (ranked 01–05) and curated Trending Bar
  - Interactive search modal, mobile navigation drawer, and editorial policy dialogs

- **Phase 2 — Universal Story Page (`/story/[slug]`)**
  - Universal article template powering every published story
  - Dynamic Reading Progress bar, editorial byline, deck, and hero photography
  - Key Facts summary sheet and live reporting update timeline
  - Verified primary source citations and formal public corrections
  - Structured content blocks (paragraphs, lead paragraphs, headings, blockquotes, lists, callouts, and inline media)
  - Dynamic JSON-LD NewsArticle structured data and SEO meta generation

- **Phase 3 — Universal Category Page (`/[category]`, `/[category]/[subcategory]`)**
  - Single reusable category architecture powering all 11 categories:
    `/ai`, `/technology`, `/gaming`, `/science`, `/space`, `/business`, `/world`, `/entertainment`, `/cybersecurity`, `/apps`, `/hardware`
  - Subcategory tabs with persistent URL-driven routing
  - Sorting modes (`Latest`, `Trending`, `Most Read`, `Featured`)
  - View layout switcher (`Grid` vs. `List`) with client pagination / Load More
  - Dynamic BreadcrumbList JSON-LD and CollectionPage metadata

- **Phase 4 — Universal Content Model & Local Repository**
  - Decoupled `NewsRepository` abstraction interface
  - High-fidelity, normalized mock dataset with live updates, sources, and fact sheets
  - Pure TypeScript runtime validators and injection guards (`src/data/validation.ts`)
  - Hot-swappable in-memory provider (`setStoriesProvider`) for seamless database migration
  - Complete architectural blueprint and schema DDL (`docs/news-content-model.md`)

---

## 🛠️ Tech Stack

- **Frontend Framework**: React 19 (`react`, `react-dom`)
- **Language**: TypeScript (`strict` mode)
- **Styling**: Tailwind CSS
- **Bundler / Dev Server**: Vite
- **Icons & Motion**: Lucide React, Motion
- **Architecture**: Repository Pattern, Local Content Modeling

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
# The application will be running at http://localhost:3000/
```

### Quality Assurance & Testing

```bash
# Run TypeScript type-checker
npm run lint

# Run production build
npm run build

# Run automated Phase 4 verification test suite (28 tests)
npx tsx test_phase4.ts
```

---

## 📖 Architecture & Documentation

For detailed specifications on the data models, repository contract, and the Phase 5 PostgreSQL / Supabase migration plan, see:
- [`docs/news-content-model.md`](docs/news-content-model.md)

---

## 📄 License

Apache-2.0
