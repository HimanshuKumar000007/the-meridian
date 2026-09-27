/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * StageRunnerService: Coordinates bounded, safe execution of individual pipeline stages
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AutomationStage, StageRunResult } from '../../types/automation';

// Stage Engines & Repositories
import { DiscoveryRunner } from '../discovery/DiscoveryRunner';
import { SupabaseDiscoveryRepository } from '../../data/repositories/SupabaseDiscoveryRepository';
import { MockDiscoveryRepository } from '../../data/repositories/MockDiscoveryRepository';
import { INITIAL_NEWS_SOURCES } from '../../data/sources/initialSources';

import { ExtractionEngine } from '../extraction/ExtractionEngine';
import { NvidiaClient } from '../extraction/NvidiaClient';
import { MockExtractionProvider } from '../extraction/MockExtractionProvider';
import { SupabaseExtractionRepository } from '../../data/repositories/SupabaseExtractionRepository';
import { MockExtractionRepository } from '../../data/repositories/MockExtractionRepository';

import { ValidationEngine, CURRENT_VALIDATOR_VERSION } from '../validation/ValidationEngine';
import { SupabaseValidationRepository } from '../../data/repositories/SupabaseValidationRepository';
import { MockValidationRepository } from '../../data/repositories/MockValidationRepository';
import { SourceContentAcquisitionService } from '../extraction/SourceContentAcquisitionService';

import { StoryLifecycleEngine, CURRENT_LIFECYCLE_VERSION } from '../lifecycle/StoryLifecycleEngine';
import { SupabaseLifecycleRepository } from '../../data/repositories/SupabaseLifecycleRepository';
import { MockLifecycleRepository } from '../../data/repositories/MockLifecycleRepository';

import { PublicationEngine } from '../publishing/PublicationEngine';
import { PublicationGateService } from '../publishing/PublicationGateService';
import { PublicationPolicyService } from '../publishing/PublicationPolicyService';
import { SupabasePublicationRepository } from '../../data/repositories/SupabasePublicationRepository';
import { MockPublicationRepository } from '../../data/repositories/MockPublicationRepository';

export interface StageRunOptions {
  limit?: number;
  dryRun?: boolean;
  force?: boolean;
  category?: string;
  source?: string;
}

export class StageRunnerService {
  constructor(
    private supabaseClient?: SupabaseClient | null,
    private isMock = false
  ) {}

  /**
   * Run a specific stage by name.
   */
  async runStage(stage: AutomationStage, options: StageRunOptions = {}): Promise<StageRunResult> {
    switch (stage) {
      case 'discovery':
        return this.runDiscovery(options);
      case 'extraction':
        return this.runExtraction(options);
      case 'validation':
        return this.runValidation(options);
      case 'lifecycle':
        return this.runLifecycle(options);
      case 'publishing':
        return this.runPublishing(options);
      default:
        throw new Error(`Unknown pipeline stage: ${stage}`);
    }
  }

  // 1. DISCOVERY STAGE
  async runDiscovery(options: StageRunOptions = {}): Promise<StageRunResult> {
    const started = Date.now();
    const limit = options.limit || 5;

    if (options.dryRun) {
      return {
        stage: 'discovery',
        status: 'completed',
        durationMs: Date.now() - started,
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        remainingQueue: 0,
        errors: [],
        metadata: { dryRun: true, plan: 'Check active sources for scheduled feed polling.' },
      };
    }

    try {
      const repo =
        this.supabaseClient && !this.isMock
          ? new SupabaseDiscoveryRepository(this.supabaseClient)
          : new MockDiscoveryRepository(INITIAL_NEWS_SOURCES);

      const runner = new DiscoveryRunner(repo);
      const result = await runner.runDiscovery({
        maxConcurrency: Math.min(limit, 3),
        forceAll: options.force ?? false,
      });

      const failedCount = result.sourcesFailed || 0;
      const status = failedCount === 0 ? 'completed' : result.sourcesSucceeded > 0 ? 'partial' : 'failed';

      return {
        stage: 'discovery',
        status,
        durationMs: Date.now() - started,
        processed: result.sourcesAttempted,
        succeeded: result.sourcesSucceeded,
        failed: failedCount,
        skipped: result.duplicates,
        remainingQueue: 0,
        errors: result.errors.map((e: any) => (typeof e === 'string' ? e : e.error || e.message || String(e))),
        metadata: {
          itemsSeen: result.itemsSeen,
          newItems: result.newItems,
          possibleUpdates: result.possibleUpdates,
        },
      };
    } catch (err: any) {
      return {
        stage: 'discovery',
        status: 'failed',
        durationMs: Date.now() - started,
        processed: 0,
        succeeded: 0,
        failed: 1,
        skipped: 0,
        remainingQueue: 0,
        errors: [err.message || String(err)],
      };
    }
  }

  // 2. EXTRACTION STAGE
  async runExtraction(options: StageRunOptions = {}): Promise<StageRunResult> {
    const started = Date.now();
    const limit = options.limit || 5;

    try {
      const repo =
        this.supabaseClient && !this.isMock
          ? new SupabaseExtractionRepository(this.supabaseClient)
          : new MockExtractionRepository();

      const pendingItems = await repo.getPendingDiscoveryItems({
        limit,
        category: options.category,
        sourceSlug: options.source,
      });

      if (options.dryRun) {
        return {
          stage: 'extraction',
          status: 'completed',
          durationMs: Date.now() - started,
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          remainingQueue: pendingItems.length,
          errors: [],
          metadata: { dryRun: true, plannedBatchSize: Math.min(limit, pendingItems.length || limit) },
        };
      }

      if (pendingItems.length === 0) {
        return {
          stage: 'extraction',
          status: 'completed',
          durationMs: Date.now() - started,
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          remainingQueue: 0,
          errors: [],
        };
      }

      const apiKey = process.env.NVIDIA_API_KEY;
      const useNvidia = !this.isMock && Boolean(apiKey);
      const llmProvider = useNvidia ? new NvidiaClient({ apiKey }) : new MockExtractionProvider();

      const engine = new ExtractionEngine({ llmProvider, repository: repo });

      let succeeded = 0;
      let failed = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const item of pendingItems) {
        try {
          const candidate = await engine.extract(item, {
            dryRun: false,
          });
          if (candidate.extractionStatus === 'completed' || candidate.extractionStatus === 'needs_review') {
            succeeded++;
          } else {
            failed++;
          }
        } catch (itemErr: any) {
          failed++;
          errors.push(itemErr.message || String(itemErr));
        }
      }

      const status = failed === 0 ? 'completed' : succeeded > 0 ? 'partial' : 'failed';

      return {
        stage: 'extraction',
        status,
        durationMs: Date.now() - started,
        processed: pendingItems.length,
        succeeded,
        failed,
        skipped,
        remainingQueue: Math.max(0, pendingItems.length - succeeded - skipped),
        errors,
      };
    } catch (err: any) {
      return {
        stage: 'extraction',
        status: 'failed',
        durationMs: Date.now() - started,
        processed: 0,
        succeeded: 0,
        failed: 1,
        skipped: 0,
        remainingQueue: 0,
        errors: [err.message || String(err)],
      };
    }
  }

  // 3. VALIDATION STAGE
  async runValidation(options: StageRunOptions = {}): Promise<StageRunResult> {
    const started = Date.now();
    const limit = options.limit || 10;

    try {
      const repo =
        this.supabaseClient && !this.isMock
          ? new SupabaseValidationRepository(this.supabaseClient)
          : new MockValidationRepository();

      const pendingExtractions = await repo.getPendingExtractions({
        limit,
        category: options.category,
      });

      if (options.dryRun) {
        return {
          stage: 'validation',
          status: 'completed',
          durationMs: Date.now() - started,
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          remainingQueue: pendingExtractions.length,
          errors: [],
          metadata: { dryRun: true, plannedBatchSize: Math.min(limit, pendingExtractions.length) },
        };
      }

      if (pendingExtractions.length === 0) {
        return {
          stage: 'validation',
          status: 'completed',
          durationMs: Date.now() - started,
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          remainingQueue: 0,
          errors: [],
        };
      }

      const engine = new ValidationEngine({
        repository: repo,
        validatorVersion: CURRENT_VALIDATOR_VERSION,
      });
      const acquisition = new SourceContentAcquisitionService({ timeoutMs: 8000 });

      let succeeded = 0;
      let failed = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const ext of pendingExtractions) {
        try {
          let sourceText = '';
          let sourceUrl = '';
          let publishedAt = null;

          if (this.supabaseClient && !this.isMock) {
            const { data: discItem } = await this.supabaseClient
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
                  sourceName: discItem.source_name || 'News Source',
                  sourceType: discItem.source_type || 'rss',
                  canonicalUrl: discItem.canonical_url || discItem.source_url,
                  sourceUrl: discItem.source_url,
                  title: discItem.title,
                  description: discItem.description || '',
                  publishedAt: discItem.published_at,
                  discoveredAt: discItem.discovered_at,
                  lastSeenAt: discItem.last_seen_at || discItem.discovered_at,
                  status: discItem.status,
                  fingerprint: discItem.fingerprint,
                  contentHash: discItem.content_hash,
                });
                sourceText = acquired.articleText || discItem.raw_content || '';
              } catch {
                sourceText = discItem.raw_content || discItem.description || '';
              }
            }
          }

          const validation = await engine.validate({
            extraction: ext,
            sourceText,
            sourceUrl,
            publishedAt,
          });

          if (validation.status === 'valid') {
            succeeded++;
          } else if (validation.status === 'needs_review' || validation.status === 'insufficient_evidence') {
            skipped++;
          } else {
            failed++;
          }
        } catch (itemErr: any) {
          failed++;
          errors.push(itemErr.message || String(itemErr));
        }
      }

      const status = failed === 0 ? 'completed' : succeeded > 0 ? 'partial' : 'failed';

      return {
        stage: 'validation',
        status,
        durationMs: Date.now() - started,
        processed: pendingExtractions.length,
        succeeded,
        failed,
        skipped,
        remainingQueue: Math.max(0, pendingExtractions.length - succeeded - skipped),
        errors,
      };
    } catch (err: any) {
      return {
        stage: 'validation',
        status: 'failed',
        durationMs: Date.now() - started,
        processed: 0,
        succeeded: 0,
        failed: 1,
        skipped: 0,
        remainingQueue: 0,
        errors: [err.message || String(err)],
      };
    }
  }

  // 4. LIFECYCLE STAGE
  async runLifecycle(options: StageRunOptions = {}): Promise<StageRunResult> {
    const started = Date.now();
    const limit = options.limit || 10;

    try {
      const repo =
        this.supabaseClient && !this.isMock
          ? new SupabaseLifecycleRepository(this.supabaseClient)
          : new MockLifecycleRepository();

      const candidates = await repo.getPendingCandidates(limit);

      if (options.dryRun) {
        return {
          stage: 'lifecycle',
          status: 'completed',
          durationMs: Date.now() - started,
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          remainingQueue: candidates.length,
          errors: [],
          metadata: { dryRun: true, plannedBatchSize: Math.min(limit, candidates.length) },
        };
      }

      if (candidates.length === 0) {
        return {
          stage: 'lifecycle',
          status: 'completed',
          durationMs: Date.now() - started,
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          remainingQueue: 0,
          errors: [],
        };
      }

      const engine = new StoryLifecycleEngine(repo, {
        lifecycleVersion: CURRENT_LIFECYCLE_VERSION,
      });

      let succeeded = 0;
      let failed = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const item of candidates) {
        try {
          const decision = await engine.processCandidate(item.extraction, item.validation, {
            dryRun: false,
            forceRerun: options.force,
          });

          if (decision.action === 'CREATE' || decision.action === 'UPDATE') {
            succeeded++;
          } else {
            skipped++;
          }
        } catch (itemErr: any) {
          failed++;
          errors.push(itemErr.message || String(itemErr));
        }
      }

      const status = failed === 0 ? 'completed' : succeeded > 0 ? 'partial' : 'failed';

      return {
        stage: 'lifecycle',
        status,
        durationMs: Date.now() - started,
        processed: candidates.length,
        succeeded,
        failed,
        skipped,
        remainingQueue: Math.max(0, candidates.length - succeeded - skipped),
        errors,
      };
    } catch (err: any) {
      return {
        stage: 'lifecycle',
        status: 'failed',
        durationMs: Date.now() - started,
        processed: 0,
        succeeded: 0,
        failed: 1,
        skipped: 0,
        remainingQueue: 0,
        errors: [err.message || String(err)],
      };
    }
  }

  // 5. PUBLISHING STAGE
  async runPublishing(options: StageRunOptions = {}): Promise<StageRunResult> {
    const started = Date.now();
    const limit = options.limit || 5;

    try {
      const repo =
        this.supabaseClient && !this.isMock
          ? new SupabasePublicationRepository(this.supabaseClient)
          : new MockPublicationRepository();

      const policyService = new PublicationPolicyService();
      const gateService = new PublicationGateService(policyService);
      const engine = new PublicationEngine({
        repository: repo,
        policyService,
        gateService,
      });

      const queuedItems = await repo.getQueuedItems(limit);

      if (options.dryRun) {
        return {
          stage: 'publishing',
          status: 'completed',
          durationMs: Date.now() - started,
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          remainingQueue: queuedItems.length,
          errors: [],
          metadata: { dryRun: true, plannedBatchSize: Math.min(limit, queuedItems.length) },
        };
      }

      if (queuedItems.length === 0) {
        return {
          stage: 'publishing',
          status: 'completed',
          durationMs: Date.now() - started,
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          remainingQueue: 0,
          errors: [],
        };
      }

      const pubRun = await engine.processQueue({
        limit,
        dryRun: false,
        force: options.force,
      });

      const succeeded = (pubRun.published || 0) + (pubRun.updated || 0);
      const skipped = (pubRun.held || 0) + (pubRun.rejected || 0);
      const failed = pubRun.failed || 0;
      const status = failed === 0 ? 'completed' : succeeded > 0 ? 'partial' : 'failed';

      return {
        stage: 'publishing',
        status,
        durationMs: Date.now() - started,
        processed: pubRun.processed || 0,
        succeeded,
        failed,
        skipped,
        remainingQueue: Math.max(0, queuedItems.length - succeeded - skipped),
        errors: pubRun.errors || [],
      };
    } catch (err: any) {
      return {
        stage: 'publishing',
        status: 'failed',
        durationMs: Date.now() - started,
        processed: 0,
        succeeded: 0,
        failed: 1,
        skipped: 0,
        remainingQueue: 0,
        errors: [err.message || String(err)],
      };
    }
  }
}
