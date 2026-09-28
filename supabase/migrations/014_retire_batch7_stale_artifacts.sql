-- Migration: 014_retire_batch7_stale_artifacts.sql
-- Description: Record permanent lifecycle retirement and review decisions for Batch 7 (final 5) historical test artifacts (mock extraction era)

INSERT INTO story_lifecycle_events (id, action, extraction_id, validation_id, match_confidence, match_reason, reason, changed_fields, lifecycle_version, created_at)
VALUES
  ('lifedec-b7-01', 'HOLD', 'ext-1790569078613-vjw0q', 'val_be597e65622e7373', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b7-02', 'HOLD', 'ext-1790567877104-s7849', 'val_f4a6ac6049398e5c', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b7-03', 'HOLD', 'ext-1790567815522-q7x4x', 'val_9d27dcd2e6407ee0', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b7-04', 'HOLD', 'ext-1790567769082-qvush', 'val_60ad480e68ae97c4', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b7-05', 'REJECT', 'ext-1790567578677-90yeq', 'val_65c8add44cb86dff', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 103 chars < 120 chars; mock test payload).', '[]'::jsonb, '1.0.0', NOW())
ON CONFLICT (id) DO NOTHING;
