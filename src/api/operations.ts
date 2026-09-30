/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/internal/operations
 * Private, Read-Only Operations Dashboard API for The Meridian.
 * Strictly requires authorized operator credentials.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { OperationsDashboardService } from '../services/operations/OperationsDashboardService';
import { AutomationConfigService } from '../services/automation/AutomationConfigService';
import type { TimeRangeOption } from '../types/operations';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Strictly enforce HTTP GET only (No write/control operations allowed)
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: `Method Not Allowed: ${req.method}. Operations Dashboard API is strictly read-only.`,
    });
  }

  // Set no-cache headers for live operations monitoring
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  try {
    const configService = new AutomationConfigService();
    const authHeader = req.headers['authorization'] as string | undefined;
    const customHeader = (req.headers['x-operator-secret'] ||
      req.headers['x-admin-secret'] ||
      req.headers['x-cron-secret']) as string | undefined;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return res.status(500).json({
        error: 'Server Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY.',
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 2. Strict Authentication: Verify against server-side secret or Supabase Vault
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
          console.warn('[operations-api] Vault verification error:', vaultErr);
        }
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({
        error: 'Unauthorized: Access restricted to authorized Meridian operators.',
      });
    }

    const section = (req.query.section as string) || 'overview';

    // Verification check for operator login
    if (section === 'verify') {
      return res.status(200).json({
        success: true,
        authorized: true,
        message: 'Operator credential verified successfully.',
      });
    }

    const dashboardService = new OperationsDashboardService(supabase);

    // Section 1: Overview
    if (section === 'overview') {
      const timeRange = (req.query.timeRange as TimeRangeOption) || '24h';
      const validTimeRanges: TimeRangeOption[] = ['1h', '24h', '7d', '30d'];
      const resolvedTimeRange = validTimeRanges.includes(timeRange) ? timeRange : '24h';

      const overview = await dashboardService.getDashboardOverview(resolvedTimeRange);
      return res.status(200).json({
        success: true,
        data: overview,
      });
    }

    // Section 2: Recent Stories
    if (section === 'stories') {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const stories = await dashboardService.getRecentStories(limit);
      return res.status(200).json({
        success: true,
        data: stories,
      });
    }

    // Section 3: Recent Errors
    if (section === 'errors') {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const errors = await dashboardService.getRecentErrors(limit);
      return res.status(200).json({
        success: true,
        data: errors,
      });
    }

    return res.status(400).json({
      error: `Invalid section: ${section}. Valid options are: overview, stories, errors, verify.`,
    });
  } catch (err: any) {
    console.error('[operations-api] Internal Server Error:', err);
    return res.status(500).json({
      error: err.message || 'Internal Server Error',
    });
  }
}
