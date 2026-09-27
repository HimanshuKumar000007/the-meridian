/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsStory } from '../types/story';
import { ASSET_IMAGES } from './assets';

/**
 * Universal Mock News Story Catalog
 * Normalized, high-fidelity local dataset backing MockNewsRepository.
 */
export const MOCK_STORIES_DATA: NewsStory[] = [
  // =========================================================================
  // 1. AI & COMPUTING — Lead Milestone (Multiple updates, sources & correction)
  // =========================================================================
  {
    id: 'story-hero',
    slug: 'quantum-coherence-breakthrough-cryogenic-milestone',
    title: 'The Sub-Kelvin Milestone: How Optical Cryostats Unlocked Continuous Fault-Tolerant Coherence',
    dek: 'A joint consortium of international physics laboratories has demonstrated three hours of unbroken logical qubit entanglement at sub-millikelvin temperatures, clearing a decade-long hurdle toward practical commercial error correction.',
    summary: 'A joint consortium of international physics laboratories has demonstrated three hours of unbroken logical qubit entanglement at sub-millikelvin temperatures, clearing a decade-long hurdle toward practical commercial error correction.',
    category: 'AI & Computing',
    subcategory: 'Quantum Systems',
    status: 'Analysis',
    lifecycleStatus: 'published',
    publishedAt: '2026-09-26T05:30:00Z',
    updatedAt: '2026-09-26T06:12:00Z',
    createdAt: '2026-09-26T03:00:00Z',
    firstSeenAt: '2026-09-26T03:15:00Z',
    lastCheckedAt: '2026-09-26T08:00:00Z',
    timeDisplay: 'Updated 25m ago',
    readTime: '6 min read',
    featured: true,
    viewCount: 18450,
    trendingScore: 98,
    rank: 1,
    author: {
      id: 'auth-helen-vance',
      name: 'Dr. Helen Vance',
      slug: 'helen-vance',
      role: 'Senior Science & Deep Tech Correspondent',
      bio: 'Dr. Helen Vance covers fundamental physics, quantum architectures, and frontier computing. Previously research fellow at Oxford Condensed Matter Physics.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
    heroImage: {
      url: ASSET_IMAGES.heroQuantum,
      alt: 'Golden cryostat wiring and optical chambers inside a low-temperature physics research facility',
      caption: 'Dilution refrigeration stages inside the international consortium laboratory prior to final vacuum sealing.',
      credit: 'The Meridian / Laurent Mercier',
    },
    quickSummary: [
      'Researchers maintained uninterrupted logical qubit coherence for 184 minutes at 12 millikelvin.',
      'A novel optical interconnect eliminates thermal vibration spikes that historically caused phase decoherence.',
      'Surface code syndrome extraction achieved an error suppression factor exceeding 99.94 percent.',
      'Commercial fabrication partners in Munich and Grenoble have commenced pilot packaging verification.',
    ],
    facts: [
      { id: 'f1', label: 'Consortium', value: 'Munich-Grenoble Quantum Labs & Stanford Applied Physics', order: 1 },
      { id: 'f2', label: 'Operating Temp', value: '12 millikelvin (-273.138°C)', order: 2 },
      { id: 'f3', label: 'Coherence Duration', value: '184 minutes continuous', order: 3 },
      { id: 'f4', label: 'Error Suppression', value: '99.94% logical fidelity', order: 4 },
      { id: 'f5', label: 'Commercial Target', value: 'H2 2027 enterprise pilot systems', order: 5 },
    ],
    updates: [
      {
        id: 'up-1',
        timestamp: '2026-09-26T06:12:00Z',
        time: '12:42 PM',
        title: 'Peer review verification finalized',
        body: 'Physical Review Applied published the complete 48-page empirical telemetry dataset and sensor calibration benchmarks.',
        text: 'Physical Review Applied published the complete 48-page empirical telemetry dataset and sensor calibration benchmarks.',
        sourceId: 'src-1',
        source: 'Physical Review Applied',
        isMajor: true,
      },
      {
        id: 'up-2',
        timestamp: '2026-09-26T05:45:00Z',
        time: '11:15 AM',
        title: 'Independent laboratory validation',
        body: 'The Swiss Federal Institute replicated phase coherence metrics under secondary cryogenic chamber parameters.',
        text: 'The Swiss Federal Institute replicated phase coherence metrics under secondary cryogenic chamber parameters.',
        sourceId: 'src-2',
        source: 'ETH Zurich Quantum Briefing',
        isMajor: false,
      },
      {
        id: 'up-3',
        timestamp: '2026-09-26T05:30:00Z',
        time: '09:30 AM',
        title: 'Consortium announcement',
        body: 'Joint statement issued simultaneously in Geneva, Paris, and Palo Alto detailing the thermal isolation breakthrough.',
        text: 'Joint statement issued simultaneously in Geneva, Paris, and Palo Alto detailing the thermal isolation breakthrough.',
        sourceId: 'src-3',
        source: 'Joint Consortium Desk',
        isMajor: false,
      },
    ],
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'For nearly thirty years, the physics of scalable quantum computing has been haunted by an uncompromising physical reality: keeping qubits cold enough to preserve delicate superposition while simultaneously routing thousands of control cables without introducing ambient thermal noise. Today, that thermodynamic bottleneck has yielded to an elegant optical solution.',
      },
      {
        type: 'paragraph',
        text: 'In coordinated experiments concluded at 03:00 UTC across synchronized facilities in Grenoble and Palo Alto, researchers maintained continuous logical state entanglement for over three hours. The achievement surpasses prior continuous-run records by nearly two orders of magnitude.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'The Optical Vacuum Bypass',
      },
      {
        type: 'paragraph',
        text: 'Traditional dilution refrigerators rely on coaxial copper and niobium-titanium wiring to transmit microwave pulses to superconducting transmon circuits. However, metal wires inevitably conduct parasitic phonons from room-temperature control racks directly into the millikelvin stage. To circumvent this, the consortium swapped metallic transmission lines with ultra-thin, low-loss optical waveguides.',
      },
      {
        type: 'quote',
        quote: 'We stopped fighting thermal conductivity through heavier shielding and instead converted the entire microwave modulation pipeline into infrared photons outside the cryostat chamber.',
        attribution: 'Dr. Marc Beauchamp',
        role: 'Co-lead Investigator, CNRS Grenoble',
      },
      {
        type: 'paragraph',
        text: 'Signals are converted back into microwave pulses directly at the sub-Kelvin mixing chamber using cryogenic photodetectors engineered to dissipate less than eight picowatts during active gating cycles.',
      },
      {
        type: 'heading',
        level: 3,
        text: 'Surface Code Syndrome Extraction',
      },
      {
        type: 'paragraph',
        text: 'The sustained coherence allowed the consortium to run continuous stabilizer measurement cycles—the foundational bedrock of fault-tolerant quantum computation. During the 184-minute window, the system performed 4.2 million syndrome measurements without a single runaway phase catastrophe.',
      },
      {
        type: 'list',
        items: [
          'Average physical two-qubit gate error remained below 0.08%',
          'Readout fidelity averaged 99.82% across all 128 active logical channels',
          'Leakage out of the computational subspace was suppressed via active resetting pulses',
          'Thermal drift in the dilution plate was constrained to within ±0.4 millikelvin',
        ],
      },
      {
        type: 'callout',
        title: 'Editorial Context: Why 184 Minutes Matters',
        text: 'Most commercial cryptographic algorithms and molecular quantum chemical simulations require billions of continuous gate executions. A system that decoheres in milliseconds requires endless restarts; a system stable for hours can execute complete molecular Hamiltonian simulations without interruptions.',
      },
      {
        type: 'paragraph',
        text: 'Independent industry analysts note that while scaling from 128 logical qubits to commercial-scale millions remains a daunting manufacturing challenge, the fundamental physics question—whether optical isolation can prevent thermal runaway—has been decisively resolved.',
      },
    ],
    sources: [
      {
        id: 'src-1',
        name: 'Physical Review Applied — Primary Telemetry',
        url: 'https://journals.aps.org',
        sourceType: 'publisher',
        publishedAt: '2026-09-26T06:00:00Z',
        isPrimary: true,
        time: 'Sept 26, 2026',
        note: 'Complete calibration logs and syndrome extraction records',
      },
      {
        id: 'src-2',
        name: 'CNRS Cryogenic Instrumentation Laboratory',
        url: 'https://cnrs.fr',
        sourceType: 'official',
        publishedAt: '2026-09-26T05:00:00Z',
        isPrimary: false,
        time: 'Sept 26, 2026',
        note: 'Photodetector dissipation and thermal budget whitepaper',
      },
      {
        id: 'src-3',
        name: 'Stanford Center for Quantum Architectures',
        url: 'https://stanford.edu',
        sourceType: 'publisher',
        publishedAt: '2026-09-26T04:30:00Z',
        isPrimary: false,
        time: 'Sept 26, 2026',
        note: 'Optical waveguide attenuation analysis',
      },
    ],
    corrections: [
      {
        id: 'cor-1',
        date: 'September 26, 2026 at 06:12 AM UTC',
        text: 'Updated with confirmed syndrome measurement totals from the Paris data repository. Earlier draft noted 3.8 million cycles.',
      },
    ],
    relatedStoryIds: [
      'tsmc-1-6nm-ramp-up',
      'openai-verification-protocol',
      'cern-charm-quark-asymmetry',
    ],
    relatedSlugs: [
      'tsmc-1-6nm-ramp-up',
      'openai-verification-protocol',
      'cern-charm-quark-asymmetry',
    ],
  },

  // =========================================================================
  // 2. AI — Autonomous Verification (Multiple updates & sources)
  // =========================================================================
  {
    id: 'ai-story-product',
    slug: 'openai-new-product',
    title: 'OpenAI Outlines Multi-Agent Verification Protocol for Autonomous Software Workflows',
    dek: 'The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.',
    summary: 'The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.',
    category: 'AI',
    subcategory: 'Frontier Models',
    status: 'Announcement',
    lifecycleStatus: 'published',
    publishedAt: '2026-09-26T04:30:00Z',
    updatedAt: '2026-09-26T05:15:00Z',
    createdAt: '2026-09-26T02:00:00Z',
    firstSeenAt: '2026-09-26T02:30:00Z',
    lastCheckedAt: '2026-09-26T08:00:00Z',
    timeDisplay: 'Updated 1 hour ago',
    readTime: '5 min read',
    viewCount: 14200,
    trendingScore: 94,
    author: {
      id: 'auth-julian-foster',
      name: 'Julian Foster',
      slug: 'julian-foster',
      role: 'Technology & AI Policy Correspondent',
      bio: 'Julian Foster covers frontier artificial intelligence research, enterprise infrastructure, and emerging European computing governance.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    },
    heroImage: {
      url: ASSET_IMAGES.techSemiconductor,
      alt: 'Cleanroom engineer testing advanced algorithmic processing hardware',
      caption: 'Compute cluster infrastructure dedicated to formal verification runs in San Francisco.',
      credit: 'OpenAI Press Materials',
    },
    quickSummary: [
      'New protocol uses dual-layer critic agents to mathematically verify code transitions before merge actions.',
      'Benchmark results show a 74% decline in runaway infinite loops during multi-hour programming tasks.',
      'Enterprise API endpoints will begin rolling out to select partners in early October.',
      'Pricing model shifts from raw token counting toward completed verification proofs.',
    ],
    facts: [
      { id: 'f-oa-1', label: 'Organization', value: 'OpenAI', order: 1 },
      { id: 'f-oa-2', label: 'Technology', value: 'State Verification Protocol (SVP)', order: 2 },
      { id: 'f-oa-3', label: 'Primary Target', value: 'Enterprise autonomous software engineering', order: 3 },
      { id: 'f-oa-4', label: 'Key Innovation', value: 'Asymmetric critic checkpoints & state hashing', order: 4 },
      { id: 'f-oa-5', label: 'Availability', value: 'North America and EU enterprise preview in October', order: 5 },
    ],
    updates: [
      {
        id: 'up-oa-1',
        timestamp: '2026-09-26T05:15:00Z',
        time: '1:45 PM',
        title: 'API documentation published',
        body: 'Developer specification docs and Python verification client packages made available in technical preview.',
        text: 'Developer specification docs and Python verification client packages made available in technical preview.',
        sourceId: 'src-oa-1',
        source: 'OpenAI Developer Portal',
        isMajor: false,
      },
      {
        id: 'up-oa-2',
        timestamp: '2026-09-26T04:30:00Z',
        time: '12:00 PM',
        title: 'Official briefing livestream',
        body: 'Executive leadership demonstrated live multi-hour refactor of a 400,000-line legacy C++ code repository without hallucinated dependencies.',
        text: 'Executive leadership demonstrated live multi-hour refactor of a 400,000-line legacy C++ code repository without hallucinated dependencies.',
        sourceId: 'src-oa-2',
        source: 'Company Briefing',
        isMajor: true,
      },
    ],
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'As artificial intelligence developers race to transition from conversational chatbots to autonomous coding agents capable of working uninterrupted for days, the chief operational risk has not been lack of capability, but compounding error propagation. Today in San Francisco, OpenAI unveiled its formal technical architecture to address that fragility.',
      },
      {
        type: 'paragraph',
        text: 'The architecture, known internally as the State Verification Protocol, interposes an asymmetric critic model between each agent action and the underlying repository. Rather than trusting sequential token generation, the system creates immutable cryptographic state hashes after each code transform.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Asymmetric Critic Checkpoints',
      },
      {
        type: 'paragraph',
        text: 'In standard agent frameworks, when an autonomous system encounters a failed test, it frequently enters an escalating cycle of speculative patches—often deleting working test suites or manufacturing phantom mocks. Under the new protocol, a separate adversarial critic model with isolated context windows must validate each diff against invariant project specifications.',
      },
      {
        type: 'quote',
        quote: 'Autonomous execution without formal verification is an illusion of velocity. The real breakthrough is providing agents with a reliable sense of when they have taken a wrong turn.',
        attribution: 'Elena Rostova',
        role: 'Head of Alignment Verification',
      },
      {
        type: 'paragraph',
        text: 'In benchmark evaluations across open-source repositories spanning Python, Rust, and TypeScript, the verification system reduced repository corruption events from 31 percent to less than 2.4 percent over four-hour continuous runs.',
      },
      {
        type: 'heading',
        level: 3,
        text: 'Enterprise Deployment & Pricing Shift',
      },
      {
        type: 'list',
        items: [
          'Initial rollout targets enterprise tier organizations with SOC 2 compliance mandates',
          'Integration with GitHub Actions, GitLab CI, and proprietary internal codebases',
          'Billing incorporates a guaranteed state proof fee alongside standard inference tokens',
          'Support for on-premise verification nodes for regulated financial and defense clients',
        ],
      },
      {
        type: 'paragraph',
        text: 'Industry watchers indicate that competitor labs in London and Seattle are developing parallel verification standards, suggesting that formal mathematical proof checking will become the default industry standard for agentic software workflows over the next year.',
      },
    ],
    sources: [
      {
        id: 'src-oa-1',
        name: 'OpenAI Engineering Disclosure — State Verification Protocol',
        url: 'https://openai.com/research',
        sourceType: 'official',
        publishedAt: '2026-09-26T04:30:00Z',
        isPrimary: true,
        time: 'Sept 26, 2026',
        note: 'Official technical specification document',
      },
      {
        id: 'src-oa-2',
        name: 'Stanford Software Verification Group Benchmark Report',
        url: 'https://stanford.edu',
        sourceType: 'publisher',
        publishedAt: '2026-09-26T04:00:00Z',
        isPrimary: false,
        time: 'Sept 26, 2026',
        note: 'Independent comparative analysis across 1,000 public GitHub test suites',
      },
    ],
    relatedStoryIds: [
      'story-hero',
      'tsmc-1-6nm-ramp-up',
    ],
    relatedSlugs: [
      'quantum-coherence-breakthrough-cryogenic-milestone',
      'tsmc-1-6nm-ramp-up',
    ],
  },

  // Alias for slug compatibility
  {
    id: 'ai-story-alias',
    slug: 'openai-verification-protocol',
    title: 'OpenAI Outlines Multi-Agent Verification Protocol for Autonomous Software Workflows',
    dek: 'The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.',
    summary: 'The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.',
    category: 'AI',
    subcategory: 'Frontier Models',
    status: 'Announcement',
    lifecycleStatus: 'published',
    publishedAt: '2026-09-26T04:30:00Z',
    updatedAt: '2026-09-26T05:15:00Z',
    timeDisplay: 'Updated 1 hour ago',
    readTime: '5 min read',
    viewCount: 13900,
    trendingScore: 92,
    author: {
      id: 'auth-julian-foster',
      name: 'Julian Foster',
      role: 'Technology & AI Policy Correspondent',
    },
    heroImage: {
      url: ASSET_IMAGES.techSemiconductor,
      alt: 'Cleanroom engineer testing advanced algorithmic processing hardware',
      caption: 'Compute cluster infrastructure dedicated to formal verification runs in San Francisco.',
      credit: 'OpenAI Press Materials',
    },
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'As artificial intelligence developers race to transition from conversational chatbots to autonomous coding agents capable of working uninterrupted for days, the chief operational risk has not been lack of capability, but compounding error propagation.',
      },
      {
        type: 'paragraph',
        text: 'The architecture, known internally as the State Verification Protocol, interposes an asymmetric critic model between each agent action and the underlying repository.',
      },
    ],
    sources: [
      {
        id: 'src-oa-alias-1',
        name: 'OpenAI Engineering Disclosure',
        url: 'https://openai.com/research',
        sourceType: 'official',
        time: 'Sept 26, 2026',
      },
    ],
  },

  // =========================================================================
  // 3. TECHNOLOGY — 1.6nm Silicon High-NA Ramp
  // =========================================================================
  {
    id: 'tech-story-1',
    slug: 'tsmc-1-6nm-ramp-up',
    title: 'TSMC Confirms Commercial Silicon Ramp-Up for 1.6nm High-NA Manufacturing Nodes',
    dek: 'Backside power delivery and advanced extreme ultraviolet lithography will enter pilot production ahead of initial 2027 server allocations.',
    summary: 'Backside power delivery and advanced extreme ultraviolet lithography will enter pilot production ahead of initial 2027 server allocations.',
    category: 'Technology',
    subcategory: 'Semiconductors',
    status: 'Updated',
    lifecycleStatus: 'published',
    publishedAt: '2026-09-26T04:15:00Z',
    updatedAt: '2026-09-26T05:30:00Z',
    timeDisplay: 'Updated 2 hours ago',
    readTime: '5 min read',
    viewCount: 11200,
    trendingScore: 89,
    author: {
      id: 'auth-sarah-lin',
      name: 'Sarah Lin',
      slug: 'sarah-lin',
      role: 'Senior Semiconductor & Hardware Reporter',
      bio: 'Sarah Lin covers global semiconductor supply chains, lithography physics, and hardware infrastructure from Taipei and Silicon Valley.',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    },
    heroImage: {
      url: ASSET_IMAGES.techSemiconductor,
      alt: 'Silicon wafer with microcircuit patterns under cleanroom yellow lighting',
      caption: 'Inspection of patterned 300mm wafers following high-numerical-aperture ultraviolet deposition.',
      credit: 'FabTech Global / The Meridian',
    },
    quickSummary: [
      'TSMC validated functional defect density on initial 1.6nm test chips utilizing backside power rails.',
      'High-NA EUV scanners from ASML achieved 8nm pitch resolution without double-patterning stitches.',
      'Pilot risk production commences at Fab 20 in Hsinchu during the third quarter of 2027.',
      'Initial allocation is fully booked by high-performance computing and enterprise AI silicon designers.',
    ],
    facts: [
      { id: 'f-ts-1', label: 'Foundry', value: 'Taiwan Semiconductor Manufacturing Co. (TSMC)', order: 1 },
      { id: 'f-ts-2', label: 'Process Node', value: 'A16 (1.6nm class with Super Power Rail)', order: 2 },
      { id: 'f-ts-3', label: 'Lithography Tool', value: 'High-NA EUV (0.55 Numerical Aperture)', order: 3 },
      { id: 'f-ts-4', label: 'Density Gain', value: '+18% logic density over 2nm N2P', order: 4 },
      { id: 'f-ts-5', label: 'Volume Production', value: 'First half 2027', order: 5 },
    ],
    updates: [
      {
        id: 'up-ts-1',
        timestamp: '2026-09-26T05:30:00Z',
        time: '11:30 AM',
        title: 'Executive confirmation in Hsinchu',
        body: 'Co-CEO confirmed equipment installation milestones during the company annual technology symposium keynote.',
        text: 'Co-CEO confirmed equipment installation milestones during the company annual technology symposium keynote.',
        source: 'TSMC Investor Relations',
      },
    ],
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'The international semiconductor roadmap reached a decisive technical threshold today as Taiwan Semiconductor Manufacturing Company announced that functional silicon yields on its 1.6-nanometer A16 process node have met baseline risk-production criteria.',
      },
      {
        type: 'paragraph',
        text: 'The milestone relies on two interrelated engineering transformations: the commercial integration of ASML High-NA extreme ultraviolet lithography systems and a complete architectural inversion of on-chip power delivery known as backside power routing.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Backside Power Delivery Solves the IR Drop Dilemma',
      },
      {
        type: 'paragraph',
        text: 'For decades, both signal wires and power delivery lines shared the top metallization layers of the silicon die. Backside power places thick, low-resistance power rails beneath the active transistor layer, dedicating top-side wiring purely to high-speed data routing.',
      },
      {
        type: 'quote',
        quote: 'A16 is not just a lithographic reduction; it is an entirely new spatial layout of the integrated circuit. It buys our architects five years of thermal breathing room.',
        attribution: 'C.C. Wei',
        role: 'Chief Executive Officer, TSMC',
      },
    ],
    sources: [
      {
        id: 'src-ts-1',
        name: 'TSMC Global Technology Symposium Transcript',
        url: 'https://tsmc.com',
        sourceType: 'official',
        time: 'Sept 26, 2026',
      },
      {
        id: 'src-ts-2',
        name: 'ASML Q3 Tool Delivery & Calibration Bulletin',
        url: 'https://asml.com',
        sourceType: 'publisher',
        time: 'Sept 25, 2026',
      },
    ],
    relatedStoryIds: ['story-hero', 'ai-story-product'],
    relatedSlugs: ['quantum-coherence-breakthrough-cryogenic-milestone', 'openai-new-product'],
  },

  // =========================================================================
  // 4. GAMING — Hardware Dynamic Radiance (Living Story)
  // =========================================================================
  {
    id: 'gaming-story-gta',
    slug: 'gta-vi-update',
    title: 'Interactive Physics & Global Illumination Engines Shift Toward Hardware Dynamic Radiance',
    dek: 'Leading game development studios are systematically phasing out static lightmap baking in favor of real-time photon field streaming on next-generation hardware.',
    summary: 'Leading game development studios are systematically phasing out static lightmap baking in favor of real-time photon field streaming on next-generation hardware.',
    category: 'Gaming',
    subcategory: 'Engine Tech',
    status: 'Developing',
    lifecycleStatus: 'developing',
    publishedAt: '2026-09-26T03:00:00Z',
    updatedAt: '2026-09-26T05:00:00Z',
    timeDisplay: 'Updated 3 hours ago',
    readTime: '4 min read',
    viewCount: 16800,
    trendingScore: 96,
    author: {
      id: 'auth-marcus-bell',
      name: 'Marcus Bell',
      slug: 'marcus-bell',
      role: 'Gaming & Interactive Entertainment Editor',
      bio: 'Marcus Bell covers video game engines, interactive physics, graphics rendering APIs, and the economics of global digital entertainment.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    },
    heroImage: {
      url: ASSET_IMAGES.gamingVista,
      alt: 'Vast cinematic fantasy landscape with mountains and sci-fi ruins in mist',
      caption: 'Dynamic global illumination running in real time with dynamic weather shifts and volumetric fog.',
      credit: 'The Meridian / Interactive Media Archive',
    },
    quickSummary: [
      'Major studio production pipelines have eliminated hundreds of hours of pre-computed light baking.',
      'Unified neural radiance streaming allows dynamic weather and time of day with zero storage overhead.',
      'Console hardware makers are testing bespoke decompression silicon to support 120 FPS ray streaming.',
      'Developers report production cycles shortened by up to fourteen percent in world-building phases.',
    ],
    facts: [
      { id: 'f-gm-1', label: 'Industry Sector', value: 'AAA Game Engine Development', order: 1 },
      { id: 'f-gm-2', label: 'Core Technology', value: 'Hardware-Accelerated Neural Radiance Caching', order: 2 },
      { id: 'f-gm-3', label: 'Target Frame Budget', value: '16.6ms (60 FPS) and 8.3ms (120 FPS)', order: 3 },
      { id: 'f-gm-4', label: 'Storage Reduction', value: '45 GB reduction per title by removing static baked lightmaps', order: 4 },
    ],
    updates: [
      {
        id: 'up-gm-1',
        timestamp: '2026-09-26T05:00:00Z',
        time: '10:45 AM',
        title: 'Developer SDK distribution begins',
        body: 'Next-generation graphics toolkits delivered to verified studio partners across North America and Europe.',
        text: 'Next-generation graphics toolkits delivered to verified studio partners across North America and Europe.',
        source: 'Developer Network Bulletin',
        isMajor: true,
      },
    ],
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'For more than two decades, the creation of sprawling virtual worlds required a quiet compromise: lighting was treated as a static texture painted onto geometry during long overnight compute runs known as baking. Today, that entire paradigm is collapsing as real-time photon caches become fast enough to run on consumer hardware.',
      },
      {
        type: 'paragraph',
        text: 'Technical directors from five premier game development studios confirmed to The Meridian that upcoming flagship releases are dropping pre-baked lightmaps entirely. The change allows artists to modify geometry, light sources, and atmospheric conditions instantly without waiting hours for level recompilation.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Instantaneous Weather and Destructible Environments',
      },
      {
        type: 'paragraph',
        text: 'When every photon is calculated dynamically or interpolated through neural radiance caches, game worlds gain unprecedented physical coherence. If a player detonates a wall, sunlight instantly pours through the breach, bouncing multiple times off interior surfaces with physically accurate diffuse color bleeding.',
      },
      {
        type: 'quote',
        quote: 'We spent twenty years faking bounce light with artistic tricks and invisible ambient probes. Now the engine does what light actually does in nature.',
        attribution: 'Taro Kishimoto',
        role: 'Chief Technical Director, Vanguard Interactive',
      },
    ],
    sources: [
      {
        id: 'src-gm-1',
        name: 'Game Developers Conference Technical Proceedings',
        url: 'https://gdconf.com',
        sourceType: 'publisher',
        time: 'Sept 25, 2026',
        isPrimary: true,
      },
      {
        id: 'src-gm-2',
        name: 'Digital Foundry Architecture Analysis',
        url: 'https://eurogamer.net',
        sourceType: 'publisher',
        time: 'Sept 26, 2026',
      },
    ],
    relatedStoryIds: ['sony-portable-tracking', 'open-world-rendering-neural-radiance-breakthrough'],
    relatedSlugs: ['sony-portable-tracking', 'open-world-rendering-neural-radiance-breakthrough'],
  },

  // =========================================================================
  // 5. SPACE — Lunar Exploration Tests
  // =========================================================================
  {
    id: 'space-story-nasa',
    slug: 'nasa-mission-update',
    title: 'NASA Artemis IV Crew Modules Clear Critical Deep-Space Acoustic Stress Tests',
    dek: 'Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.',
    summary: 'Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.',
    category: 'Space',
    subcategory: 'Lunar Exploration',
    status: 'Updated',
    lifecycleStatus: 'published',
    publishedAt: '2026-09-26T02:30:00Z',
    updatedAt: '2026-09-26T04:45:00Z',
    timeDisplay: 'Updated 4 hours ago',
    readTime: '4 min read',
    viewCount: 9800,
    trendingScore: 84,
    author: {
      id: 'auth-alina-thorne',
      name: 'Alina Thorne',
      slug: 'alina-thorne',
      role: 'Senior Aerospace & Astrophysics Correspondent',
      bio: 'Alina Thorne covers planetary science, deep-space propulsion, orbital logistics, and international lunar treaties from Cape Canaveral.',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    },
    heroImage: {
      url: ASSET_IMAGES.spaceRocket,
      alt: 'Orbital space rocket ignition flame reflecting over ocean waters at twilight',
      caption: 'Static acoustic simulation chamber at Kennedy Space Center during the Artemis IV clearance sequence.',
      credit: 'NASA / KSC Imagery',
    },
    quickSummary: [
      'Acoustic testing simulated maximum dynamic pressure launch loads up to 142.8 decibels.',
      'Telemetry recorded zero anomalous structural delaminations across composite pressure hulls.',
      'The crew life support systems maintained nominal internal atmospheric pressure throughout the vibration run.',
      'NASA remains on schedule for the first crewed docking with the Lunar Gateway station in 2028.',
    ],
    facts: [
      { id: 'f-sp-1', label: 'Agency', value: 'NASA / Artemis Program Directorate', order: 1 },
      { id: 'f-sp-2', label: 'Spacecraft', value: 'Orion Spacecraft Crew Module (Artemis IV)', order: 2 },
      { id: 'f-sp-3', label: 'Test Facility', value: 'Operations and Checkout Building, Kennedy Space Center', order: 3 },
      { id: 'f-sp-4', label: 'Peak Sound Pressure', value: '142.8 dB Overall Sound Pressure Level (OASPL)', order: 4 },
      { id: 'f-sp-5', label: 'Target Launch Window', value: 'September 2028', order: 5 },
    ],
    updates: [
      {
        id: 'up-sp-1',
        timestamp: '2026-09-26T04:45:00Z',
        time: '9:15 AM',
        title: 'Sensor telemetry verified',
        body: 'Structural vibration sensors confirmed all six hundred telemetry channels reported within predicted analytical tolerance bounds.',
        text: 'Structural vibration sensors confirmed all six hundred telemetry channels reported within predicted analytical tolerance bounds.',
        source: 'NASA Engineering Directorate',
        isMajor: false,
      },
    ],
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'Inside the high-bay testing chambers of Kennedy Space Center in Florida, engineers have subjected the Artemis IV crew module to one of the most violent physical environments on Earth: the thunderous acoustic reverberation of a heavy-lift rocket ignition.',
      },
      {
        type: 'paragraph',
        text: 'The tests subjected the spacecraft pressure vessel to sound pressure levels exceeding 142 decibels—loud enough to instantly tear apart unreinforced mechanical joints. According to official test logs released this morning, the capsule passed all structural inspections with zero defects.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Gateway Station Rendezvous',
      },
      {
        type: 'paragraph',
        text: 'Artemis IV represents a pivotal evolution in NASA\'s deep space architecture. Unlike earlier lunar landing sorties, Artemis IV will deliver the International Habitation module (I-Hab) to the Lunar Gateway station in halo orbit around the Moon.',
      },
    ],
    sources: [
      {
        id: 'src-sp-1',
        name: 'NASA Kennedy Space Center Press Release',
        url: 'https://nasa.gov/artemis',
        sourceType: 'official',
        time: 'Sept 26, 2026',
        isPrimary: true,
      },
      {
        id: 'src-sp-2',
        name: 'ESA Lunar Gateway Partnership Briefing',
        url: 'https://esa.int',
        sourceType: 'official',
        time: 'Sept 25, 2026',
      },
    ],
  },

  // Alias for space clearance
  {
    id: 'space-story-clearance',
    slug: 'nasa-artemis-iv-clearance',
    title: 'NASA Artemis IV Crew Modules Clear Critical Deep-Space Acoustic Stress Tests',
    dek: 'Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.',
    summary: 'Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.',
    category: 'Space',
    subcategory: 'Lunar Exploration',
    status: 'Updated',
    lifecycleStatus: 'published',
    publishedAt: '2026-09-26T02:30:00Z',
    updatedAt: '2026-09-26T04:45:00Z',
    timeDisplay: 'Updated 4 hours ago',
    readTime: '4 min read',
    author: {
      name: 'Alina Thorne',
      role: 'Senior Aerospace & Astrophysics Correspondent',
    },
    heroImage: {
      url: ASSET_IMAGES.spaceRocket,
      alt: 'Orbital space rocket ignition flame',
    },
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'Inside the high-bay testing chambers of Kennedy Space Center in Florida, engineers have subjected the Artemis IV crew module to simulated launch acoustic loads.',
      },
    ],
  },

  // =========================================================================
  // 6. SCIENCE — Particle Physics
  // =========================================================================
  {
    id: 'sci-cern',
    slug: 'cern-charm-quark-asymmetry',
    title: 'CERN Physicists Detect Anomalous Charm Quark Asymmetry in Run 3 Dataset',
    dek: 'Measurements from the LHCb detector show a subtle deviation from Standard Model decay predictions, prompting independent validation runs.',
    summary: 'Measurements from the LHCb detector show a subtle deviation from Standard Model decay predictions, prompting independent validation runs.',
    category: 'Science',
    subcategory: 'Particle Physics',
    status: 'Analysis',
    lifecycleStatus: 'published',
    publishedAt: '2026-09-26T01:30:00Z',
    updatedAt: '2026-09-26T04:00:00Z',
    timeDisplay: 'Updated 5 hours ago',
    readTime: '6 min read',
    viewCount: 12500,
    trendingScore: 88,
    author: {
      id: 'auth-helen-vance',
      name: 'Dr. Helen Vance',
      slug: 'helen-vance',
      role: 'Senior Science Editor',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
    heroImage: {
      url: ASSET_IMAGES.heroQuantum,
      alt: 'Particle detector spectrometer beamline components',
      caption: 'The LHCb spectrometer cavern located 100 meters beneath the Franco-Swiss border.',
      credit: 'CERN / Maximilien Brice',
    },
    quickSummary: [
      'The LHCb collaboration analyzed over 60 billion charm meson decay events from Run 3 collisions.',
      'Direct CP violation in D0 meson decays deviated from Standard Model theory by 3.4 standard deviations.',
      'If confirmed, the discrepancy points toward previously unobserved intermediate gauge bosons.',
      'Secondary analysis from the Belle II experiment in Japan is scheduled to cross-examine findings in November.',
    ],
    facts: [
      { id: 'f-cern-1', label: 'Laboratory', value: 'CERN (European Organization for Nuclear Research)', order: 1 },
      { id: 'f-cern-2', label: 'Experiment', value: 'LHCb (Large Hadron Collider beauty)', order: 2 },
      { id: 'f-cern-3', label: 'Observed Phenomenon', value: 'Charge-Parity (CP) Asymmetry in D0 Mesons', order: 3 },
      { id: 'f-cern-4', label: 'Statistical Significance', value: '3.4 sigma (evidence threshold)', order: 4 },
      { id: 'f-cern-5', label: 'Collision Energy', value: '13.6 TeV center-of-mass', order: 5 },
    ],
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'One of the most persistent enigmas in modern cosmology is why the universe consists almost entirely of matter rather than equal parts matter and antimatter. Today in Geneva, physicists working at the world’s largest particle accelerator reported a rare empirical clue that could help unravel the asymmetry.',
      },
      {
        type: 'paragraph',
        text: 'Using high-luminosity collision records gathered throughout 2025 and 2026, the LHCb collaboration measured the decay rates of neutral charm mesons into pairs of charged pions and kaons.',
      },
      {
        type: 'quote',
        quote: 'While the Standard Model permits subtle CP violation, the magnitude we observe is noticeably larger than conventional perturbative QCD calculations suggest.',
        attribution: 'Dr. Vincenzo Canale',
        role: 'LHCb Physics Coordinator',
      },
    ],
    sources: [
      {
        id: 'src-cern-1',
        name: 'CERN LHCb Collaboration Pre-print Server',
        url: 'https://arxiv.org',
        sourceType: 'publisher',
        time: 'Sept 26, 2026',
        isPrimary: true,
      },
    ],
  },

  // =========================================================================
  // 7. BUSINESS — Central Banking & Macroeconomics
  // =========================================================================
  {
    id: 'biz-ecb',
    slug: 'ecb-rate-calibration',
    title: 'European Central Bank Signals Cautious Rate Calibration Amid Energy Rebound',
    dek: 'Governing Council members signal a data-contingent approach as euro-area headline inflation stabilizes near the two-percent target while industrial activity remains mixed.',
    summary: 'Governing Council members signal a data-contingent approach as euro-area headline inflation stabilizes near the two-percent target while industrial activity remains mixed.',
    category: 'Business',
    subcategory: 'Central Banking',
    status: 'Analysis',
    lifecycleStatus: 'published',
    publishedAt: '2026-09-26T03:30:00Z',
    updatedAt: '2026-09-26T04:20:00Z',
    timeDisplay: 'Updated 4 hours ago',
    readTime: '5 min read',
    viewCount: 10400,
    trendingScore: 82,
    author: {
      id: 'auth-victoria-sterling',
      name: 'Victoria Sterling',
      slug: 'victoria-sterling',
      role: 'Chief Economics Correspondent',
      bio: 'Victoria Sterling reports on monetary policy, sovereign debt markets, foreign exchange dynamics, and global macroeconomic policy from Frankfurt and London.',
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=256&q=80',
    },
    heroImage: {
      url: ASSET_IMAGES.worldSummit,
      alt: 'Financial district skyscrapers and European Central Bank plaza',
      caption: 'The European Central Bank headquarters in Frankfurt am Main.',
      credit: 'The Meridian / Financial Press Bureau',
    },
    quickSummary: [
      'The ECB benchmark deposit facility rate remains steady at 2.75 percent following policy deliberations.',
      'Services sector inflation fell to 2.4 percent, while manufacturing energy costs ticked slightly higher.',
      'Sovereign yield spreads between German Bunds and Italian BTPs held narrow at 118 basis points.',
      'Market pricing implies a 65 percent probability of a 25 basis point reduction at the December meeting.',
    ],
    facts: [
      { id: 'f-ecb-1', label: 'Institution', value: 'European Central Bank (ECB)', order: 1 },
      { id: 'f-ecb-2', label: 'Deposit Facility Rate', value: '2.75%', order: 2 },
      { id: 'f-ecb-3', label: 'Headline Euro Inflation', value: '2.1% year-on-year', order: 3 },
      { id: 'f-ecb-4', label: 'Next Policy Decision', value: 'October 29, 2026', order: 4 },
      { id: 'f-ecb-5', label: 'Sovereign Spread (Bund/BTP)', value: '118 bps', order: 5 },
    ],
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'In their final formal deliberations before the autumn fiscal season, policymakers at the European Central Bank held key interest rates steady today, balancing relief over cooling services inflation against lingering concerns over volatile commercial energy imports.',
      },
      {
        type: 'paragraph',
        text: 'Addressing reporters in Frankfurt, central bank officials underscored that while restrictive monetary policy has successfully re-anchored medium-term inflation expectations, monetary easing will proceed only as hard data confirms wage deceleration across Germany, France, and Italy.',
      },
    ],
    sources: [
      {
        id: 'src-ecb-1',
        name: 'ECB Monetary Policy Statement',
        url: 'https://ecb.europa.eu',
        sourceType: 'official',
        time: 'Sept 26, 2026',
        isPrimary: true,
      },
    ],
  },

  // =========================================================================
  // 8. WORLD — Maritime Accords & Trade Corridors
  // =========================================================================
  {
    id: 'world-maritime',
    slug: 'transatlantic-trade-corridor-maritime-accord',
    title: 'G7 Delegations Reach Preliminary Maritime Framework on Low-Emission Shipping Corridors',
    dek: 'The accord sets enforceable sulfur and synthetic methanol targets for North Atlantic cargo lanes commencing in the second quarter of 2027.',
    summary: 'The accord sets enforceable sulfur and synthetic methanol targets for North Atlantic cargo lanes commencing in the second quarter of 2027.',
    category: 'World',
    subcategory: 'Diplomacy & Treaties',
    status: 'Announcement',
    lifecycleStatus: 'published',
    publishedAt: '2026-09-26T01:15:00Z',
    updatedAt: '2026-09-26T03:30:00Z',
    timeDisplay: 'Updated 5 hours ago',
    readTime: '6 min read',
    viewCount: 8900,
    trendingScore: 78,
    author: {
      id: 'auth-claire-delacroix',
      name: 'Claire Delacroix',
      slug: 'claire-delacroix',
      role: 'European Affairs & Trade Editor',
      bio: 'Claire Delacroix reports on European Union policy, transatlantic trade, multilateral treaties, and international climate summits from Brussels.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    },
    heroImage: {
      url: ASSET_IMAGES.worldSummit,
      alt: 'Diplomatic summit hall with leaders seated at circular table',
      caption: 'Trade ministers finalizing environmental compliance timelines in Geneva.',
      credit: 'Press Syndicate / The Meridian',
    },
    quickSummary: [
      'The agreement binds container vessels operating between Rotterdam, Hamburg, New York, and Halifax.',
      'Bunkering infrastructure for green e-methanol will receive coordinated public co-financing.',
      'Enforcement begins in Q2 2027 with progressive fee penalties for non-compliant merchant fleets.',
      'Maritime transport accounts for approximately 2.9% of total anthropogenic emissions.',
    ],
    facts: [
      { id: 'f-wm-1', label: 'Accord Name', value: 'Transatlantic Green Maritime Corridor Initiative', order: 1 },
      { id: 'f-wm-2', label: 'Participating Ports', value: 'Rotterdam, Antwerp, Hamburg, New York/NJ, Halifax', order: 2 },
      { id: 'f-wm-3', label: 'Effective Date', value: 'May 1, 2027', order: 3 },
      { id: 'f-wm-4', label: 'Target Fuels', value: 'Bio-e-methanol, green hydrogen, and low-sulfur e-ammonia', order: 4 },
      { id: 'f-wm-5', label: 'Oversight Agency', value: 'Joint Atlantic Maritime Environmental Commission', order: 5 },
    ],
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'After eleven days of contentious negotiations in Geneva, trade and environmental ministers from the Group of Seven nations concluded an unprecedented multilateral agreement establishing legally binding emissions standards for commercial shipping corridors across the North Atlantic.',
      },
      {
        type: 'paragraph',
        text: 'Under the agreement, cargo carriers operating on designated routes between western European ports and the eastern seaboard of North America will face tiered port access fees unless they transition twenty percent of their propulsion power to certified synthetic zero-carbon fuels by 2028.',
      },
    ],
    sources: [
      {
        id: 'src-wm-1',
        name: 'Geneva G7 Trade Ministerial Communiqué',
        url: 'https://g7trade.org',
        sourceType: 'official',
        time: 'Sept 26, 2026',
        isPrimary: true,
      },
    ],
  },
];
