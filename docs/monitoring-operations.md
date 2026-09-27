# The Meridian — Monitoring Operations & Incident Playbook

This document provides operational runbooks and command references for operators maintaining *The Meridian — Global News Platform*.

---

## 1. Daily Operations & CLI Commands

The platform includes a CLI runner (`scripts/run-monitoring.ts`) for diagnostics, probes, and maintenance.

### Basic Health Check
```bash
npm run monitoring:run
```
Outputs system status, service breakdown, queue depths, latencies, and active incidents. Persists a snapshot to `monitoring_snapshots`.

### Dry-Run Health Check (No Database Mutations)
```bash
npm run monitoring:run -- --dry-run
```
Evaluates all services and alerts in read-only mode without saving alerts or snapshots.

### Readiness Probe
```bash
npm run monitoring:run -- --readiness
```
Fast deployment probe verifying database and storage connectivity. Returns exit code 0 if ready, 1 if not.

### Focus on Specific Service
```bash
npm run monitoring:run -- --service supabase
npm run monitoring:run -- --service discovery
npm run monitoring:run -- --service scheduler
```

### Retention Pruning
```bash
npm run monitoring:run -- --prune
```
Prunes snapshots older than 30 days and resolved alerts older than 90 days. Active alerts are never pruned.

### Automated Test Suite
```bash
npm run monitoring:test
```
Runs all 25 automated monitoring verification tests (62 assertions) covering all failure modes, security boundaries, and alert transitions.

---

## 2. Incident Response Playbooks

### `SCHEDULER_STALE`
- **Symptom**: `scheduler` service reports `failed` with alert `SCHEDULER_STALE`. No automation run recorded in > 60 minutes.
- **Cause**:
  1. GitHub Actions workflow disabled or encountering runner delays.
  2. Expired secret (`CRON_SECRET` mismatch between GitHub repository secrets and Vercel environment variables).
  3. Distributed lock blocked by an unreleased run.
- **Remediation**:
  1. Inspect GitHub Actions tab: check if `.github/workflows/scheduler.yml` is running every 10 minutes.
  2. Verify secret values in Vercel project settings (`CRON_SECRET`).
  3. Run `npm run automation:run -- --dry-run` to test trigger reachability.
  4. If a lock is held, run `npm run monitoring:run -- --service locks` to inspect lock state.

---

### `LOCK_STUCK`
- **Symptom**: `locks` service reports `degraded` with `LOCK_STUCK`. Distributed lock `automation_pipeline_lock` held beyond TTL (300s).
- **Cause**: A serverless function timed out or terminated abruptly without executing the `finally` block.
- **Remediation**:
  1. The distributed lock automatically expires after 300 seconds (TTL).
  2. If an immediate run is required, invoke orchestrator with `--force`:
     ```bash
     npm run automation:run -- --force
     ```

---

### `DB_CONNECTION_FAILED` / `DB_TIMEOUT`
- **Symptom**: `supabase` service reports `failed` or ping latency > 5,000ms. Overall system status switches to `failed`.
- **Cause**: Supabase project paused, network interruption, connection pool exhaustion, or invalid credentials.
- **Remediation**:
  1. Check Supabase project status in dashboard: verify project is active (not paused).
  2. Verify `SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_URL` in `.env.local` / Vercel secrets.
  3. Check connection pool limits in Supabase Database Settings.

---

### `QUEUE_GROWING`
- **Symptom**: `extraction` or `validation` queue has backlog exceeding warning threshold (100 items) or oldest item age > 2 hours.
- **Cause**: Inflow rate from discovery exceeds extraction processing rate, or extraction worker encountered rate limits.
- **Remediation**:
  1. Check if NVIDIA extraction API is operational:
     ```bash
     npm run extraction:run -- --dry-run
     ```
  2. Trigger an immediate extraction batch:
     ```bash
     npm run extraction:run -- --limit 10
     ```

---

### `PUBLICATION_RATE_ANOMALY`
- **Symptom**: Critical alert `PUBLICATION_RATE_ANOMALY` fired. More than 20 stories were published in the last hour.
- **Cause**: Automated publication anomaly or unintended loop publishing bulk content.
- **Remediation**:
  1. Check publication logs immediately:
     ```bash
     npm run publishing:run -- --dry-run
     ```
  2. If necessary, activate the publication kill switch by setting in Vercel:
     `AUTOMATION_PUBLISHING_ENABLED=false`
  3. Inspect published stories in Supabase: verify count matches expected editorial baseline.

---

### `SITE_UNAVAILABLE`
- **Symptom**: `website` reports `failed` or homepage HTTP 5xx.
- **Cause**: Vercel deployment error, CDN incident, or frontend asset bundling failure.
- **Remediation**:
  1. Verify Vercel deployment status in Vercel Dashboard.
  2. Run `npm run build` locally to ensure zero build or TypeScript errors.
  3. Inspect recent deployment events.

---

### `SOURCE_HTTP_ERROR`
- **Symptom**: `discovery` service reports consecutive HTTP errors across upstream RSS feeds.
- **Cause**: Upstream news provider modified feed URL, changed format, or blocked requests.
- **Remediation**:
  1. Run discovery runner in verbose mode:
     ```bash
     npm run discovery:run
     ```
  2. Update broken source feed URLs in `news_sources` table.
