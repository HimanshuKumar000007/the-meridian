-- Migration: 004_discovery_engine_schema.sql
-- The Meridian — Universal News Source Discovery Engine Schema

-- 1. NEWS SOURCES REGISTRY
CREATE TABLE IF NOT EXISTS news_sources (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'rss',
    feed_url TEXT NOT NULL,
    base_url TEXT NOT NULL,
    country VARCHAR(16) NOT NULL DEFAULT 'Global',
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    priority INTEGER NOT NULL DEFAULT 2,
    poll_interval_minutes INTEGER NOT NULL DEFAULT 15,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_checked_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    etag TEXT,
    last_modified TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DISCOVERY ITEMS QUEUE
CREATE TABLE IF NOT EXISTS news_discovery_items (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES news_sources(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    fingerprint VARCHAR(128) UNIQUE NOT NULL,
    canonical_url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    published_at TIMESTAMPTZ,
    source_updated_at TIMESTAMPTZ,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'new',
    category_hint VARCHAR(64),
    subcategory_hint VARCHAR(64),
    author VARCHAR(255),
    image_url TEXT,
    raw_payload JSONB,
    content_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_discovery_status CHECK (status IN ('new', 'candidate', 'possible_update', 'duplicate', 'processed', 'failed'))
);

-- 3. DISCOVERY RUN AUDIT LOG
CREATE TABLE IF NOT EXISTS discovery_runs (
    id VARCHAR(64) PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    sources_attempted INTEGER NOT NULL DEFAULT 0,
    sources_succeeded INTEGER NOT NULL DEFAULT 0,
    sources_failed INTEGER NOT NULL DEFAULT 0,
    items_seen INTEGER NOT NULL DEFAULT 0,
    new_items INTEGER NOT NULL DEFAULT 0,
    possible_updates INTEGER NOT NULL DEFAULT 0,
    duplicates INTEGER NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_sources_active_poll ON news_sources(is_active, last_checked_at);
CREATE INDEX IF NOT EXISTS idx_sources_priority ON news_sources(priority);
CREATE INDEX IF NOT EXISTS idx_discovery_fingerprint ON news_discovery_items(fingerprint);
CREATE INDEX IF NOT EXISTS idx_discovery_canonical_url ON news_discovery_items(canonical_url);
CREATE INDEX IF NOT EXISTS idx_discovery_source_status ON news_discovery_items(source_id, status);
CREATE INDEX IF NOT EXISTS idx_discovery_published ON news_discovery_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_discovered ON news_discovery_items(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_started ON discovery_runs(started_at DESC);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_discovery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_runs ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated read-only visibility
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sources_public_read') THEN
        CREATE POLICY sources_public_read ON news_sources FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discovery_public_read') THEN
        CREATE POLICY discovery_public_read ON news_discovery_items FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'runs_public_read') THEN
        CREATE POLICY runs_public_read ON discovery_runs FOR SELECT TO public USING (true);
    END IF;
END $$;

-- Table Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON news_sources, news_discovery_items, discovery_runs TO anon, authenticated;
-- Mutation permissions are intentionally reserved for service_role / postgres
