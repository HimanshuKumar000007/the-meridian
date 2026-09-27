/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/monitoring/readiness
 * Production Readiness & Ingress Gate Endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { MonitoringService } from '../../src/services/monitoring/MonitoringService';
import {
  getRequestId,
  formatSafeErrorResponse,
  trackError,
} from '../../src/services/monitoring/errorTracker';

function verifyMonitoringAuth(req: VercelRequest): boolean {
  const monitoringSecret =
    process.env.MONITORING_SECRET ||
    process.env.CRON_SECRET ||
    process.env.AUTOMATION_CRON_SECRET ||
    process.env.ADMIN_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!monitoringSecret || monitoringSecret.trim() === '') {
    return false;
  }

  const customHeader =
    (req.headers['x-monitoring-secret'] as string | undefined) ||
    (req.headers['x-cron-secret'] as string | undefined) ||
    (req.headers['x-admin-secret'] as string | undefined);

  if (customHeader && customHeader.trim() === monitoringSecret.trim()) {
    return true;
  }

  const authHeader = req.headers['authorization'] as string | undefined;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token === monitoringSecret.trim()) {
      return true;
    }
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = getRequestId(req.headers);
  res.setHeader('x-request-id', requestId);

  if (!verifyMonitoringAuth(req)) {
    return res.status(401).json(
      formatSafeErrorResponse(
        new Error('Unauthorized: Access restricted to authorized monitoring operators.'),
        requestId,
        'UNAUTHORIZED'
      )
    );
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(500).json(
      formatSafeErrorResponse(
        new Error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY missing.'),
        requestId,
        'CONFIG_ERROR'
      )
    );
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const service = new MonitoringService({
      client: supabase,
    });

    const readiness = await service.getReadiness();

    const statusCode = readiness.ready ? 200 : 503;
    return res.status(statusCode).json({
      status: readiness.ready ? 'ready' : 'not_ready',
      requestId,
      ...readiness,
    });
  } catch (err: any) {
    trackError(err, {
      requestId,
      service: 'api/monitoring/readiness',
      action: 'getReadiness',
    });

    return res.status(500).json(
      formatSafeErrorResponse(
        err,
        requestId,
        'READINESS_CHECK_FAILED'
      )
    );
  }
}
