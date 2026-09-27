-- Migration: 005_discovery_permissions.sql
-- Description: Enable mutation permissions for news_sources, news_discovery_items, and discovery_runs

-- 1. Table Grants for anon and authenticated
GRANT ALL ON news_sources, news_discovery_items, discovery_runs TO anon, authenticated;

-- 2. Row Level Security Policies for Mutations
DO $$
BEGIN
    -- news_sources
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sources_public_insert') THEN
        CREATE POLICY sources_public_insert ON news_sources FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sources_public_update') THEN
        CREATE POLICY sources_public_update ON news_sources FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;

    -- news_discovery_items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discovery_public_insert') THEN
        CREATE POLICY discovery_public_insert ON news_discovery_items FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'discovery_public_update') THEN
        CREATE POLICY discovery_public_update ON news_discovery_items FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;

    -- discovery_runs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'runs_public_insert') THEN
        CREATE POLICY runs_public_insert ON discovery_runs FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'runs_public_update') THEN
        CREATE POLICY runs_public_update ON discovery_runs FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;
END $$;
