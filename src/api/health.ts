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
import { ResearchCanaryService } from '../services/research/ResearchCanaryService';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const configService = new AutomationConfigService();
  const authHeader = req.headers['authorization'] as string | undefined;
  const customHeader = (req.headers['x-cron-secret'] || req.headers['x-admin-secret']) as string | undefined;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Server Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Strict server authentication: check local env secret first, then Supabase Vault
  let isAuthorized = configService.verifyAuthHeader(authHeader, customHeader);
  if (!isAuthorized) {
    const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : undefined;
    const provided = bearerToken || (customHeader ? customHeader.trim() : undefined);
    if (provided && (!serviceRoleKey || provided !== serviceRoleKey.trim())) {
      try {
        const { data: isValid, error: rpcErr } = await supabase.rpc('verify_cron_secret', {
          candidate: provided,
        });
        if (!rpcErr && isValid === true) {
          isAuthorized = true;
        }
      } catch (vaultErr) {
        console.warn('[health] Vault verification check error:', vaultErr);
      }
    }
  }

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized: Access restricted to authorized operators.' });
  }

  try {

    const repository = new SupabaseAutomationRepository(supabase);
    const healthService = new AutomationHealthService(repository, configService);
    const capabilityService = new SchedulerCapabilityService();

    const health = await healthService.getHealth();
    const capabilities = capabilityService.getCapabilities();

    const canaryService = new ResearchCanaryService(supabase);
    const canaryPublishedCount = await canaryService.getCanaryPublishedCount();
    const researchCanary = {
      mode: process.env.RESEARCH_PIPELINE_MODE || 'canary',
      active: canaryService.isCanaryActive(),
      category: canaryService.getCanaryCategory(),
      activationCutoff: canaryService.getActivationCutoff().toISOString(),
      maxPublications: canaryService.getMaxCanaryPublications(),
      publishedCount: canaryPublishedCount,
      remainingSlots: Math.max(0, canaryService.getMaxCanaryPublications() - canaryPublishedCount),
    };

    return res.status(200).json({
      success: true,
      health,
      capabilities,
      researchCanary,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
