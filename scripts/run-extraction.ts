/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — PRODUCTION EXTRACTION RUNNER
 * Usage:
 *   npm run extraction:run -- --limit 5 --dry-run
 *   npm run extraction:run -- --limit 10 --source reuters-tech
 *   npm run extraction:run -- --mock
 */

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import { ExtractionEngine } from '../src/services/extraction/ExtractionEngine';
import { HybridLlmProvider } from '../src/services/extraction/HybridLlmProvider';
import { NvidiaClient } from '../src/services/extraction/NvidiaClient';
import { MockExtractionProvider } from '../src/services/extraction/MockExtractionProvider';
import { SupabaseExtractionRepository } from '../src/data/repositories/SupabaseExtractionRepository';
import { MockExtractionRepository } from '../src/data/repositories/MockExtractionRepository';
import { isSupabaseConfigured, isServiceRoleConfigured, getSupabaseServiceClient, getSupabaseClient } from '../src/lib/supabase';
import type { DiscoveryItem } from '../src/types/discovery';
import type { ExtractionRepository } from '../src/data/repositories/ExtractionRepository';

function parseArgs(): {
  limit: number;
  dryRun: boolean;
  source?: string;
  category?: string;
  model?: string;
  mock: boolean;
  retryFailed: boolean;
} {
  const args = process.argv.slice(2);
  let limit = 5;
  let dryRun = false;
  let source: string | undefined;
  let category: string | undefined;
  let model: string | undefined;
  let mock = false;
  let retryFailed = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Math.max(1, Math.min(parseInt(args[i + 1], 10) || 5, 50));
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--mock') {
      mock = true;
    } else if (args[i] === '--retry-failed') {
      retryFailed = true;
    } else if (args[i] === '--source' && args[i + 1]) {
      source = args[i + 1];
      i++;
    } else if (args[i] === '--category' && args[i + 1]) {
      category = args[i + 1];
      i++;
    } else if (args[i] === '--model' && args[i + 1]) {
      model = args[i + 1];
      i++;
    }
  }

  return { limit, dryRun, source, category, model, mock, retryFailed };
}

async function main() {
  const options = parseArgs();

  console.log('====================================================');
  console.log('THE MERIDIAN — UNIVERSAL NEWS EXTRACTION RUNNER');
  console.log('====================================================');
  console.log(`Configuration: Limit=${options.limit}, DryRun=${options.dryRun}, Mock=${options.mock}`);
  if (options.source) console.log(`Filter: Source = ${options.source}`);
  if (options.category) console.log(`Filter: Category = ${options.category}`);

  let repository: ExtractionRepository;

  if (isSupabaseConfigured() && !options.mock) {
    console.log('[Runner] Connecting to live Supabase with secure service credentials...');
    const client = isServiceRoleConfigured() ? getSupabaseServiceClient() : getSupabaseClient();
    repository = new SupabaseExtractionRepository(client);
  } else {
    console.log('[Runner] Using Mock In-Memory extraction repository...');
    repository = new MockExtractionRepository();
  }

  const hybrid = new HybridLlmProvider({
    geminiOptions: options.model ? { model: options.model } : undefined,
    nvidiaOptions: options.model ? { model: options.model } : undefined,
  });
  const useLlm = !options.mock && hybrid.isConfigured();
  const llmProvider = useLlm ? hybrid : new MockExtractionProvider();

  console.log(`[Runner] Engine Provider: ${useLlm ? hybrid.getModelName() : 'Mock Provider'}`);

  const engine = new ExtractionEngine({
    llmProvider,
    repository,
  });

  // Fetch pending discovery items
  console.log('[Runner] Querying discovery queue for unextracted items...');
  const pendingItems = await repository.getPendingDiscoveryItems({
    limit: options.limit,
    category: options.category,
    sourceSlug: options.source,
    includeFailed: options.retryFailed,
  });

  if (pendingItems.length === 0) {
    console.log('[Runner] No pending discovery items found awaiting extraction.');
    console.log('====================================================\n');
    return;
  }

  console.log(`[Runner] Found ${pendingItems.length} candidate(s) to process. Starting batch execution...\n`);

  let succeeded = 0;
  let failed = 0;
  let needsReview = 0;
  const startTime = Date.now();

  for (let idx = 0; idx < pendingItems.length; idx++) {
    const item = pendingItems[idx];
    const itemNum = `[${idx + 1}/${pendingItems.length}]`;

    console.log(`${itemNum} Processing: "${item.title.slice(0, 65)}..."`);
    console.log(`   Source: ${item.sourceName} (${item.canonicalUrl})`);

    try {
      const candidate = await engine.extract(item, {
        dryRun: options.dryRun,
        model: options.model,
      });

      if (candidate.extractionStatus === 'needs_review') {
        needsReview++;
        console.log(`   ⚠️ Extracted with Flag: NEEDS_REVIEW (Confidence: ${(candidate.overallConfidence * 100).toFixed(0)}%, Conflicts: ${candidate.hasConflicts})`);
      } else {
        succeeded++;
        console.log(`   ✅ Extracted: "${candidate.title.slice(0, 60)}..."`);
        console.log(`      Category: ${candidate.category}/${candidate.subcategory} | Facts: ${candidate.facts.length} | Entities: ${candidate.entities.length} | Blocks: ${candidate.contentBlocks.length}`);
      }
    } catch (err: any) {
      failed++;
      console.error(`   ❌ Failed: ${err.message}`);
    }

    console.log('');
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('========================================');
  console.log('THE MERIDIAN — EXTRACTION BATCH COMPLETE');
  console.log('========================================');
  console.log(`Duration:         ${durationSec}s`);
  console.log(`Processed:        ${pendingItems.length}`);
  console.log(`Completed:        ${succeeded}`);
  console.log(`Needs Review:     ${needsReview}`);
  console.log(`Failed:           ${failed}`);
  console.log(`Database Storage: ${options.dryRun ? 'Skipped (Dry Run)' : 'Persisted to news_extractions'}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('[Runner] Fatal extraction error:', err);
  process.exit(1);
});
