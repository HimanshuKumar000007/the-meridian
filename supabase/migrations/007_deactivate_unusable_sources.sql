-- Migration: 007_deactivate_unusable_sources.sql
-- Description: Explicitly deactivate unusable news sources with forensic audit reasons

UPDATE news_sources
SET is_active = false,
    last_error = 'SOURCE_ENDPOINT_UNAVAILABLE',
    updated_at = NOW()
WHERE slug = 'anthropic-news' OR id = 'src-anthropic-news';

UPDATE news_sources
SET is_active = false,
    last_error = 'SOURCE_BLOCKED',
    updated_at = NOW()
WHERE slug = 'cnbc-economy' OR id = 'src-cnbc-economy';
