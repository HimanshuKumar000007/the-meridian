/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Phase 14A: Media Processing CLI Runner
 *
 * Usage:
 *   npx tsx scripts/run-media-processing.ts
 *   npx tsx scripts/run-media-processing.ts --dry-run
 *   npx tsx scripts/run-media-processing.ts --limit 5
 *   npx tsx scripts/run-media-processing.ts --story-id <uuid>
 *   npx tsx scripts/run-media-processing.ts --mock
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
function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const hasFlag = (flag: string) => args.includes(flag);

const isDryRun = hasFlag('--dry-run');
const isMock = hasFlag('--mock');
const isVerbose = hasFlag('--verbose');
const storyIdArg = getArg('--story-id');
const limitArg = parseInt(getArg('--limit') || '10', 10);
const jobTypeArg = getArg('--job-type');

async function main() {
  console.log('====================================================');
  console.log('THE MERIDIAN — UNIVERSAL IMAGE & MEDIA ENGINE');
  console.log('====================================================');
  console.log(`Timestamp:   ${new Date().toISOString()}`);
  console.log(`Mode:        ${isMock ? 'OFFLINE MOCK' : 'LIVE PRODUCTION'}`);
  console.log(`Dry Run:     ${isDryRun ? 'YES (No DB updates)' : 'NO'}`);
  console.log(`Batch Limit: ${limitArg}`);
  if (storyIdArg) console.log(`Target Story: ${storyIdArg}`);
  if (jobTypeArg) console.log(`Job Type:    ${jobTypeArg}`);
  console.log('----------------------------------------------------\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let repository: MediaRepository;
  let supabaseClient: any = null;

  if (isMock || !serviceRoleKey) {
    if (!isMock && !serviceRoleKey) {
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

  if (storyIdArg) {
    console.log(`Processing media for Story ID: ${storyIdArg}...`);
    let story: any = null;
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('stories')
        .select('*')
        .eq('id', storyIdArg)
        .maybeSingle();
      if (error) {
        console.error(`Failed to fetch story ${storyIdArg}: ${error.message}`);
        process.exit(1);
      }
      story = data;
    } else {
      story = {
        id: storyIdArg,
        title: 'Mock Story Title for Processing',
        slug: 'mock-story-title',
        category: 'technology',
        summary: 'A summary for the mock story',
      };
    }

    if (!story) {
      console.error(`Story with ID ${storyIdArg} not found.`);
      process.exit(1);
    }

    const decision = await mediaService.processStoryMedia(
      {
        id: story.id,
        title: story.title,
        slug: story.slug,
        category: story.category,
        summary: story.summary,
        existingHeroMedia: story.hero_media_id ? { id: story.hero_media_id } as any : undefined,
      },
      [],
      { persist: !isDryRun }
    );

    console.log('\nProcessing Decision:');
    console.log(`- Decision:    ${decision.decision}`);
    console.log(`- Reason:      ${decision.reason}`);
    console.log(`- Source Type: ${decision.sourceType}`);
    console.log(`- Rights:      ${decision.rightsStatus}`);
    if (decision.asset) {
      console.log(`- Asset ID:    ${decision.asset.id}`);
      const displayUrl = decision.asset.storageUrl || decision.asset.originalUrl || 'N/A';
      console.log(`- Asset URL:   ${displayUrl.slice(0, 80)}...`);
    }
  } else {
    console.log(`Fetching pending jobs from media_processing_queue (limit: ${limitArg})...`);
    const pendingJobs = await repository.getNextPendingJobs(limitArg);
    console.log(`Found ${pendingJobs.length} pending job(s).`);

    if (pendingJobs.length === 0) {
      console.log('Media processing queue is clear. No work to perform.');
      return;
    }

    if (isDryRun) {
      console.log('\n[Dry Run] Jobs that would be processed:');
      for (const job of pendingJobs) {
        console.log(`- Job ${job.id}: type=${job.jobType}, storyId=${job.storyId || 'none'}, mediaId=${job.mediaId || 'none'}`);
      }
      return;
    }

    console.log('\nExecuting media queue jobs...');
    const result = await mediaService.processQueue(limitArg);
    console.log('\nBatch Execution Results:');
    console.log(`- Processed: ${result.processed}`);
    console.log(`- Succeeded: ${result.succeeded}`);
    console.log(`- Failed:    ${result.failed}`);
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      for (const err of result.errors) {
        console.log(`  * ${err}`);
      }
    }
  }

  console.log('\nMedia processing execution completed successfully.');
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
