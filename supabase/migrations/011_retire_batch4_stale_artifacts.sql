-- Migration: 011_retire_batch4_stale_artifacts.sql
-- Description: Record permanent lifecycle retirement and review decisions for Batch 4 historical test artifacts (mock extraction era)

INSERT INTO story_lifecycle_events (id, action, extraction_id, validation_id, match_confidence, match_reason, reason, changed_fields, lifecycle_version, created_at)
VALUES
  ('lifedec-b4-01', 'REJECT', 'ext-1790540929238-hkqwc', 'val_1f666f432a2a1a7f', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b4-02', 'HOLD', 'ext-1790551235048-6pi1p', 'val_4e2bdf94d3b10e13', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b4-03', 'REJECT', 'ext-1790551234250-h87ox', 'val_bb1572ac086168fe', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 83 chars < 120 chars; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b4-04', 'REJECT', 'ext-1790551233778-tzgyh', 'val_e4c3d96740a96ab9', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 79 chars < 120 chars; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b4-05', 'REJECT', 'ext-1790551233307-3g8fa', 'val_f07af87101405b7f', 'none', 'NO_MATCH', 'Validation gate rejected candidate (video artifact; category mismatch & mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b4-06', 'REJECT', 'ext-1790551232888-t459g', 'val_312bb0f5b50d4e19', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b4-07', 'REJECT', 'ext-1790559129101-kxssj', 'val_d0037a59a0e72e72', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b4-08', 'REJECT', 'ext-1790559128650-a1d31', 'val_c8efb1e3559c6bb6', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b4-09', 'REJECT', 'ext-1790559128166-qq93f', 'val_7edd4a9feb220c33', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b4-10', 'REJECT', 'ext-1790559127684-v0k40', 'val_4eaa694ad0d98a30', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW())
ON CONFLICT (id) DO NOTHING;
