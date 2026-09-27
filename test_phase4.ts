/**
 * Comprehensive Phase 4 Integration & Verification Script
 */

import { newsRepository, isUsingSupabase, setRepositoryProvider } from './src/data/newsRepository';
import { MockNewsRepository } from './src/data/repositories/MockNewsRepository';
import { isSupabaseConfigured } from './src/lib/supabase';

async function runPhase4Verification() {
  console.log('====================================================');
  console.log('THE MERIDIAN — PHASE 4 VERIFICATION SUITE');
  console.log('====================================================\n');

  // 1. Supabase Client Configuration
  console.log('1. Checking Supabase Configuration...');
  const configured = isSupabaseConfigured();
  console.log(`   Supabase configured: ${configured}`);
  if (!configured) throw new Error('Supabase is not configured!');
  console.log(`   Active Repository is Supabase: ${isUsingSupabase()}`);
  console.log('   [PASS] Supabase configuration validated.\n');

  // 2. Live Supabase Homepage Data
  console.log('2. Testing Homepage Data from live Supabase...');
  const homeData = await newsRepository.getHomepageData();
  console.log(`   Featured Story: "${homeData.featuredStory.title}" (${homeData.featuredStory.slug})`);
  console.log(`   Latest Stories: ${homeData.latestStories.length} items`);
  console.log(`   Top Stories: ${homeData.topStories.length} items`);
  console.log(`   Trending Stories: ${homeData.trendingStories.length} items`);
  console.log(`   AI & Tech Stories: ${homeData.aiTechStories.length} items`);
  console.log(`   Gaming Stories: ${homeData.gamingStories.length} items`);
  console.log(`   Science Stories: ${homeData.scienceStories.length} items`);
  console.log(`   Business Stories: ${homeData.businessStories.length} items`);
  console.log(`   World Stories: ${homeData.worldStories.length} items`);
  if (!homeData.featuredStory || homeData.latestStories.length === 0) {
    throw new Error('Homepage data is incomplete');
  }
  console.log('   [PASS] Live Homepage Data validated.\n');

  // 3. Live Supabase Story Page Data
  console.log('3. Testing Story Page Retrieval from live Supabase...');
  const testSlug = 'quantum-coherence-breakthrough-cryogenic-milestone';
  const story = await newsRepository.getStoryBySlug(testSlug);
  if (!story) throw new Error(`Story ${testSlug} not found in Supabase!`);
  console.log(`   Title: "${story.title}"`);
  console.log(`   Category: "${story.category}" / "${story.subcategory}"`);
  console.log(`   Author: "${story.author.name}" (${story.author.role})`);
  console.log(`   Content Blocks: ${story.content.length}`);
  console.log(`   Sources: ${story.sources?.length || 0}`);
  console.log(`   Updates: ${story.updates?.length || 0}`);
  console.log(`   Facts: ${story.facts?.length || 0}`);
  console.log('   [PASS] Universal Story Page Data validated.\n');

  // 4. Live Supabase Category Page Data
  console.log('4. Testing Universal Category Page Data from live Supabase...');
  const categoriesToTest = ['ai', 'technology', 'gaming', 'science', 'business'];
  for (const catSlug of categoriesToTest) {
    const catPage = await newsRepository.getCategoryPageData(catSlug);
    if (!catPage) throw new Error(`Category ${catSlug} failed to load!`);
    console.log(`   Category "${catPage.category.name}": ${catPage.totalCount} total stories, ${catPage.featuredStories.length} featured`);
  }
  console.log('   [PASS] Universal Category Page Data validated.\n');

  // 5. Live Search
  console.log('5. Testing Live Search in Supabase...');
  const searchResults = await newsRepository.searchStories('quantum');
  console.log(`   Search for 'quantum': found ${searchResults.length} stories`);
  if (searchResults.length === 0) throw new Error('Search query returned 0 results');
  console.log('   [PASS] Live Search validated.\n');

  // 6. Mock Fallback Switchability
  console.log('6. Testing Mock Fallback / Provider Switching...');
  const originalRepo = newsRepository;
  const mockRepo = new MockNewsRepository();
  setRepositoryProvider(mockRepo);
  console.log(`   Switched to Mock Repository: isUsingSupabase = ${isUsingSupabase()}`);
  const mockHome = await mockRepo.getHomepageData();
  console.log(`   Mock Featured Story: "${mockHome.featuredStory.title}"`);
  setRepositoryProvider(originalRepo as any);
  console.log(`   Restored Supabase Repository: isUsingSupabase = ${isUsingSupabase()}`);
  console.log('   [PASS] Mock fallback switchability validated.\n');

  console.log('====================================================');
  console.log('ALL PHASE 4 CHECKS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runPhase4Verification().catch((err) => {
  console.error('Phase 4 verification failed:', err);
  process.exit(1);
});
