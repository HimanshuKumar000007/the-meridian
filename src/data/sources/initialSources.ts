/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsSource } from '../../types/discovery';

/**
 * Initial Curated News Source Catalog for The Meridian Discovery Engine.
 * Configuration-driven; new sources can be added by declaring configuration records.
 */
export const INITIAL_NEWS_SOURCES: NewsSource[] = [
  // ==========================================
  // AI & FRONTIER COMPUTING
  // ==========================================
  {
    id: 'src-openai-news',
    slug: 'openai-news',
    name: 'OpenAI News & Research',
    type: 'rss',
    feedUrl: 'https://openai.com/news/rss.xml',
    baseUrl: 'https://openai.com',
    country: 'US',
    language: 'en',
    priority: 1,
    pollIntervalMinutes: 10,
    categories: ['ai', 'technology'],
    isActive: true,
    consecutiveFailures: 0,
  },
  {
    id: 'src-anthropic-news',
    slug: 'anthropic-news',
    name: 'Anthropic Research & Announcements',
    type: 'rss',
    feedUrl: 'https://www.anthropic.com/feed.xml',
    baseUrl: 'https://www.anthropic.com',
    country: 'US',
    language: 'en',
    priority: 1,
    pollIntervalMinutes: 15,
    categories: ['ai', 'technology'],
    isActive: false, // Inactive: Anthropic does not maintain a public RSS endpoint (returns 404)
    consecutiveFailures: 0,
    lastError: 'SOURCE_ENDPOINT_UNAVAILABLE',
  },
  {
    id: 'src-mit-tech-review-ai',
    slug: 'mit-tech-review-ai',
    name: 'MIT Technology Review — AI',
    type: 'rss',
    feedUrl: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/',
    baseUrl: 'https://www.technologyreview.com',
    country: 'US',
    language: 'en',
    priority: 2,
    pollIntervalMinutes: 30,
    categories: ['ai', 'technology'],
    isActive: true,
    consecutiveFailures: 0,
  },

  // ==========================================
  // TECHNOLOGY & SEMICONDUCTORS
  // ==========================================
  {
    id: 'src-ars-technica',
    slug: 'ars-technica',
    name: 'Ars Technica — Technology Lab',
    type: 'rss',
    feedUrl: 'https://feeds.arstechnica.com/arstechnica/index',
    baseUrl: 'https://arstechnica.com',
    country: 'US',
    language: 'en',
    priority: 1,
    pollIntervalMinutes: 15,
    categories: ['technology', 'ai'],
    isActive: true,
    consecutiveFailures: 0,
  },
  {
    id: 'src-the-verge-tech',
    slug: 'the-verge-tech',
    name: 'The Verge — Tech Dispatches',
    type: 'atom',
    feedUrl: 'https://www.theverge.com/rss/technology/index.xml',
    baseUrl: 'https://www.theverge.com',
    country: 'US',
    language: 'en',
    priority: 2,
    pollIntervalMinutes: 20,
    categories: ['technology'],
    isActive: true,
    consecutiveFailures: 0,
  },

  // ==========================================
  // GAMING & INTERACTIVE MEDIA
  // ==========================================
  {
    id: 'src-eurogamer',
    slug: 'eurogamer',
    name: 'Eurogamer Dispatches',
    type: 'rss',
    feedUrl: 'https://www.eurogamer.net/feed',
    baseUrl: 'https://www.eurogamer.net',
    country: 'GB',
    language: 'en',
    priority: 2,
    pollIntervalMinutes: 30,
    categories: ['gaming', 'technology'],
    isActive: true,
    consecutiveFailures: 0,
  },
  {
    id: 'src-game-developer',
    slug: 'game-developer',
    name: 'Game Developer — Industry & Engine Tech',
    type: 'rss',
    feedUrl: 'https://www.gamedeveloper.com/rss.xml',
    baseUrl: 'https://www.gamedeveloper.com',
    country: 'US',
    language: 'en',
    priority: 2,
    pollIntervalMinutes: 30,
    categories: ['gaming', 'technology'],
    isActive: true,
    consecutiveFailures: 0,
  },

  // ==========================================
  // SCIENCE & FUNDAMENTAL RESEARCH
  // ==========================================
  {
    id: 'src-nature-news',
    slug: 'nature-news',
    name: 'Nature — Latest Science News',
    type: 'rss',
    feedUrl: 'https://www.nature.com/nature.rss',
    baseUrl: 'https://www.nature.com',
    country: 'GB',
    language: 'en',
    priority: 1,
    pollIntervalMinutes: 30,
    categories: ['science'],
    isActive: true,
    consecutiveFailures: 0,
  },
  {
    id: 'src-phys-org',
    slug: 'phys-org',
    name: 'Phys.org — Physical Sciences',
    type: 'rss',
    feedUrl: 'https://phys.org/rss-feed/',
    baseUrl: 'https://phys.org',
    country: 'Global',
    language: 'en',
    priority: 2,
    pollIntervalMinutes: 30,
    categories: ['science'],
    isActive: true,
    consecutiveFailures: 0,
  },

  // ==========================================
  // SPACE & AEROSPACE
  // ==========================================
  {
    id: 'src-nasa-breaking',
    slug: 'nasa-breaking',
    name: 'NASA News Releases & Missions',
    type: 'rss',
    feedUrl: 'https://www.nasa.gov/news-release/feed/',
    baseUrl: 'https://www.nasa.gov',
    country: 'US',
    language: 'en',
    priority: 1,
    pollIntervalMinutes: 20,
    categories: ['space', 'science'],
    isActive: true,
    consecutiveFailures: 0,
  },
  {
    id: 'src-space-news',
    slug: 'space-news',
    name: 'SpaceNews Dispatches',
    type: 'rss',
    feedUrl: 'https://spacenews.com/feed/',
    baseUrl: 'https://spacenews.com',
    country: 'US',
    language: 'en',
    priority: 2,
    pollIntervalMinutes: 30,
    categories: ['space'],
    isActive: true,
    consecutiveFailures: 0,
  },

  // ==========================================
  // BUSINESS & GLOBAL ECONOMY
  // ==========================================
  {
    id: 'src-cnbc-economy',
    slug: 'cnbc-economy',
    name: 'CNBC International Economy',
    type: 'rss',
    feedUrl: 'https://search.cnbc.com/rs/search/view.html?partnerId=2000&keywords=economy&sort=date',
    baseUrl: 'https://www.cnbc.com',
    country: 'US',
    language: 'en',
    priority: 2,
    pollIntervalMinutes: 20,
    categories: ['business'],
    isActive: false, // Inactive: CNBC endpoint stalls/throttles response body exceeding timeouts
    consecutiveFailures: 0,
    lastError: 'SOURCE_BLOCKED',
  },

  // ==========================================
  // WORLD AFFAIRS & GEOPOLITICS
  // ==========================================
  {
    id: 'src-bbc-world',
    slug: 'bbc-world',
    name: 'BBC News — World',
    type: 'rss',
    feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    baseUrl: 'https://www.bbc.com/news',
    country: 'GB',
    language: 'en',
    priority: 1,
    pollIntervalMinutes: 15,
    categories: ['world'],
    isActive: true,
    consecutiveFailures: 0,
  },
];
