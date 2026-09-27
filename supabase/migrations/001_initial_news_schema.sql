-- Migration: 001_initial_news_schema.sql
-- Description: Core Schema for The Meridian Global News Platform
-- Tables: categories, subcategories, authors, stories, story_sources, story_updates, story_facts, story_corrections, story_relationships

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_category_subcategory UNIQUE (category_id, slug)
);

-- 3. AUTHORS TABLE
CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. STORIES TABLE
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  dek TEXT,
  summary TEXT NOT NULL,
  summary_points JSONB,
  category_id TEXT NOT NULL REFERENCES categories(id),
  subcategory_id TEXT REFERENCES subcategories(id),
  author_id TEXT NOT NULL REFERENCES authors(id),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'developing', 'updated', 'archived')),
  hero_image_url TEXT,
  hero_image_alt TEXT,
  hero_image_caption TEXT,
  hero_image_credit TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_seen_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  trending_score FLOAT NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. STORY SOURCES TABLE
CREATE TABLE IF NOT EXISTS story_sources (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  source_type TEXT NOT NULL DEFAULT 'other' CHECK (source_type IN ('official', 'publisher', 'press_release', 'public_feed', 'other')),
  published_at TIMESTAMPTZ,
  accessed_at TIMESTAMPTZ,
  author TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. STORY UPDATES TABLE
CREATE TABLE IF NOT EXISTS story_updates (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT,
  body TEXT NOT NULL,
  source_id TEXT REFERENCES story_sources(id) ON DELETE SET NULL,
  is_major BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. STORY FACTS TABLE
CREATE TABLE IF NOT EXISTS story_facts (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. STORY CORRECTIONS TABLE
CREATE TABLE IF NOT EXISTS story_corrections (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  summary TEXT,
  body TEXT NOT NULL,
  author_id TEXT REFERENCES authors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. STORY RELATIONSHIPS TABLE
CREATE TABLE IF NOT EXISTS story_relationships (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  related_story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'related' CHECK (relationship_type IN ('related', 'follow_up', 'same_topic', 'same_entity')),
  score FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_no_self_relationship CHECK (story_id != related_story_id),
  CONSTRAINT unique_story_relationship UNIQUE (story_id, related_story_id)
);

-- 10. INDEXES
CREATE INDEX IF NOT EXISTS idx_stories_slug ON stories(slug);
CREATE INDEX IF NOT EXISTS idx_stories_category_id ON stories(category_id);
CREATE INDEX IF NOT EXISTS idx_stories_subcategory_id ON stories(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_stories_published_at ON stories(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_updated_at ON stories(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_is_featured ON stories(is_featured);
CREATE INDEX IF NOT EXISTS idx_stories_trending_score ON stories(trending_score DESC);

CREATE INDEX IF NOT EXISTS idx_story_sources_story_id ON story_sources(story_id);
CREATE INDEX IF NOT EXISTS idx_story_updates_story_id ON story_updates(story_id);
CREATE INDEX IF NOT EXISTS idx_story_facts_story_id ON story_facts(story_id);
CREATE INDEX IF NOT EXISTS idx_story_corrections_story_id ON story_corrections(story_id);
CREATE INDEX IF NOT EXISTS idx_story_relationships_story_id ON story_relationships(story_id);

-- 11. ROW LEVEL SECURITY (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_relationships ENABLE ROW LEVEL SECURITY;

-- 12. PUBLIC READ POLICIES (Published and Active Content Only)
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view active subcategories"
  ON subcategories FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view authors"
  ON authors FOR SELECT USING (true);

CREATE POLICY "Public can view published stories"
  ON stories FOR SELECT USING (status = 'published');

CREATE POLICY "Public can view sources for published stories"
  ON story_sources FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_sources.story_id AND stories.status = 'published')
  );

CREATE POLICY "Public can view updates for published stories"
  ON story_updates FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_updates.story_id AND stories.status = 'published')
  );

CREATE POLICY "Public can view facts for published stories"
  ON story_facts FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_facts.story_id AND stories.status = 'published')
  );

CREATE POLICY "Public can view corrections for published stories"
  ON story_corrections FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_corrections.story_id AND stories.status = 'published')
  );

CREATE POLICY "Public can view relationships for published stories"
  ON story_relationships FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_relationships.story_id AND stories.status = 'published')
  );
