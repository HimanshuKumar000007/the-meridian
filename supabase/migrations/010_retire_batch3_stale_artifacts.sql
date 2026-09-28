-- Migration: 010_retire_batch3_stale_artifacts.sql
-- Description: Record permanent lifecycle retirement and review decisions for Batch 3 historical test artifacts (mock extraction era)

INSERT INTO story_lifecycle_events (id, action, extraction_id, validation_id, match_confidence, match_reason, reason, changed_fields, lifecycle_version, created_at)
VALUES
  ('lifedec-b3-01', 'REJECT', 'ext-1790491197810-uv1t4', 'val_0ff9ec553a76d49d', 'none', 'NO_MATCH', 'Validation gate rejected candidate (synthetic example.com domain fixture; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b3-02', 'REJECT', 'ext-1790531360790-gjsad', 'val_8e9da6afdac944cd', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 68 chars < 120 chars; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b3-03', 'REJECT', 'ext-1790531359884-gl5hk', 'val_09cfc6deda7eb1de', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 100 chars < 120 chars; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b3-04', 'HOLD', 'ext-1790531359462-g5qjy', 'val_bdae7974eec3b66b', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b3-05', 'HOLD', 'ext-1790531358547-j1m5a', 'val_4f9a536dd705fd20', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b3-06', 'HOLD', 'ext-1790531358171-wtgn6', 'val_9641a200deed90bd', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b3-07', 'REJECT', 'ext-1790540931524-vatpl', 'val_1f1a076aa74d9023', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b3-08', 'HOLD', 'ext-1790540931067-sqq8x', 'val_8ea56323d976f260', 'none', 'NO_MATCH', 'Candidate held for editorial review (category mismatch ''technology'' vs ''climate''; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b3-09', 'REJECT', 'ext-1790540930628-edit6', 'val_59e74aba7e91946f', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b3-10', 'REJECT', 'ext-1790540930102-kyzv0', 'val_071b9c67fc929271', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW())
ON CONFLICT (id) DO NOTHING;
