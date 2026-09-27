-- ==============================================================================
-- Migration: 013_monitoring_reliability_observability_schema.sql
-- Description: Phase 14 Production Monitoring, Reliability & Observability Engine
-- Author: The Meridian Engineering Team
-- ==============================================================================

-- 1. Create monitoring_alerts table
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    service TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'acknowledged', 'resolved')),
    message TEXT NOT NULL,
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for monitoring_alerts
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_active 
    ON public.monitoring_alerts (code, service, status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status 
    ON public.monitoring_alerts (status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_service 
    ON public.monitoring_alerts (service);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity 
    ON public.monitoring_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at 
    ON public.monitoring_alerts (created_at DESC);

-- 2. Create monitoring_snapshots table
CREATE TABLE IF NOT EXISTS public.monitoring_snapshots (
    id TEXT PRIMARY KEY,
    system_status TEXT NOT NULL CHECK (system_status IN ('healthy', 'degraded', 'failed')),
    service_statuses JSONB NOT NULL DEFAULT '{}'::jsonb,
    queue_depths JSONB NOT NULL DEFAULT '{}'::jsonb,
    latest_runs JSONB NOT NULL DEFAULT '{}'::jsonb,
    latency_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    alert_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for monitoring_snapshots
CREATE INDEX IF NOT EXISTS idx_monitoring_snapshots_created_at 
    ON public.monitoring_snapshots (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_snapshots_status 
    ON public.monitoring_snapshots (system_status);

-- 3. Row-Level Security (RLS) Policies
-- Strict isolation: Public/anonymous users have ZERO access to monitoring data.
-- Only authenticated service role has full access.

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_snapshots ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions from public and anon
REVOKE ALL ON public.monitoring_alerts FROM anon, public;
REVOKE ALL ON public.monitoring_snapshots FROM anon, public;

-- Grant permissions to authenticated service_role
GRANT ALL ON public.monitoring_alerts TO service_role;
GRANT ALL ON public.monitoring_snapshots TO service_role;

-- RLS Policies for monitoring_alerts
DROP POLICY IF EXISTS "Deny public select on monitoring_alerts" ON public.monitoring_alerts;
CREATE POLICY "Deny public select on monitoring_alerts"
    ON public.monitoring_alerts
    FOR SELECT
    TO anon, public
    USING (false);

DROP POLICY IF EXISTS "Deny public insert on monitoring_alerts" ON public.monitoring_alerts;
CREATE POLICY "Deny public insert on monitoring_alerts"
    ON public.monitoring_alerts
    FOR INSERT
    TO anon, public
    WITH CHECK (false);

DROP POLICY IF EXISTS "Deny public update on monitoring_alerts" ON public.monitoring_alerts;
CREATE POLICY "Deny public update on monitoring_alerts"
    ON public.monitoring_alerts
    FOR UPDATE
    TO anon, public
    USING (false);

DROP POLICY IF EXISTS "Deny public delete on monitoring_alerts" ON public.monitoring_alerts;
CREATE POLICY "Deny public delete on monitoring_alerts"
    ON public.monitoring_alerts
    FOR DELETE
    TO anon, public
    USING (false);

DROP POLICY IF EXISTS "Service role full access on monitoring_alerts" ON public.monitoring_alerts;
CREATE POLICY "Service role full access on monitoring_alerts"
    ON public.monitoring_alerts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for monitoring_snapshots
DROP POLICY IF EXISTS "Deny public select on monitoring_snapshots" ON public.monitoring_snapshots;
CREATE POLICY "Deny public select on monitoring_snapshots"
    ON public.monitoring_snapshots
    FOR SELECT
    TO anon, public
    USING (false);

DROP POLICY IF EXISTS "Deny public insert on monitoring_snapshots" ON public.monitoring_snapshots;
CREATE POLICY "Deny public insert on monitoring_snapshots"
    ON public.monitoring_snapshots
    FOR INSERT
    TO anon, public
    WITH CHECK (false);

DROP POLICY IF EXISTS "Deny public update on monitoring_snapshots" ON public.monitoring_snapshots;
CREATE POLICY "Deny public update on monitoring_snapshots"
    ON public.monitoring_snapshots
    FOR UPDATE
    TO anon, public
    USING (false);

DROP POLICY IF EXISTS "Deny public delete on monitoring_snapshots" ON public.monitoring_snapshots;
CREATE POLICY "Deny public delete on monitoring_snapshots"
    ON public.monitoring_snapshots
    FOR DELETE
    TO anon, public
    USING (false);

DROP POLICY IF EXISTS "Service role full access on monitoring_snapshots" ON public.monitoring_snapshots;
CREATE POLICY "Service role full access on monitoring_snapshots"
    ON public.monitoring_snapshots
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
