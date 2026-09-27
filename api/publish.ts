/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/publish
 * Secure server-side news publication endpoint.
 * Secret keys (SUPABASE_SERVICE_ROLE_KEY) are executed strictly server-side.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { SupabasePublicationRepository } from '../src/data/repositories/SupabasePublicationRepository';
import { PublicationEngine } from '../src/services/publishing/PublicationEngine';
import { PublicationGateService } from '../src/services/publishing/PublicationGateService';
import { PublicationPolicyService } from '../src/services/publishing/PublicationPolicyService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(500).json({
      error: 'Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing.',
    });
  }

  // Verify internal authorization if ADMIN_SECRET_KEY is configured
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  if (adminSecret) {
    const authHeader = req.headers['x-admin-secret'] || req.headers['authorization'];
    const token = authHeader?.toString().replace(/^Bearer\s+/i, '');
    if (token !== adminSecret && token !== serviceRoleKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials.' });
    }
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const repository = new SupabasePublicationRepository(supabase);
    const policyService = new PublicationPolicyService();
    const gateService = new PublicationGateService(policyService);
    const engine = new PublicationEngine({
      repository,
      policyService,
      gateService,
    });

    if (req.method === 'GET') {
      const telemetry = await repository.getTelemetry();
      return res.status(200).json({
        success: true,
        telemetry,
      });
    }

    if (req.method === 'POST') {
      const { action = 'process_queue', limit = 5, dryRun = false, force = false, storyId, input, reason } = req.body || {};

      if (action === 'unpublish') {
        if (!storyId) {
          return res.status(400).json({ error: 'Missing storyId for unpublish action.' });
        }
        const event = await engine.unpublishStory(storyId, reason || 'UNPUBLISHED_BY_OPERATOR');
        return res.status(200).json({
          success: true,
          action: 'unpublish',
          event,
        });
      }

      if (action === 'publish_candidate') {
        if (!input) {
          return res.status(400).json({ error: 'Missing input for publish_candidate action.' });
        }
        const result = await engine.publishCandidate(input, { force, dryRun });
        return res.status(200).json({
          success: true,
          action: 'publish_candidate',
          result,
        });
      }

      // Default: process bounded queue
      const run = await engine.processQueue({
        limit: Number(limit) || 5,
        dryRun: Boolean(dryRun),
        force: Boolean(force),
      });

      return res.status(200).json({
        success: true,
        action: 'process_queue',
        run,
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed. Use GET or POST.' });
  } catch (err: any) {
    console.error('[PublishHandler] Error:', err);
    return res.status(500).json({
      error: 'An internal error occurred during publication.',
      message: err.message,
    });
  }
}
