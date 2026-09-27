/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsCategory, CategorySortMode, CategoryPageData } from '../types/category';
import { MOCK_STORIES, type Story } from './mockNews';

/**
 * Universal Category Catalog
 * Dynamic, data-driven configuration powering every category page.
 */
export const CATEGORY_DEFINITIONS: NewsCategory[] = [
  {
    id: 'ai',
    slug: 'ai',
    name: 'AI',
    shortName: 'AI',
    description: 'Frontier models, machine learning research, neural architectures, and computational intelligence.',
    longDescription: 'In-depth reporting and rigorous editorial analysis covering the fundamental models, hardware infrastructure, corporate strategies, and regulatory frameworks reshaping artificial intelligence.',
    featuredTopic: 'Frontier Reasoning & Safety Protocols',
    subcategories: [
      { id: 'all', name: 'All AI', slug: 'all' },
      { id: 'models', name: 'Frontier Models', slug: 'models', description: 'Large multimodal models, reasoning engines, and weights' },
      { id: 'research', name: 'Research', slug: 'research', description: 'Peer-reviewed preprints, benchmark evaluations, and theorems' },
      { id: 'enterprise', name: 'Enterprise & Infrastructure', slug: 'enterprise', description: 'Compute clusters, cloud data centers, and enterprise deployments' },
      { id: 'policy', name: 'Policy & Safety', slug: 'policy', description: 'Sovereign governance, ethics, copyright, and safety accords' },
    ],
  },
  {
    id: 'tech',
    slug: 'technology',
    name: 'Technology',
    shortName: 'Tech',
    description: 'Semiconductor physics, platform architecture, enterprise hardware, and computing systems.',
    longDescription: 'Authoritative coverage of silicon lithography, network fabrics, operating platforms, and high-performance computing engineering from foundries to server racks.',
    featuredTopic: 'High-NA EUV & Power Delivery',
    subcategories: [
      { id: 'all', name: 'All Technology', slug: 'all' },
      { id: 'semiconductors', name: 'Semiconductors', slug: 'semiconductors', description: 'Foundries, packaging, lithography, and memory' },
      { id: 'infrastructure', name: 'Infrastructure', slug: 'infrastructure', description: 'Data centers, optical networks, and power substations' },
      { id: 'hardware', name: 'Hardware', slug: 'hardware', description: 'Processors, interconnects, and physical computing' },
      { id: 'security', name: 'Security', slug: 'security', description: 'Cryptographic systems, firmware, and platform integrity' },
    ],
  },
  {
    id: 'gaming',
    slug: 'gaming',
    name: 'Gaming',
    shortName: 'Gaming',
    description: 'Interactive entertainment, hardware engineering, rendering engines, and industry economics.',
    longDescription: 'Critical coverage of real-time graphics pipelines, interactive physics, console architecture, studio economics, and the creative minds driving global interactive media.',
    featuredTopic: 'Real-Time Neural Radiance',
    subcategories: [
      { id: 'all', name: 'All Gaming', slug: 'all' },
      { id: 'engines', name: 'Engine Tech', slug: 'engines', description: 'Graphics APIs, physics simulations, and illumination' },
      { id: 'hardware', name: 'Hardware', slug: 'hardware', description: 'Handheld devices, bespoke silicon, and peripherals' },
      { id: 'releases', name: 'Releases', slug: 'releases', description: 'Major studio dispatches and interactive titles' },
      { id: 'industry', name: 'Industry & Economics', slug: 'industry', description: 'Publishing budgets, development cycles, and labor' },
    ],
  },
  {
    id: 'science',
    slug: 'science',
    name: 'Science',
    shortName: 'Science',
    description: 'Fundamental physics, climate systems, molecular genetics, and laboratory breakthroughs.',
    longDescription: 'Reporting directly from international laboratories and research consortiums on experimental particle physics, cellular therapies, and thermodynamic discoveries.',
    featuredTopic: 'Sub-Kelvin Quantum Milestones',
    subcategories: [
      { id: 'all', name: 'All Science', slug: 'all' },
      { id: 'physics', name: 'Particle Physics', slug: 'physics', description: 'High-energy accelerators, colliders, and cosmology' },
      { id: 'biotech', name: 'Genetics & Biotech', slug: 'biotech', description: 'Epigenetic vectors, molecular biology, and therapies' },
      { id: 'materials', name: 'Materials Science', slug: 'materials', description: 'Superconductors, synthetic crystals, and polymers' },
      { id: 'climate', name: 'Climate Systems', slug: 'climate', description: 'Ocean circulation, atmospheric metrics, and modeling' },
    ],
  },
  {
    id: 'space',
    slug: 'space',
    name: 'Space',
    shortName: 'Space',
    description: 'Orbital logistics, lunar missions, astrophysics observation, and deep-space propulsion.',
    longDescription: 'Comprehensive tracking of civil space exploration, heavy-lift launch architectures, deep-space astronomical observatories, and lunar infrastructure development.',
    featuredTopic: 'Artemis Heavy Lift Telemetry',
    subcategories: [
      { id: 'all', name: 'All Space', slug: 'all' },
      { id: 'lunar', name: 'Lunar Exploration', slug: 'lunar', description: 'Artemis missions, landers, and lunar gateway orbit' },
      { id: 'astrophysics', name: 'Astrophysics', slug: 'astrophysics', description: 'Orbital telescopes, spectroscopy, and exoplanets' },
      { id: 'propulsion', name: 'Launch & Propulsion', slug: 'propulsion', description: 'Heavy-lift rocketry, methalox engines, and reusability' },
      { id: 'commercial', name: 'Commercial Orbit', slug: 'commercial', description: 'Private stations, satellite constellations, and cargo' },
    ],
  },
  {
    id: 'business',
    slug: 'business',
    name: 'Business',
    shortName: 'Business',
    description: 'Macroeconomics, central bank policy, sovereign debt, and international supply chains.',
    longDescription: 'Global financial reporting with an emphasis on central bank monetary policy, capital allocation into industrial technologies, sovereign bond markets, and trade flows.',
    featuredTopic: 'Monetary Calibration & Nearshoring',
    subcategories: [
      { id: 'all', name: 'All Business', slug: 'all' },
      { id: 'macro', name: 'Central Banking', slug: 'macro', description: 'Interest rate decisions, inflation gauges, and yield curves' },
      { id: 'markets', name: 'Global Markets', slug: 'markets', description: 'Equities, sovereign debt, commodities, and currencies' },
      { id: 'supply-chains', name: 'Supply Chains', slug: 'supply-chains', description: 'Nearshoring, logistics hubs, and industrial trade' },
      { id: 'enterprise', name: 'Enterprise Capital', slug: 'enterprise', description: 'Corporate finance, debt issuance, and M&A' },
    ],
  },
  {
    id: 'world',
    slug: 'world',
    name: 'World',
    shortName: 'World',
    description: 'Diplomatic summits, international trade pacts, geopolitics, and global statecraft.',
    longDescription: 'Dispatches from international bureaus analyzing multilateral accords, border governance, environmental corridors, and diplomatic negotiations among global powers.',
    featuredTopic: 'Transatlantic Maritime Treaties',
    subcategories: [
      { id: 'all', name: 'All World', slug: 'all' },
      { id: 'diplomacy', name: 'Diplomacy & Treaties', slug: 'diplomacy', description: 'G7 summits, bilateral accords, and treaties' },
      { id: 'trade', name: 'Trade & Corridors', slug: 'trade', description: 'Tariffs, maritime routes, and customs pacts' },
      { id: 'governance', name: 'Global Governance', slug: 'governance', description: 'Multilateral institutions and international law' },
    ],
  },
  {
    id: 'entertainment',
    slug: 'entertainment',
    name: 'Entertainment',
    shortName: 'Entertainment',
    description: 'Global film production, streaming distribution, media economics, and digital arts.',
    longDescription: 'Reporting on the intersection of media production, streaming licensing architectures, interactive IP adaptations, and international cultural exhibitions.',
    subcategories: [
      { id: 'all', name: 'All Entertainment', slug: 'all' },
      { id: 'film', name: 'Film & Production', slug: 'film' },
      { id: 'streaming', name: 'Streaming Platforms', slug: 'streaming' },
      { id: 'culture', name: 'Arts & Culture', slug: 'culture' },
    ],
  },
  {
    id: 'cybersecurity',
    slug: 'cybersecurity',
    name: 'Cybersecurity',
    shortName: 'Cybersecurity',
    description: 'Cryptographic defense, critical infrastructure resilience, and zero-day threat analysis.',
    longDescription: 'Technical investigations into state-sponsored cyber warfare, cryptographic agility, post-quantum defenses, and industrial control system safeguards.',
    subcategories: [
      { id: 'all', name: 'All Cybersecurity', slug: 'all' },
      { id: 'threats', name: 'Threat Intelligence', slug: 'threats' },
      { id: 'cryptography', name: 'Post-Quantum Crypto', slug: 'cryptography' },
    ],
  },
  {
    id: 'apps',
    slug: 'apps',
    name: 'Apps',
    shortName: 'Apps',
    description: 'Mobile operating systems, distributed application ecosystems, and platform API shifts.',
    longDescription: 'Detailed technical analysis of consumer software platforms, developer frameworks, app store antitrust regulations, and next-generation operating system releases.',
    subcategories: [
      { id: 'all', name: 'All Apps', slug: 'all' },
      { id: 'mobile', name: 'Mobile Systems', slug: 'mobile' },
      { id: 'desktop', name: 'Desktop Software', slug: 'desktop' },
    ],
  },
  {
    id: 'hardware',
    slug: 'hardware',
    name: 'Hardware',
    shortName: 'Hardware',
    description: 'Consumer electronics engineering, photonics, custom silicon packaging, and robotics.',
    longDescription: 'In-depth dispatches evaluating thermal packaging, consumer silicon architectures, optics modules, and advanced robotics manufacturing.',
    subcategories: [
      { id: 'all', name: 'All Hardware', slug: 'all' },
      { id: 'silicon', name: 'Custom Silicon', slug: 'silicon' },
      { id: 'devices', name: 'Devices & Sensors', slug: 'devices' },
    ],
  },
];

/**
 * Normalized slug lookup supporting aliases (e.g. 'tech' -> 'technology')
 */
export function getCategoryBySlug(slug: string): NewsCategory | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase().trim().replace(/^\//, '');

  if (s === 'tech') {
    return CATEGORY_DEFINITIONS.find((c) => c.slug === 'technology');
  }

  return CATEGORY_DEFINITIONS.find(
    (c) => c.slug.toLowerCase() === s || c.id.toLowerCase() === s
  );
}

export function getAllCategories(): NewsCategory[] {
  return CATEGORY_DEFINITIONS;
}

/**
 * Matches a story to a category slug based on category name, ID, or domain keywords.
 */
function matchesCategory(story: Story, categorySlug: string): boolean {
  const normSlug = categorySlug.toLowerCase().trim();
  const cat = story.category.toLowerCase();
  const sub = story.subcategory?.toLowerCase() || '';

  if (normSlug === 'ai') {
    return cat.includes('ai') || cat.includes('computing') || story.id.startsWith('ai-') || story.id === 'story-hero';
  }
  if (normSlug === 'technology' || normSlug === 'tech') {
    return cat.includes('tech') || cat.includes('hardware') || cat.includes('computing') || story.id.startsWith('top-1') || story.id === 'latest-2';
  }
  if (normSlug === 'gaming') {
    return cat.includes('game') || cat.includes('gaming') || story.id.startsWith('game-') || story.id === 'latest-3' || story.id === 'top-3';
  }
  if (normSlug === 'science') {
    return cat.includes('sci') || cat.includes('physics') || cat.includes('biotech') || story.id.startsWith('sci-') || story.id === 'top-2';
  }
  if (normSlug === 'space') {
    return cat.includes('space') || cat.includes('astrophysics') || sub.includes('aerospace') || story.id.startsWith('space-') || story.id === 'latest-4';
  }
  if (normSlug === 'business') {
    return cat.includes('biz') || cat.includes('business') || cat.includes('market') || story.id.startsWith('biz-') || story.id === 'latest-5';
  }
  if (normSlug === 'world') {
    return cat.includes('world') || cat.includes('trade') || cat.includes('diplomacy') || story.id.startsWith('world-') || story.id === 'top-4';
  }
  if (normSlug === 'hardware') {
    return cat.includes('hardware') || sub.includes('hardware') || cat.includes('silicon');
  }
  if (normSlug === 'entertainment') {
    return cat.includes('entertainment') || cat.includes('culture');
  }
  if (normSlug === 'cybersecurity') {
    return cat.includes('security') || cat.includes('cyber');
  }
  if (normSlug === 'apps') {
    return cat.includes('apps') || cat.includes('software');
  }

  return cat.includes(normSlug);
}

/**
 * Filter and sort stories for a category.
 * Ready for future Supabase client drop-in.
 */
export function getStoriesByCategory(
  categorySlug: string,
  options: {
    subcategory?: string;
    sort?: CategorySortMode;
    limit?: number;
    offset?: number;
  } = {}
): Story[] {
  const { subcategory, sort = 'latest', limit, offset = 0 } = options;

  let stories = MOCK_STORIES.filter((s) => matchesCategory(s, categorySlug));

  // Subcategory filter if active and not 'all'
  if (subcategory && subcategory.toLowerCase() !== 'all') {
    const subQuery = subcategory.toLowerCase();
    stories = stories.filter(
      (s) =>
        s.subcategory?.toLowerCase().includes(subQuery) ||
        s.category.toLowerCase().includes(subQuery) ||
        s.title.toLowerCase().includes(subQuery) ||
        s.summary.toLowerCase().includes(subQuery)
    );
  }

  // Sorting
  if (sort === 'trending') {
    stories = [...stories].sort((a, b) => {
      const aScore = (a.isBreaking ? 10 : 0) + (a.isLive ? 5 : 0) + (a.featured ? 3 : 0);
      const bScore = (b.isBreaking ? 10 : 0) + (b.isLive ? 5 : 0) + (b.featured ? 3 : 0);
      return bScore - aScore;
    });
  } else if (sort === 'most-read') {
    stories = [...stories].sort((a, b) => (a.rank || 99) - (b.rank || 99));
  } else if (sort === 'featured') {
    stories = [...stories].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  } else {
    // Latest (published date descending)
    stories = [...stories].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  if (typeof limit === 'number') {
    return stories.slice(offset, offset + limit);
  }

  return stories.slice(offset);
}

export function getFeaturedStoriesByCategory(categorySlug: string): Story[] {
  const allInCat = getStoriesByCategory(categorySlug, { sort: 'latest' });
  const explicitFeatured = allInCat.filter((s) => s.featured);

  if (explicitFeatured.length > 0) {
    return explicitFeatured.slice(0, 4);
  }

  // Fallback: top 3 stories in category
  return allInCat.slice(0, 3);
}

export function getLatestStoriesByCategory(
  categorySlug: string,
  subcategory?: string,
  limit = 9,
  offset = 0
): Story[] {
  return getStoriesByCategory(categorySlug, {
    subcategory,
    sort: 'latest',
    limit,
    offset,
  });
}

export function getTrendingStoriesByCategory(categorySlug: string): Story[] {
  const stories = getStoriesByCategory(categorySlug, { sort: 'trending', limit: 5 });
  if (stories.length >= 3) return stories;
  return getStoriesByCategory(categorySlug, { sort: 'latest', limit: 5 });
}

export function getMostReadStoriesByCategory(categorySlug: string): Story[] {
  const stories = getStoriesByCategory(categorySlug, { sort: 'most-read', limit: 5 });
  if (stories.length >= 3) return stories;
  return getStoriesByCategory(categorySlug, { sort: 'latest', limit: 5 });
}

/**
 * Universal aggregate loader for CategoryPage
 */
export function getCategoryPageData(
  categorySlug: string,
  subcategory?: string,
  sort: CategorySortMode = 'latest'
): CategoryPageData | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;

  const allFiltered = getStoriesByCategory(categorySlug, { subcategory, sort });
  const featured = getFeaturedStoriesByCategory(categorySlug);
  const latest = allFiltered.filter((s) => !featured.slice(0, 1).some((f) => f.id === s.id));
  const trending = getTrendingStoriesByCategory(categorySlug);
  const mostRead = getMostReadStoriesByCategory(categorySlug);

  return {
    category,
    activeSubcategory: subcategory || 'all',
    featuredStories: featured,
    latestStories: latest,
    trendingStories: trending,
    mostReadStories: mostRead,
    totalCount: allFiltered.length,
  };
}
