/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/automation/health
 * Internal Automation Dashboard & Telemetry Endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { AutomationHealthService } from '../services/automation/AutomationHealthService';
import { SupabaseAutomationRepository } from '../data/repositories/SupabaseAutomationRepository';
import { AutomationConfigService } from '../services/automation/AutomationConfigService';
import { SchedulerCapabilityService } from '../services/automation/SchedulerCapabilityService';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const configService = new AutomationConfigService();
  const authHeader = req.headers['authorization'] as string | undefined;
  const customHeader = (req.headers['x-cron-secret'] || req.headers['x-admin-secret']) as string | undefined;

  // Strict server authentication
  if (!configService.verifyAuthHeader(authHeader, customHeader)) {
    return res.status(401).json({ error: 'Unauthorized: Access restricted to authorized operators.' });
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

    const repository = new SupabaseAutomationRepository(supabase);
    const healthService = new AutomationHealthService(repository, configService);
    const capabilityService = new SchedulerCapabilityService();

    const health = await healthService.getHealth();
    const capabilities = capabilityService.getCapabilities();

    return res.status(200).json({
      success: true,
      health,
      capabilities,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
