-- Migration: 009_story_lifecycle_schema.sql
-- Description: Schema for Universal Story Lifecycle Engine (Phase 8)
-- Tables: story_clusters, story_lifecycle_events, alterations to stories

-- 1. STORY CLUSTERS TABLE
CREATE TABLE IF NOT EXISTS story_clusters (
    id VARCHAR(64) PRIMARY KEY,
    cluster_key VARCHAR(128) UNIQUE NOT NULL,
    canonical_title TEXT NOT NULL,
    primary_category VARCHAR(64) NOT NULL,
    primary_subcategory VARCHAR(64),
    event_date TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_clusters_cluster_key ON story_clusters(cluster_key);
CREATE INDEX IF NOT EXISTS idx_story_clusters_status ON story_clusters(status);
CREATE INDEX IF NOT EXISTS idx_story_clusters_created_at ON story_clusters(created_at DESC);

-- 2. ALTER STORIES TABLE (ADD CLUSTER_ID AND CONTENT_VERSION)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'cluster_id'
    ) THEN
        ALTER TABLE stories ADD COLUMN cluster_id VARCHAR(64) REFERENCES story_clusters(id) ON DELETE SET NULL;
        CREATE INDEX idx_stories_cluster_id ON stories(cluster_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'content_version'
    ) THEN
        ALTER TABLE stories ADD COLUMN content_version INT NOT NULL DEFAULT 1;
    END IF;
END $$;

-- 3. ENSURE MERIDIAN DESK AUTHOR EXISTS
INSERT INTO authors (id, name, slug, bio, role)
VALUES (
    'auth-meridian-desk',
    'The Meridian Newsroom Desk',
    'meridian-desk',
    'Automated editorial curation and factual synthesis by The Meridian Global Intelligence Desk.',
    'Editorial Staff Desk'
)
ON CONFLICT (id) DO NOTHING;

-- 4. STORY LIFECYCLE EVENTS (INTERNAL AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS story_lifecycle_events (
    id VARCHAR(64) PRIMARY KEY,
    story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
    cluster_id VARCHAR(64) REFERENCES story_clusters(id) ON DELETE SET NULL,
    action VARCHAR(32) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'NO_OP', 'HOLD', 'REJECT')),
    extraction_id VARCHAR(64) REFERENCES news_extractions(id) ON DELETE SET NULL,
    validation_id VARCHAR(64) REFERENCES news_validations(id) ON DELETE SET NULL,
    match_confidence VARCHAR(16) NOT NULL DEFAULT 'none' CHECK (match_confidence IN ('high', 'medium', 'low', 'none')),
    match_reason VARCHAR(64) NOT NULL DEFAULT 'NO_MATCH',
    reason TEXT NOT NULL,
    changed_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    lifecycle_version VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_lifecycle_idempotency UNIQUE (extraction_id, validation_id, lifecycle_version)
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_story_id ON story_lifecycle_events(story_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_cluster_id ON story_lifecycle_events(cluster_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_action ON story_lifecycle_events(action);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_created_at ON story_lifecycle_events(created_at DESC);

-- 5. ROW LEVEL SECURITY (HARDENED INTERNAL ACCESS ONLY)
ALTER TABLE story_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- Revoke all public / anonymous privileges on internal lifecycle tables
REVOKE ALL ON TABLE story_clusters FROM anon, authenticated, public;
REVOKE ALL ON TABLE story_lifecycle_events FROM anon, authenticated, public;

-- Grant privileged access strictly to service_role
GRANT ALL ON TABLE story_clusters TO service_role;
GRANT ALL ON TABLE story_lifecycle_events TO service_role;
