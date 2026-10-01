-- ==============================================================================
-- Migration: 015_approved_source_registry.sql
-- Description: Multi-Source Research Architecture Approved Source Registry
-- Fields: sourceId, sourceName, category, sourceType, feedUrl, active,
--         authorityLevel, allowedUsage, discoveryRole, evidenceRole,
--         pollingCadence, status, lastSuccess, lastFailure, errorCount
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.research_source_registry (
    source_id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('AI', 'TECHNOLOGY', 'SCIENCE', 'GAMING', 'SPACE', 'BUSINESS', 'BACKSTOP')),
    source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'atom', 'official_feed')),
    feed_url TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    authority_level TEXT NOT NULL CHECK (authority_level IN ('primary_official', 'high_journalism', 'specialist_technical', 'lead_only')),
    allowed_usage TEXT NOT NULL CHECK (allowed_usage IN ('story_lead', 'full_reference', 'official_record')),
    discovery_role TEXT NOT NULL CHECK (discovery_role IN ('primary', 'independent_reporting', 'lead_only', 'technical_reporting', 'research_papers', 'backstop')),
    evidence_role TEXT NOT NULL CHECK (evidence_role IN ('primary_evidence', 'corroborating_evidence', 'lead_only', 'unusable_for_synthesis')),
    polling_cadence INTEGER NOT NULL DEFAULT 10 CHECK (polling_cadence >= 5),
    status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'failing', 'deactivated')),
    last_success TIMESTAMPTZ,
    last_failure TIMESTAMPTZ,
    error_count INTEGER NOT NULL DEFAULT 0,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for fast filtering and polling
CREATE INDEX IF NOT EXISTS idx_research_registry_category ON public.research_source_registry (category);
CREATE INDEX IF NOT EXISTS idx_research_registry_active ON public.research_source_registry (active);
CREATE INDEX IF NOT EXISTS idx_research_registry_status ON public.research_source_registry (status);
CREATE INDEX IF NOT EXISTS idx_research_registry_feed_url ON public.research_source_registry (feed_url);

-- RLS Security Policies
ALTER TABLE public.research_source_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public and anon can read research source registry"
    ON public.research_source_registry
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Service role has full control of research source registry"
    ON public.research_source_registry
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Seed candidate feeds with empirically verified statuses
INSERT INTO public.research_source_registry (
    source_id, source_name, category, source_type, feed_url, active,
    authority_level, allowed_usage, discovery_role, evidence_role,
    polling_cadence, status, failure_reason
) VALUES
-- AI Category
('src-openai-news', 'OpenAI News & Research', 'AI', 'rss', 'https://openai.com/news/rss.xml', true, 'primary_official', 'official_record', 'primary', 'primary_evidence', 10, 'healthy', NULL),
('src-nvidia-ai-blog', 'NVIDIA Blog', 'AI', 'rss', 'https://blogs.nvidia.com/feed/', true, 'primary_official', 'official_record', 'primary', 'primary_evidence', 10, 'healthy', NULL),
('src-techcrunch-ai', 'TechCrunch AI', 'AI', 'rss', 'https://techcrunch.com/category/artificial-intelligence/feed/', true, 'high_journalism', 'story_lead', 'lead_only', 'lead_only', 15, 'healthy', NULL),
('src-arstechnica-tech-lab', 'Ars Technica Tech Lab', 'AI', 'rss', 'https://feeds.arstechnica.com/arstechnica/technology-lab', true, 'high_journalism', 'story_lead', 'technical_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-deepmind-blog', 'Google DeepMind', 'AI', 'rss', 'https://deepmind.google/blog/rss.xml', false, 'primary_official', 'official_record', 'primary', 'unusable_for_synthesis', 30, 'deactivated', 'Google deprecated RSS feed endpoint (returns HTML only)'),
('src-anthropic-news', 'Anthropic News', 'AI', 'rss', 'https://www.anthropic.com/news/rss.xml', false, 'primary_official', 'official_record', 'primary', 'unusable_for_synthesis', 30, 'deactivated', 'HTTP 404 at candidate endpoint'),
('src-microsoft-ai-blog', 'Microsoft AI Blog', 'AI', 'rss', 'https://blogs.microsoft.com/ai/feed/', false, 'primary_official', 'official_record', 'primary', 'unusable_for_synthesis', 30, 'deactivated', 'HTTP 410 Gone at candidate endpoint'),

-- TECHNOLOGY Category
('src-arstechnica-tech', 'Ars Technica — Technology Lab', 'TECHNOLOGY', 'rss', 'https://feeds.arstechnica.com/arstechnica/index', true, 'high_journalism', 'story_lead', 'technical_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-the-verge-tech', 'The Verge — Tech Dispatches', 'TECHNOLOGY', 'atom', 'https://www.theverge.com/rss/index.xml', true, 'high_journalism', 'story_lead', 'independent_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-wired-tech', 'WIRED', 'TECHNOLOGY', 'rss', 'https://www.wired.com/feed/rss', true, 'high_journalism', 'story_lead', 'independent_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-mit-tech-review', 'MIT Technology Review', 'TECHNOLOGY', 'rss', 'https://www.technologyreview.com/feed/', true, 'high_journalism', 'story_lead', 'technical_reporting', 'corroborating_evidence', 30, 'healthy', NULL),
('src-apple-newsroom', 'Apple Newsroom', 'TECHNOLOGY', 'rss', 'https://www.apple.com/newsroom/rss-feed.rss', true, 'primary_official', 'official_record', 'primary', 'primary_evidence', 15, 'healthy', NULL),
('src-microsoft-blog', 'Microsoft Official Blog', 'TECHNOLOGY', 'rss', 'https://blogs.microsoft.com/feed/', true, 'primary_official', 'official_record', 'primary', 'primary_evidence', 15, 'healthy', NULL),
('src-techcrunch-main', 'TechCrunch Main', 'TECHNOLOGY', 'rss', 'https://techcrunch.com/feed/', false, 'high_journalism', 'story_lead', 'lead_only', 'lead_only', 15, 'deactivated', 'Socket hangup / unreachable during verification'),

-- SCIENCE Category
('src-science-aaas', 'Science / AAAS News', 'SCIENCE', 'rss', 'https://www.science.org/rss/news_current.xml', true, 'high_journalism', 'story_lead', 'research_papers', 'primary_evidence', 20, 'healthy', NULL),
('src-nasa-breaking', 'NASA News Releases & Missions', 'SCIENCE', 'rss', 'https://www.nasa.gov/news-release/feed/', true, 'primary_official', 'official_record', 'primary', 'primary_evidence', 15, 'healthy', NULL),
('src-esa-space-news', 'ESA Space News', 'SCIENCE', 'rss', 'https://www.esa.int/rssfeed/Our_Activities/Space_News', true, 'primary_official', 'official_record', 'primary', 'primary_evidence', 20, 'healthy', NULL),
('src-sciencedaily-top', 'ScienceDaily Top News', 'SCIENCE', 'rss', 'https://www.sciencedaily.com/rss/top/science.xml', true, 'high_journalism', 'story_lead', 'lead_only', 'lead_only', 20, 'healthy', NULL),
('src-arxiv-ai', 'arXiv cs.AI', 'SCIENCE', 'rss', 'https://export.arxiv.org/rss/cs.AI', true, 'primary_official', 'official_record', 'research_papers', 'primary_evidence', 60, 'healthy', NULL),
('src-phys-org', 'Phys.org — Physical Sciences', 'SCIENCE', 'rss', 'https://phys.org/rss-feed/', true, 'high_journalism', 'story_lead', 'technical_reporting', 'corroborating_evidence', 20, 'healthy', NULL),
('src-nature-main', 'Nature — Latest Science News', 'SCIENCE', 'rss', 'https://www.nature.com/nature.rss', false, 'high_journalism', 'story_lead', 'research_papers', 'unusable_for_synthesis', 30, 'deactivated', 'Redirects to HTML content without XML feed'),
('src-scientific-american', 'Scientific American', 'SCIENCE', 'rss', 'https://www.scientificamerican.com/feed/', false, 'high_journalism', 'story_lead', 'independent_reporting', 'unusable_for_synthesis', 30, 'deactivated', 'HTTP 404 at candidate endpoint'),

-- GAMING Category
('src-gamespot-news', 'GameSpot News', 'GAMING', 'rss', 'https://www.gamespot.com/feeds/news/', true, 'high_journalism', 'story_lead', 'independent_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-pc-gamer', 'PC Gamer', 'GAMING', 'rss', 'https://www.pcgamer.com/rss/', true, 'high_journalism', 'story_lead', 'independent_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-polygon-main', 'Polygon', 'GAMING', 'rss', 'https://www.polygon.com/rss/index.xml', true, 'high_journalism', 'story_lead', 'independent_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-vgc-news', 'Video Games Chronicle (VGC)', 'GAMING', 'rss', 'https://www.videogameschronicle.com/feed/', true, 'high_journalism', 'story_lead', 'independent_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-playstation-blog', 'PlayStation Blog', 'GAMING', 'rss', 'https://blog.playstation.com/feed/', true, 'primary_official', 'official_record', 'primary', 'primary_evidence', 15, 'healthy', NULL),
('src-xbox-wire', 'Xbox Wire', 'GAMING', 'rss', 'https://news.xbox.com/en-us/feed/', true, 'primary_official', 'official_record', 'primary', 'primary_evidence', 15, 'healthy', NULL),
('src-eurogamer', 'Eurogamer Dispatches', 'GAMING', 'rss', 'https://www.eurogamer.net/feed', true, 'high_journalism', 'story_lead', 'lead_only', 'lead_only', 30, 'healthy', 'Lead-only; never critical research dependency'),
('src-ign-articles', 'IGN Articles', 'GAMING', 'rss', 'https://www.ign.com/rss/articles', false, 'high_journalism', 'story_lead', 'independent_reporting', 'unusable_for_synthesis', 15, 'deactivated', 'HTTP 404 at candidate endpoint'),
('src-nintendo-news', 'Nintendo Newsroom', 'GAMING', 'rss', 'https://www.nintendo.com/whatsnew/feed/', false, 'primary_official', 'official_record', 'primary', 'unusable_for_synthesis', 30, 'deactivated', 'HTTP 404 at candidate endpoint'),

-- SPACE Category
('src-space-com', 'Space.com All', 'SPACE', 'rss', 'https://www.space.com/feeds/all', true, 'high_journalism', 'story_lead', 'independent_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-arstechnica-space', 'Ars Technica Science & Space', 'SPACE', 'rss', 'https://feeds.arstechnica.com/arstechnica/science', true, 'high_journalism', 'story_lead', 'technical_reporting', 'corroborating_evidence', 15, 'healthy', NULL),

-- BUSINESS Category
('src-cnbc-rss', 'CNBC Markets & Business', 'BUSINESS', 'rss', 'https://www.cnbc.com/id/100003114/device/rss/rss.html', true, 'high_journalism', 'story_lead', 'independent_reporting', 'corroborating_evidence', 15, 'healthy', NULL),
('src-techcrunch-startups', 'TechCrunch Startups & VC', 'BUSINESS', 'rss', 'https://techcrunch.com/category/startups/feed/', true, 'high_journalism', 'story_lead', 'lead_only', 'lead_only', 15, 'healthy', NULL),

-- BACKSTOP Category (All Six Categories Discovery Lead)
('src-gdelt-gal', 'GDELT Article List RSS', 'BACKSTOP', 'rss', 'https://data.gdeltproject.org/gdeltv3/gal/feed.rss', true, 'lead_only', 'story_lead', 'backstop', 'unusable_for_synthesis', 15, 'healthy', 'Global discovery stream only; never copied directly')
ON CONFLICT (source_id) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    category = EXCLUDED.category,
    source_type = EXCLUDED.source_type,
    feed_url = EXCLUDED.feed_url,
    active = EXCLUDED.active,
    authority_level = EXCLUDED.authority_level,
    allowed_usage = EXCLUDED.allowed_usage,
    discovery_role = EXCLUDED.discovery_role,
    evidence_role = EXCLUDED.evidence_role,
    polling_cadence = EXCLUDED.polling_cadence,
    status = EXCLUDED.status,
    failure_reason = EXCLUDED.failure_reason,
    updated_at = NOW();
