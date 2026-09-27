-- Migration: 012_search_trending_most_read_schema.sql
-- Description: Phase 11 - Universal Search, Trending & Most Read Engine
-- Features:
-- 1. Full-text search vector on stories (generated always as tsvector)
-- 2. GIN search index & trigram indexes for typo tolerance
-- 3. Composite indexes for trending and most-read queries
-- 4. story_view_events table for deduplicated view counting
-- 5. Stored procedures: record_story_view, recalculate_trending_scores, cleanup_story_view_events, search_published_stories

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. SEARCH VECTOR GENERATED COLUMN ON STORIES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stories' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE stories 
    ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(dek, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(summary, '')), 'C')
    ) STORED;
  END IF;
END $$;

-- 3. INDEXES FOR SEARCH, TRENDING, AND MOST READ
CREATE INDEX IF NOT EXISTS idx_stories_search_vector ON stories USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_stories_title_trgm ON stories USING GIN(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_stories_trending_published 
ON stories(status, trending_score DESC, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_views_published 
ON stories(status, view_count DESC, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_category_trending 
ON stories(category_id, status, trending_score DESC);

CREATE INDEX IF NOT EXISTS idx_stories_category_views 
ON stories(category_id, status, view_count DESC);

-- 4. STORY VIEW EVENTS TABLE (ANTI-INFLATION & DEDUPLICATION)
CREATE TABLE IF NOT EXISTS story_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  session_hash VARCHAR(64) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_view_events_story_window 
ON story_view_events(story_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_view_events_dedup 
ON story_view_events(story_id, session_hash, occurred_at DESC);

-- RLS ON story_view_events
ALTER TABLE story_view_events ENABLE ROW LEVEL SECURITY;

-- Revoke raw SELECT/INSERT from public roles
REVOKE ALL ON story_view_events FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON story_view_events TO service_role;

-- 5. ATOMIC VIEW RECORDING RPC WITH 30-MIN WINDOW DEBOUNCE
CREATE OR REPLACE FUNCTION record_story_view(p_story_id TEXT, p_session_hash VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_story RECORD;
  v_recent_event_id UUID;
  v_hours_since_pub NUMERIC;
  v_new_view_count INT;
  v_new_trending_score FLOAT;
BEGIN
  -- 1. Strictly verify the story exists and is published
  SELECT id, status, published_at, view_count, trending_score
  INTO v_story
  FROM stories
  WHERE id = p_story_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'recorded', false,
      'error', 'story_not_found'
    );
  END IF;

  IF v_story.status <> 'published' THEN
    RETURN jsonb_build_object(
      'recorded', false,
      'error', 'story_not_published'
    );
  END IF;

  -- 2. Deduplication check: Has this session viewed this story in the last 30 minutes?
  SELECT id INTO v_recent_event_id
  FROM story_view_events
  WHERE story_id = p_story_id
    AND session_hash = p_session_hash
    AND occurred_at > NOW() - INTERVAL '30 minutes'
  LIMIT 1;

  IF v_recent_event_id IS NOT NULL THEN
    -- Debounced: return current metrics without incrementing
    RETURN jsonb_build_object(
      'recorded', false,
      'reason', 'deduplicated_window',
      'view_count', v_story.view_count,
      'trending_score', v_story.trending_score
    );
  END IF;

  -- 3. Insert view event
  INSERT INTO story_view_events(story_id, session_hash, occurred_at)
  VALUES (p_story_id, p_session_hash, NOW());

  -- 4. Calculate updated trending score using deterministic time-decay:
  -- Score = V / (T + 2)^1.5
  -- where V = view_count + 1, T = hours since publication
  v_hours_since_pub := GREATEST(EXTRACT(EPOCH FROM (NOW() - coalesce(v_story.published_at, NOW()))) / 3600.0, 0.0);
  v_new_view_count := coalesce(v_story.view_count, 0) + 1;
  v_new_trending_score := ROUND(CAST((v_new_view_count / POWER(v_hours_since_pub + 2.0, 1.5)) AS numeric), 4);

  -- 5. Update story record atomically
  UPDATE stories
  SET view_count = v_new_view_count,
      trending_score = v_new_trending_score,
      updated_at = NOW()
  WHERE id = p_story_id;

  RETURN jsonb_build_object(
    'recorded', true,
    'view_count', v_new_view_count,
    'trending_score', v_new_trending_score
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_story_view(TEXT, VARCHAR) TO anon, authenticated, service_role;

-- 6. RECALCULATE TRENDING SCORES RPC (FOR PERIODIC REFRESH)
CREATE OR REPLACE FUNCTION recalculate_trending_scores()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INT;
BEGIN
  UPDATE stories
  SET trending_score = ROUND(CAST((GREATEST(view_count, 1) / POWER(GREATEST(EXTRACT(EPOCH FROM (NOW() - coalesce(published_at, NOW()))) / 3600.0, 0.0) + 2.0, 1.5)) AS numeric), 4)
  WHERE status = 'published';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_trending_scores() TO service_role;

-- 7. EVENT RETENTION CLEANUP FUNCTION
CREATE OR REPLACE FUNCTION cleanup_story_view_events(p_retention_days INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM story_view_events
  WHERE occurred_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_story_view_events(INT) TO service_role;

-- 8. SEARCH PUBLISHED STORIES RPC
CREATE OR REPLACE FUNCTION search_published_stories(
  p_query TEXT,
  p_category TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'relevance',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  slug TEXT,
  title TEXT,
  dek TEXT,
  summary TEXT,
  category_id TEXT,
  subcategory_id TEXT,
  author_id TEXT,
  hero_image_url TEXT,
  hero_image_alt TEXT,
  published_at TIMESTAMPTZ,
  view_count INT,
  trending_score FLOAT,
  match_score FLOAT,
  match_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_query TEXT;
  v_nospace_query TEXT;
  v_tsquery tsquery;
  v_safe_limit INT;
  v_safe_offset INT;
BEGIN
  v_clean_query := trim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g'));
  v_nospace_query := regexp_replace(lower(v_clean_query), '\s+', '', 'g');
  v_safe_limit := LEAST(GREATEST(coalesce(p_limit, 20), 1), 50);
  v_safe_offset := GREATEST(coalesce(p_offset, 0), 0);

  IF v_clean_query = '' THEN
    RETURN QUERY
    SELECT 
      s.id, s.slug, s.title, s.dek, s.summary, 
      s.category_id, s.subcategory_id, s.author_id, 
      s.hero_image_url, s.hero_image_alt, s.published_at, 
      s.view_count, s.trending_score,
      1.0::FLOAT AS match_score,
      'recent'::TEXT AS match_reason
    FROM stories s
    WHERE s.status = 'published'
      AND (p_category IS NULL OR s.category_id = p_category)
    ORDER BY s.published_at DESC
    LIMIT v_safe_limit OFFSET v_safe_offset;
    RETURN;
  END IF;

  v_tsquery := websearch_to_tsquery('english', v_clean_query);

  RETURN QUERY
  SELECT 
    s.id, s.slug, s.title, s.dek, s.summary, 
    s.category_id, s.subcategory_id, s.author_id, 
    s.hero_image_url, s.hero_image_alt, s.published_at, 
    s.view_count, s.trending_score,
    (
      -- Exact title match (+50.0)
      (CASE WHEN lower(s.title) = lower(v_clean_query) THEN 50.0 ELSE 0.0 END) +
      -- Title substring (+25.0)
      (CASE WHEN lower(s.title) LIKE '%' || lower(v_clean_query) || '%' THEN 25.0 ELSE 0.0 END) +
      -- No-space match e.g. "open ai" in "openai" (+20.0)
      (CASE WHEN regexp_replace(lower(s.title), '\s+', '', 'g') LIKE '%' || v_nospace_query || '%' THEN 20.0 ELSE 0.0 END) +
      -- Full-text ts_rank_cd
      (coalesce(ts_rank_cd(s.search_vector, v_tsquery), 0.0) * 15.0) +
      -- Word similarity on title (+15.0 * word_sim)
      (word_similarity(v_clean_query, s.title) * 15.0)
    )::FLOAT AS match_score,
    (
      CASE 
        WHEN lower(s.title) = lower(v_clean_query) THEN 'exact_title'
        WHEN lower(s.title) LIKE '%' || lower(v_clean_query) || '%' THEN 'title_match'
        WHEN regexp_replace(lower(s.title), '\s+', '', 'g') LIKE '%' || v_nospace_query || '%' THEN 'compound_word_match'
        WHEN s.search_vector @@ v_tsquery THEN 'text_match'
        ELSE 'typo_tolerance_match'
      END
    )::TEXT AS match_reason
  FROM stories s
  WHERE s.status = 'published'
    AND (p_category IS NULL OR s.category_id = p_category)
    AND (
      s.search_vector @@ v_tsquery
      OR lower(s.title) LIKE '%' || lower(v_clean_query) || '%'
      OR regexp_replace(lower(s.title), '\s+', '', 'g') LIKE '%' || v_nospace_query || '%'
      OR word_similarity(v_clean_query, s.title) >= 0.4
    )
  ORDER BY 
    CASE WHEN p_sort = 'latest' THEN s.published_at END DESC,
    CASE WHEN p_sort = 'most_read' THEN s.view_count END DESC,
    CASE WHEN p_sort = 'relevance' OR p_sort IS NULL THEN 
      (
        (CASE WHEN lower(s.title) = lower(v_clean_query) THEN 50.0 ELSE 0.0 END) +
        (CASE WHEN lower(s.title) LIKE '%' || lower(v_clean_query) || '%' THEN 25.0 ELSE 0.0 END) +
        (CASE WHEN regexp_replace(lower(s.title), '\s+', '', 'g') LIKE '%' || v_nospace_query || '%' THEN 20.0 ELSE 0.0 END) +
        (coalesce(ts_rank_cd(s.search_vector, v_tsquery), 0.0) * 15.0) +
        (word_similarity(v_clean_query, s.title) * 15.0)
      )
    END DESC,
    s.published_at DESC
  LIMIT v_safe_limit OFFSET v_safe_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION search_published_stories(TEXT, TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
