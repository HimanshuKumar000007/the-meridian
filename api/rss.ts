/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/rss
 * Generates dynamic RSS 2.0 feed strictly for published stories.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { SupabasePublicationRepository } from '../src/data/repositories/SupabasePublicationRepository';
import { RssFeedService } from '../src/services/distribution/RssFeedService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  try {
    const supabase = createClient(supabaseUrl, anonKey || '', {
      auth: { persistSession: false },
    });
    const repository = new SupabasePublicationRepository(supabase);
    const rssService = new RssFeedService();

    const publishedStories = await repository.getPublishedStories(50);
    const xml = rssService.generateRssXml(publishedStories);

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error('[RssHandler] Error:', err);
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel></channel></rss>');
  }
}
