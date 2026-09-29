/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Vercel Serverless Function: /api/rss
 * Generates dynamic RSS 2.0 feed strictly for published stories.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { SupabasePublicationRepository } from '../data/repositories/SupabasePublicationRepository';
import { RssFeedService } from '../services/distribution/RssFeedService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';

  const rssService = new RssFeedService();

  try {
    if (!supabaseKey) {
      console.error('[RssHandler] Warning: No Supabase API key found in environment.');
      const xml = rssService.generateRssXml([]);
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
      return res.status(200).send(xml);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const repository = new SupabasePublicationRepository(supabase);

    const publishedStories = await repository.getPublishedStories(50);
    const xml = rssService.generateRssXml(publishedStories);

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error('[RssHandler] Runtime error generating RSS:', err?.message || err);
    try {
      const fallbackXml = rssService.generateRssXml([]);
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      return res.status(200).send(fallbackXml);
    } catch {
      return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>The Meridian</title><link>https://themeridian.in</link><description>The Meridian News Feed</description></channel></rss>');
    }
  }
}
