# Universal Automation Scheduler & Pipeline Orchestrator Architecture
**The Meridian — Global News Platform**

## 1. Architectural Overview

```text
               ┌────────────────────────────────────────────────────────┐
               │              Trigger Sources / Schedulers             │
               │  - Vercel Cron (Daily on Hobby: 0 6 * * *)             │
               │  - GitHub Actions Workflow (Optional Sub-Daily)        │
               │  - Supabase pg_cron / External Webhook                 │
               │  - Manual Operator CLI (npm run automation:run)        │
               └───────────────────────────┬────────────────────────────┘
                                           │ POST /api/automation/orchestrator
                                           │ Header: Authorization: Bearer <CRON_SECRET>
                                           ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           MASTER PIPELINE ORCHESTRATOR                            │
│ 1. Distributed Database Run Lock Acquisition (automation_locks)                    │
│ 2. Platform Capability Check (SchedulerCapabilityService)                         │
│ 3. Global & Stage Kill Switch Checks (AutomationConfigService)                    │
│ 4. Schedule Due & Queue Depth Evaluation (automation_schedules)                   │
└──────┬────────────────────┬────────────────────┬────────────────────┬─────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Discovery   │     │  Extraction  │     │  Validation  │     │  Lifecycle   │
│   (Stage)    │     │   (Stage)    │     │   (Stage)    │     │   (Stage)    │
│  (60m Cadence│     │  (10m Cadence│     │  (10m Cadence│     │  (10m Cadence│
│  maxBatch 5) │     │  maxBatch 5) │     │  maxBatch 10)│     │  maxBatch 10)│
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       └────────────────────┼────────────────────┴────────────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │     Publishing Stage      │
              │  (10m Cadence, maxBatch 5)│
              │  Strict Gate Verification │
              └─────────────┬─────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  Telemetry & Audit Persistence        │
        │  - automation_runs                    │
        │  - automation_events                  │
        │  - Lock Release (automation_locks)    │
        └───────────────────────────────────────┘
```

---

## 2. Platform Capability & Scheduling Truth

### Current Vercel Plan: **Hobby**
* **Vercel Hobby Scheduling Behavior:**
  * Maximum cron execution frequency: **Once per day** (`24 hours`).
  * Cron expressions running more frequently than 24 hours (e.g. `*/10 * * * *` or `0 * * * *`) are rejected during deployment.
  * Maximum registered cron jobs: **2**.
* **Configured Vercel Cron:**
  * Path: `/api/automation/orchestrator`
  * Schedule: `0 6 * * *` (Daily at 06:00 UTC).
* **Target Automation Cadence:**
  * Discovery: Every 60 minutes.
  * Extraction, Validation, Lifecycle, Publishing: Every 10 minutes.
* **Can Current Plan Deliver Target Cadence?** **NO**.
  * The Hobby tier strictly prohibits sub-daily cron triggers.
  * The Meridian does **not** simulate or fake hourly cron in `vercel.json`.
* **Sub-Daily Upgrade Path:**
  * Option A: Upgrade Vercel account to **Vercel Pro** (supports minute-level scheduling natively).
  * Option B: External schedulers (GitHub Actions, Supabase `pg_cron`, or external webhook services) calling `POST /api/automation/orchestrator` with `CRON_SECRET`.

---

## 3. Distributed Database Run Lock (`automation_locks`)

To prevent duplicate execution and race conditions across serverless instances:
* **Storage Engine:** PostgreSQL `automation_locks` table.
* **Fields:**
  * `lock_name`: Unique mutex identifier (e.g., `'master_orchestrator'`).
  * `owner_id`: Unique worker or run ID (`run-orch-...`).
  * `acquired_at`: Timestamp of acquisition.
  * `expires_at`: Automatic expiration deadline (`acquired_at + TTL`).
* **Auto-Expiration & Stale Recovery:**
  * Default TTL: 300 seconds (5 minutes).
  * If a serverless function crashes before releasing its lock, subsequent invocations detect `expires_at <= NOW()` and automatically reclaim ownership without deadlock.

---

## 4. Backlog Protection & Bounded Batches

To prevent queue accumulation from exhausting serverless execution time budgets or API quotas:
* **Discovery:** Respects each individual source's `poll_interval_minutes` and backoff multiplier.
* **Extraction:** Strictly capped at `EXTRACTION_MAX_BATCH` (default: 5 items per run). Even if 1,500 discovery items are queued, extraction only processes 5 items per invocation.
* **Validation:** Strictly capped at `VALIDATION_MAX_BATCH` (default: 10 items per run).
* **Lifecycle:** Strictly capped at `LIFECYCLE_MAX_BATCH` (default: 10 items per run).
* **Publishing:** Strictly capped at `PUBLISHING_MAX_BATCH` (default: 5 items per run).

---

## 5. Security & Authentication Architecture

* **Server-to-Server Authentication:**
  * Invocations of `/api/automation/*` require a valid `Bearer <secret>` token in the `Authorization` header or an `x-cron-secret` / `x-admin-secret` header.
  * Validated against `CRON_SECRET`, `AUTOMATION_CRON_SECRET`, `ADMIN_SECRET_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`.
* **Zero Secret Exposure:**
  * Secrets are never logged or returned in HTTP responses.
  * All automation infrastructure tables (`automation_locks`, `automation_runs`, `automation_events`, `automation_schedules`) have Row Level Security (RLS) enabled. Public and anonymous roles are revoked of all permissions. Only `service_role` has access.

---

## 6. Emergency Kill Switches

1. **Global Automation Kill Switch:**
   * Environment variable: `AUTOMATION_ENABLED=false`
   * Effect: All automatic stage executions immediately abort with status `disabled` and code `AUTOMATION_DISABLED`. No database mutations or AI calls occur.
2. **Stage-Level Kill Switches:**
   * `AUTOMATION_DISCOVERY_ENABLED=false`
   * `AUTOMATION_EXTRACTION_ENABLED=false`
   * `AUTOMATION_VALIDATION_ENABLED=false`
   * `AUTOMATION_LIFECYCLE_ENABLED=false`
   * `AUTOMATION_PUBLISHING_ENABLED=false`
   * Effect: Allows pausing specific stages (e.g. holding all publication) while letting upstream extraction and validation proceed safely in staging.
