/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { StoryAuthor } from '../types/story';

export interface AuthorProfile extends StoryAuthor {
  credentials?: string[];
  education?: string;
  location?: string;
  twitter?: string;
  bluesky?: string;
}

export const AUTHOR_PROFILES: Record<string, AuthorProfile> = {
  'helen-vance': {
    id: 'auth-helen-vance',
    name: 'Dr. Helen Vance',
    slug: 'helen-vance',
    role: 'Senior Science & Deep Tech Correspondent',
    bio: 'Dr. Helen Vance covers fundamental physics, quantum architectures, and frontier computing. Previously a research fellow at Oxford Condensed Matter Physics.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    credentials: ['D.Phil Condensed Matter Physics, University of Oxford', 'Member, Institute of Physics'],
    location: 'Oxford & London, UK',
    twitter: '@DrHelenVance',
  },
  'julian-foster': {
    id: 'auth-julian-foster',
    name: 'Julian Foster',
    slug: 'julian-foster',
    role: 'Technology & AI Policy Correspondent',
    bio: 'Julian Foster covers frontier artificial intelligence research, enterprise infrastructure, and emerging European computing governance.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    credentials: ['M.Sc. Technology Governance, LSE', '12+ years technology journalism'],
    location: 'London & Brussels',
    twitter: '@JulianFosterTech',
  },
  'sarah-lin': {
    id: 'auth-sarah-lin',
    name: 'Sarah Lin',
    slug: 'sarah-lin',
    role: 'Senior Semiconductor & Hardware Reporter',
    bio: 'Sarah Lin covers global semiconductor supply chains, lithography physics, and hardware infrastructure from Taipei and Silicon Valley.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    credentials: ['B.S. Electrical Engineering, UC Berkeley', 'Former hardware analyst'],
    location: 'Taipei & San Francisco',
    twitter: '@SarahLinChips',
  },
  'marcus-bell': {
    id: 'auth-marcus-bell',
    name: 'Marcus Bell',
    slug: 'marcus-bell',
    role: 'Gaming & Interactive Entertainment Editor',
    bio: 'Marcus Bell covers video game engines, interactive physics, graphics rendering APIs, and the economics of global digital entertainment.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    credentials: ['B.A. Interactive Media & Game Design, NYU Tisch'],
    location: 'Los Angeles & Seattle',
    twitter: '@MarcusBellGames',
  },
  'alina-thorne': {
    id: 'auth-alina-thorne',
    name: 'Alina Thorne',
    slug: 'alina-thorne',
    role: 'Senior Aerospace & Astrophysics Correspondent',
    bio: 'Alina Thorne covers planetary science, deep-space propulsion, orbital logistics, and international lunar treaties from Cape Canaveral.',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    credentials: ['M.S. Aerospace Engineering, MIT', 'Accredited NASA Press Corp member'],
    location: 'Cape Canaveral & Houston',
    twitter: '@AlinaThorneSpace',
  },
  'victoria-sterling': {
    id: 'auth-victoria-sterling',
    name: 'Victoria Sterling',
    slug: 'victoria-sterling',
    role: 'Chief Economics Correspondent',
    bio: 'Victoria Sterling reports on monetary policy, sovereign debt markets, foreign exchange dynamics, and global macroeconomic policy from Frankfurt and London.',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=256&q=80',
    credentials: ['M.Phil Economics, Cambridge', 'Former policy researcher at Bank of England'],
    location: 'Frankfurt & London',
    twitter: '@V_SterlingEcon',
  },
  'claire-delacroix': {
    id: 'auth-claire-delacroix',
    name: 'Claire Delacroix',
    slug: 'claire-delacroix',
    role: 'European Affairs & Trade Editor',
    bio: 'Claire Delacroix reports on European Union policy, transatlantic trade, multilateral treaties, and international climate summits from Brussels.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    credentials: ['Sciences Po Paris, International Relations', 'Accredited EU correspondent'],
    location: 'Brussels & Paris',
    twitter: '@CDelacroix_EU',
  },
  'kenji-takahashi': {
    id: 'auth-kenji-takahashi',
    name: 'Kenji Takahashi',
    slug: 'kenji-takahashi',
    role: 'Tokyo Bureau Chief',
    bio: 'Kenji Takahashi leads The Meridian’s Tokyo bureau, covering East Asian markets, robotics manufacturing, and regional diplomatic shifts.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    credentials: ['Waseda University, Economics & Journalism', 'Foreign Correspondents’ Club of Japan'],
    location: 'Tokyo, Japan',
    twitter: '@TakahashiTokyo',
  },
  'clara-dupont': {
    id: 'auth-clara-dupont',
    name: 'Clara Dupont',
    slug: 'clara-dupont',
    role: 'Culture & Entertainment Technology Editor',
    bio: 'Clara Dupont investigates generative AI in creative production, streaming platform economics, and intellectual property transformations.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    credentials: ['Columbia Journalism School, M.S.'],
    location: 'New York & Paris',
    twitter: '@ClaraDupontMedia',
  },
  'meridian-desk': {
    id: 'auth-meridian-desk',
    name: 'The Meridian Newsroom Desk',
    slug: 'meridian-desk',
    role: 'Editorial Staff Desk',
    bio: 'The Meridian Newsroom Desk aggregates verified multi-agency wire dispatches, institutional research filings, and collaborative reporting.',
    avatar: undefined,
    credentials: ['The Meridian Editorial Standards Board'],
    location: 'Global Newsroom',
    twitter: '@TheMeridianNews',
  },
};

export function getAuthorProfile(slug: string): AuthorProfile | null {
  if (!slug) return null;
  const clean = slug.toLowerCase().trim();
  return AUTHOR_PROFILES[clean] || null;
}
