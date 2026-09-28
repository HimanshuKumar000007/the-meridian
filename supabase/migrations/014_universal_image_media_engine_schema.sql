-- ==============================================================================
-- Migration: 014_universal_image_media_engine_schema.sql
-- Description: Phase 14A Universal Image & Media Engine Schema
-- Author: The Meridian Engineering Team
-- ==============================================================================

-- 1. Create media_assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
    id TEXT PRIMARY KEY,
    story_id TEXT REFERENCES public.stories(id) ON DELETE SET NULL,
    asset_type TEXT NOT NULL DEFAULT 'image' CHECK (asset_type IN ('image', 'video', 'audio', 'document', 'illustration')),
    source_type TEXT NOT NULL CHECK (source_type IN (
        'official', 'publisher', 'licensed', 'stock', 'public_domain',
        'user_provided', 'ai_generated', 'existing_asset', 'fallback', 'unknown'
    )),
    source_url TEXT,
    original_url TEXT,
    storage_url TEXT NOT NULL,
    rights_status TEXT NOT NULL DEFAULT 'unknown' CHECK (rights_status IN (
        'verified', 'licensed', 'public_domain', 'permission_granted',
        'unknown', 'restricted', 'rejected'
    )),
    provenance_status TEXT NOT NULL DEFAULT 'unknown' CHECK (provenance_status IN (
        'verified', 'partially_verified', 'unknown', 'missing'
    )),
    validation_status TEXT NOT NULL DEFAULT 'candidate' CHECK (validation_status IN (
        'candidate', 'processing', 'approved', 'rejected', 'needs_review', 'fallback'
    )),
    license TEXT,
    license_url TEXT,
    credit TEXT,
    caption TEXT,
    alt_text TEXT,
    width INTEGER,
    height INTEGER,
    aspect_ratio TEXT,
    format TEXT,
    file_size INTEGER,
    mime_type TEXT,
    image_hash TEXT,
    is_illustrative BOOLEAN NOT NULL DEFAULT false,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    derivatives JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for media_assets
CREATE INDEX IF NOT EXISTS idx_media_assets_story_id ON public.media_assets (story_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON public.media_assets (image_hash);
CREATE INDEX IF NOT EXISTS idx_media_assets_validation ON public.media_assets (validation_status);
CREATE INDEX IF NOT EXISTS idx_media_assets_rights ON public.media_assets (rights_status);
CREATE INDEX IF NOT EXISTS idx_media_assets_source_type ON public.media_assets (source_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON public.media_assets (created_at DESC);

-- 2. Create media_processing_queue table
CREATE TABLE IF NOT EXISTS public.media_processing_queue (
    id TEXT PRIMARY KEY,
    story_id TEXT,
    media_id TEXT REFERENCES public.media_assets(id) ON DELETE SET NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('discover', 'download', 'validate', 'optimize', 'generate', 'attach', 'replace')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for media_processing_queue
CREATE INDEX IF NOT EXISTS idx_media_queue_status_sched ON public.media_processing_queue (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_media_queue_story_id ON public.media_processing_queue (story_id);
CREATE INDEX IF NOT EXISTS idx_media_queue_created_at ON public.media_processing_queue (created_at DESC);

-- 3. Create media_audit_events table
CREATE TABLE IF NOT EXISTS public.media_audit_events (
    id TEXT PRIMARY KEY,
    media_id TEXT,
    story_id TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'MEDIA_DISCOVERED', 'MEDIA_VALIDATED', 'MEDIA_APPROVED', 'MEDIA_REJECTED',
        'MEDIA_ATTACHED', 'MEDIA_REPLACED', 'MEDIA_REVOKED', 'MEDIA_FALLBACK_SELECTED', 'MEDIA_GENERATED'
    )),
    reason TEXT NOT NULL,
    source TEXT,
    actor TEXT NOT NULL DEFAULT 'system',
    old_media_id TEXT,
    new_media_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for media_audit_events
CREATE INDEX IF NOT EXISTS idx_media_audit_media_id ON public.media_audit_events (media_id);
CREATE INDEX IF NOT EXISTS idx_media_audit_story_id ON public.media_audit_events (story_id);
CREATE INDEX IF NOT EXISTS idx_media_audit_event_type ON public.media_audit_events (event_type);
CREATE INDEX IF NOT EXISTS idx_media_audit_created_at ON public.media_audit_events (created_at DESC);

-- 4. Extend stories table with hero_media_id and media_gallery
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS hero_media_id TEXT REFERENCES public.media_assets(id) ON DELETE SET NULL;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS media_gallery JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_stories_hero_media_id ON public.stories (hero_media_id);

-- 5. Row-Level Security (RLS) Policies
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_audit_events ENABLE ROW LEVEL SECURITY;

-- media_assets policies:
-- Public / anonymous users may ONLY view approved or fallback media assets
DROP POLICY IF EXISTS media_assets_public_read ON public.media_assets;
CREATE POLICY media_assets_public_read ON public.media_assets
    FOR SELECT
    TO anon, authenticated
    USING (validation_status IN ('approved', 'fallback'));

-- Strict write protection: NO public/anonymous insert, update, or delete
DROP POLICY IF EXISTS media_assets_service_role ON public.media_assets;
CREATE POLICY media_assets_service_role ON public.media_assets
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- media_processing_queue policies:
-- Strictly internal; service_role only
DROP POLICY IF EXISTS media_queue_service_role ON public.media_processing_queue;
CREATE POLICY media_queue_service_role ON public.media_processing_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- media_audit_events policies:
-- Strictly internal audit trail; service_role only
DROP POLICY IF EXISTS media_audit_service_role ON public.media_audit_events;
CREATE POLICY media_audit_service_role ON public.media_audit_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Permissions and Role Grants
GRANT SELECT ON public.media_assets TO anon, authenticated;
GRANT ALL ON public.media_assets, public.media_processing_queue, public.media_audit_events TO service_role;
