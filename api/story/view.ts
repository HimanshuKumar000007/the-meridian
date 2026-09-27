/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/story/view
 * Secure endpoint for recording verified, anti-inflation story views
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../src/lib/supabase';
import { SupabaseSearchRepository } from '../../src/data/repositories/SupabaseSearchRepository';
import { ViewCountService } from '../../src/services/metrics/ViewCountService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { storyId, sessionHash } = req.body || {};

  if (!storyId || typeof storyId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid storyId parameter.' });
  }

  if (!sessionHash || typeof sessionHash !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid sessionHash parameter.' });
  }

  try {
    const repository = new SupabaseSearchRepository(getSupabaseClient());
    const viewService = new ViewCountService(repository);

    const result = await viewService.recordView(storyId, sessionHash);

    if (result.error === 'story_not_found') {
      return res.status(404).json({ error: 'Story not found.' });
    }

    if (result.error === 'story_not_published') {
      return res.status(403).json({ error: 'Cannot record view for non-published story.' });
    }

    return res.status(200).json({
      recorded: result.recorded,
      reason: result.reason,
      viewCount: result.viewCount,
      trendingScore: result.trendingScore,
    });
  } catch (error: any) {
    console.error('[API /api/story/view] Error:', error);
    return res.status(500).json({ error: 'Failed to record story view.' });
  }
}
