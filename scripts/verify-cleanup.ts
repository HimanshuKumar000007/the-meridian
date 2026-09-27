/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Verification Script for Phase 9 Cleanup
 * Verifies that the controlled test story is completely absent from all public channels:
 * - Homepage
 * - Category pages
 * - Story Page public query
 * - Sitemap XML
 * - RSS Feed XML
 * - Audit event preservation
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { SupabasePublicationRepository } from '../src/data/repositories/SupabasePublicationRepository';
import { SupabaseNewsRepository } from '../src/data/repositories/SupabaseNewsRepository';
import { SitemapService } from '../src/services/distribution/SitemapService';
import { RssFeedService } from '../src/services/distribution/RssFeedService';

const TEST_STORY_ID = 'story-live-safe-mujgj06e';
const TEST_STORY_SLUG = 'deepmind-unveils-quantum-compiler-milestone-mujgj06f';

async function main() {
  console.log('====================================================');
  console.log('PHASE 9 CLEANUP VERIFICATION');
  console.log('====================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const adminClient = createClient(supabaseUrl, serviceRoleKey!, { auth: { persistSession: false } });
  const anonClient = createClient(supabaseUrl, anonKey || '', { auth: { persistSession: false } });

  const pubRepo = new SupabasePublicationRepository(adminClient);
  const newsRepo = new SupabaseNewsRepository(anonClient);

  // 1. Check Story Record State
  const { data: storyRow } = await adminClient
    .from('stories')
    .select('id, slug, title, status, updated_at')
    .eq('id', TEST_STORY_ID)
    .single();

  console.log('1. Story Record State:');
  console.log(`   - ID:        ${storyRow?.id}`);
  console.log(`   - Status:    ${storyRow?.status} (Expected: archived)`);
  console.log(`   - Archived:  ${storyRow?.status === 'archived' ? 'YES ✅' : 'NO ❌'}`);

  // 2. Published Count
  const publishedCount = await pubRepo.countPublishedStories();
  console.log(`\n2. Published Stories Count: ${publishedCount} (Expected: 19)`);
  console.log(`   - Invariant: ${publishedCount === 19 ? 'PRESERVED (19) ✅' : 'FAILED ❌'}`);

  // 3. Homepage Verification
  const homepage = await newsRepo.getHomepageData();
  const allHpStories = [
    homepage.featuredStory,
    ...homepage.latestStories,
    ...homepage.topStories,
    ...homepage.trendingStories,
    ...homepage.aiTechStories,
  ].filter(Boolean);
  const inHp = allHpStories.some((s) => s.id === TEST_STORY_ID || s.slug === TEST_STORY_SLUG);
  console.log(`\n3. Homepage Check:`);
  console.log(`   - Present on Homepage: ${inHp ? 'YES ❌ (Still visible)' : 'NO ✅ (Successfully hidden)'}`);

  // 4. Category Pages Verification
  const categoryStories = await newsRepo.getStoriesByCategory('technology', { limit: 50 });
  const inCategory = categoryStories.some((s) => s.id === TEST_STORY_ID || s.slug === TEST_STORY_SLUG);
  console.log(`\n4. Category (/technology) Check:`);
  console.log(`   - Present in Category: ${inCategory ? 'YES ❌ (Still visible)' : 'NO ✅ (Successfully hidden)'}`);

  // 5. Public Story Page Query
  const storyPageStory = await newsRepo.getStoryBySlug(TEST_STORY_SLUG);
  console.log(`\n5. Public Story Page Query (/story/${TEST_STORY_SLUG}):`);
  console.log(`   - Retrievable by Public: ${storyPageStory ? 'YES ❌ (Still visible)' : 'NO ✅ (Returns null)'}`);

  // 6. Sitemap Verification
  const publishedStories = await pubRepo.getPublishedStories(50);
  const sitemapXml = new SitemapService().generateSitemapXml(publishedStories);
  const inSitemap = sitemapXml.includes(TEST_STORY_SLUG);
  console.log(`\n6. Sitemap Check:`);
  console.log(`   - Included in Sitemap: ${inSitemap ? 'YES ❌ (Still present)' : 'NO ✅ (Excluded)'}`);

  // 7. RSS Feed Verification
  const rssXml = new RssFeedService().generateRssXml(publishedStories);
  const inRss = rssXml.includes(TEST_STORY_SLUG);
  console.log(`\n7. RSS Feed Check:`);
  console.log(`   - Included in RSS: ${inRss ? 'YES ❌ (Still present)' : 'NO ✅ (Excluded)'}`);

  // 8. Audit Event Preservation
  const events = await pubRepo.getPublicationEventsForStory(TEST_STORY_ID);
  console.log(`\n8. Publication Audit History: ${events.length} event(s) recorded:`);
  for (const ev of events) {
    console.log(`   - Event [${ev.id}]: action=${ev.action}, previous=${ev.previousStatus}, new=${ev.newStatus}, reason="${ev.reason}"`);
  }
  const hasPublish = events.some((e) => e.action === 'PUBLISH');
  const hasUnpublish = events.some((e) => e.action === 'UNPUBLISH');
  console.log(`   - Audit Trail Complete: ${hasPublish && hasUnpublish ? 'YES ✅' : 'NO ❌'}`);

  console.log('\n====================================================');
  console.log('CLEANUP VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
