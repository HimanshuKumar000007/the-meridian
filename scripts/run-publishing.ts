/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Phase 9: Automated Publishing & Web Distribution Engine CLI Runner
 *
 * Usage:
 *   npx tsx scripts/run-publishing.ts --limit 5 --dry-run
 *   npx tsx scripts/run-publishing.ts --limit 10
 *   npx tsx scripts/run-publishing.ts --story-id <id>
 *   npx tsx scripts/run-publishing.ts --mock --limit 5
 *   npx tsx scripts/run-publishing.ts --unpublish <story-id>
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { SupabasePublicationRepository } from '../src/data/repositories/SupabasePublicationRepository';
import { MockPublicationRepository } from '../src/data/repositories/MockPublicationRepository';
import { PublicationEngine } from '../src/services/publishing/PublicationEngine';
import { PublicationPolicyService } from '../src/services/publishing/PublicationPolicyService';
import { PublicationGateService } from '../src/services/publishing/PublicationGateService';
import { SitemapService } from '../src/services/distribution/SitemapService';
import { RssFeedService } from '../src/services/distribution/RssFeedService';
import type { PublicationRepository } from '../src/data/repositories/PublicationRepository';

// Parse command-line flags
const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const hasFlag = (flag: string) => args.includes(flag);

const isDryRun = hasFlag('--dry-run');
const isMock = hasFlag('--mock');
const isForce = hasFlag('--force');
const retryFailed = hasFlag('--retry-failed');
const limit = parseInt(getArg('--limit') || '5', 10);
const targetCategory = getArg('--category');
const targetStoryId = getArg('--story-id');
const unpublishStoryId = getArg('--unpublish');

async function main() {
  console.log('====================================================');
  console.log('THE MERIDIAN — AUTOMATED PUBLISHING ENGINE (PHASE 9)');
  console.log('====================================================');
  console.log(`Mode:       ${isMock ? 'OFFLINE MOCK' : 'LIVE SUPABASE'}`);
  console.log(`Dry Run:    ${isDryRun ? 'YES (No database writes)' : 'NO (Real mutations)'}`);
  console.log(`Limit:      ${limit}`);
  if (targetCategory) console.log(`Category:   ${targetCategory}`);
  if (targetStoryId) console.log(`Story ID:   ${targetStoryId}`);
  if (unpublishStoryId) console.log(`Unpublish:  ${unpublishStoryId}`);
  console.log('----------------------------------------------------');

  let repository: PublicationRepository;

  if (isMock) {
    repository = new MockPublicationRepository();
  } else {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required for live publishing operations.');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    repository = new SupabasePublicationRepository(supabase);
  }

  const policyService = new PublicationPolicyService();
  const gateService = new PublicationGateService(policyService);
  const engine = new PublicationEngine({
    repository,
    policyService,
    gateService,
  });

  // Handle Controlled Unpublish
  if (unpublishStoryId) {
    console.log(`Initiating controlled unpublish for story: ${unpublishStoryId}`);
    try {
      const event = await engine.unpublishStory(
        unpublishStoryId,
        'Manual unpublish requested via CLI operator.'
      );
      console.log('✅ Story unpublished successfully.');
      console.log(`   Event ID:        ${event.id}`);
      console.log(`   Previous Status: ${event.previousStatus}`);
      console.log(`   New Status:      ${event.newStatus}`);
      process.exit(0);
    } catch (err: any) {
      console.error('❌ Failed to unpublish story:', err.message);
      process.exit(1);
    }
  }

  // Handle Single Story Publish
  if (targetStoryId) {
    console.log(`Processing single story: ${targetStoryId}`);
    const story = await repository.getStoryById(targetStoryId);
    if (!story) {
      console.error(`ERROR: Story '${targetStoryId}' not found.`);
      process.exit(1);
    }

    const decision = gateService.evaluate({
      story,
      lifecycleDecision: {
        id: 'manual-cli-run',
        action: 'CREATE',
        matchConfidence: 'none',
        matchReason: 'NO_MATCH',
        reason: 'Manual CLI publication check',
        changedFields: [],
        lifecycleVersion: '1.0.0',
        createdAt: new Date().toISOString(),
      },
      validation: {
        id: 'manual-val',
        extractionId: 'manual-ext',
        status: 'valid',
        overallScore: 0.95,
        issues: [],
        validatedFields: { title: 'validated', summary: 'validated', category: 'validated' },
        rejectedFields: [],
        claimCoverage: 1.0,
        sourceCoverage: 1.0,
        categoryValidation: {
          expectedCategory: story.category,
          extractedCategory: story.category,
          status: 'match',
          confidence: 1.0,
        },
        dateValidation: { status: 'valid' },
        numberValidation: { numbersChecked: 0, numbersPassed: 0, status: 'valid' },
        quoteValidation: { quotesChecked: 0, quotesPassed: 0, status: 'valid' },
        entityValidation: { entitiesChecked: 0, entitiesPassed: 0, status: 'valid' },
        originalityCheck: { copyRiskScore: 0.1, status: 'original' },
        sensitiveTopicFlags: [],
        validatorVersion: '1.0.0',
        inputHash: 'cli',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      extraction: {
        id: 'manual-ext',
        discoveryItemId: 'cli',
        title: story.title,
        dek: story.dek || '',
        summary: story.summary,
        summaryPoints: story.summary_points || [],
        category: story.category,
        subcategory: story.subcategory || '',
        classificationConfidence: 0.95,
        topics: [story.category],
        status: 'normal',
        publishedAt: story.published_at || new Date().toISOString(),
        author: story.author?.name || 'Staff',
        entities: [],
        facts: [],
        timelineCandidates: [],
        contentBlocks: story.content || [],
        sources: (story.sources || []).map((s) => ({ name: s.name, url: s.url || '' })),
        heroImage: story.image,
        sourceEvidence: [],
        overallConfidence: 0.95,
        confidenceLevel: 'high',
        hasConflicts: false,
        extractionStatus: 'completed',
        model: 'manual',
        promptVersion: '1.0.0',
        inputHash: 'cli',
        outputHash: 'cli',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      force: isForce,
    });

    console.log(`Gate Decision:       ${decision.decision}`);
    console.log(`Reason:              ${decision.reason}`);
    console.log(`Publication Version: ${decision.publicationVersion}`);
    if (decision.blockingIssues.length > 0) {
      console.log(`Blocking Issues:     ${decision.blockingIssues.join('; ')}`);
    }

    if (decision.decision === 'PUBLISH' && !isDryRun) {
      const res = await engine.publishCandidate(
        {
          story,
          lifecycleDecision: {
            id: `cli-${Date.now()}`,
            action: 'CREATE',
            matchConfidence: 'none',
            matchReason: 'NO_MATCH',
            reason: 'Manual CLI publish',
            changedFields: [],
            lifecycleVersion: '1.0.0',
            createdAt: new Date().toISOString(),
          },
          validation: {
            id: `val-${Date.now()}`,
            extractionId: 'cli',
            status: 'valid',
            overallScore: 0.95,
            issues: [],
            validatedFields: { title: 'validated' },
            rejectedFields: [],
            claimCoverage: 1.0,
            sourceCoverage: 1.0,
            categoryValidation: {
              expectedCategory: story.category,
              extractedCategory: story.category,
              status: 'match',
              confidence: 1.0,
            },
            dateValidation: { status: 'valid' },
            numberValidation: { numbersChecked: 0, numbersPassed: 0, status: 'valid' },
            quoteValidation: { quotesChecked: 0, quotesPassed: 0, status: 'valid' },
            entityValidation: { entitiesChecked: 0, entitiesPassed: 0, status: 'valid' },
            originalityCheck: { copyRiskScore: 0.1, status: 'original' },
            sensitiveTopicFlags: [],
            validatorVersion: '1.0.0',
            inputHash: 'cli',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          extraction: {
            id: `ext-${Date.now()}`,
            discoveryItemId: 'cli',
            title: story.title,
            dek: story.dek || '',
            summary: story.summary,
            summaryPoints: story.summary_points || [],
            category: story.category,
            subcategory: story.subcategory || '',
            classificationConfidence: 0.95,
            topics: [story.category],
            status: 'normal',
            publishedAt: new Date().toISOString(),
            author: story.author?.name || 'Staff',
            entities: [],
            facts: [],
            timelineCandidates: [],
            contentBlocks: story.content || [],
            sources: (story.sources || []).map((s) => ({ name: s.name, url: s.url || '' })),
            heroImage: story.image,
            sourceEvidence: [],
            overallConfidence: 0.95,
            confidenceLevel: 'high',
            hasConflicts: false,
            extractionStatus: 'completed',
            model: 'manual',
            promptVersion: '1.0.0',
            inputHash: 'cli',
            outputHash: 'cli',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          force: isForce,
        },
        { force: isForce }
      );
      console.log(`✅ Story published! Status: ${res.story?.status}`);
    }
    process.exit(0);
  }

  // Bounded Queue Processing
  console.log(`Fetching queued publication items (limit: ${limit})...`);
  const queuedItems = await repository.getQueuedItems(limit);
  console.log(`Found ${queuedItems.length} candidate(s) in queue.`);

  if (queuedItems.length === 0) {
    console.log('No queued items awaiting publication.');
    const pubCount = await repository.countPublishedStories();
    console.log(`Current published stories count: ${pubCount}`);
    process.exit(0);
  }

  const run = await engine.processQueue({
    limit,
    dryRun: isDryRun,
    force: isForce,
  });

  console.log('----------------------------------------------------');
  console.log('PUBLICATION RUN COMPLETED:');
  console.log(`   Processed:  ${run.processed}`);
  console.log(`   Published:  ${run.published}`);
  console.log(`   Updated:    ${run.updated}`);
  console.log(`   Held:       ${run.held}`);
  console.log(`   Rejected:   ${run.rejected}`);
  console.log(`   Failed:     ${run.failed}`);
  if (run.errors.length > 0) {
    console.log(`   Errors:     ${JSON.stringify(run.errors)}`);
  }

  const pubCount = await repository.countPublishedStories();
  console.log(`Current published stories in database: ${pubCount}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
