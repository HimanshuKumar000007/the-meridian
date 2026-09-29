/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsStory, ArticleBlock } from '../types/story';
import { ASSET_IMAGES } from './assets';
import { MOCK_STORIES, type Story } from './mockNews';

/**
 * Curated, high-fidelity mock stories across every key editorial category.
 * Fully structured for the universal story page architecture.
 */
export const DETAILED_STORIES: NewsStory[] = [
  // =========================================================================
  // 1. AI & COMPUTING — FEATURED HERO / LEAD INVESTIGATION
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
    publishedAt: '2026-09-26T05:30:00Z',
    updatedAt: '2026-09-26T06:12:00Z',
    timeDisplay: 'Updated 25m ago',
    readTime: '6 min read',
    featured: true,
    author: {
      name: 'Dr. Helen Vance',
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
      { label: 'Consortium', value: 'Munich-Grenoble Quantum Labs & Stanford Applied Physics' },
      { label: 'Operating Temp', value: '12 millikelvin (-273.138°C)' },
      { label: 'Coherence Duration', value: '184 minutes continuous' },
      { label: 'Error Suppression', value: '99.94% logical fidelity' },
      { label: 'Commercial Target', value: 'H2 2027 enterprise pilot systems' },
    ],
    updates: [
      {
        time: '12:42 PM',
        timestamp: '2026-09-26T06:12:00Z',
        title: 'Peer review verification finalized',
        text: 'Physical Review Applied published the complete 48-page empirical telemetry dataset and sensor calibration benchmarks.',
        source: 'Physical Review Applied',
      },
      {
        time: '11:15 AM',
        timestamp: '2026-09-26T05:45:00Z',
        title: 'Independent laboratory validation',
        text: 'The Swiss Federal Institute replicated phase coherence metrics under secondary cryogenic chamber parameters.',
        source: 'ETH Zurich Quantum Briefing',
      },
      {
        time: '09:30 AM',
        timestamp: '2026-09-26T05:30:00Z',
        title: 'Consortium announcement',
        text: 'Joint statement issued simultaneously in Geneva, Paris, and Palo Alto detailing the thermal isolation breakthrough.',
        source: 'Joint Consortium Desk',
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
        name: 'Physical Review Applied — Primary Telemetry',
        url: 'https://journals.aps.org',
        time: 'Sept 26, 2026',
        note: 'Complete calibration logs and syndrome extraction records',
      },
      {
        name: 'CNRS Cryogenic Instrumentation Laboratory',
        url: 'https://cnrs.fr',
        time: 'Sept 26, 2026',
        note: 'Photodetector dissipation and thermal budget whitepaper',
      },
      {
        name: 'Stanford Center for Quantum Architectures',
        url: 'https://stanford.edu',
        time: 'Sept 26, 2026',
        note: 'Optical waveguide attenuation analysis',
      },
    ],
    corrections: [
      {
        date: 'September 26, 2026 at 06:12 AM UTC',
        text: 'Updated with confirmed syndrome measurement totals from the Paris data repository. Earlier draft noted 3.8 million cycles.',
      },
    ],
    relatedSlugs: [
      'tsmc-1-6nm-ramp-up',
      'openai-verification-protocol',
      'cern-charm-quark-asymmetry',
    ],
  },

  // =========================================================================
  // 2. AI — MULTI-AGENT VERIFICATION (Prompt example: /story/openai-new-product)
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
    publishedAt: '2026-09-26T04:30:00Z',
    updatedAt: '2026-09-26T05:15:00Z',
    timeDisplay: 'Updated 1 hour ago',
    readTime: '5 min read',
    author: {
      name: 'Julian Foster',
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
      { label: 'Organization', value: 'OpenAI' },
      { label: 'Technology', value: 'State Verification Protocol (SVP)' },
      { label: 'Primary Target', value: 'Enterprise autonomous software engineering' },
      { label: 'Key Innovation', value: 'Asymmetric critic checkpoints & state hashing' },
      { label: 'Availability', value: 'North America and EU enterprise preview in October' },
    ],
    updates: [
      {
        time: '1:45 PM',
        timestamp: '2026-09-26T05:15:00Z',
        title: 'API documentation published',
        text: 'Developer specification docs and Python verification client packages made available in technical preview.',
        source: 'OpenAI Developer Portal',
      },
      {
        time: '12:00 PM',
        timestamp: '2026-09-26T04:30:00Z',
        title: 'Official briefing livestream',
        text: 'Executive leadership demonstrated live multi-hour refactor of a 400,000-line legacy C++ code repository without hallucinated dependencies.',
        source: 'Company Briefing',
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
        name: 'OpenAI Engineering Disclosure — State Verification Protocol',
        url: 'https://openai.com/research',
        time: 'Sept 26, 2026',
        note: 'Official technical specification document',
      },
      {
        name: 'Stanford Software Verification Group Benchmark Report',
        url: 'https://stanford.edu',
        time: 'Sept 26, 2026',
        note: 'Independent comparative analysis across 1,000 public GitHub test suites',
      },
    ],
    relatedSlugs: [
      'quantum-coherence-breakthrough-cryogenic-milestone',
      'tsmc-1-6nm-ramp-up',
      'semiconductor-lithography-power-grid-integration',
    ],
  },

  // Alias for prompt example
  {
    id: 'ai-story-alias',
    slug: 'openai-verification-protocol',
    title: 'OpenAI Outlines Multi-Agent Verification Protocol for Autonomous Software Workflows',
    dek: 'The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.',
    summary: 'The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.',
    category: 'AI',
    subcategory: 'Frontier Models',
    status: 'Announcement',
    publishedAt: '2026-09-26T04:30:00Z',
    updatedAt: '2026-09-26T05:15:00Z',
    timeDisplay: 'Updated 1 hour ago',
    readTime: '5 min read',
    author: {
      name: 'Julian Foster',
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
      { label: 'Organization', value: 'OpenAI' },
      { label: 'Technology', value: 'State Verification Protocol (SVP)' },
      { label: 'Primary Target', value: 'Enterprise autonomous software engineering' },
      { label: 'Key Innovation', value: 'Asymmetric critic checkpoints & state hashing' },
      { label: 'Availability', value: 'North America and EU enterprise preview in October' },
    ],
    updates: [
      {
        time: '1:45 PM',
        timestamp: '2026-09-26T05:15:00Z',
        title: 'API documentation published',
        text: 'Developer specification docs and Python verification client packages made available in technical preview.',
        source: 'OpenAI Developer Portal',
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
        type: 'quote',
        quote: 'Autonomous execution without formal verification is an illusion of velocity. The real breakthrough is providing agents with a reliable sense of when they have taken a wrong turn.',
        attribution: 'Elena Rostova',
        role: 'Head of Alignment Verification',
      },
      {
        type: 'paragraph',
        text: 'Industry watchers indicate that competitor labs in London and Seattle are developing parallel verification standards, suggesting that formal mathematical proof checking will become the default industry standard for agentic software workflows over the next year.',
      },
    ],
    sources: [
      {
        name: 'OpenAI Engineering Disclosure — State Verification Protocol',
        url: 'https://openai.com/research',
        time: 'Sept 26, 2026',
      },
    ],
    relatedSlugs: [
      'quantum-coherence-breakthrough-cryogenic-milestone',
      'tsmc-1-6nm-ramp-up',
    ],
  },

  // =========================================================================
  // 3. TECHNOLOGY — SEMICONDUCTORS (1.6nm High-NA Node)
  // =========================================================================
  {
    id: 'tech-story-1',
    slug: 'tsmc-1-6nm-ramp-up',
    title: 'TSMC Confirms Commercial Silicon Ramp-Up for 1.6nm High-NA Manufacturing Nodes',
    dek: 'Backside power delivery and advanced extreme ultraviolet lithography will enter pilot production ahead of initial 2027 server allocations.',
    summary: 'Backside power delivery and advanced extreme ultraviolet lithography will enter pilot production ahead of initial 2027 server allocations.',
    category: 'Technology',
    subcategory: 'Semiconductor Fabrication',
    status: 'Updated',
    publishedAt: '2026-09-26T04:15:00Z',
    updatedAt: '2026-09-26T05:30:00Z',
    timeDisplay: 'Updated 2 hours ago',
    readTime: '5 min read',
    author: {
      name: 'Sarah Lin',
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
      { label: 'Foundry', value: 'Taiwan Semiconductor Manufacturing Co. (TSMC)' },
      { label: 'Process Node', value: 'A16 (1.6nm class with Super Power Rail)' },
      { label: 'Lithography Tool', value: 'High-NA EUV (0.55 Numerical Aperture)' },
      { label: 'Density Gain', value: '+18% logic density over 2nm N2P' },
      { label: 'Volume Production', value: 'First half 2027' },
    ],
    updates: [
      {
        time: '11:30 AM',
        timestamp: '2026-09-26T05:30:00Z',
        title: 'Executive confirmation in Hsinchu',
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
        text: 'For decades, both signal wires and power delivery lines shared the top metallization layers of the silicon die. As transistors shrank below three nanometers, the resistance in minuscule power wires caused severe voltage drops and thermal runaway. Backside power places thick, low-resistance power rails beneath the active transistor layer, dedicating top-side wiring purely to high-speed data routing.',
      },
      {
        type: 'quote',
        quote: 'A16 is not just a lithographic reduction; it is an entirely new spatial layout of the integrated circuit. It buys our architects five years of thermal breathing room.',
        attribution: 'C.C. Wei',
        role: 'Chief Executive Officer, TSMC',
      },
      {
        type: 'paragraph',
        text: 'Fab equipment suppliers confirm that four High-NA EUV tools have been calibrated in Hsinchu, with two additional units scheduled for shipment to the Baoshan expansion facility before the close of the calendar year.',
      },
    ],
    sources: [
      {
        name: 'TSMC Global Technology Symposium Transcript',
        url: 'https://tsmc.com',
        time: 'Sept 26, 2026',
        note: 'Official engineering address and investor presentation',
      },
      {
        name: 'ASML Q3 Tool Delivery & Calibration Bulletin',
        url: 'https://asml.com',
        time: 'Sept 25, 2026',
        note: 'Twinscan EXE:5000 field test confirmation',
      },
    ],
    relatedSlugs: [
      'semiconductor-lithography-power-grid-integration',
      'quantum-coherence-breakthrough-cryogenic-milestone',
      'openai-verification-protocol',
    ],
  },

  // =========================================================================
  // 4. GAMING — PROMPT EXAMPLE (/story/gta-vi-update or /story/sony-portable-tracking)
  // =========================================================================
  {
    id: 'gaming-story-gta',
    slug: 'gta-vi-update',
    title: 'Interactive Physics & Global Illumination Engines Shift Toward Hardware Dynamic Radiance',
    dek: 'Leading game development studios are systematically phasing out static lightmap baking in favor of real-time photon field streaming on next-generation hardware.',
    summary: 'Leading game development studios are systematically phasing out static lightmap baking in favor of real-time photon field streaming on next-generation hardware.',
    category: 'Gaming',
    subcategory: 'Engine Architecture',
    status: 'Developing',
    publishedAt: '2026-09-26T03:00:00Z',
    updatedAt: '2026-09-26T05:00:00Z',
    timeDisplay: 'Updated 3 hours ago',
    readTime: '4 min read',
    author: {
      name: 'Marcus Bell',
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
      { label: 'Industry Sector', value: 'AAA Game Engine Development' },
      { label: 'Core Technology', value: 'Hardware-Accelerated Neural Radiance Caching' },
      { label: 'Target Frame Budget', value: '16.6ms (60 FPS) and 8.3ms (120 FPS)' },
      { label: 'Storage Reduction', value: '45 GB reduction per title by removing static baked lightmaps' },
    ],
    updates: [
      {
        time: '10:45 AM',
        timestamp: '2026-09-26T05:00:00Z',
        title: 'Developer SDK distribution begins',
        text: 'Next-generation graphics toolkits delivered to verified studio partners across North America and Europe.',
        source: 'Developer Network Bulletin',
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
        name: 'Game Developers Conference Technical Proceedings',
        url: 'https://gdconf.com',
        time: 'Sept 25, 2026',
        note: 'Session notes on volumetric photon streaming',
      },
      {
        name: 'Digital Foundry Architecture Analysis',
        url: 'https://eurogamer.net',
        time: 'Sept 26, 2026',
      },
    ],
    relatedSlugs: [
      'sony-portable-tracking',
      'open-world-rendering-neural-radiance-breakthrough',
      'how-game-studios-are-adapting-to-longer-cycles',
    ],
  },

  // =========================================================================
  // 5. SPACE — PROMPT EXAMPLE (/story/nasa-mission-update)
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
    publishedAt: '2026-09-26T02:30:00Z',
    updatedAt: '2026-09-26T04:45:00Z',
    timeDisplay: 'Updated 4 hours ago',
    readTime: '4 min read',
    author: {
      name: 'Alina Thorne',
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
      { label: 'Agency', value: 'NASA / Artemis Program Directorate' },
      { label: 'Spacecraft', value: 'Orion Spacecraft Crew Module (Artemis IV)' },
      { label: 'Test Facility', value: 'Operations and Checkout Building, Kennedy Space Center' },
      { label: 'Peak Sound Pressure', value: '142.8 dB Overall Sound Pressure Level (OASPL)' },
      { label: 'Target Launch Window', value: 'September 2028' },
    ],
    updates: [
      {
        time: '9:15 AM',
        timestamp: '2026-09-26T04:45:00Z',
        title: 'Sensor telemetry verified',
        text: 'Structural vibration sensors confirmed all six hundred telemetry channels reported within predicted analytical tolerance bounds.',
        source: 'NASA Engineering Directorate',
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
        text: 'Artemis IV represents a pivotal evolution in NASA\'s deep space architecture. Unlike earlier lunar landing sorties, Artemis IV will deliver the International Habitation module (I-Hab) to the Lunar Gateway station in halo orbit around the Moon, establishing the first permanent crewed staging post beyond low Earth orbit.',
      },
      {
        type: 'quote',
        quote: 'Passing acoustic stress clearance means our primary structures are qualified for the most severe launch dynamic loads we will ever encounter. We are ready for integration.',
        attribution: 'Commander Robert Lindgren',
        role: 'Artemis Crew Safety Director',
      },
    ],
    sources: [
      {
        name: 'NASA Kennedy Space Center Press Release',
        url: 'https://nasa.gov/artemis',
        time: 'Sept 26, 2026',
      },
      {
        name: 'ESA Lunar Gateway Partnership Briefing',
        url: 'https://esa.int',
        time: 'Sept 25, 2026',
      },
    ],
    relatedSlugs: [
      'deep-space-heavy-lift-propulsion-tests',
      'commercial-space-station-hab-pressure-tests',
      'james-webb-trappist-atmosphere-spectroscopy',
    ],
  },

  // Space story alias for the homepage link
  {
    id: 'space-story-clearance',
    slug: 'nasa-artemis-iv-clearance',
    title: 'NASA Artemis IV Crew Modules Clear Critical Deep-Space Acoustic Stress Tests',
    dek: 'Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.',
    summary: 'Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.',
    category: 'Space',
    subcategory: 'Lunar Exploration',
    status: 'Updated',
    publishedAt: '2026-09-26T02:30:00Z',
    updatedAt: '2026-09-26T04:45:00Z',
    timeDisplay: 'Updated 4 hours ago',
    readTime: '4 min read',
    author: {
      name: 'Alina Thorne',
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
      { label: 'Agency', value: 'NASA / Artemis Program Directorate' },
      { label: 'Spacecraft', value: 'Orion Spacecraft Crew Module (Artemis IV)' },
      { label: 'Test Facility', value: 'Operations and Checkout Building, Kennedy Space Center' },
      { label: 'Peak Sound Pressure', value: '142.8 dB Overall Sound Pressure Level (OASPL)' },
      { label: 'Target Launch Window', value: 'September 2028' },
    ],
    updates: [
      {
        time: '9:15 AM',
        timestamp: '2026-09-26T04:45:00Z',
        title: 'Sensor telemetry verified',
        text: 'Structural vibration sensors confirmed all six hundred telemetry channels reported within predicted analytical tolerance bounds.',
        source: 'NASA Engineering Directorate',
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
        text: 'Artemis IV represents a pivotal evolution in NASA\'s deep space architecture. Unlike earlier lunar landing sorties, Artemis IV will deliver the International Habitation module (I-Hab) to the Lunar Gateway station in halo orbit around the Moon, establishing the first permanent crewed staging post beyond low Earth orbit.',
      },
      {
        type: 'quote',
        quote: 'Passing acoustic stress clearance means our primary structures are qualified for the most severe launch dynamic loads we will ever encounter. We are ready for integration.',
        attribution: 'Commander Robert Lindgren',
        role: 'Artemis Crew Safety Director',
      },
    ],
    sources: [
      {
        name: 'NASA Kennedy Space Center Press Release',
        url: 'https://nasa.gov/artemis',
        time: 'Sept 26, 2026',
      },
      {
        name: 'ESA Lunar Gateway Partnership Briefing',
        url: 'https://esa.int',
        time: 'Sept 25, 2026',
      },
    ],
    relatedSlugs: [
      'deep-space-heavy-lift-propulsion-tests',
      'commercial-space-station-hab-pressure-tests',
      'james-webb-trappist-atmosphere-spectroscopy',
    ],
  },

  // =========================================================================
  // 6. SCIENCE — PARTICLE PHYSICS
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
    publishedAt: '2026-09-26T01:30:00Z',
    updatedAt: '2026-09-26T04:00:00Z',
    timeDisplay: 'Updated 5 hours ago',
    readTime: '6 min read',
    author: {
      name: 'Dr. Helen Vance',
      role: 'Senior Science Editor',
      bio: 'Dr. Helen Vance covers fundamental physics, quantum architectures, and frontier computing. Previously research fellow at Oxford Condensed Matter Physics.',
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
      { label: 'Laboratory', value: 'CERN (European Organization for Nuclear Research)' },
      { label: 'Experiment', value: 'LHCb (Large Hadron Collider beauty)' },
      { label: 'Observed Phenomenon', value: 'Charge-Parity (CP) Asymmetry in D0 Mesons' },
      { label: 'Statistical Significance', value: '3.4 sigma (evidence threshold)' },
      { label: 'Collision Energy', value: '13.6 TeV center-of-mass' },
    ],
    updates: [
      {
        time: '8:30 AM',
        timestamp: '2026-09-26T04:00:00Z',
        title: 'Seminar preprint distributed',
        text: 'CERN theory department convened a public academic briefing discussing quantum chromodynamics corrections.',
        source: 'CERN Academic Training Lecture Series',
      },
    ],
    content: [
      {
        type: 'paragraph',
        lead: true,
        text: 'One of the most persistent enigmas in modern cosmology is why the universe consists almost entirely of matter rather than equal parts matter and antimatter. Today in Geneva, physicists working at the world’s largest particle accelerator reported a rare empirical clue that could help unravel the asymmetry.',
      },
      {
        type: 'paragraph',
        text: 'Using high-luminosity collision records gathered throughout 2025 and 2026, the LHCb collaboration measured the decay rates of neutral charm mesons into pairs of charged pions and kaons. They discovered that matter and antimatter versions of the particles do not decay at identical rates.',
      },
      {
        type: 'quote',
        quote: 'While the Standard Model permits subtle CP violation, the magnitude we observe is noticeably larger than conventional perturbative QCD calculations suggest.',
        attribution: 'Dr. Vincenzo Canale',
        role: 'LHCb Physics Coordinator',
      },
      {
        type: 'paragraph',
        text: 'Physicists caution that a 3.4 sigma measurement falls short of the rigorous 5.0 sigma "gold standard" required for a formal discovery. However, the result has immediately sparked feverish activity among theoretical physicists attempting to model potential beyond-the-Standard-Model interactions.',
      },
    ],
    sources: [
      {
        name: 'CERN LHCb Collaboration Pre-print Server',
        url: 'https://arxiv.org',
        time: 'Sept 26, 2026',
      },
      {
        name: 'European Physical Journal C',
        url: 'https://epjc.epj.org',
        time: 'Sept 26, 2026',
      },
    ],
    relatedSlugs: [
      'fusion-ignition-reproducibility-records',
      'quantum-coherence-breakthrough-cryogenic-milestone',
      'deep-space-heavy-lift-propulsion-tests',
    ],
  },

  // =========================================================================
  // 7. BUSINESS — CENTRAL BANKING & MACROECONOMICS
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
    publishedAt: '2026-09-26T03:30:00Z',
    updatedAt: '2026-09-26T04:20:00Z',
    timeDisplay: 'Updated 4 hours ago',
    readTime: '5 min read',
    author: {
      name: 'Victoria Sterling',
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
      { label: 'Institution', value: 'European Central Bank (ECB)' },
      { label: 'Deposit Facility Rate', value: '2.75%' },
      { label: 'Headline Euro Inflation', value: '2.1% year-on-year' },
      { label: 'Next Policy Decision', value: 'October 29, 2026' },
      { label: 'Sovereign Spread (Bund/BTP)', value: '118 bps' },
    ],
    updates: [
      {
        time: '9:00 AM',
        timestamp: '2026-09-26T04:20:00Z',
        title: 'Frankfurt press conference concludes',
        text: 'President reiterated that decisions remain strictly meeting-by-meeting without forward guidance commitments.',
        source: 'ECB Press Office',
      },
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
      {
        type: 'quote',
        quote: 'We are not committing to a predetermined rate path. We will remain firmly data-dependent, navigating quarter by quarter.',
        attribution: 'Christine Lagarde',
        role: 'President, European Central Bank',
      },
      {
        type: 'paragraph',
        text: 'European equity indices traded largely unchanged following the announcement, reflecting widespread market expectation that the bank is pacing its actions in tandem with the US Federal Reserve and the Bank of England.',
      },
    ],
    sources: [
      {
        name: 'ECB Monetary Policy Statement',
        url: 'https://ecb.europa.eu',
        time: 'Sept 26, 2026',
      },
      {
        name: 'Eurostat Harmonised Index of Consumer Prices (HICP)',
        url: 'https://ec.europa.eu/eurostat',
        time: 'Sept 25, 2026',
      },
    ],
    relatedSlugs: [
      'global-supply-chain-nearshoring-metrics',
      'transatlantic-trade-corridor-maritime-accord',
      'tokyo-sovereign-bond-yield-shift',
    ],
  },

  // =========================================================================
  // 8. WORLD — DIPLOMACY & GLOBAL ACCORDS
  // =========================================================================
  {
    id: 'world-maritime',
    slug: 'transatlantic-trade-corridor-maritime-accord',
    title: 'G7 Delegations Reach Preliminary Maritime Framework on Low-Emission Shipping Corridors',
    dek: 'The accord sets enforceable sulfur and synthetic methanol targets for North Atlantic cargo lanes commencing in the second quarter of 2027.',
    summary: 'The accord sets enforceable sulfur and synthetic methanol targets for North Atlantic cargo lanes commencing in the second quarter of 2027.',
    category: 'World',
    subcategory: 'Trade & Governance',
    status: 'Announcement',
    publishedAt: '2026-09-26T01:15:00Z',
    updatedAt: '2026-09-26T03:30:00Z',
    timeDisplay: 'Updated 5 hours ago',
    readTime: '6 min read',
    author: {
      name: 'Claire Delacroix',
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
      { label: 'Accord Name', value: 'Transatlantic Green Maritime Corridor Initiative' },
      { label: 'Participating Ports', value: 'Rotterdam, Antwerp, Hamburg, New York/NJ, Halifax' },
      { label: 'Effective Date', value: 'May 1, 2027' },
      { label: 'Target Fuels', value: 'Bio-e-methanol, green hydrogen, and low-sulfur e-ammonia' },
      { label: 'Oversight Agency', value: 'Joint Atlantic Maritime Environmental Commission' },
    ],
    updates: [
      {
        time: '7:45 AM',
        timestamp: '2026-09-26T03:30:00Z',
        title: 'Final communique endorsed',
        text: 'All seven member states signed the implementation annex following late-night negotiations in Geneva.',
        source: 'Geneva Summit Secretariat',
      },
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
      {
        type: 'quote',
        quote: 'Global shipping has operated in regulatory ambiguity for half a century. Today’s framework proves that major trading democracies can establish enforceable environmental baselines without disrupting supply chains.',
        attribution: 'Henrik Visser',
        role: 'Netherlands Minister of Transport & Water Management',
      },
      {
        type: 'paragraph',
        text: 'Major maritime liner carriers, including Maersk, Hapag-Lloyd, and CMA CGM, issued a joint statement welcoming regulatory clarity, noting that common transatlantic standards prevent fragmented patchwork levies.',
      },
    ],
    sources: [
      {
        name: 'Geneva G7 Trade Ministerial Communiqué',
        url: 'https://g7trade.org',
        time: 'Sept 26, 2026',
      },
      {
        name: 'International Chamber of Shipping Statement',
        url: 'https://ics-shipping.org',
        time: 'Sept 26, 2026',
      },
    ],
    relatedSlugs: [
      'global-supply-chain-nearshoring-metrics',
      'ecb-rate-calibration',
      'geneva-digital-sovereignty-compact',
    ],
  },
];

/**
 * Automatically synthesizes a high-quality NewsStory from any Story object.
 * This guarantees that every story in MOCK_STORIES renders seamlessly
 * on the Universal Story Page without missing content.
 */
export function enrichStoryWithEditorialContent(story: Story): NewsStory {
  const existing = DETAILED_STORIES.find((d) => d.slug === story.slug || d.id === story.id);
  if (existing) {
    return existing;
  }

  // Generate realistic, dignified editorial blocks matching the story's domain
  const contentBlocks: ArticleBlock[] = [
    {
      type: 'paragraph',
      lead: true,
      text: `${story.summary} Reporting from international bureaus indicates that technical and operational teams have been monitoring these developments over several weeks as secondary data sets emerged across industry and regulatory channels.`,
    },
    {
      type: 'paragraph',
      text: `According to internal documentation and briefings reviewed by The Meridian, the strategic implications extend well beyond immediate operational milestones. Analysts familiar with the matter emphasize that the broader market has been seeking definitive verification of these performance benchmarks.`,
    },
    {
      type: 'heading',
      level: 2,
      text: 'Operational Context & Strategic Impact',
    },
    {
      type: 'paragraph',
      text: `In earlier evaluation phases, industry observers had expressed measured skepticism regarding whether execution timelines could be maintained under prevailing macroeconomic constraints. However, the latest telemetry and verification disclosures confirm that primary deliverables remain squarely on schedule.`,
    },
    {
      type: 'quote',
      quote: 'We have progressed past the exploratory phase into rigorous operational execution. The fundamental parameters have now been firmly established.',
      attribution: story.author.name,
      role: story.author.role,
    },
    {
      type: 'paragraph',
      text: `Regulatory bodies and institutional stakeholders have indicated that formal oversight filings and comprehensive implementation guidance will be made available before the close of the current calendar cycle.`,
    },
  ];

  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    dek: story.summary,
    summary: story.summary,
    category: story.category,
    subcategory: story.subcategory,
    author: {
      name: story.author.name,
      role: story.author.role,
      bio: `${story.author.name} is a senior correspondent covering ${story.category} developments for The Meridian.`,
      avatar: story.author.avatar,
    },
    heroImage: story.image
      ? {
          url: story.image,
          alt: story.alt || story.title,
          caption: story.caption || `Editorial coverage of ${story.title} by The Meridian staff.`,
          credit: story.credit || 'The Meridian / Editorial Desk',
        }
      : undefined,
    quickSummary: [
      `Key findings verify primary operational benchmarks across ${story.category}.`,
      'Internal briefing records demonstrate consistency across independent validation cycles.',
      'Institutional stakeholders and industry partners have endorsed the baseline framework.',
      'Formal guidance and implementation milestones remain on track for scheduled release.',
    ],
    facts: [
      { label: 'Category', value: story.category },
      { label: 'Reporting Bureau', value: story.author.role },
      { label: 'Verification', value: 'Confirmed by Editorial Verification Desk' },
      { label: 'Coverage Status', value: story.isLive ? 'Active Live Wire' : 'Standard Editorial Record' },
    ],
    updates: story.isLive
      ? [
          {
            time: '11:45 AM',
            text: 'Editorial desk confirmed secondary source attributions and updated briefing data.',
            source: 'Editorial Wire',
          },
        ]
      : undefined,
    sources: [
      {
        name: 'The Meridian Editorial Bureau & Field Dispatches',
        url: 'https://themeridian.in',
        time: story.timeDisplay,
        note: 'Direct reporting and verified documentation',
      },
    ],
    content: contentBlocks,
    publishedAt: story.publishedAt,
    updatedAt: story.updatedAt,
    timeDisplay: story.timeDisplay,
    readTime: story.readTime || '4 min read',
    status: story.isLive ? 'Live' : story.isBreaking ? 'Developing' : 'Updated',
    featured: story.featured,
    isLive: story.isLive,
    isBreaking: story.isBreaking,
    rank: story.rank,
  };
}

/**
 * Universal Story Lookup function.
 * Matches by slug, falling back to id match or mock story enrichment.
 * Future migration: Drop-in replacement with Supabase query.
 */
export function getStoryBySlug(slug: string): NewsStory | undefined {
  if (!slug) return undefined;
  const normalizedSlug = slug.toLowerCase().trim();

  // 1. Direct match in curated detailed stories
  const detailed = DETAILED_STORIES.find(
    (s) => s.slug.toLowerCase() === normalizedSlug || s.id.toLowerCase() === normalizedSlug
  );
  if (detailed) return detailed;

  // 2. Match in MOCK_STORIES and enrich with editorial content
  const standardStory = MOCK_STORIES.find(
    (s) => s.slug.toLowerCase() === normalizedSlug || s.id.toLowerCase() === normalizedSlug
  );
  if (standardStory) {
    return enrichStoryWithEditorialContent(standardStory);
  }

  return undefined;
}

/**
 * Alias for explicit mock data requirements in the prompt:
 * "For now: getMockStoryBySlug(slug)"
 */
export function getMockStoryBySlug(slug: string): NewsStory | undefined {
  return getStoryBySlug(slug);
}
