/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isSupabaseConfigured } from '../lib/supabase';
import { SupabaseNewsRepository } from './repositories/SupabaseNewsRepository';
import { MockNewsRepository } from './repositories/MockNewsRepository';
import type { NewsRepository } from '../types/repository';

function checkExplicitMock(): boolean {
  if (typeof process !== 'undefined' && process.env && process.env.VITE_USE_MOCK_DATA === 'true') {
    return true;
  }
  try {
    const meta = new Function('return import.meta')();
    return meta?.env?.VITE_USE_MOCK_DATA === 'true';
  } catch {}
  return false;
}

const isExplicitMock = checkExplicitMock();

let activeRepository: SupabaseNewsRepository | MockNewsRepository;

if (isSupabaseConfigured() && !isExplicitMock) {
  try {
    activeRepository = new SupabaseNewsRepository();
  } catch (err) {
    console.warn('[newsRepository] Fallback to MockNewsRepository due to initialization failure:', err);
    activeRepository = new MockNewsRepository();
  }
} else {
  activeRepository = new MockNewsRepository();
}

export const newsRepository = activeRepository;

/**
 * Hot-swap or override repository provider (useful for testing or manual toggle)
 */
export function setRepositoryProvider(repo: SupabaseNewsRepository | MockNewsRepository): void {
  activeRepository = repo;
}

export function isUsingSupabase(): boolean {
  return activeRepository instanceof SupabaseNewsRepository;
}

export default newsRepository;
export type { NewsRepository };
