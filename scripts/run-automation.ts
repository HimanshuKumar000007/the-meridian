/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Phase 10: Automation CLI Runner
 *
 * Usage:
 *   npx tsx scripts/run-automation.ts --dry-run
 *   npx tsx scripts/run-automation.ts --limit 5
 *   npx tsx scripts/run-automation.ts --stage extraction --limit 3
 *   npx tsx scripts/run-automation.ts --mock
 *   npx tsx scripts/run-automation.ts --force
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { SupabaseAutomationRepository } from '../src/data/repositories/SupabaseAutomationRepository';
import { MockAutomationRepository } from '../src/data/repositories/MockAutomationRepository';
import { StageRunnerService } from '../src/services/automation/StageRunnerService';
import { PipelineOrchestrator } from '../src/services/automation/PipelineOrchestrator';
import { AutomationConfigService } from '../src/services/automation/AutomationConfigService';
import { SchedulerCapabilityService } from '../src/services/automation/SchedulerCapabilityService';
import type { AutomationStage } from '../src/types/automation';
import type { AutomationRepository } from '../src/data/repositories/AutomationRepository';

const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const hasFlag = (flag: string) => args.includes(flag);

const isDryRun = hasFlag('--dry-run');
const isMock = hasFlag('--mock');
const isForce = hasFlag('--force');
const stageArg = getArg('--stage') as AutomationStage | undefined;
const limitArg = getArg('--limit');
const limitOverride = limitArg ? parseInt(limitArg, 10) : undefined;

async function main() {
  console.log('====================================================');
  console.log('THE MERIDIAN — AUTOMATION SCHEDULER & ORCHESTRATOR');
  console.log('====================================================');
  console.log(`Mode:        ${isMock ? 'OFFLINE MOCK' : 'LIVE PRODUCTION'}`);
  console.log(`Dry Run:     ${isDryRun ? 'YES (No mutations or LLM calls)' : 'NO (Live execution)'}`);
  console.log(`Force Due:   ${isForce ? 'YES' : 'NO'}`);
  if (stageArg) console.log(`Stage Focus: ${stageArg}`);
  if (limitOverride) console.log(`Batch Limit: ${limitOverride}`);
  console.log('----------------------------------------------------');

  let repository: AutomationRepository;
  let supabaseClient: any = null;

  if (isMock) {
    repository = new MockAutomationRepository();
  } else {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to Mock mode.');
      repository = new MockAutomationRepository();
    } else {
      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
      repository = new SupabaseAutomationRepository(supabaseClient);
    }
  }

  const stageRunner = new StageRunnerService(supabaseClient, isMock || !supabaseClient);
  const configService = new AutomationConfigService();
  const capabilityService = new SchedulerCapabilityService();

  const orchestrator = new PipelineOrchestrator(repository, stageRunner, {
    configService,
    capabilityService,
  });

  const stagesToRun = stageArg ? [stageArg] : undefined;

  console.log('[Runner] Initiating orchestration cycle...');
  const result = await orchestrator.orchestrate({
    trigger: 'manual',
    dryRun: isDryRun,
    force: isForce,
    stages: stagesToRun,
    limitOverride,
  });

  console.log('\n====================================================');
  console.log('THE MERIDIAN AUTOMATION RUN RESULT');
  console.log('====================================================');
  console.log(`Run ID:      ${result.runId}`);
  console.log(`Trigger:     ${result.trigger}`);
  console.log(`Overall:     ${result.status.toUpperCase()}`);
  console.log(`Duration:    ${(result.durationMs / 1000).toFixed(2)}s`);
  console.log(`Dry Run:     ${result.isDryRun ? 'YES' : 'NO'}`);
  console.log('----------------------------------------------------');

  const stageKeys: AutomationStage[] = [
    'discovery',
    'extraction',
    'validation',
    'lifecycle',
    'publishing',
  ];

  for (const stg of stageKeys) {
    const r = result.stageResults[stg];
    if (!r) {
      console.log(`[${stg.toUpperCase()}]: NOT RUN (Skipped by filter)`);
      continue;
    }
    const symbol =
      r.status === 'completed'
        ? '✅ COMPLETED'
        : r.status === 'partial'
        ? '⚠️ PARTIAL'
        : r.status === 'failed'
        ? '❌ FAILED'
        : r.status === 'disabled'
        ? '⛔ DISABLED'
        : '⏭️ SKIPPED';

    console.log(`[${stg.toUpperCase()}]: ${symbol}`);
    console.log(`  - Processed: ${r.processed}`);
    console.log(`  - Succeeded: ${r.succeeded}`);
    console.log(`  - Failed:    ${r.failed}`);
    console.log(`  - Skipped:   ${r.skipped}`);
    if (r.errors.length > 0) {
      console.log(`  - Errors:    ${r.errors.join('; ')}`);
    }
    if (r.metadata && Object.keys(r.metadata).length > 0) {
      console.log(`  - Details:   ${JSON.stringify(r.metadata)}`);
    }
  }

  if (result.planCapability) {
    console.log('----------------------------------------------------');
    console.log('PLATFORM SCHEDULING CAPABILITY:');
    console.log(`- Plan:            ${result.planCapability.plan.toUpperCase()}`);
    console.log(`- Cron Status:     ${result.planCapability.status}`);
    console.log(`- Active Cadence:  ${result.planCapability.activeCadenceDescription}`);
    console.log(`- Target Cadence:  ${result.planCapability.targetCadenceDescription}`);
    console.log(`- Meets Target:    ${result.planCapability.canDeliverTargetCadence ? 'YES' : 'NO'}`);
    if (!result.planCapability.canDeliverTargetCadence) {
      console.log(`- Explanation:     ${result.planCapability.reason}`);
      console.log(`- Upgrade Path:    ${result.planCapability.upgradeOrExternalAlternative}`);
    }
  }

  console.log('====================================================\n');

  if (result.errors.length > 0 && result.status === 'failed') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n[Runner] Fatal orchestration error:', err);
  process.exit(1);
});
