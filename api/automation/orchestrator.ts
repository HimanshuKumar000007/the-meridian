/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/automation/orchestrator
 * Master Orchestrator: Coordinates multi-stage automated news pipeline.
 *
 * Invoked by Vercel Cron, GitHub Actions, or scheduled webhook callers.
 * Strictly requires server automation credentials (CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { PipelineOrchestrator } from '../../src/services/automation/PipelineOrchestrator';
import { StageRunnerService } from '../../src/services/automation/StageRunnerService';
import { SupabaseAutomationRepository } from '../../src/data/repositories/SupabaseAutomationRepository';
import { AutomationConfigService } from '../../src/services/automation/AutomationConfigService';
import type { AutomationStage, AutomationTrigger } from '../../src/types/automation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const configService = new AutomationConfigService();
  const authHeader = req.headers['authorization'] as string | undefined;
  const customHeader = (req.headers['x-cron-secret'] || req.headers['x-admin-secret']) as string | undefined;

  // 1. Strict Server Authentication
  if (!configService.verifyAuthHeader(authHeader, customHeader)) {
    return res.status(401).json({
      error: 'Unauthorized: Valid automation credentials required to invoke the orchestrator.',
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(500).json({
      error: 'Server Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const repository = new SupabaseAutomationRepository(supabase);
    const stageRunner = new StageRunnerService(supabase);
    const orchestrator = new PipelineOrchestrator(repository, stageRunner, {
      configService,
    });

    // Detect trigger from headers (e.g. Vercel Cron sends user-agent or custom headers)
    const isVercelCron = Boolean(req.headers['user-agent']?.includes('vercel-cron'));
    const bodyTrigger = req.body?.trigger as AutomationTrigger | undefined;
    const trigger: AutomationTrigger = isVercelCron ? 'cron' : bodyTrigger || 'api';

    const {
      dryRun = false,
      force = false,
      stages,
      limitOverride,
    } = req.body || {};

    const validatedStages = Array.isArray(stages)
      ? (stages.filter((s: string) =>
          ['discovery', 'extraction', 'validation', 'lifecycle', 'publishing'].includes(s)
        ) as AutomationStage[])
      : undefined;

    const result = await orchestrator.orchestrate({
      trigger,
      dryRun: Boolean(dryRun),
      force: Boolean(force),
      stages: validatedStages,
      limitOverride: limitOverride ? Math.max(1, Math.min(Number(limitOverride), 20)) : undefined,
    });

    const statusCode = result.status === 'failed' ? 500 : result.status === 'skipped' ? 409 : 200;

    return res.status(statusCode).json({
      success: result.status === 'completed' || result.status === 'partial',
      result,
    });
  } catch (err: any) {
    console.error('[api/automation/orchestrator] Unhandled error:', err);
    return res.status(500).json({
      error: err.message || 'Internal Server Error during orchestration.',
    });
  }
}
