/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/search
 * Public search endpoint for published news stories
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../src/lib/supabase';
import { SupabaseSearchRepository } from '../src/data/repositories/SupabaseSearchRepository';
import { SearchService } from '../src/services/search/SearchService';
import type { SearchSortOption } from '../src/types/search';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS and Cache-Control headers
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
    const searchService = new SearchService(repository);

    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const suggest = req.query.suggest === 'true';

    if (suggest) {
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '6'), 10), 1), 8);
      const suggestions = await searchService.getSuggestions(query, limit);
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res.status(200).json({ suggestions });
    }

    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const sort = (typeof req.query.sort === 'string' ? req.query.sort : 'relevance') as SearchSortOption;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10), 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);

    const response = await searchService.search(query, {
      category,
      sort,
      limit,
      offset,
    });

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[API /api/search] Error:', error);
    return res.status(500).json({
      error: 'An internal error occurred while executing search.',
    });
  }
}
