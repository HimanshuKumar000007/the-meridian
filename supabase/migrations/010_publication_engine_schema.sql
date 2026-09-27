-- Migration: 010_publication_engine_schema.sql
-- Description: Schema for Automated Publishing & Web Distribution Engine (Phase 9)
-- Tables: publication_queue, publication_events, publication_runs, alter stories

-- 1. ALTER STORIES TABLE (ADD PUBLISHED_VERSION AND ALLOW HELD/READY STATUS)
DO $$
BEGIN
    -- Add published_version if not present
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'published_version'
    ) THEN
        ALTER TABLE stories ADD COLUMN published_version INT NOT NULL DEFAULT 1;
        CREATE INDEX IF NOT EXISTS idx_stories_published_version ON stories(published_version);
    END IF;

    -- Update check constraint on status if necessary to permit 'ready' and 'held'
    IF EXISTS (
        SELECT 1 FROM pg_constraint c 
        JOIN pg_class t ON c.conrelid = t.oid 
        WHERE t.relname = 'stories' AND c.conname = 'stories_status_check'
    ) THEN
        ALTER TABLE stories DROP CONSTRAINT stories_status_check;
        ALTER TABLE stories ADD CONSTRAINT stories_status_check 
            CHECK (status IN ('draft', 'ready', 'held', 'published', 'developing', 'updated', 'archived'));
    END IF;
END $$;

-- 2. PUBLICATION QUEUE TABLE
CREATE TABLE IF NOT EXISTS publication_queue (
    id VARCHAR(64) PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    lifecycle_event_id VARCHAR(64) REFERENCES story_lifecycle_events(id) ON DELETE SET NULL,
    priority INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'published', 'held', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    scheduled_for TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    last_error TEXT,
    content_hash VARCHAR(128),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pub_queue_status_sched ON publication_queue(status, scheduled_for, priority DESC);
CREATE INDEX IF NOT EXISTS idx_pub_queue_story_id ON publication_queue(story_id);
CREATE INDEX IF NOT EXISTS idx_pub_queue_created_at ON publication_queue(created_at DESC);

-- 3. PUBLICATION EVENTS TABLE (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS publication_events (
    id VARCHAR(64) PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    lifecycle_event_id VARCHAR(64) REFERENCES story_lifecycle_events(id) ON DELETE SET NULL,
    action VARCHAR(32) NOT NULL CHECK (action IN ('PUBLISH', 'HOLD', 'REJECT', 'UNPUBLISH')),
    previous_status VARCHAR(32) NOT NULL,
    new_status VARCHAR(32) NOT NULL,
    publication_version INT NOT NULL DEFAULT 1,
    reason VARCHAR(64) NOT NULL,
    blocking_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation_id VARCHAR(64) REFERENCES news_validations(id) ON DELETE SET NULL,
    extraction_id VARCHAR(64) REFERENCES news_extractions(id) ON DELETE SET NULL,
    content_hash VARCHAR(128),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_publication_event_version UNIQUE (story_id, publication_version, action)
);

CREATE INDEX IF NOT EXISTS idx_pub_events_story_id ON publication_events(story_id);
CREATE INDEX IF NOT EXISTS idx_pub_events_action ON publication_events(action);
CREATE INDEX IF NOT EXISTS idx_pub_events_created_at ON publication_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pub_events_lifecycle_id ON publication_events(lifecycle_event_id);

-- 4. PUBLICATION RUNS TABLE (OPERATIONAL MONITORING & TELEMETRY)
CREATE TABLE IF NOT EXISTS publication_runs (
    id VARCHAR(64) PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    processed INT NOT NULL DEFAULT 0,
    published INT NOT NULL DEFAULT 0,
    updated INT NOT NULL DEFAULT 0,
    held INT NOT NULL DEFAULT 0,
    rejected INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pub_runs_started_at ON publication_runs(started_at DESC);

-- 5. ROW LEVEL SECURITY (HARDENED INTERNAL ACCESS ONLY)
ALTER TABLE publication_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_runs ENABLE ROW LEVEL SECURITY;

-- Revoke all public / anonymous access on internal publication tables
REVOKE ALL ON TABLE publication_queue FROM anon, authenticated, public;
REVOKE ALL ON TABLE publication_events FROM anon, authenticated, public;
REVOKE ALL ON TABLE publication_runs FROM anon, authenticated, public;

-- Grant privileged access strictly to service_role
GRANT ALL ON TABLE publication_queue TO service_role;
GRANT ALL ON TABLE publication_events TO service_role;
GRANT ALL ON TABLE publication_runs TO service_role;
