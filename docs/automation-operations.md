# Automation Operations Guide
**The Meridian — Global News Platform**

This guide provides operational procedures for managing, monitoring, and troubleshooting the automated news pipeline.

---

## 1. CLI Commands & Manual Execution

### Master Orchestrator
```bash
# Run dry-run (checks queue depths, due schedules, and plan capabilities without mutating data)
npm run automation:run -- --dry-run

# Run live orchestration cycle with safe batch limits
npm run automation:run

# Force execution of all stages regardless of target interval
npm run automation:run -- --force

# Focus execution on a single stage
npm run automation:run -- --stage extraction --limit 3
```

### Stage-Specific Manual Commands
```bash
# Discovery
npm run discovery:run

# Extraction
npm run extraction:run -- --limit 5

# Validation
npm run validation:run -- --limit 10

# Story Lifecycle
npm run lifecycle:run -- --limit 10

# Publication
npm run publishing:run -- --limit 5
```

---

## 2. Emergency Operations

### How to Pause All Automation
Set the global environment variable on Vercel or locally:
```bash
AUTOMATION_ENABLED=false
```
When set, any scheduler trigger (Vercel Cron, external webhook) immediately exits with status `disabled` and code `AUTOMATION_DISABLED`. Existing queues remain untouched.

### How to Disable Publishing Only (Safe Staging Mode)
To allow discovery, extraction, and validation to run while halting all public publication:
```bash
AUTOMATION_PUBLISHING_ENABLED=false
```

### How to Disable an Individual Stage
```bash
AUTOMATION_DISCOVERY_ENABLED=false
AUTOMATION_EXTRACTION_ENABLED=false
AUTOMATION_VALIDATION_ENABLED=false
AUTOMATION_LIFECYCLE_ENABLED=false
```

---

## 3. Distributed Lock Troubleshooting

### Inspecting Current Lock
Run the following SQL in Supabase SQL Editor:
```sql
SELECT * FROM automation_locks WHERE lock_name = 'master_orchestrator';
```

### Resetting a Stuck Lock Manually
The system automatically recovers locks once `expires_at` has passed (5-minute TTL). To force release immediately:
```sql
DELETE FROM automation_locks WHERE lock_name = 'master_orchestrator';
```

---

## 4. Monitoring Queue Depths & Pipeline Health

### Via Internal Health API
Make an authenticated request to `/api/automation/health`:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
     https://the-meridian.vercel.app/api/automation/health
```

### Via Supabase SQL
```sql
-- Pipeline queue depth
SELECT 
  (SELECT count(*) FROM news_discovery_items WHERE status = 'new') AS extraction_queue,
  (SELECT count(*) FROM news_extractions WHERE status = 'completed') AS validation_queue,
  (SELECT count(*) FROM news_validations WHERE status = 'valid') AS lifecycle_queue,
  (SELECT count(*) FROM publication_queue WHERE status = 'queued') AS publishing_queue,
  (SELECT count(*) FROM stories WHERE status = 'published') AS published_stories;

-- Recent automation runs
SELECT id, run_type, status, trigger, processed, succeeded, failed, duration_ms, started_at
FROM automation_runs
ORDER BY started_at DESC
LIMIT 5;

-- Recent automation events
SELECT stage, event_type, severity, message, created_at
FROM automation_events
ORDER BY created_at DESC
LIMIT 10;
```

---

## 5. Setting Up External Sub-Daily Schedulers

Since Vercel Hobby only supports daily cron (`0 6 * * *`), an external scheduler can trigger the pipeline at 10-minute intervals:

### Option A: GitHub Actions Workflow (`.github/workflows/meridian-cron.yml`)
```yaml
name: Meridian Pipeline Cron
on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch:

jobs:
  orchestrate:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Orchestrator
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.AUTOMATION_CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            https://the-meridian.vercel.app/api/automation/orchestrator
```
