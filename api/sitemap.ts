/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/sitemap
 * Generates dynamic sitemap.xml strictly for published stories.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { SupabasePublicationRepository } from '../src/data/repositories/SupabasePublicationRepository';
import { SitemapService } from '../src/services/distribution/SitemapService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  try {
    const supabase = createClient(supabaseUrl, anonKey || '', {
      auth: { persistSession: false },
    });
    const repository = new SupabasePublicationRepository(supabase);
    const sitemapService = new SitemapService();

    const publishedStories = await repository.getPublishedStories(100);
    const xml = sitemapService.generateSitemapXml(publishedStories);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error('[SitemapHandler] Error:', err);
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>');
  }
}
