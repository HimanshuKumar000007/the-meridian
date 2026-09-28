-- Migration: 013_retire_batch6_stale_artifacts.sql
-- Description: Record permanent lifecycle retirement and review decisions for Batch 6 historical test artifacts (mock extraction era)

INSERT INTO story_lifecycle_events (id, action, extraction_id, validation_id, match_confidence, match_reason, reason, changed_fields, lifecycle_version, created_at)
VALUES
  ('lifedec-b6-01', 'REJECT', 'ext-1790562549364-rs71r', 'val_8edbbe6414315a0d', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b6-02', 'REJECT', 'ext-1790560910241-d5qqf', 'val_b600324df0f7d9df', 'none', 'NO_MATCH', 'Validation gate rejected candidate (synthetic example.com domain fixture; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b6-03', 'REJECT', 'ext-1790567076785-gfrq0', 'val_e2f8c309326afe54', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 80 chars < 120 chars).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b6-04', 'REJECT', 'ext-1790567041490-45f5b', 'val_cf4149530ad23fd7', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 113 chars < 120 chars).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b6-05', 'REJECT', 'ext-1790563181061-77nkg', 'val_ebe59f0c7ff6680b', 'none', 'NO_MATCH', 'Validation gate rejected candidate (synthetic example.com domain fixture; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b6-06', 'HOLD', 'ext-1790569051624-rapnk', 'val_8b09abddf5e9c79b', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 OpenAI/Microsoft post; category conflict ''ai'' vs ''tech'').', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b6-07', 'HOLD', 'ext-1790583471133-l5i24', 'val_301aa5e19fb8fca9', 'none', 'NO_MATCH', 'Candidate held for editorial review (low claim coverage 0.25; genuine Phys.org science story candidate).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b6-08', 'HOLD', 'ext-1790577170632-wck7e', 'val_6812ec4a99b33b16', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b6-09', 'HOLD', 'ext-1790574772546-tbhll', 'val_f2080568b28dbcaf', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b6-10', 'HOLD', 'ext-1790572127443-ehqvv', 'val_7d1e83e631ce448b', 'none', 'NO_MATCH', 'Candidate held for editorial review (historical 2016 archive post; mock test payload).', '[]'::jsonb, '1.0.0', NOW())
ON CONFLICT (id) DO NOTHING;
