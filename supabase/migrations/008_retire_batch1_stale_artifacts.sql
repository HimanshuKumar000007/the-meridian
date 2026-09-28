-- Migration: 008_retire_batch1_stale_artifacts.sql
-- Description: Record permanent lifecycle retirement decisions for Batch 1 historical test artifacts (mock extraction era)

INSERT INTO story_lifecycle_events (id, action, extraction_id, validation_id, match_confidence, match_reason, reason, changed_fields, lifecycle_version, created_at)
VALUES
  ('lifedec-b1-01', 'REJECT', 'ext-1790487364421-otq59', 'val_d033e1c8041ee3ad', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence < 120 chars; mock test artifact).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b1-02', 'REJECT', 'ext-1790493632342-oyhe1', 'val_46303b83cdb296cc', 'none', 'NO_MATCH', 'Validation gate rejected candidate (scraped caption artifact; unverified entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b1-03', 'REJECT', 'ext-1790517198136-h77rf', 'val_b4980d683155be24', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unverified entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b1-04', 'REJECT', 'ext-1790529839952-euaq1', 'val_37ef17cfdd09f20b', 'none', 'NO_MATCH', 'Validation gate rejected candidate (unsupported entities from mock extraction).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b1-05', 'REJECT', 'ext-1790529839481-qwhv2', 'val_32362eabe6bb7b9c', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b1-06', 'HOLD', 'ext-1790529838963-ze5yp', 'val_4dbda2b03e15b082', 'none', 'NO_MATCH', 'Candidate held for editorial review (category mismatch / mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b1-07', 'REJECT', 'ext-1790529838466-o47k7', 'val_7fc12e78719ef116', 'none', 'NO_MATCH', 'Validation gate rejected candidate (unsupported entities & category mismatch).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b1-08', 'HOLD', 'ext-1790529837628-djzjh', 'val_234491eee0de8ebc', 'none', 'NO_MATCH', 'Candidate held for editorial review (unverified entities / mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b1-09', 'REJECT', 'ext-1790517331868-x9kja', 'val_1a295f04b28458fb', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unverified entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b1-10', 'REJECT', 'ext-1790514725192-7kvqc', 'val_a0da98756c0a5a1f', 'none', 'NO_MATCH', 'Validation gate rejected candidate (scraped caption artifact; unverified entities).', '[]'::jsonb, '1.0.0', NOW())
ON CONFLICT (id) DO NOTHING;
