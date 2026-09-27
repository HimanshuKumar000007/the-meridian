/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — PRODUCTION FACT VALIDATION RUNNER
 * Usage:
 *   npm run validation:run -- --limit 5 --dry-run
 *   npm run validation:run -- --limit 10 --category tech
 *   npm run validation:run -- --mock
 */

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import { ValidationEngine, CURRENT_VALIDATOR_VERSION } from '../src/services/validation/ValidationEngine';
import { SupabaseValidationRepository } from '../src/data/repositories/SupabaseValidationRepository';
import { MockValidationRepository } from '../src/data/repositories/MockValidationRepository';
import { SourceContentAcquisitionService } from '../src/services/extraction/SourceContentAcquisitionService';
import {
  isSupabaseConfigured,
  isServiceRoleConfigured,
  getSupabaseServiceClient,
  getSupabaseClient,
} from '../src/lib/supabase';
import { VALIDATION_FIXTURES } from '../test/fixtures/validations/fixtures';
import type { ValidationRepository } from '../src/data/repositories/ValidationRepository';
import type { ValidationInput } from '../src/services/validation/ValidationEngine';

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
  console.log('THE MERIDIAN — INDEPENDENT FACT VALIDATION RUNNER');
  console.log('====================================================');
  console.log(`Configuration: Limit=${options.limit}, DryRun=${options.dryRun}, Mock=${options.mock}`);
  if (options.category) console.log(`Filter: Category = ${options.category}`);

  let repository: ValidationRepository;
  const useLiveSupabase = isSupabaseConfigured() && !options.mock;

  if (useLiveSupabase) {
    console.log('[Runner] Connecting to live Supabase with secure service credentials...');
    const client = isServiceRoleConfigured() ? getSupabaseServiceClient() : getSupabaseClient();
    repository = new SupabaseValidationRepository(client);
  } else {
    console.log('[Runner] Using Mock In-Memory validation repository...');
    repository = new MockValidationRepository();
  }

  const engine = new ValidationEngine({
    repository,
    validatorVersion: CURRENT_VALIDATOR_VERSION,
  });

  const acquisition = new SourceContentAcquisitionService({ timeoutMs: 8000 });

  let inputsToValidate: ValidationInput[] = [];

  if (useLiveSupabase) {
    const client = isServiceRoleConfigured() ? getSupabaseServiceClient() : getSupabaseClient();
    const pendingExtractions = await repository.getPendingExtractions({
      limit: options.limit,
      category: options.category,
    });

    console.log(`[Runner] Found ${pendingExtractions.length} pending extractions in database.`);

    for (const ext of pendingExtractions) {
      // Fetch associated discovery item for URL and source content
      let sourceText = '';
      let sourceUrl = '';
      let publishedAt = null;

      const { data: discItem } = await client
        .from('news_discovery_items')
        .select('*')
        .eq('id', ext.discovery_item_id)
        .maybeSingle();

      if (discItem) {
        sourceUrl = discItem.canonical_url || discItem.source_url;
        publishedAt = discItem.published_at;
        try {
          const acquired = await acquisition.acquireContent({
            id: discItem.id,
            sourceId: discItem.source_id,
            sourceName: discItem.source_name,
            sourceType: discItem.source_type,
            canonicalUrl: discItem.canonical_url,
            sourceUrl: discItem.source_url,
            title: discItem.title,
            description: discItem.description,
            publishedAt: discItem.published_at,
            discoveredAt: discItem.discovered_at,
            lastSeenAt: discItem.last_seen_at,
            categoryHint: discItem.category_hint,
            status: discItem.status,
            fingerprint: discItem.fingerprint,
            contentHash: discItem.content_hash,
          });
          sourceText = acquired.articleText;
        } catch {
          sourceText = discItem.description || '';
        }
      }

      inputsToValidate.push({
        extraction: ext,
        sourceText,
        sourceUrl,
        publishedAt,
      });
    }
  }

  // If no live pending extractions, use fixtures for demonstration
  if (inputsToValidate.length === 0) {
    console.log('[Runner] No unvalidated live extractions found. Running validation across test fixtures...');
    inputsToValidate = VALIDATION_FIXTURES.slice(0, options.limit).map((f) => f.input);
  }

  console.log(`\n[Runner] Executing fact validation for ${inputsToValidate.length} candidates...\n`);

  const results = [];
  for (let i = 0; i < inputsToValidate.length; i++) {
    const input = inputsToValidate[i];
    const candidateTitle = input.extraction.title || 'Untitled Candidate';
    console.log(`[${i + 1}/${inputsToValidate.length}] Validating: "${candidateTitle.substring(0, 60)}..."`);

    try {
      const result = await engine.validate(input, {
        dryRun: options.dryRun,
        forceRerun: options.forceRerun,
      });

      const statusBadge =
        result.status === 'valid'
          ? '✅ VALID'
          : result.status === 'needs_review'
          ? '⚠️  NEEDS_REVIEW'
          : result.status === 'insufficient_evidence'
          ? '❓ INSUFFICIENT_EVIDENCE'
          : '❌ REJECTED';

      console.log(`    Status: ${statusBadge} | Score: ${(result.overallScore * 100).toFixed(0)}% | Issues: ${result.issues.length}`);
      if (result.issues.length > 0) {
        console.log(`    Codes:  ${result.issues.map((iss) => `${iss.code} (${iss.severity})`).join(', ')}`);
      }
      results.push(result);
    } catch (err: any) {
      console.error(`    Error validating candidate: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log('VALIDATION RUN SUMMARY');
  console.log('====================================================');
  console.log(`Total Candidates Validated: ${results.length}`);
  console.log(`  - Valid:                 ${results.filter((r) => r.status === 'valid').length}`);
  console.log(`  - Needs Review:          ${results.filter((r) => r.status === 'needs_review').length}`);
  console.log(`  - Rejected:              ${results.filter((r) => r.status === 'rejected').length}`);
  console.log(`  - Insufficient Evidence: ${results.filter((r) => r.status === 'insufficient_evidence').length}`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
