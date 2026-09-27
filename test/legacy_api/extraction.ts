/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/automation/extraction
 * Server-side secure extraction stage automation endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { StageRunnerService } from '../../src/services/automation/StageRunnerService';
import { AutomationConfigService } from '../../src/services/automation/AutomationConfigService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const configService = new AutomationConfigService();
  const authHeader = req.headers['authorization'] as string | undefined;
  const customHeader = (req.headers['x-cron-secret'] || req.headers['x-admin-secret']) as string | undefined;

  if (!configService.verifyAuthHeader(authHeader, customHeader)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid automation credentials.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Server Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY.' });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const runner = new StageRunnerService(supabase);
    const { limit = 5, dryRun = false, force = false, category, source } = req.body || {};

    const result = await runner.runExtraction({
      limit: Math.min(Math.max(Number(limit) || 5, 1), 10), // bounded extraction limit
      dryRun: Boolean(dryRun),
      force: Boolean(force),
      category: typeof category === 'string' ? category : undefined,
      source: typeof source === 'string' ? source : undefined,
    });

    return res.status(200).json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
