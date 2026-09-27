-- Migration: 011_automation_scheduler_schema.sql
-- Description: Schema for Universal Automation Scheduler & Pipeline Orchestrator (Phase 10)
-- Tables: automation_locks, automation_runs, automation_events, automation_schedules

-- 1. AUTOMATION RUN LOCKS (DISTRIBUTED DATABASE-SAFE MUTEX)
CREATE TABLE IF NOT EXISTS automation_locks (
    lock_name VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_automation_locks_expires ON automation_locks(expires_at);

-- 2. AUTOMATION RUNS TABLE (ORCHESTRATOR & STAGE TELEMETRY)
CREATE TABLE IF NOT EXISTS automation_runs (
    id VARCHAR(64) PRIMARY KEY,
    run_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued' 
        CHECK (status IN ('queued', 'running', 'completed', 'partial', 'failed', 'skipped', 'disabled')),
    trigger VARCHAR(32) NOT NULL DEFAULT 'cron' 
        CHECK (trigger IN ('cron', 'manual', 'api', 'retry', 'dependency', 'dry_run')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms INT,
    sources INT NOT NULL DEFAULT 0,
    processed INT NOT NULL DEFAULT 0,
    succeeded INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    skipped INT NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_started_at ON automation_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_type ON automation_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation_runs(status);

-- 3. AUTOMATION EVENTS TABLE (GRANULAR AUDIT & INCIDENT LOG)
CREATE TABLE IF NOT EXISTS automation_events (
    id VARCHAR(64) PRIMARY KEY,
    run_id VARCHAR(64) REFERENCES automation_runs(id) ON DELETE CASCADE,
    stage VARCHAR(32) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'info' 
        CHECK (severity IN ('info', 'warn', 'error', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_events_run_id ON automation_events(run_id);
CREATE INDEX IF NOT EXISTS idx_automation_events_created_at ON automation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_events_stage ON automation_events(stage);
CREATE INDEX IF NOT EXISTS idx_automation_events_type ON automation_events(event_type);

-- 4. AUTOMATION SCHEDULES & STAGE TRACKING TABLE
CREATE TABLE IF NOT EXISTS automation_schedules (
    stage VARCHAR(32) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    target_interval_minutes INT NOT NULL DEFAULT 10,
    max_batch_size INT NOT NULL DEFAULT 5,
    last_run_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    next_due_at TIMESTAMPTZ,
    consecutive_failures INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial stage schedules
INSERT INTO automation_schedules (stage, enabled, target_interval_minutes, max_batch_size, next_due_at)
VALUES 
    ('discovery', true, 60, 5, NOW()),
    ('extraction', true, 10, 5, NOW()),
    ('validation', true, 10, 10, NOW()),
    ('lifecycle', true, 10, 10, NOW()),
    ('publishing', true, 10, 5, NOW())
ON CONFLICT (stage) DO NOTHING;

-- 5. ROW LEVEL SECURITY (STRICT SERVER-SIDE ISOLATION)
ALTER TABLE automation_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_schedules ENABLE ROW LEVEL SECURITY;

-- Revoke all public / anonymous access on internal automation tables
REVOKE ALL ON TABLE automation_locks FROM anon, authenticated, public;
REVOKE ALL ON TABLE automation_runs FROM anon, authenticated, public;
REVOKE ALL ON TABLE automation_events FROM anon, authenticated, public;
REVOKE ALL ON TABLE automation_schedules FROM anon, authenticated, public;

-- Grant privileged access strictly to service_role
GRANT ALL ON TABLE automation_locks TO service_role;
GRANT ALL ON TABLE automation_runs TO service_role;
GRANT ALL ON TABLE automation_events TO service_role;
GRANT ALL ON TABLE automation_schedules TO service_role;
