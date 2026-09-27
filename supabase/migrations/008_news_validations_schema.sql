-- Migration: 008_news_validations_schema.sql
-- Description: Schema for Independent News Fact Validation Engine (Phase 7)

-- 1. NEWS VALIDATIONS TABLE
CREATE TABLE IF NOT EXISTS news_validations (
    id VARCHAR(64) PRIMARY KEY,
    extraction_id VARCHAR(64) NOT NULL REFERENCES news_extractions(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL CHECK (status IN ('valid', 'needs_review', 'rejected', 'insufficient_evidence')),
    overall_score FLOAT NOT NULL,
    
    issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    validated_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    rejected_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    claim_coverage FLOAT NOT NULL DEFAULT 0.0,
    source_coverage FLOAT NOT NULL DEFAULT 0.0,
    
    category_status VARCHAR(32),
    date_status VARCHAR(32),
    number_status VARCHAR(32),
    quote_status VARCHAR(32),
    entity_status VARCHAR(32),
    
    sensitive_topic_flags JSONB DEFAULT '[]'::jsonb,
    validator_version VARCHAR(64) NOT NULL,
    input_hash VARCHAR(64) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_validation_idempotency UNIQUE (extraction_id, input_hash, validator_version)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_validations_extraction_id ON news_validations(extraction_id);
CREATE INDEX IF NOT EXISTS idx_validations_status ON news_validations(status);
CREATE INDEX IF NOT EXISTS idx_validations_created_at ON news_validations(created_at DESC);

-- 3. ROW LEVEL SECURITY (HARDENED INTERNAL ACCESS ONLY)
ALTER TABLE news_validations ENABLE ROW LEVEL SECURITY;

-- Revoke all public / anonymous privileges
REVOKE ALL ON TABLE news_validations FROM anon, authenticated, public;

-- Grant privileged access strictly to service_role
GRANT ALL ON TABLE news_validations TO service_role;
