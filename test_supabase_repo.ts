/**
 * Real Supabase Repository Integration Test
 */

import { SupabaseNewsRepository } from './src/data/repositories/SupabaseNewsRepository';
import { getSupabaseClient } from './src/lib/supabase';

async function testSupabaseRepo() {
  console.log('Testing SupabaseNewsRepository with live Supabase database...');
  const client = getSupabaseClient();
  const repo = new SupabaseNewsRepository(client);

  // 1. Categories
  const categories = await repo.getAllCategories();
  console.log(`[PASS] getAllCategories returned ${categories.length} categories`);
  if (categories.length === 0) throw new Error('No categories returned');

  // 2. Story by slug
  const story = await repo.getStoryBySlug('quantum-coherence-breakthrough-cryogenic-milestone');
  if (!story) throw new Error('Failed to retrieve story by slug');
  console.log(`[PASS] getStoryBySlug returned: "${story.title}" (${story.content.length} content blocks)`);

  // 3. Homepage Data
  const homepage = await repo.getHomepageData();
  console.log(`[PASS] getHomepageData returned: Featured "${homepage.featuredStory.title}", ${homepage.latestStories.length} latest stories, ${homepage.topStories.length} top stories`);

  // 4. Stories by category
  const aiStories = await repo.getStoriesByCategory('ai');
  console.log(`[PASS] getStoriesByCategory('ai') returned ${aiStories.length} stories`);

  // 5. Category Page Data
  const catPage = await repo.getCategoryPageData('ai');
  if (!catPage) throw new Error('Failed to load category page data');
  console.log(`[PASS] getCategoryPageData('ai') returned: Category "${catPage.category.name}", ${catPage.featuredStories.length} featured, ${catPage.latestStories.length} latest`);

  // 6. Sub-entities (updates, sources, facts)
  const updates = await repo.getStoryUpdates(story.id);
  const sources = await repo.getStorySources(story.id);
  const facts = await repo.getStoryFacts(story.id);
  console.log(`[PASS] Sub-entities for ${story.id}: ${updates.length} updates, ${sources.length} sources, ${facts.length} facts`);

  console.log('\nALL SUPABASE REPOSITORY LIVE TESTS PASSED SUCCESSFULLY!');
}

testSupabaseRepo().catch((err) => {
  console.error('Supabase repository test failed:', err);
  process.exit(1);
});
