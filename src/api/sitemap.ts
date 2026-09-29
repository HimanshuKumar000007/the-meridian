/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Vercel Serverless Function: /api/sitemap
 * Generates dynamic sitemap.xml strictly for published stories and canonical routes.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { SupabasePublicationRepository } from '../data/repositories/SupabasePublicationRepository';
import { SitemapService } from '../services/distribution/SitemapService';

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

  const sitemapService = new SitemapService();

  try {
    if (!supabaseKey) {
      console.error('[SitemapHandler] Warning: No Supabase API key found in environment.');
      const xml = sitemapService.generateSitemapXml([]);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
      return res.status(200).send(xml);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const repository = new SupabasePublicationRepository(supabase);

    const publishedStories = await repository.getPublishedStories(100);
    const xml = sitemapService.generateSitemapXml(publishedStories);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error('[SitemapHandler] Runtime error generating sitemap:', err?.message || err);
    try {
      const fallbackXml = sitemapService.generateSitemapXml([]);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      return res.status(200).send(fallbackXml);
    } catch {
      return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
  }
}
