/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Author {
  name: string;
  role: string;
  avatar?: string;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  subcategory?: string;
  image?: string;
  alt?: string;
  caption?: string;
  credit?: string;
  publishedAt: string;
  updatedAt?: string;
  timeDisplay: string;
  author: Author;
  readTime: string;
  featured?: boolean;
  isLive?: boolean;
  isBreaking?: boolean;
  rank?: number;
}

export interface TrendingItem {
  id: string;
  title: string;
  category: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

import { ASSET_IMAGES } from './assets';
export { ASSET_IMAGES };

export const CATEGORIES: Category[] = [
  { id: 'all', name: 'Home', slug: '/', description: 'The front page of global reporting' },
  { id: 'ai', name: 'AI', slug: '/ai', description: 'Frontier models, machine learning, and computational intelligence' },
  { id: 'tech', name: 'Technology', slug: '/technology', description: 'Semiconductors, platforms, security, and computing architecture' },
  { id: 'gaming', name: 'Gaming', slug: '/gaming', description: 'Interactive entertainment, hardware, engines, and design' },
  { id: 'science', name: 'Science', slug: '/science', description: 'Fundamental physics, climate systems, genetics, and biotechnology' },
  { id: 'space', name: 'Space', slug: '/space', description: 'Orbital missions, astrophysics, and lunar exploration' },
  { id: 'business', name: 'Business', slug: '/business', description: 'Macroeconomics, markets, enterprise tech, and supply chains' },
  { id: 'world', name: 'World', slug: '/world', description: 'Diplomatic summits, geopolitics, and global governance' },
];

export const TRENDING_ITEMS: TrendingItem[] = [
  { id: 't1', title: 'OpenAI outlines next-generation multi-agent verification protocol', category: 'AI', slug: 'openai-verification-protocol' },
  { id: 't2', title: 'TSMC confirms commercial ramp-up of 1.6nm silicon architecture', category: 'Technology', slug: 'tsmc-1-6nm-ramp-up' },
  { id: 't3', title: 'NASA Artemis IV crew modules complete acoustic stress clearance', category: 'Space', slug: 'nasa-artemis-iv-clearance' },
  { id: 't4', title: 'European Central Bank signals cautious rate calibration amid energy rebound', category: 'Business', slug: 'ecb-rate-calibration' },
  { id: 't5', title: 'Sony reveals bespoke optical tracking module for upcoming portable system', category: 'Gaming', slug: 'sony-portable-tracking' },
  { id: 't6', title: 'CERN physicists detect anomalous charm quark asymmetry in Run 3 dataset', category: 'Science', slug: 'cern-charm-quark-asymmetry' },
];

export const MOCK_STORIES: Story[] = [
  // FEATURED HERO STORY
  {
    id: 'story-hero',
    slug: 'quantum-coherence-breakthrough-cryogenic-milestone',
    title: 'The Sub-Kelvin Milestone: How Optical Cryostats Unlocked Continuous Fault-Tolerant Coherence',
    summary: 'A joint consortium of international physics laboratories has demonstrated three hours of unbroken logical qubit entanglement at sub-millikelvin temperatures, clearing a decade-long hurdle toward practical commercial error correction.',
    category: 'AI & Computing',
    subcategory: 'Quantum Systems',
    image: ASSET_IMAGES.heroQuantum,
    alt: 'Golden cryostat wiring and optical chambers inside a low-temperature physics research facility',
    caption: 'Dilution refrigeration stages inside the international consortium laboratory prior to final vacuum sealing.',
    credit: 'The Meridian / Laurent Mercier',
    publishedAt: '2026-09-26T05:30:00Z',
    updatedAt: '2026-09-26T06:12:00Z',
    timeDisplay: 'Updated 18m ago',
    author: {
      name: 'Dr. Helen Vance',
      role: 'Senior Science & Deep Tech Correspondent',
    },
    readTime: '6 min read',
    featured: true,
    isBreaking: false,
  },

  // LATEST NEWS FEED
  {
    id: 'latest-1',
    slug: 'eu-ai-safety-audits-first-wave',
    title: 'European AI Safety Board issues initial compliance directives to frontier model developers',
    summary: 'The directive mandates standardized stress testing for autonomous code execution and recursive weight distillation.',
    category: 'AI',
    image: ASSET_IMAGES.heroQuantum,
    alt: 'EU regulatory chambers',
    publishedAt: '2026-09-26T06:05:00Z',
    timeDisplay: '10:42 AM',
    author: { name: 'Julian Foster', role: 'Brussels Bureau Chief' },
    readTime: '3 min read',
    isLive: true,
  },
  {
    id: 'latest-2',
    slug: 'nvidia-quantum-interconnect-standard',
    title: 'Chipmakers ratify unified optical interconnect standard for distributed cluster memory',
    summary: 'The open architecture promises to reduce inter-rack networking latency by thirty-eight percent across heterogeneous data centers.',
    category: 'Technology',
    image: ASSET_IMAGES.techSemiconductor,
    alt: 'Semiconductor interconnect',
    publishedAt: '2026-09-26T05:45:00Z',
    timeDisplay: '10:31 AM',
    author: { name: 'Sarah Lin', role: 'Silicon Valley Reporter' },
    readTime: '4 min read',
  },
  {
    id: 'latest-3',
    slug: 'nintendo-devkit-distribution-expands',
    title: 'Independent studios confirm expanded shipments of next-generation handheld developer kits',
    summary: 'Several Kyoto and Montreal partners have reportedly begun compiling launch titles with custom hardware upscaling support.',
    category: 'Gaming',
    image: ASSET_IMAGES.gamingVista,
    alt: 'Game studio development station',
    publishedAt: '2026-09-26T05:22:00Z',
    timeDisplay: '10:19 AM',
    author: { name: 'Marcus Bell', role: 'Gaming Editor' },
    readTime: '3 min read',
  },
  {
    id: 'latest-4',
    slug: 'james-webb-trappist-atmosphere-spectroscopy',
    title: 'Webb telescope spectroscopy confirms heavy carbon dioxide mantle on outer TRAPPIST-1 world',
    summary: 'The empirical observations provide astronomers with the first atmospheric density baseline for earth-sized terrestrial exoplanets.',
    category: 'Space',
    image: ASSET_IMAGES.spaceRocket,
    alt: 'Exoplanet spectroscopy visualization',
    publishedAt: '2026-09-26T04:58:00Z',
    timeDisplay: '09:58 AM',
    author: { name: 'Alina Thorne', role: 'Astrophysics Correspondent' },
    readTime: '5 min read',
  },
  {
    id: 'latest-5',
    slug: 'tokyo-sovereign-bond-yield-shift',
    title: 'Bank of Japan maintains short-term benchmark following morning sovereign debt auction',
    summary: 'Yields on ten-year Japanese government bonds settled at 1.42 percent amid balanced corporate bond issuances.',
    category: 'Business',
    image: ASSET_IMAGES.worldSummit,
    alt: 'Financial district in Tokyo',
    publishedAt: '2026-09-26T04:20:00Z',
    timeDisplay: '09:20 AM',
    author: { name: 'Kenji Takahashi', role: 'Tokyo Bureau' },
    readTime: '3 min read',
  },

  // TOP STORIES (4 CARDS)
  {
    id: 'top-1',
    slug: 'semiconductor-lithography-power-grid-integration',
    title: 'The High-NA Lithography Bottleneck: Why Next-Generation Fabs Are Building Dedicated Power Substations',
    summary: 'Extreme ultraviolet machinery requires unprecedented electrical stability, driving leading foundries to negotiate bespoke grid infrastructure.',
    category: 'Technology',
    subcategory: 'Hardware Infrastructure',
    image: ASSET_IMAGES.techSemiconductor,
    alt: 'Silicon wafer with microcircuit patterns under cleanroom yellow lighting',
    caption: 'Inspection of 300mm patterned wafers following multi-layer ultraviolet deposition.',
    credit: 'FabTech Global / Meridian',
    publishedAt: '2026-09-26T04:15:00Z',
    timeDisplay: '2 hours ago',
    author: { name: 'Sarah Lin', role: 'Technology Correspondent' },
    readTime: '5 min read',
  },
  {
    id: 'top-2',
    slug: 'deep-space-heavy-lift-propulsion-tests',
    title: 'Methane-Oxygen Propulsion Passes Extended Static Fire Test Ahead of First Orbital Cargo Run',
    summary: 'Telemetry indicates nominal chamber pressures throughout the four-minute duration burn conducted at the Boca Chica proving grounds.',
    category: 'Science & Space',
    subcategory: 'Aerospace',
    image: ASSET_IMAGES.spaceRocket,
    alt: 'Orbital space rocket ignition flame reflecting over ocean waters at twilight',
    caption: 'Orbital vehicle stage one firing at dusk over the coastal test facility.',
    credit: 'AeroArchive / The Meridian',
    publishedAt: '2026-09-26T03:45:00Z',
    timeDisplay: '3 hours ago',
    author: { name: 'Alina Thorne', role: 'Aerospace Reporter' },
    readTime: '4 min read',
  },
  {
    id: 'top-3',
    slug: 'open-world-rendering-neural-radiance-breakthrough',
    title: 'Real-Time Neural Radiance Fields Are Replacing Traditional Game Engine Level Baking',
    summary: 'Next-generation engines are abandoning static lightmaps entirely, streaming billions of volumetric photons in 60 frames per second.',
    category: 'Gaming',
    subcategory: 'Engine Architecture',
    image: ASSET_IMAGES.gamingVista,
    alt: 'Vast cinematic fantasy landscape with mountains and sci-fi ruins in mist',
    caption: 'Procedural lighting demonstration rendered dynamically in real time without precomputed lightmaps.',
    credit: 'Vanguard Studios',
    publishedAt: '2026-09-26T02:30:00Z',
    timeDisplay: '4 hours ago',
    author: { name: 'Marcus Bell', role: 'Interactive Media Editor' },
    readTime: '5 min read',
  },
  {
    id: 'top-4',
    slug: 'transatlantic-trade-corridor-maritime-accord',
    title: 'G7 Delegations Reach Preliminary Maritime Framework on Low-Emission Shipping Corridors',
    summary: 'The accord sets enforceable sulfur and synthetic methanol targets for North Atlantic cargo lanes commencing in the second quarter of 2027.',
    category: 'World',
    subcategory: 'Trade & Governance',
    image: ASSET_IMAGES.worldSummit,
    alt: 'Diplomatic summit hall with leaders seated at circular table',
    caption: 'Trade ministers finalizing environmental compliance timelines in Geneva.',
    credit: 'Press Syndicate / Meridian',
    publishedAt: '2026-09-26T01:15:00Z',
    timeDisplay: '5 hours ago',
    author: { name: 'Claire Delacroix', role: 'European Affairs Editor' },
    readTime: '6 min read',
  },

  // AI & TECHNOLOGY SECTION
  {
    id: 'ai-feat-1',
    slug: 'autonomous-scientific-reasoning-agents-materials',
    title: 'Autonomous Lab Synthesizers Discover Four Thermoelectric Alloys in Unsupervised Fortnight Run',
    summary: 'By pairing foundation chemistry models with robotic crystal vapor deposition chambers, researchers achieved a search efficiency sixteen times higher than human exploration.',
    category: 'AI & Technology',
    subcategory: 'Materials AI',
    image: ASSET_IMAGES.techSemiconductor,
    alt: 'Microscopic inspection of alloy crystals',
    publishedAt: '2026-09-26T03:10:00Z',
    timeDisplay: '3 hours ago',
    author: { name: 'Dr. Helen Vance', role: 'Senior Science Editor' },
    readTime: '6 min read',
  },
  {
    id: 'ai-sub-1',
    slug: 'open-source-weights-governance-split',
    title: 'Open-weights developers split over mandatory model licensing clauses in federal grant guidelines',
    summary: 'Academics argue new indemnification rules could unintentionally favor established tech conglomerates.',
    category: 'AI & Technology',
    subcategory: 'Policy',
    image: ASSET_IMAGES.heroQuantum,
    alt: 'Federal registry document on screen',
    publishedAt: '2026-09-26T02:00:00Z',
    timeDisplay: '4 hours ago',
    author: { name: 'Julian Foster', role: 'Policy Bureau' },
    readTime: '4 min read',
  },
  {
    id: 'ai-sub-2',
    slug: 'memory-bandwidth-hbm4-packaging-costs',
    title: 'HBM4 packaging yields hit eighty-five percent as thermal interface materials improve',
    summary: 'Advanced micro-bump technology allows twelve-die stacking with significantly diminished warping during reflow.',
    category: 'AI & Technology',
    subcategory: 'Hardware',
    image: ASSET_IMAGES.techSemiconductor,
    alt: 'Silicon die under electron microscope',
    publishedAt: '2026-09-26T01:30:00Z',
    timeDisplay: '5 hours ago',
    author: { name: 'Sarah Lin', role: 'Silicon Valley Reporter' },
    readTime: '4 min read',
  },

  // GAMING SECTION (3 EQUAL CARDS)
  {
    id: 'game-1',
    slug: 'narrative-design-systemic-ai-npc-experiments',
    title: 'The Death of the Scripted Bark: How Dynamic Dialogue Engines Are Reshaping Open-World RPGs',
    summary: 'Leading narrative designers discuss why players favor emergent character interactions over traditional multi-branch dialogue trees.',
    category: 'Gaming',
    subcategory: 'Design Analysis',
    image: ASSET_IMAGES.gamingVista,
    alt: 'High detail RPG environment vista',
    publishedAt: '2026-09-26T03:00:00Z',
    timeDisplay: '3 hours ago',
    author: { name: 'Marcus Bell', role: 'Gaming Editor' },
    readTime: '5 min read',
  },
  {
    id: 'game-2',
    slug: 'handheld-oled-battery-chemistry-advancements',
    title: 'Silicon-Anode Batteries Give Next-Wave Portable Consoles Seven-Hour AAA Runtimes',
    summary: 'Higher energy density cells withstand sixty-watt peak draws without noticeable thermal throttling or premature cell degradation.',
    category: 'Gaming',
    subcategory: 'Hardware',
    image: ASSET_IMAGES.techSemiconductor,
    alt: 'Internal battery and heatsink assembly of gaming handheld',
    publishedAt: '2026-09-26T02:15:00Z',
    timeDisplay: '4 hours ago',
    author: { name: 'David Chen', role: 'Hardware Specialist' },
    readTime: '4 min read',
  },
  {
    id: 'game-3',
    slug: 'indie-publishing-steam-algorithm-discoverability',
    title: 'Micro-Studios Are Circumventing Storefront Algorithms by Rebuilding Dedicated Demo Tours',
    summary: 'Physical expos and direct community playtests are replacing algorithmic wishlist campaigns as the primary driver of indie profitability.',
    category: 'Gaming',
    subcategory: 'Industry',
    image: ASSET_IMAGES.gamingVista,
    alt: 'Crowded indie game convention booth',
    publishedAt: '2026-09-26T01:00:00Z',
    timeDisplay: '5 hours ago',
    author: { name: 'Elena Rostova', role: 'Culture & Entertainment' },
    readTime: '4 min read',
  },

  // SCIENCE & SPACE SECTION
  {
    id: 'sci-1',
    slug: 'antarctic-ice-shelf-subglacial-radar-mapping',
    title: 'Subglacial Radar Array Reveals Geothermal Vent System Beneath West Antarctic Basin',
    summary: 'The airborne electromagnetic survey identifies localized basal melting channels previously unrepresented in climate equilibrium models.',
    category: 'Science & Space',
    subcategory: 'Glaciology',
    image: ASSET_IMAGES.spaceRocket,
    alt: 'Subglacial radar scanning aircraft over polar ice',
    publishedAt: '2026-09-26T04:00:00Z',
    timeDisplay: '2 hours ago',
    author: { name: 'Dr. Helen Vance', role: 'Senior Science Editor' },
    readTime: '6 min read',
  },
  {
    id: 'sci-2',
    slug: 'lunar-polar-water-ice-neutron-spectrometer',
    title: 'Orbital neutron spectrometer detects surface frost concentrations inside Shackleton Crater',
    summary: 'Permanent shadow regions indicate substantial hydrogen abundance suitable for in-situ propellant processing.',
    category: 'Science & Space',
    subcategory: 'Planetary Science',
    image: ASSET_IMAGES.spaceRocket,
    alt: 'Craters on lunar south pole',
    publishedAt: '2026-09-26T02:40:00Z',
    timeDisplay: '4 hours ago',
    author: { name: 'Alina Thorne', role: 'Astrophysics Correspondent' },
    readTime: '4 min read',
  },
  {
    id: 'sci-3',
    slug: 'crispr-epigenetic-silencing-cardiac-fibrosis',
    title: 'Epigenetic silencing therapy halts progressive cardiac fibrosis in Phase II clinical trial',
    summary: 'Rather than cutting double-stranded DNA, the targeted methylation represses maladaptive collagen deposition safely.',
    category: 'Science & Space',
    subcategory: 'Biotechnology',
    image: ASSET_IMAGES.heroQuantum,
    alt: 'Biomedical research laboratory assay',
    publishedAt: '2026-09-26T01:10:00Z',
    timeDisplay: '5 hours ago',
    author: { name: 'Dr. Aris Thorne', role: 'Medical Science Contributor' },
    readTime: '5 min read',
  },
  {
    id: 'sci-cern',
    slug: 'cern-charm-quark-asymmetry',
    title: 'CERN Physicists Detect Anomalous Charm Quark Asymmetry in Run 3 Dataset',
    summary: 'Measurements from the LHCb detector show a subtle deviation from Standard Model decay predictions, prompting independent validation runs.',
    category: 'Science',
    subcategory: 'Physics',
    image: ASSET_IMAGES.heroQuantum,
    alt: 'Particle detector spectrometer beamline components',
    publishedAt: '2026-09-26T01:30:00Z',
    timeDisplay: '5 hours ago',
    author: { name: 'Dr. Helen Vance', role: 'Senior Science Editor' },
    readTime: '6 min read',
  },

  // BUSINESS SECTION
  {
    id: 'biz-1',
    slug: 'central-bank-liquidity-swap-lines-sovereign-debt',
    title: 'Treasury Refinancing Surge Prompts Federal Reserve to Expand Overnight Repo Facilities',
    summary: 'Institutional market makers absorbed sixty-two billion dollars in newly auctioned paper with stable primary dealer bid-to-cover ratios.',
    category: 'Business',
    subcategory: 'Monetary Policy',
    image: ASSET_IMAGES.worldSummit,
    alt: 'Financial exchange floor with traders and monitors',
    publishedAt: '2026-09-26T03:50:00Z',
    timeDisplay: '3 hours ago',
    author: { name: 'Victoria Sterling', role: 'Chief Economics Correspondent' },
    readTime: '5 min read',
  },
  {
    id: 'biz-2',
    slug: 'datacenter-energy-contracts-nuclear-sponsorship',
    title: 'Cloud hyperscalers execute twenty-year power purchase pacts with modular reactor builders',
    summary: 'Small modular reactor ventures gain institutional credit backing as tech giants seek steady baseload electricity for training clusters.',
    category: 'Business',
    subcategory: 'Energy & Infrastructure',
    image: ASSET_IMAGES.techSemiconductor,
    alt: 'Clean nuclear energy facility blueprint',
    publishedAt: '2026-09-26T02:30:00Z',
    timeDisplay: '4 hours ago',
    author: { name: 'Kenji Takahashi', role: 'Tokyo Bureau' },
    readTime: '4 min read',
  },
  {
    id: 'biz-3',
    slug: 'venture-capital-b2b-software-multiples-rationalization',
    title: 'Enterprise software valuations re-anchor to cash flow as ARR multiples drop to historic medians',
    summary: 'Founders prioritize GAAP operating margins over hyper-growth, leading to a revival in strategic trade sales and take-private bids.',
    category: 'Business',
    subcategory: 'Markets',
    image: ASSET_IMAGES.worldSummit,
    alt: 'Corporate boardroom financial presentation',
    publishedAt: '2026-09-26T01:00:00Z',
    timeDisplay: '5 hours ago',
    author: { name: 'Victoria Sterling', role: 'Chief Economics Correspondent' },
    readTime: '4 min read',
  },

  // WORLD NEWS SECTION
  {
    id: 'world-1',
    slug: 'geneva-digital-sovereignty-treaty-negotiations',
    title: 'Delegates in Geneva Conclude Third Round of Cross-Border Data Sovereignty Negotiations',
    summary: 'The draft protocol establishes verifiable international dispute mechanisms for cloud storage extraterritoriality and lawful government access requests.',
    category: 'World',
    subcategory: 'International Law',
    image: ASSET_IMAGES.worldSummit,
    alt: 'United Nations conference chamber in Geneva',
    publishedAt: '2026-09-26T04:10:00Z',
    timeDisplay: '2 hours ago',
    author: { name: 'Claire Delacroix', role: 'European Affairs Editor' },
    readTime: '5 min read',
  },
  {
    id: 'world-2',
    slug: 'pacific-islands-subsea-telecom-cable-consortium',
    title: 'Pacific Island nations commission redundant trans-oceanic fiber ring to bolster island connectivity',
    summary: 'The seven-thousand-kilometer subsea system will provide hardened satellite fallbacks during severe seasonal cyclone disturbances.',
    category: 'World',
    subcategory: 'Infrastructure',
    image: ASSET_IMAGES.spaceRocket,
    alt: 'Subsea cable installation vessel in open ocean',
    publishedAt: '2026-09-26T02:20:00Z',
    timeDisplay: '4 hours ago',
    author: { name: 'Kenji Takahashi', role: 'Asia-Pacific Bureau' },
    readTime: '4 min read',
  },
  {
    id: 'world-3',
    slug: 'scandinavian-grid-interconnect-green-hydrogen',
    title: 'Nordic power grid operators complete synchronous HVDC link for offshore hydrogen production',
    summary: 'The cable connects high-capacity North Sea wind installations directly with Baltic synthetic fuel synthesis plants.',
    category: 'World',
    subcategory: 'Energy',
    image: ASSET_IMAGES.techSemiconductor,
    alt: 'High voltage transmission converter station',
    publishedAt: '2026-09-26T00:45:00Z',
    timeDisplay: '6 hours ago',
    author: { name: 'Julian Foster', role: 'Brussels Bureau Chief' },
    readTime: '4 min read',
  },

  // MOST READ STORIES (RANKED 01 to 05)
  {
    id: 'most-read-1',
    slug: 'the-silicon-ceiling-transistor-density-physics',
    title: 'Why Physicists Warn the Silicon Transistor Has Reached Atomic Lattice Boundaries',
    summary: 'At zero-point-six nanometers, quantum tunneling ceases to be an engineering nuance and becomes an absolute thermodynamic wall.',
    category: 'Technology',
    image: ASSET_IMAGES.techSemiconductor,
    alt: 'Silicon atomic lattice simulation',
    publishedAt: '2026-09-25T14:00:00Z',
    timeDisplay: 'Yesterday',
    author: { name: 'Sarah Lin', role: 'Technology Correspondent' },
    readTime: '7 min read',
    rank: 1,
  },
  {
    id: 'most-read-2',
    slug: 'how-game-studios-are-adapting-to-longer-cycles',
    title: 'Seven-Year Development Windows: Inside the Financial Squeeze of Modern Blockbusters',
    summary: 'With budgets routinely surpassing two hundred million dollars, studios are rethinking single-release milestones.',
    category: 'Gaming',
    image: ASSET_IMAGES.gamingVista,
    alt: 'Game motion capture stage with sensors',
    publishedAt: '2026-09-25T18:30:00Z',
    timeDisplay: 'Yesterday',
    author: { name: 'Marcus Bell', role: 'Gaming Editor' },
    readTime: '6 min read',
    rank: 2,
  },
  {
    id: 'most-read-3',
    slug: 'fusion-ignition-reproducibility-records',
    title: 'Inertial Confinement Reactor Delivers Consecutive Net Energy Yields in Livermore Campaign',
    summary: 'Researchers exceed target gain factors on back-to-back shots using shaped diamond target capsules.',
    category: 'Science',
    subcategory: 'Physics',
    image: ASSET_IMAGES.heroQuantum,
    alt: 'Fusion chamber target chamber',
    publishedAt: '2026-09-25T11:20:00Z',
    timeDisplay: 'Yesterday',
    author: { name: 'Dr. Helen Vance', role: 'Senior Science Editor' },
    readTime: '5 min read',
    rank: 3,
  },
  {
    id: 'most-read-4',
    slug: 'commercial-space-station-hab-pressure-tests',
    title: 'Inflatable Orbital Habitat Bladder Withstands Extreme Hypervelocity Particle Impacts',
    summary: 'Kevlar-vectran weave composite displays zero puncture leaks during simulated debris collisions at eight kilometers per second.',
    category: 'Space',
    image: ASSET_IMAGES.spaceRocket,
    alt: 'Pressurized habitat module in vacuum chamber',
    publishedAt: '2026-09-25T16:15:00Z',
    timeDisplay: 'Yesterday',
    author: { name: 'Alina Thorne', role: 'Aerospace Reporter' },
    readTime: '4 min read',
    rank: 4,
  },
  {
    id: 'most-read-5',
    slug: 'global-supply-chain-nearshoring-metrics',
    title: 'Manufacturing Data Shows Northern Mexico Absorbing Record Capital Goods Investment',
    summary: 'Automotive and industrial electronics assembly footprints expand along the Monterrey-Saltillo corridor.',
    category: 'Business',
    image: ASSET_IMAGES.worldSummit,
    alt: 'Modern automated logistics fulfillment center',
    publishedAt: '2026-09-25T09:40:00Z',
    timeDisplay: 'Yesterday',
    author: { name: 'Victoria Sterling', role: 'Chief Economics Correspondent' },
    readTime: '5 min read',
    rank: 5,
  },
];

export function getFeaturedStory(): Story {
  return MOCK_STORIES.find((s) => s.featured) || MOCK_STORIES[0];
}

export function getLatestNews(): Story[] {
  return MOCK_STORIES.filter((s) => s.id.startsWith('latest-'));
}

export function getTopStories(): Story[] {
  return MOCK_STORIES.filter((s) => s.id.startsWith('top-'));
}

export function getStoriesByCategory(category: string, limit = 3): Story[] {
  const cat = category.toLowerCase();
  return MOCK_STORIES.filter((s) => {
    const c = s.category.toLowerCase();
    if (cat === 'ai') return c.includes('ai') || c.includes('computing');
    if (cat === 'tech') return c.includes('tech') || c.includes('semiconductor');
    if (cat === 'gaming') return c.includes('game') || c.includes('gaming');
    if (cat === 'sci') return c.includes('sci') || c.includes('physics');
    if (cat === 'biz') return c.includes('biz') || c.includes('business');
    if (cat === 'world') return c.includes('world') || c.includes('trade');
    return c.includes(cat);
  }).slice(0, limit);
}

export function getMostReadStories(): Story[] {
  return MOCK_STORIES.filter((s) => s.rank !== undefined).sort(
    (a, b) => (a.rank || 0) - (b.rank || 0)
  );
}

export function getTrendingHeadlines(): TrendingItem[] {
  return TRENDING_ITEMS;
}

export function searchStories(query: string): Story[] {
  if (!query || query.trim() === '') return [];
  const q = query.toLowerCase().trim();
  return MOCK_STORIES.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.author.name.toLowerCase().includes(q)
  );
}

// Re-export full story database functions & types
export {
  getStoryBySlug,
  getMockStoryBySlug,
  enrichStoryWithEditorialContent,
  DETAILED_STORIES,
} from './storyDatabase';

export type {
  NewsStory,
  ArticleBlock,
  Fact,
  StoryUpdate,
  StorySource,
  StoryCorrection,
  StoryStatus,
  StoryAuthor,
  StoryHeroImage,
} from '../types/story';

// Re-export category database functions & types
export {
  getCategoryBySlug,
  getAllCategories,
  getStoriesByCategory as queryStoriesByCategory,
  getFeaturedStoriesByCategory,
  getLatestStoriesByCategory,
  getTrendingStoriesByCategory,
  getMostReadStoriesByCategory,
  getCategoryPageData,
  CATEGORY_DEFINITIONS,
} from './categoryDatabase';

export type {
  NewsCategory,
  CategorySubcategory,
  CategorySortMode,
  CategoryViewMode,
  CategoryPageData,
} from '../types/category';

// Re-export repository types only (type-only, erased at compile-time)
export type { NewsRepository, HomepageData, CategoryStoryQueryOptions } from '../types/repository';

