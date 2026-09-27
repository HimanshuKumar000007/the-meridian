-- Migration: 007_news_extractions_schema.sql
-- Description: Schema for Universal News Extraction Engine (Phase 6)

-- 1. NEWS EXTRACTIONS TABLE
CREATE TABLE IF NOT EXISTS news_extractions (
    id VARCHAR(64) PRIMARY KEY,
    discovery_item_id VARCHAR(64) NOT NULL REFERENCES news_discovery_items(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'needs_review', 'failed')),
    model VARCHAR(128) NOT NULL,
    prompt_version VARCHAR(64) NOT NULL,
    input_hash VARCHAR(64) NOT NULL,
    output_hash VARCHAR(64),
    
    title TEXT,
    dek TEXT,
    summary TEXT,
    summary_points JSONB DEFAULT '[]'::jsonb,
    
    category VARCHAR(64),
    subcategory VARCHAR(64),
    classification_confidence FLOAT,
    
    content JSONB DEFAULT '[]'::jsonb,
    facts JSONB DEFAULT '[]'::jsonb,
    entities JSONB DEFAULT '[]'::jsonb,
    timeline_candidates JSONB DEFAULT '[]'::jsonb,
    source_evidence JSONB DEFAULT '[]'::jsonb,
    
    overall_confidence FLOAT,
    has_conflicts BOOLEAN NOT NULL DEFAULT false,
    conflict_details TEXT,
    
    error_code VARCHAR(64),
    error_message TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_extraction_idempotency UNIQUE (discovery_item_id, input_hash, prompt_version)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_extractions_discovery_item ON news_extractions(discovery_item_id);
CREATE INDEX IF NOT EXISTS idx_extractions_status ON news_extractions(status);
CREATE INDEX IF NOT EXISTS idx_extractions_category ON news_extractions(category);
CREATE INDEX IF NOT EXISTS idx_extractions_created_at ON news_extractions(created_at DESC);

-- 3. ROW LEVEL SECURITY (HARDENED INTERNAL ACCESS ONLY)
ALTER TABLE news_extractions ENABLE ROW LEVEL SECURITY;

-- Revoke all public / anonymous privileges
REVOKE ALL ON TABLE news_extractions FROM anon, authenticated, public;

-- Grant privileged access strictly to service_role
GRANT ALL ON TABLE news_extractions TO service_role;
