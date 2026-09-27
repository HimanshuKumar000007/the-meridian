/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/trending
 * Public endpoint for trending stories based on deterministic time-decay metrics
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../src/lib/supabase';
import { SupabaseSearchRepository } from '../src/data/repositories/SupabaseSearchRepository';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const repository = new SupabaseSearchRepository(getSupabaseClient());
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '5'), 10), 1), 20);
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    const stories = await repository.getTrendingStories({ limit, category });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=180');
    return res.status(200).json({ stories, count: stories.length });
  } catch (error: any) {
    console.error('[API /api/trending] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve trending stories.' });
  }
}
