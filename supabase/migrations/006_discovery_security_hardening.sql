-- Migration: 006_discovery_security_hardening.sql
-- Description: Revoke all public/anonymous access to discovery engine tables and restrict to service role

-- 1. DROP ALL PUBLIC POLICIES
DROP POLICY IF EXISTS sources_public_read ON news_sources;
DROP POLICY IF EXISTS sources_public_insert ON news_sources;
DROP POLICY IF EXISTS sources_public_update ON news_sources;

DROP POLICY IF EXISTS discovery_public_read ON news_discovery_items;
DROP POLICY IF EXISTS discovery_public_insert ON news_discovery_items;
DROP POLICY IF EXISTS discovery_public_update ON news_discovery_items;

DROP POLICY IF EXISTS runs_public_read ON discovery_runs;
DROP POLICY IF EXISTS runs_public_insert ON discovery_runs;
DROP POLICY IF EXISTS runs_public_update ON discovery_runs;

-- 2. REVOKE ALL PRIVILEGES FROM PUBLIC, ANON, AND AUTHENTICATED ROLES
REVOKE ALL ON TABLE news_sources FROM anon, authenticated, public;
REVOKE ALL ON TABLE news_discovery_items FROM anon, authenticated, public;
REVOKE ALL ON TABLE discovery_runs FROM anon, authenticated, public;

-- 3. ENSURE ROW LEVEL SECURITY IS ENFORCED
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_discovery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_runs ENABLE ROW LEVEL SECURITY;

-- 4. GRANT PRIVILEGED ACCESS EXCLUSIVELY TO SERVICE ROLE
GRANT ALL ON TABLE news_sources, news_discovery_items, discovery_runs TO service_role;

-- 5. UPDATE INACTIVE / FIXED SOURCE FEEDS
UPDATE news_sources
SET feed_url = 'https://feeds.arstechnica.com/arstechnica/index',
    updated_at = NOW()
WHERE slug = 'ars-technica' OR id = 'src-ars-technica';

UPDATE news_sources
SET is_active = false,
    updated_at = NOW()
WHERE slug = 'anthropic-news' OR id = 'src-anthropic-news';

UPDATE news_sources
SET is_active = false,
    updated_at = NOW()
WHERE slug = 'cnbc-economy' OR id = 'src-cnbc-economy';
