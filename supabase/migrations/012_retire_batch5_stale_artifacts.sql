-- Migration: 012_retire_batch5_stale_artifacts.sql
-- Description: Record permanent lifecycle retirement decisions for Batch 5 historical test artifacts (mock extraction era)

INSERT INTO story_lifecycle_events (id, action, extraction_id, validation_id, match_confidence, match_reason, reason, changed_fields, lifecycle_version, created_at)
VALUES
  ('lifedec-b5-01', 'REJECT', 'ext-1790559127238-0asx2', 'val_063c785b3320e828', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b5-02', 'REJECT', 'ext-1790560332038-pak13', 'val_737b0ac8398eed82', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 71 chars < 120 chars; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b5-03', 'REJECT', 'ext-1790560331585-e7o52', 'val_6ef07c074a90b030', 'none', 'NO_MATCH', 'Validation gate rejected candidate (historical 2015 announcement; category mismatch & mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b5-04', 'REJECT', 'ext-1790560330734-c5kgp', 'val_e7b8bc6e862af67a', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 96 chars < 120 chars; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b5-05', 'REJECT', 'ext-1790560330265-y5rcv', 'val_764b33b8d188bfaa', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 114 chars < 120 chars; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b5-06', 'REJECT', 'ext-1790560329369-tn6xa', 'val_151c2edeb4290600', 'none', 'NO_MATCH', 'Validation gate rejected candidate (insufficient source evidence 59 chars < 120 chars; mock test payload).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b5-07', 'REJECT', 'ext-1790562552372-z4utv', 'val_fad2df9c906b2cf5', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b5-08', 'REJECT', 'ext-1790562551522-ukj90', 'val_5eeab8ca4f79b776', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b5-09', 'REJECT', 'ext-1790562550655-spvkj', 'val_d35f38f7d327d295', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW()),
  ('lifedec-b5-10', 'REJECT', 'ext-1790562550268-jrsiy', 'val_2e36eaf08cfcc73b', 'none', 'NO_MATCH', 'Validation gate rejected candidate (category mismatch & unsupported mock entities).', '[]'::jsonb, '1.0.0', NOW())
ON CONFLICT (id) DO NOTHING;
