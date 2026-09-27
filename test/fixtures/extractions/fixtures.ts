/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 12 Comprehensive Test Fixtures for Universal News Extraction Engine
 */

import type { DiscoveryItem } from '../../../src/types/discovery';

export interface ExtractionTestFixture {
  id: string;
  name: string;
  description: string;
  discoveryItem: DiscoveryItem;
  htmlContent: string;
  expectedCategory: string;
  expectedStatus: string;
  hasConflicts?: boolean;
}

export const EXTRACTION_TEST_FIXTURES: ExtractionTestFixture[] = [
  // 1. AI product announcement
  {
    id: 'fix-01-ai-announcement',
    name: 'AI Product Announcement',
    description: 'OpenAI announces next-generation inference architecture for frontier models',
    expectedCategory: 'ai',
    expectedStatus: 'announcement',
    discoveryItem: {
      id: 'disc-ai-01',
      sourceId: 'src-openai',
      sourceName: 'OpenAI News',
      sourceType: 'rss',
      canonicalUrl: 'https://openai.example.com/news/next-gen-inference',
      sourceUrl: 'https://openai.example.com/news/next-gen-inference',
      title: 'OpenAI Unveils Optimized Inference Engine for Frontier Systems',
      description: 'The new inference architecture reduces latency by 45 percent across production clusters.',
      publishedAt: '2026-09-26T14:00:00Z',
      discoveredAt: '2026-09-26T14:15:00Z',
      lastSeenAt: '2026-09-26T14:15:00Z',
      categoryHint: 'ai',
      subcategoryHint: 'models',
      status: 'candidate',
      fingerprint: 'fp-ai-01',
      contentHash: 'ch-ai-01',
    },
    htmlContent: `<!DOCTYPE html><html><head><title>OpenAI Unveils Optimized Inference Engine</title>
<meta name="author" content="Engineering Team"><meta property="article:published_time" content="2026-09-26T14:00:00Z"></head>
<body><article>
<h1>OpenAI Unveils Optimized Inference Engine for Frontier Systems</h1>
<p>SAN FRANCISCO — OpenAI today announced a major architectural update to its production inference engine, delivering a 45 percent reduction in token generation latency.</p>
<p>The system, codenamed StreamV2, will roll out to enterprise API customers beginning October 15, 2026.</p>
<p>Chief Product Officer Kevin Scott stated: "This optimization fundamentally alters the cost-performance boundary for multi-agent reasoning systems."</p>
</article></body></html>`,
  },

  // 2. Gaming announcement
  {
    id: 'fix-02-gaming-announcement',
    name: 'Gaming Hardware / Engine Announcement',
    description: 'Unreal Engine 6 roadmap revealed with native neural rendering capabilities',
    expectedCategory: 'gaming',
    expectedStatus: 'announcement',
    discoveryItem: {
      id: 'disc-game-02',
      sourceId: 'src-eurogamer',
      sourceName: 'Eurogamer',
      sourceType: 'rss',
      canonicalUrl: 'https://eurogamer.example.com/epic-games-unreal-engine-6-preview',
      sourceUrl: 'https://eurogamer.example.com/epic-games-unreal-engine-6-preview',
      title: 'Epic Games Outlines Unreal Engine 6 With Built-In Neural Radiance Fields',
      description: 'Epic Games announced the preliminary architecture for Unreal Engine 6 at its annual state of play.',
      publishedAt: '2026-09-25T16:30:00Z',
      discoveredAt: '2026-09-25T17:00:00Z',
      lastSeenAt: '2026-09-25T17:00:00Z',
      categoryHint: 'gaming',
      subcategoryHint: 'industry',
      status: 'candidate',
      fingerprint: 'fp-game-02',
      contentHash: 'ch-game-02',
    },
    htmlContent: `<!DOCTYPE html><html><head><title>Epic Games Outlines Unreal Engine 6</title></head>
<body><article>
<h1>Epic Games Outlines Unreal Engine 6 With Built-In Neural Radiance Fields</h1>
<p>Epic Games formally revealed the roadmap for Unreal Engine 6 during its State of Unreal keynote this afternoon.</p>
<p>The next-generation engine incorporates real-time neural volumetric rendering directly into the core Nanite virtualized geometry pipeline, eliminating traditional lightmap bake cycles.</p>
<p>Public previews are scheduled for developer testing in spring 2027 across console and PC platforms.</p>
</article></body></html>`,
  },

  // 3. Science article
  {
    id: 'fix-03-science-article',
    name: 'Peer-Reviewed Science Breakthrough',
    description: 'James Webb Space Telescope observes pristine molecular clouds in early cosmos',
    expectedCategory: 'science',
    expectedStatus: 'normal',
    discoveryItem: {
      id: 'disc-sci-03',
      sourceId: 'src-nature',
      sourceName: 'Nature',
      sourceType: 'rss',
      canonicalUrl: 'https://nature.example.com/articles/jwst-early-carbon-enrichment',
      sourceUrl: 'https://nature.example.com/articles/jwst-early-carbon-enrichment',
      title: 'Webb Telescope Identifies Earliest Known Polycyclic Aromatic Hydrocarbons',
      description: 'Spectroscopic observations from JWST date complex carbon chemistry to 350 million years after the Big Bang.',
      publishedAt: '2026-09-24T18:00:00Z',
      discoveredAt: '2026-09-24T18:30:00Z',
      lastSeenAt: '2026-09-24T18:30:00Z',
      categoryHint: 'science',
      subcategoryHint: 'astronomy',
      status: 'candidate',
      fingerprint: 'fp-sci-03',
      contentHash: 'ch-sci-03',
    },
    htmlContent: `<!DOCTYPE html><html><head><title>Webb Telescope Identifies Earliest Known Polycyclic Aromatic Hydrocarbons</title></head>
<body><article>
<h1>Webb Telescope Identifies Earliest Known Polycyclic Aromatic Hydrocarbons</h1>
<p>Astronomers analyzing deep infrared spectroscopy from the James Webb Space Telescope have discovered signatures of complex aromatic hydrocarbons in a proto-galaxy 350 million years after the Big Bang.</p>
<p>The findings, published Thursday in Nature, demonstrate that interstellar dust grain formation and organic molecule synthesis proceeded far more rapidly in the cosmic dawn than existing cosmological models predicted.</p>
<p>Lead researcher Dr. Elena Rostova of the European Southern Observatory noted that the spectral peak at 3.3 micrometers confirms abundant aromatic C-H bonds.</p>
</article></body></html>`,
  },

  // 4. Business article
  {
    id: 'fix-04-business-merger',
    name: 'Global Financial & Semiconductor Business',
    description: 'TSMC confirms commercial ramp of A16 angled-power rail technology',
    expectedCategory: 'business',
    expectedStatus: 'normal',
    discoveryItem: {
      id: 'disc-biz-04',
      sourceId: 'src-reuters',
      sourceName: 'Reuters Business',
      sourceType: 'rss',
      canonicalUrl: 'https://reuters.example.com/business/tsmc-a16-commercial-ramp',
      sourceUrl: 'https://reuters.example.com/business/tsmc-a16-commercial-ramp',
      title: 'TSMC Commits $32 Billion to Advanced Packaging and A16 Node Expansion',
      description: 'Taiwan Semiconductor Manufacturing Co announced revised capital expenditure for high-density 1.6nm production.',
      publishedAt: '2026-09-25T08:00:00Z',
      discoveredAt: '2026-09-25T08:30:00Z',
      lastSeenAt: '2026-09-25T08:30:00Z',
      categoryHint: 'business',
      subcategoryHint: 'markets',
      status: 'candidate',
      fingerprint: 'fp-biz-04',
      contentHash: 'ch-biz-04',
    },
    htmlContent: `<!DOCTYPE html><html><head><title>TSMC Commits $32 Billion to Advanced Packaging</title></head>
<body><article>
<h1>TSMC Commits $32 Billion to Advanced Packaging and A16 Node Expansion</h1>
<p>TAIPEI — Taiwan Semiconductor Manufacturing Co (TSMC) on Friday raised its annual capital expenditure budget to $32 billion, citing unyielding demand for high-bandwidth artificial intelligence silicon.</p>
<p>The world's largest contract chipmaker confirmed that volume production of its 1.6-nanometer A16 node will begin in the second half of 2026 in Hsinchu.</p>
<p>Operating margins for the fiscal quarter rose 180 basis points to 53.4 percent, surpassing consensus analyst projections of 51.6 percent.</p>
</article></body></html>`,
  },

  // 5. World news article
  {
    id: 'fix-05-world-geopolitics',
    name: 'World News & Diplomatic Accord',
    description: 'Maritime navigation safety agreement ratified by bilateral Pacific commission',
    expectedCategory: 'world',
    expectedStatus: 'normal',
    discoveryItem: {
      id: 'disc-world-05',
      sourceId: 'src-bbc',
      sourceName: 'BBC World News',
      sourceType: 'rss',
      canonicalUrl: 'https://bbc.example.com/news/world-pacific-maritime-safety-accord',
      sourceUrl: 'https://bbc.example.com/news/world-pacific-maritime-safety-accord',
      title: 'Pacific Littoral States Ratify Comprehensive Maritime Safety Protocol',
      description: 'Representatives from twelve coastal nations signed the Suva Maritime Protocol governing automatic identification transponders.',
      publishedAt: '2026-09-26T06:00:00Z',
      discoveredAt: '2026-09-26T06:45:00Z',
      lastSeenAt: '2026-09-26T06:45:00Z',
      categoryHint: 'world',
      subcategoryHint: 'geopolitics',
      status: 'candidate',
      fingerprint: 'fp-world-05',
      contentHash: 'ch-world-05',
    },
    htmlContent: `<!DOCTYPE html><html><head><title>Pacific Littoral States Ratify Protocol</title></head>
<body><article>
<h1>Pacific Littoral States Ratify Comprehensive Maritime Safety Protocol</h1>
<p>SUVA, Fiji — Twelve Pacific nations on Saturday ratified the Suva Maritime Accord, establishing shared radar feeds and standardized transponder mandates across exclusive economic zones.</p>
<p>The agreement enters into legal effect on January 1, 2027, backed by joint funding from regional maritime defense boards.</p>
<p>Diplomats praised the measure as a critical safeguard against unregistered commercial traffic and deep-sea mineral dredging.</p>
</article></body></html>`,
  },

  // 6. Short article (brevity testing)
  {
    id: 'fix-06-short-bulletin',
    name: 'Short Flash Bulletin',
    description: 'Minimal two-sentence official bulletin testing brevity handling',
    expectedCategory: 'space',
    expectedStatus: 'announcement',
    discoveryItem: {
      id: 'disc-short-06',
      sourceId: 'src-nasa',
      sourceName: 'NASA Releases',
      sourceType: 'rss',
      canonicalUrl: 'https://nasa.example.com/press/artemis-stage-hotfire-completed',
      sourceUrl: 'https://nasa.example.com/press/artemis-stage-hotfire-completed',
      title: 'NASA Completes 500-Second RS-25 Engine Hotfire at Stennis Space Center',
      description: 'Engineers concluded the final baseline certification test of the RS-25 flight engine for Artemis IV.',
      publishedAt: '2026-09-26T21:00:00Z',
      discoveredAt: '2026-09-26T21:10:00Z',
      lastSeenAt: '2026-09-26T21:10:00Z',
      categoryHint: 'space',
      subcategoryHint: 'missions',
      status: 'candidate',
      fingerprint: 'fp-short-06',
      contentHash: 'ch-short-06',
    },
    htmlContent: `<!DOCTYPE html><html><body><article>
<p>STENNIS, Miss. — NASA conducted a full-duration 500-second hotfire test of the RS-25 core stage engine on Saturday at the Fred Haise Test Stand.</p>
<p>All performance metrics met flight readiness thresholds for the Artemis IV lunar mission scheduled for late 2028.</p>
</article></body></html>`,
  },

  // 7. Long article (context window and truncation testing)
  {
    id: 'fix-07-long-investigation',
    name: 'In-Depth Investigation & Long-form Analysis',
    description: 'Multi-section technical investigation examining critical grid software infrastructure',
    expectedCategory: 'cybersecurity',
    expectedStatus: 'analysis',
    discoveryItem: {
      id: 'disc-long-07',
      sourceId: 'src-ars',
      sourceName: 'Ars Technica',
      sourceType: 'rss',
      canonicalUrl: 'https://arstechnica.example.com/security/2026/09/grid-scada-vulnerabilities-analysis',
      sourceUrl: 'https://arstechnica.example.com/security/2026/09/grid-scada-vulnerabilities-analysis',
      title: 'Inside the Ten-Year Push to Modernize Industrial Power Grid Cryptography',
      description: 'A deep-dive into the architectural hurdles of deploying post-quantum cryptographic standards across legacy SCADA systems.',
      publishedAt: '2026-09-23T11:00:00Z',
      discoveredAt: '2026-09-23T11:45:00Z',
      lastSeenAt: '2026-09-23T11:45:00Z',
      categoryHint: 'cybersecurity',
      subcategoryHint: 'infrastructure',
      status: 'candidate',
      fingerprint: 'fp-long-07',
      contentHash: 'ch-long-07',
    },
    htmlContent: `<!DOCTYPE html><html><body><article>
<h1>Inside the Ten-Year Push to Modernize Industrial Power Grid Cryptography</h1>
<p>WASHINGTON — Across thousands of high-voltage transmission substations in North America, programmable logic controllers installed in the mid-1990s continue to exchange unencrypted Modbus and DNP3 telemetric streams.</p>
<h2>The Hardware Deficit</h2>
<p>While federal energy regulators enacted mandatory cipher requirements in 2024, implementation has stalled due to compute limitations on legacy microcontrollers. Upgrading field substations requires taking critical transformers offline during peak cooling demand.</p>
<p>Engineers at Pacific Gas and Electric have piloted an intermediate bump-in-the-wire proxy architecture using lattice-based cryptosystems, reducing protocol overhead to less than 12 milliseconds per packet exchange.</p>
<h2>Next Steps and Regulatory Milestones</h2>
<p>Utilities must achieve 75 percent compliance by December 2028 under the revised NERC CIP guidelines or face daily statutory fines up to $1 million per violation.</p>
</article></body></html>`,
  },

  // 8. Conflicting facts (verifying conflict detection & needs_review flag)
  {
    id: 'fix-08-conflicting-facts',
    name: 'Article with Conflicting Numbers and Claims',
    description: 'Internal contradictions between headline valuation ($10B) and paragraph text ($8.2B)',
    expectedCategory: 'business',
    expectedStatus: 'needs_review',
    hasConflicts: true,
    discoveryItem: {
      id: 'disc-conf-08',
      sourceId: 'src-reuters',
      sourceName: 'Financial Dispatches',
      sourceType: 'rss',
      canonicalUrl: 'https://example.com/finance/cloud-provider-funding-conflict',
      sourceUrl: 'https://example.com/finance/cloud-provider-funding-conflict',
      title: 'CloudInfra Secures $10 Billion Series D Valuation in Oversubscribed Round',
      description: 'Contradictory filings report differing totals for the company funding valuation.',
      publishedAt: '2026-09-26T12:00:00Z',
      discoveredAt: '2026-09-26T12:30:00Z',
      lastSeenAt: '2026-09-26T12:30:00Z',
      categoryHint: 'business',
      subcategoryHint: 'startups',
      status: 'candidate',
      fingerprint: 'fp-conf-08',
      contentHash: 'ch-conf-08',
    },
    htmlContent: `<!DOCTYPE html><html><body><article>
<h1>CloudInfra Secures $10 Billion Series D Valuation in Oversubscribed Round</h1>
<p>CloudInfra announced today it closed a $1.2 billion capital round valuing the startup at $10.0 billion.</p>
<p>However, regulatory filings submitted simultaneously to the SEC indicate the post-money enterprise valuation stands at $8.2 billion, reflecting discounted secondary share transactions.</p>
<p>A company spokesperson declined to clarify which figure represents the definitive statutory baseline.</p>
</article></body></html>`,
  },

  // 9. Missing date (graceful date fallback)
  {
    id: 'fix-09-missing-date',
    name: 'Article Without Publication or Event Date',
    description: 'Feed missing pubDate tag and HTML lacking time or meta datetime tags',
    expectedCategory: 'technology',
    expectedStatus: 'normal',
    discoveryItem: {
      id: 'disc-nodate-09',
      sourceId: 'src-tech',
      sourceName: 'Tech Bulletin',
      sourceType: 'rss',
      canonicalUrl: 'https://tech.example.com/bulletins/open-source-compiler-release',
      sourceUrl: 'https://tech.example.com/bulletins/open-source-compiler-release',
      title: 'LLVM 22.0 Released With Full C++26 Reflection Standard Support',
      description: 'The LLVM community announced the formal release of version 22.0 featuring static reflection.',
      publishedAt: null,
      discoveredAt: '2026-09-27T08:00:00Z',
      lastSeenAt: '2026-09-27T08:00:00Z',
      categoryHint: 'technology',
      subcategoryHint: 'developer-tools',
      status: 'candidate',
      fingerprint: 'fp-nodate-09',
      contentHash: 'ch-nodate-09',
    },
    htmlContent: `<!DOCTYPE html><html><body><article>
<h1>LLVM 22.0 Released With Full C++26 Reflection Standard Support</h1>
<p>The LLVM developer collective has published LLVM 22.0, adding experimental support for compile-time reflection defined in the upcoming ISO C++26 draft.</p>
<p>Benchmarks indicate zero runtime penalty for metadata introspections on clang-compiled binaries.</p>
</article></body></html>`,
  },

  // 10. Ambiguous category (overriding inaccurate category hint)
  {
    id: 'fix-10-ambiguous-category',
    name: 'Ambiguous Category Cross-Over',
    description: 'Story hints gaming but content is strictly legal antitrust litigation',
    expectedCategory: 'business',
    expectedStatus: 'normal',
    discoveryItem: {
      id: 'disc-ambig-10',
      sourceId: 'src-game-dev',
      sourceName: 'Game Industry News',
      sourceType: 'rss',
      canonicalUrl: 'https://gamedev.example.com/antitrust-ruling-storefront-fees',
      sourceUrl: 'https://gamedev.example.com/antitrust-ruling-storefront-fees',
      title: 'Federal Appellate Court Upholds Injunction on App Store Revenue Fees',
      description: 'The Ninth Circuit Court of Appeals ruled that mobile platform operators must permit third-party billing engines without imposition of 27 percent steering fees.',
      publishedAt: '2026-09-25T19:00:00Z',
      discoveredAt: '2026-09-25T19:30:00Z',
      lastSeenAt: '2026-09-25T19:30:00Z',
      categoryHint: 'gaming',
      subcategoryHint: 'industry',
      status: 'candidate',
      fingerprint: 'fp-ambig-10',
      contentHash: 'ch-ambig-10',
    },
    htmlContent: `<!DOCTYPE html><html><body><article>
<h1>Federal Appellate Court Upholds Injunction on App Store Revenue Fees</h1>
<p>SAN FRANCISCO — A federal appeals court has upheld an injunction requiring mobile operating system vendors to allow direct third-party payment rails, striking down retaliatory commissions.</p>
<p>The 3-0 unanimous decision impacts billions in digital marketplace margins across corporate storefronts.</p>
</article></body></html>`,
  },

  // 11. Article with direct attributed quote
  {
    id: 'fix-11-article-with-quote',
    name: 'Attributed Executive Statement & Direct Quote',
    description: 'Verifies quotes are extracted with exact attribution and without fabrication',
    expectedCategory: 'technology',
    expectedStatus: 'normal',
    discoveryItem: {
      id: 'disc-quote-11',
      sourceId: 'src-verge',
      sourceName: 'The Verge',
      sourceType: 'rss',
      canonicalUrl: 'https://theverge.example.com/ai-robotics-open-consortium',
      sourceUrl: 'https://theverge.example.com/ai-robotics-open-consortium',
      title: 'Robotics Giants Form Open Protocol Alliance for Humanoid Locomotion',
      description: 'Boston Dynamics, Figure, and Agility Robotics established an open safety protocol.',
      publishedAt: '2026-09-26T15:00:00Z',
      discoveredAt: '2026-09-26T15:30:00Z',
      lastSeenAt: '2026-09-26T15:30:00Z',
      categoryHint: 'technology',
      subcategoryHint: 'robotics',
      status: 'candidate',
      fingerprint: 'fp-quote-11',
      contentHash: 'ch-quote-11',
    },
    htmlContent: `<!DOCTYPE html><html><body><article>
<h1>Robotics Giants Form Open Protocol Alliance for Humanoid Locomotion</h1>
<p>Industry leaders in bipedal robotics have founded the Humanoid Open Interface Group to standardize kinematic control telemetries.</p>
<p>Boston Dynamics CEO Robert Playter remarked: "Standardizing safety interlocks at the firmware level prevents catastrophic kinematic failures as humanoids transition into active logistics centers."</p>
</article></body></html>`,
  },

  // 12. Article with multiple sources & cross-citations
  {
    id: 'fix-12-multi-source',
    name: 'Multi-Source Synthesis',
    description: 'Story referencing joint academic collaboration between Stanford and CERN',
    expectedCategory: 'science',
    expectedStatus: 'normal',
    discoveryItem: {
      id: 'disc-multi-12',
      sourceId: 'src-phys-org',
      sourceName: 'Phys.org',
      sourceType: 'rss',
      canonicalUrl: 'https://phys.org/news/cern-stanford-quantum-entanglement-calorimeter',
      sourceUrl: 'https://phys.org/news/cern-stanford-quantum-entanglement-calorimeter',
      title: 'Joint CERN and Stanford Team Measures Sub-Femtometer Quark Displacements',
      description: 'Researchers deployed continuous quantum nondemolition sensors to observe hadron collisions.',
      publishedAt: '2026-09-24T10:00:00Z',
      discoveredAt: '2026-09-24T10:30:00Z',
      lastSeenAt: '2026-09-24T10:30:00Z',
      categoryHint: 'science',
      subcategoryHint: 'physics',
      status: 'candidate',
      fingerprint: 'fp-multi-12',
      contentHash: 'ch-multi-12',
    },
    htmlContent: `<!DOCTYPE html><html><body><article>
<h1>Joint CERN and Stanford Team Measures Sub-Femtometer Quark Displacements</h1>
<p>GENEVA — In a joint publication appearing in Physical Review Letters, experimental physicists at CERN and Stanford University detailed sub-femtometer spatial resolutions during proton collisions.</p>
<p>The experiment combined the High-Luminosity Large Hadron Collider beamline with superconducting nanowire single-photon detectors developed at Stanford's SLAC National Accelerator Laboratory.</p>
<p>Data confirmed that quark wavefunctions undergo transient spatial non-locality under high-density gluonic fields.</p>
</article></body></html>`,
  },
];
