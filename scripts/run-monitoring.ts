/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Phase 14: Production Monitoring & Observability CLI Runner
 *
 * Usage:
 *   npx tsx scripts/run-monitoring.ts
 *   npx tsx scripts/run-monitoring.ts --dry-run
 *   npx tsx scripts/run-monitoring.ts --readiness
 *   npx tsx scripts/run-monitoring.ts --service supabase
 *   npx tsx scripts/run-monitoring.ts --prune
 *   npx tsx scripts/run-monitoring.ts --verbose
 *   npx tsx scripts/run-monitoring.ts --mock
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { MonitoringService } from '../src/services/monitoring/MonitoringService';
import { SupabaseMonitoringRepository } from '../src/data/repositories/SupabaseMonitoringRepository';
import { MockMonitoringRepository } from '../src/data/repositories/MockMonitoringRepository';
import type { MonitoringRepository } from '../src/data/repositories/MonitoringRepository';

const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const hasFlag = (flag: string) => args.includes(flag);

const isDryRun = hasFlag('--dry-run');
const isMock = hasFlag('--mock');
const isReadiness = hasFlag('--readiness');
const isPrune = hasFlag('--prune');
const isVerbose = hasFlag('--verbose');
const shouldPersist = !isDryRun && !hasFlag('--no-persist');
const targetService = getArg('--service');
const baseUrlArg = getArg('--base-url') || process.env.DEPLOYED_URL || 'https://the-meridian-aptionaiged-4225.vercel.app';

async function main() {
  console.log('====================================================');
  console.log('THE MERIDIAN — PRODUCTION MONITORING & OBSERVABILITY');
  console.log('====================================================');
  console.log(`Timestamp:   ${new Date().toISOString()}`);
  console.log(`Mode:        ${isMock ? 'OFFLINE MOCK' : 'LIVE PRODUCTION'}`);
  console.log(`Base URL:    ${baseUrlArg}`);
  console.log(`Action:      ${isReadiness ? 'READINESS PROBE' : 'HEALTH & TELEMETRY CHECK'}`);
  console.log(`Dry Run:     ${isDryRun ? 'YES (No DB updates)' : 'NO'}`);
  console.log(`Persist:     ${shouldPersist ? 'YES' : 'NO'}`);
  if (targetService) console.log(`Service:     ${targetService}`);
  console.log('----------------------------------------------------\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let repository: MonitoringRepository;
  let supabaseClient: any = null;

  if (isMock || !serviceRoleKey) {
    if (!isMock && !serviceRoleKey) {
      console.warn('[Warning] SUPABASE_SERVICE_ROLE_KEY not found in environment. Defaulting to mock repository.');
    }
    repository = new MockMonitoringRepository();
  } else {
    supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    repository = new SupabaseMonitoringRepository(supabaseClient);
  }

  const monitoringService = new MonitoringService({
    client: supabaseClient,
    repository,
    baseUrl: baseUrlArg,
  });

  if (isReadiness) {
    console.log('Probing system readiness...');
    const readiness = await monitoringService.getReadiness();

    console.log('\n--- READINESS REPORT ---');
    console.log(`Status:         ${readiness.ready ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`Database:       ${readiness.databaseReady ? 'READY' : 'UNAVAILABLE'}`);
    console.log(`Storage:        ${readiness.storageReady ? 'READY' : 'UNAVAILABLE'}`);
    console.log(`Scheduler:      ${readiness.schedulerReady ? 'READY' : 'STALE'}`);

    if (readiness.criticalIssues.length > 0) {
      console.log('\nCritical Issues:');
      readiness.criticalIssues.forEach((issue) => console.log(`  - ❌ ${issue}`));
    }

    if (isVerbose) {
      console.log('\nFull Readiness Details:');
      console.log(JSON.stringify(readiness, null, 2));
    }

    process.exit(readiness.ready ? 0 : 1);
  }

  console.log('Running comprehensive platform health check...');
  const health = await monitoringService.runHealthCheck({
    persistSnapshot: shouldPersist,
    dryRun: isDryRun,
    pruneOldData: isPrune,
  });

  console.log('\n--- SYSTEM HEALTH SUMMARY ---');
  const statusIcon =
    health.status === 'healthy' ? '✅ HEALTHY' : health.status === 'degraded' ? '⚠️ DEGRADED' : '❌ FAILED';
  console.log(`Overall Status:   ${statusIcon}`);
  console.log(`Active Incidents: ${health.alerts.activeCount}`);
  console.log(`Database Ping:    ${health.latencies.dbPingMs} ms`);

  console.log('\n--- SERVICES ---');
  for (const [name, s] of Object.entries(health.services)) {
    if (targetService && name !== targetService) continue;
    const icon =
      s.status === 'healthy'
        ? '✅'
        : s.status === 'degraded'
        ? '⚠️'
        : s.status === 'disabled'
        ? '⚪'
        : '❌';
    console.log(
      `  ${icon} ${name.padEnd(16)} : ${s.status.toUpperCase().padEnd(9)} (${s.responseTimeMs}ms) ${
        s.message ? '- ' + s.message : ''
      }`
    );
  }

  console.log('\n--- QUEUE DEPTHS ---');
  console.log(`  Discovery Queue:  ${health.queues.discovery}`);
  console.log(`  Extraction Queue: ${health.queues.extraction}`);
  console.log(`  Validation Queue: ${health.queues.validation}`);
  console.log(`  Lifecycle Queue:  ${health.queues.lifecycle}`);
  console.log(`  Publish Queue:    ${health.queues.publication}`);

  if (health.alerts.activeCount > 0) {
    console.log('\n--- ACTIVE ALERTS ---');
    for (const alert of health.alerts.openIncidents) {
      const sevIcon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵';
      console.log(`  ${sevIcon} [${alert.severity.toUpperCase()}] ${alert.code} on ${alert.service} (x${alert.occurrenceCount})`);
      console.log(`     Message: ${alert.message}`);
    }
  }

  if (isPrune) {
    console.log('\n--- RETENTION PRUNING ---');
    const pruneResult = await monitoringService.pruneOldData();
    console.log(`  Deleted old snapshots: ${pruneResult.deletedSnapshots}`);
    console.log(`  Deleted old alerts:    ${pruneResult.deletedAlerts}`);
  }

  if (isVerbose) {
    console.log('\n--- FULL DIAGNOSTIC METRICS ---');
    console.log(JSON.stringify(health, null, 2));
  }

  console.log('\n====================================================');
  console.log('MONITORING RUN COMPLETE');
  console.log('====================================================');

  process.exit(health.status === 'failed' ? 1 : 0);
}

main().catch((err) => {
  console.error('[CLI Exception]', err);
  process.exit(1);
});
