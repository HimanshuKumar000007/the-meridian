/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Phase 14A: Media Audit CLI Runner
 *
 * Usage:
 *   npx tsx scripts/audit-media.ts
 *   npx tsx scripts/audit-media.ts --json
 *   npx tsx scripts/audit-media.ts --mock
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { MediaService } from '../src/services/media/MediaService';
import { SupabaseMediaRepository } from '../src/data/repositories/SupabaseMediaRepository';
import { MockMediaRepository } from '../src/data/repositories/MockMediaRepository';
import type { MediaRepository } from '../src/data/repositories/MediaRepository';

const args = process.argv.slice(2);
const hasFlag = (flag: string) => args.includes(flag);

const isJson = hasFlag('--json');
const isMock = hasFlag('--mock');

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let repository: MediaRepository;
  let supabaseClient: any = null;

  if (isMock || !serviceRoleKey) {
    if (!isMock && !serviceRoleKey && !isJson) {
      console.warn('[Warning] SUPABASE_SERVICE_ROLE_KEY not found in environment. Defaulting to MockMediaRepository.');
    }
    repository = new MockMediaRepository();
  } else {
    supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    repository = new SupabaseMediaRepository(supabaseClient);
  }

  const mediaService = new MediaService(repository);
  const report = await mediaService.auditMedia();

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('====================================================');
  console.log('THE MERIDIAN — MEDIA & IMAGE ASSET AUDIT REPORT');
  console.log('====================================================');
  console.log(`Generated At:   ${report.timestamp}`);
  console.log(`Environment:    ${isMock ? 'OFFLINE MOCK' : 'LIVE PRODUCTION'}`);
  console.log(`Total Assets:   ${report.totalAssets}`);
  console.log('----------------------------------------------------');

  console.log('\n[1] RIGHTS DISTRIBUTION:');
  const rightsEntries = Object.entries(report.rightsDistribution);
  if (rightsEntries.length === 0) {
    console.log('  No assets recorded in repository.');
  } else {
    for (const [status, count] of rightsEntries) {
      console.log(`  - ${status.padEnd(20)}: ${count}`);
    }
  }

  console.log('\n[2] STORIES WITHOUT HERO MEDIA:');
  if (report.storiesWithoutHeroMedia.length === 0) {
    console.log('  All published stories have associated hero media (0 missing).');
  } else {
    console.log(`  Found ${report.storiesWithoutHeroMedia.length} story/stories missing hero media:`);
    for (const s of report.storiesWithoutHeroMedia) {
      console.log(`  - [${s.category}] ${s.title} (${s.id})`);
    }
  }

  console.log('\n[3] ORPHAN MEDIA ASSETS:');
  if (report.orphanMedia.length === 0) {
    console.log('  No orphan media assets detected (0 unlinked).');
  } else {
    console.log(`  Found ${report.orphanMedia.length} orphan media asset(s):`);
    for (const m of report.orphanMedia) {
      console.log(`  - ${m.id} (${m.sourceType}, rights: ${m.rightsStatus})`);
    }
  }

  console.log('\n[4] MEDIA PROCESSING QUEUE:');
  console.log(`  - Current Pending Queue Depth: ${report.queueDepth}`);
  console.log(`  - Oldest Pending Item Age:     ${report.oldestQueueItemAgeSec !== null ? `${report.oldestQueueItemAgeSec}s` : 'N/A (queue empty)'}`);

  console.log('\n====================================================');
  console.log('AUDIT COMPLETED');
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
