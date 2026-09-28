-- Migration: 009_retire_batch2_stale_artifacts.sql
-- Description: Record permanent lifecycle retirement and review decisions for Batch 2 historical test artifacts (mock extraction era)

INSERT INTO story_lifecycle_events (id, action, extraction_id, validation_id, match_confidence, match_reason, reason, changed_fields, lifecycle_version, created_at)
VALUES
  ('lifedec-b2-01', 'REJECT', 'ext-1790508719472-cct85', 'val_0c23894355606584', 'none', 'NO_MATCH', 'Validation gate rejected candidate (caption artifact; mock payload with unverified entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b2-02', 'HOLD', 'ext-1790498505761-xvq6y', 'val_e2e1a2b7624a702a', 'none', 'NO_MATCH', 'Candidate held for editorial review (sensitive claim & mock extraction payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b2-03', 'HOLD', 'ext-1790495913148-wufgc', 'val_25278ccb0aae960b', 'none', 'NO_MATCH', 'Candidate held for editorial review (deactivated source anthropic-news; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b2-04', 'HOLD', 'ext-1790530931282-0zi8y', 'val_66a4faddde9d3ec3', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b2-05', 'REJECT', 'ext-1790530930424-g2ht6', 'val_53b1d0629b955efe', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 78 chars < 120 chars).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b2-06', 'HOLD', 'ext-1790530929609-4ol3o', 'val_8f219baf3fb0d32d', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b2-07', 'HOLD', 'ext-1790530928820-mx0ts', 'val_4302bf7d61d64521', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b2-08', 'HOLD', 'ext-1790530927931-sl0sz', 'val_25f1da39cfef3645', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b2-09', 'REJECT', 'ext-1790493236200-c5tqy', 'val_25edde8eee499b18', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b2-10', 'REJECT', 'ext-1790493190949-ry762', 'val_e5d06e8fee7d3bd5', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW())
ON CONFLICT (id) DO NOTHING;
