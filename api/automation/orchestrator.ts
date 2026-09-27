/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/automation/orchestrator
 * Master Orchestrator: Coordinates multi-stage automated news pipeline.
 *
 * Invoked by Vercel Cron, GitHub Actions, or scheduled webhook callers.
 * Strictly requires server automation credentials (AUTOMATION_CRON_SECRET).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { PipelineOrchestrator } from '../../src/services/automation/PipelineOrchestrator';
import { StageRunnerService } from '../../src/services/automation/StageRunnerService';
import { SupabaseAutomationRepository } from '../../src/data/repositories/SupabaseAutomationRepository';
import { AutomationConfigService } from '../../src/services/automation/AutomationConfigService';
import { MonitoringService } from '../../src/services/monitoring/MonitoringService';
import type { AutomationStage, AutomationTrigger } from '../../src/types/automation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const authHeader = req.headers['authorization'] as string | undefined;
    const customHeader = (req.headers['x-cron-secret'] || req.headers['x-admin-secret']) as string | undefined;
    const expectedSecret = process.env.AUTOMATION_CRON_SECRET || process.env.CRON_SECRET;

    if (!expectedSecret || expectedSecret.trim() === '') {
      return res.status(401).json({
        error: 'Unauthorized: AUTOMATION_CRON_SECRET is not configured on server.',
      });
    }

    const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : undefined;
    const provided = bearerToken || (customHeader ? customHeader.trim() : undefined);

    if (!provided) {
      return res.status(401).json({
        error: 'Unauthorized: Missing automation credentials.',
      });
    }

    // Strict Security Guard: SUPABASE_SERVICE_ROLE_KEY must NEVER authenticate as the cron credential
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_KEY;

    if (serviceRoleKey && serviceRoleKey.trim() !== '' && provided === serviceRoleKey.trim()) {
      return res.status(401).json({
        error: 'Unauthorized: SUPABASE_SERVICE_ROLE_KEY cannot be used as automation secret.',
      });
    }

    if (provided !== expectedSecret.trim()) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid automation credentials.',
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
    if (!serviceRoleKey) {
      return res.status(500).json({
        error: 'Server Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY.',
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const configService = new AutomationConfigService();
    const repository = new SupabaseAutomationRepository(supabase);
    const stageRunner = new StageRunnerService(supabase);
    const orchestrator = new PipelineOrchestrator(repository, stageRunner, {
      configService,
    });

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

    const monitoringService = new MonitoringService({ client: supabase });

    const result = await orchestrator.orchestrate({
      trigger,
      dryRun: Boolean(dryRun),
      force: Boolean(force),
      stages: validatedStages,
      limitOverride: limitOverride ? Math.max(1, Math.min(Number(limitOverride), 20)) : undefined,
      monitoringHook: async () => {
        await monitoringService.runHealthCheck({ persistSnapshot: true });
      },
    });

    const statusCode = result.status === 'failed' ? 500 : result.status === 'skipped' ? 409 : 200;

    return res.status(statusCode).json({
      success: result.status === 'completed' || result.status === 'partial',
      result,
    });
  } catch (err: any) {
    console.error('[api/automation/orchestrator] Error:', err);
    return res.status(500).json({
      error: err?.message || String(err),
      name: err?.name,
      stack: err?.stack,
    });
  }
}
