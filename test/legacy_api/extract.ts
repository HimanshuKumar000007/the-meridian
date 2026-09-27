/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/extract
 * Server-side AI news extraction endpoint.
 * Secret keys (NVIDIA_API_KEY, SUPABASE_SERVICE_ROLE_KEY) are executed strictly server-side.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ExtractionEngine } from '../../src/services/extraction/ExtractionEngine';
import { NvidiaClient } from '../../src/services/extraction/NvidiaClient';
import { MockExtractionProvider } from '../../src/services/extraction/MockExtractionProvider';
import { SupabaseExtractionRepository } from '../../src/data/repositories/SupabaseExtractionRepository';
import type { DiscoveryItem } from '../../src/types/discovery';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return res.status(500).json({
      error: 'Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing.',
    });
  }

  const { discoveryItemId, discoveryItem, dryRun } = req.body || {};

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const repository = new SupabaseExtractionRepository(supabase);

    let targetItem: DiscoveryItem;

    if (discoveryItem) {
      targetItem = discoveryItem;
    } else if (discoveryItemId) {
      const { data, error } = await supabase
        .from('news_discovery_items')
        .select('*, news_sources(slug, name)')
        .eq('id', discoveryItemId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: `Discovery item not found: ${discoveryItemId}` });
      }

      targetItem = {
        id: data.id,
        sourceId: data.source_id,
        sourceSlug: data.news_sources?.slug || 'source',
        sourceName: data.news_sources?.name || 'News Source',
        sourceType: 'rss',
        externalId: data.external_id,
        sourceUrl: data.canonical_url,
        canonicalUrl: data.canonical_url,
        title: data.title,
        description: data.description,
        publishedAt: data.published_at,
        discoveredAt: data.discovered_at || new Date().toISOString(),
        lastSeenAt: data.last_seen_at || new Date().toISOString(),
        author: data.author,
        imageUrl: data.image_url,
        categoryHint: data.category_hint,
        subcategoryHint: data.subcategory_hint,
        rawPayload: data.raw_payload,
        fingerprint: data.fingerprint,
        status: data.status,
        contentHash: data.content_hash,
      };
    } else {
      return res.status(400).json({ error: 'Missing discoveryItemId or discoveryItem in request body.' });
    }

    const llmProvider = apiKey
      ? new NvidiaClient({ apiKey })
      : new MockExtractionProvider();

    const engine = new ExtractionEngine({
      llmProvider,
      repository,
    });

    const candidate = await engine.extract(targetItem, { dryRun: Boolean(dryRun) });

    return res.status(200).json({
      success: true,
      candidate,
    });
  } catch (err: any) {
    console.error('Extraction handler error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal extraction failure',
    });
  }
}
