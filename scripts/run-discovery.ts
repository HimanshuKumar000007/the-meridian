/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import { DiscoveryRunner } from '../src/services/discovery/DiscoveryRunner';
import { SupabaseDiscoveryRepository } from '../src/data/repositories/SupabaseDiscoveryRepository';
import { MockDiscoveryRepository } from '../src/data/repositories/MockDiscoveryRepository';
import { isSupabaseConfigured, getSupabaseClient } from '../src/lib/supabase';
import { INITIAL_NEWS_SOURCES } from '../src/data/sources/initialSources';
import { DiscoveryRepository } from '../src/data/repositories/DiscoveryRepository';

async function main() {
  console.log('====================================================');
  console.log('THE MERIDIAN — MANUAL DISCOVERY RUNNER');
  console.log('====================================================');

  let repo: DiscoveryRepository;

  if (isSupabaseConfigured()) {
    console.log('[Runner] Connecting to live Supabase repository...');
    const client = getSupabaseClient();
    repo = new SupabaseDiscoveryRepository(client);
  } else {
    console.log('[Runner] Supabase not configured; using In-Memory Mock repository...');
    repo = new MockDiscoveryRepository(INITIAL_NEWS_SOURCES);
  }

  const runner = new DiscoveryRunner(repo);

  console.log('[Runner] Starting discovery run cycle across configured sources...');
  const result = await runner.runDiscovery({
    maxConcurrency: 3,
    forceAll: true, // evaluate all active sources during manual run
  });

  const durationSec = result.durationMs ? (result.durationMs / 1000).toFixed(2) : '0.00';
  console.log('\n[Runner] Discovery run completed successfully!');
  console.log(`- Run ID:           ${result.id}`);
  console.log(`- Duration:         ${durationSec}s`);
  console.log(`- Sources Polled:   ${result.sourcesAttempted} (${result.sourcesSucceeded} succeeded, ${result.sourcesFailed} failed)`);
  console.log(`- Items Discovered: ${result.itemsSeen} total`);
  console.log(`  * New Candidates: ${result.newItems}`);
  console.log(`  * Possible Updates: ${result.possibleUpdates}`);
  console.log(`  * Duplicates:     ${result.duplicates}`);

  if (result.errors.length > 0) {
    console.log(`- Errors (${result.errors.length}):`);
    result.errors.forEach(err => console.log(`  * [${err.sourceSlug}]: ${err.error}`));
  }

  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('[Runner] Discovery run encountered an unexpected failure:', err);
  process.exit(1);
});
