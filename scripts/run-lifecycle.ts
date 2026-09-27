/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — PRODUCTION STORY LIFECYCLE RUNNER
 * Usage:
 *   npm run lifecycle:run -- --limit 5 --dry-run
 *   npm run lifecycle:run -- --limit 10 --category tech
 *   npm run lifecycle:run -- --mock
 */

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import { StoryLifecycleEngine, CURRENT_LIFECYCLE_VERSION } from '../src/services/lifecycle/StoryLifecycleEngine';
import { SupabaseLifecycleRepository } from '../src/data/repositories/SupabaseLifecycleRepository';
import { MockLifecycleRepository } from '../src/data/repositories/MockLifecycleRepository';
import {
  isSupabaseConfigured,
  isServiceRoleConfigured,
  getSupabaseServiceClient,
  getSupabaseClient,
} from '../src/lib/supabase';
import { LIFECYCLE_FIXTURES } from '../test/fixtures/lifecycles/fixtures';
import type { LifecycleRepository } from '../src/data/repositories/LifecycleRepository';
import type { LifecycleCandidateInput } from '../src/types/lifecycle';

function parseArgs(): {
  limit: number;
  dryRun: boolean;
  category?: string;
  mock: boolean;
  forceRerun: boolean;
} {
  const args = process.argv.slice(2);
  let limit = 5;
  let dryRun = false;
  let category: string | undefined;
  let mock = false;
  let forceRerun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Math.max(1, Math.min(parseInt(args[i + 1], 10) || 5, 50));
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--mock') {
      mock = true;
    } else if (args[i] === '--force-rerun') {
      forceRerun = true;
    } else if (args[i] === '--category' && args[i + 1]) {
      category = args[i + 1];
      i++;
    }
  }

  return { limit, dryRun, category, mock, forceRerun };
}

async function main() {
  const options = parseArgs();

  console.log('====================================================');
  console.log('THE MERIDIAN — UNIVERSAL STORY LIFECYCLE RUNNER');
  console.log('====================================================');
  console.log(`Configuration: Limit=${options.limit}, DryRun=${options.dryRun}, Mock=${options.mock}`);
  if (options.category) console.log(`Filter: Category = ${options.category}`);

  let repository: LifecycleRepository;
  const useLiveSupabase = isSupabaseConfigured() && !options.mock;

  if (useLiveSupabase) {
    console.log('[Runner] Connecting to live Supabase with secure service credentials...');
    const client = isServiceRoleConfigured() ? getSupabaseServiceClient() : getSupabaseClient();
    repository = new SupabaseLifecycleRepository(client);
  } else {
    console.log('[Runner] Using Mock In-Memory lifecycle repository...');
    repository = new MockLifecycleRepository();
  }

  const engine = new StoryLifecycleEngine(repository, {
    lifecycleVersion: CURRENT_LIFECYCLE_VERSION,
  });

  let candidates: LifecycleCandidateInput[] = [];

  if (useLiveSupabase) {
    candidates = await repository.getPendingCandidates(options.limit);
    console.log(`[Runner] Found ${candidates.length} validated candidates pending lifecycle routing in database.`);
  }

  // If no live pending candidates, fallback to fixtures for demonstration
  if (candidates.length === 0) {
    console.log('[Runner] No live validated candidates found in queue. Running against test fixtures...');
    candidates = LIFECYCLE_FIXTURES.slice(0, options.limit).map((f) => ({
      extraction: f.candidate,
      validation: f.validation,
    }));
  }

  console.log(`\n[Runner] Executing lifecycle routing for ${candidates.length} candidates...\n`);

  const results = [];
  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    const candidateTitle = item.extraction.title || 'Untitled Candidate';
    console.log(`[${i + 1}/${candidates.length}] Processing: "${candidateTitle.substring(0, 60)}..."`);

    try {
      const decision = await engine.processCandidate(item.extraction, item.validation, {
        dryRun: options.dryRun,
        forceRerun: options.forceRerun,
      });

      const actionBadge =
        decision.action === 'CREATE'
          ? '✨ CREATE (draft)'
          : decision.action === 'UPDATE'
          ? '🔄 UPDATE'
          : decision.action === 'NO_OP'
          ? '⏸️  NO_OP'
          : decision.action === 'HOLD'
          ? '⏳ HOLD (needs_review)'
          : '❌ REJECT';

      console.log(`    Action: ${actionBadge} | Reason: ${decision.reason}`);
      if (decision.storyId) console.log(`    Story ID: ${decision.storyId}`);
      if (decision.changedFields.length > 0) console.log(`    Changed Fields: ${decision.changedFields.join(', ')}`);
      results.push(decision);
    } catch (err: any) {
      console.error(`    Error processing candidate: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log('LIFECYCLE RUN SUMMARY');
  console.log('====================================================');
  console.log(`Total Candidates Processed: ${results.length}`);
  console.log(`  - CREATE (draft):        ${results.filter((r) => r.action === 'CREATE').length}`);
  console.log(`  - UPDATE:                ${results.filter((r) => r.action === 'UPDATE').length}`);
  console.log(`  - NO_OP:                 ${results.filter((r) => r.action === 'NO_OP').length}`);
  console.log(`  - HOLD:                  ${results.filter((r) => r.action === 'HOLD').length}`);
  console.log(`  - REJECT:                ${results.filter((r) => r.action === 'REJECT').length}`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
