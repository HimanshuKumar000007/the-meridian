/**
 * Automated Phase 4 Architecture & Content Model Verification Suite
 * Tests repository contract, mock implementation, validators, query methods,
 * and data provider hot-swapping.
 */

import { MockNewsRepository } from './src/data/repositories/MockNewsRepository';
import { validateNewsStory, validateNewsCategory } from './src/data/validation';
import { MOCK_STORIES_DATA } from './src/data/mockStoriesData';
import { MOCK_CATEGORIES } from './src/data/mockCategories';
import type { NewsStory } from './src/types/story';

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('   THE MERIDIAN — PHASE 4 VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Schema Validation on All Mock Stories
  // ----------------------------------------------------
  console.log('--- 1. Schema Validation on Normalized Stories ---');
  let allStoriesValid = true;
  for (const story of MOCK_STORIES_DATA) {
    const res = validateNewsStory(story);
    if (!res.valid) {
      console.error(`Story invalid: ${story.slug}`, res.errors);
      allStoriesValid = false;
    }
  }
  assert(allStoriesValid, `All ${MOCK_STORIES_DATA.length} detailed stories conform to NewsStory schema`);

  // ----------------------------------------------------
  // TEST 2: Schema Validation on Categories
  // ----------------------------------------------------
  console.log('\n--- 2. Schema Validation on Categories ---');
  let allCatsValid = true;
  for (const cat of MOCK_CATEGORIES) {
    const res = validateNewsCategory(cat);
    if (!res.valid) {
      console.error(`Category invalid: ${cat.slug}`, res.errors);
      allCatsValid = false;
    }
  }
  assert(allCatsValid, `All ${MOCK_CATEGORIES.length} categories conform to NewsCategory schema`);

  const repo = new MockNewsRepository();

  // ----------------------------------------------------
  // TEST 3: getStoryBySlug & invalid slug handling
  // ----------------------------------------------------
  console.log('\n--- 3. Story Query by Slug ---');
  const validSlug = 'quantum-coherence-breakthrough-cryogenic-milestone';
  const story = await repo.getStoryBySlug(validSlug);
  assert(story !== null && story.slug === validSlug, `getStoryBySlug('${validSlug}') returns matching story`);
  assert(Boolean(story?.content && story.content.length > 0), `Story contains structured content blocks (${story?.content?.length} blocks)`);

  const invalidSlug = 'non-existent-story-slug-99999';
  const notFoundStory = await repo.getStoryBySlug(invalidSlug);
  assert(notFoundStory === null, `getStoryBySlug('${invalidSlug}') returns null safely without throwing`);

  // ----------------------------------------------------
  // TEST 4: getLatestStories, getFeaturedStories, getTrendingStories, getMostReadStories
  // ----------------------------------------------------
  console.log('\n--- 4. Story Feed Aggregations ---');
  const latest = await repo.getLatestStories(5);
  assert(latest.length === 5, `getLatestStories(5) returns 5 stories`);
  const isSortedDate = new Date(latest[0].publishedAt).getTime() >= new Date(latest[1].publishedAt).getTime();
  assert(isSortedDate, `getLatestStories returns stories ordered by publishedAt descending`);

  const featured = await repo.getFeaturedStories(4);
  assert(featured.length > 0 && featured[0].featured === true, `getFeaturedStories(4) returns featured stories`);

  const trending = await repo.getTrendingStories(5);
  assert(trending.length === 5, `getTrendingStories(5) returns 5 stories`);
  const isTrendingSorted = (trending[0].trendingScore || 0) >= (trending[1].trendingScore || 0);
  assert(isTrendingSorted, `getTrendingStories ordered by trendingScore descending`);

  const mostRead = await repo.getMostReadStories(5);
  assert(mostRead.length === 5, `getMostReadStories(5) returns 5 stories`);

  // ----------------------------------------------------
  // TEST 5: getStoriesByCategory & invalid category
  // ----------------------------------------------------
  console.log('\n--- 5. Category Filtering & Subcategories ---');
  const aiStories = await repo.getStoriesByCategory('ai');
  assert(aiStories.length > 0, `getStoriesByCategory('ai') returns ${aiStories.length} stories`);

  const gamingStories = await repo.getStoriesByCategory('gaming');
  assert(gamingStories.length > 0, `getStoriesByCategory('gaming') returns ${gamingStories.length} stories`);

  const invalidCatStories = await repo.getStoriesByCategory('non-existent-category-xyz');
  assert(Array.isArray(invalidCatStories) && invalidCatStories.length === 0, `getStoriesByCategory('non-existent-category-xyz') returns empty array`);

  // ----------------------------------------------------
  // TEST 6: Sub-entity queries (Updates & Sources)
  // ----------------------------------------------------
  console.log('\n--- 6. Sub-entity Queries (Updates & Sources) ---');
  const storyWithUpdates = await repo.getStoryBySlug('openai-new-product');
  assert(storyWithUpdates !== null, `Target story for updates found`);
  if (storyWithUpdates) {
    const updates = await repo.getStoryUpdates(storyWithUpdates.id);
    assert(Array.isArray(updates) && updates.length >= 2, `getStoryUpdates returns ${updates.length} updates for live story`);

    const sources = await repo.getStorySources(storyWithUpdates.id);
    assert(Array.isArray(sources) && sources.length >= 2, `getStorySources returns ${sources.length} sources`);
  }

  // ----------------------------------------------------
  // TEST 7: Aggregate Providers (Homepage & Category Page)
  // ----------------------------------------------------
  console.log('\n--- 7. Aggregate Page Providers ---');
  const homepage = await repo.getHomepageData();
  assert(homepage.featuredStory !== undefined, `HomepageData has featuredStory`);
  assert(homepage.latestStories.length > 0, `HomepageData has latestStories`);
  assert(homepage.topStories.length > 0, `HomepageData has topStories`);
  assert(homepage.aiTechStories.length > 0, `HomepageData has aiTechStories`);
  assert(homepage.gamingStories.length > 0, `HomepageData has gamingStories`);
  assert(homepage.scienceStories.length > 0, `HomepageData has scienceStories`);

  const categoryPage = await repo.getCategoryPageData('ai');
  assert(categoryPage !== null, `getCategoryPageData('ai') returns category page bundle`);
  assert(categoryPage?.category.slug === 'ai', `CategoryPageData has category metadata`);
  assert(categoryPage?.latestStories !== undefined, `CategoryPageData has latestStories`);

  // ----------------------------------------------------
  // TEST 8: Data Provider Swappability (Phase 5 Decoupling)
  // ----------------------------------------------------
  console.log('\n--- 8. Provider Swappability Test ---');
  const customStory: NewsStory = {
    id: 'test-custom-swap-1',
    slug: 'custom-swapped-story-slug',
    title: 'Custom In-Memory Swapped Story for Phase 5 Decoupling',
    summary: 'A dynamically injected story proving the repository data source can be replaced at runtime.',
    category: 'AI',
    subcategory: 'Frontier Models',
    publishedAt: new Date().toISOString(),
    timeDisplay: 'Just now',
    author: {
      name: 'Dynamic Test Agent',
      role: 'System Verifier',
    },
    readTime: '2 min read',
    content: [
      {
        type: 'paragraph',
        text: 'This verifies that the repository abstraction is completely isolated from mock data.',
      },
    ],
  };

  repo.setStoriesProvider([customStory]);
  const fetchedCustom = await repo.getStoryBySlug('custom-swapped-story-slug');
  assert(
    fetchedCustom !== null && fetchedCustom.id === 'test-custom-swap-1',
    `setStoriesProvider successfully decoupled repository to new data source`
  );
  const swappedLatest = await repo.getLatestStories(10);
  assert(
    swappedLatest.length === 1 && swappedLatest[0].slug === 'custom-swapped-story-slug',
    `Repository queries now resolve exclusively from swapped provider`
  );

  console.log('\n====================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
