/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/most-read
 * Public endpoint for most read stories based on verified view counts
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
    const window = typeof req.query.window === 'string' ? req.query.window : 'lifetime';

    const stories = await repository.getMostReadStories({
      limit,
      category,
      window: window as any,
    });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=180');
    return res.status(200).json({ stories, count: stories.length, window });
  } catch (error: any) {
    console.error('[API /api/most-read] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve most read stories.' });
  }
}
