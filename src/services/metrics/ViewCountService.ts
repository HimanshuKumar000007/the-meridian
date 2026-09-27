/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SearchRepository } from '../../data/repositories/SearchRepository';
import type { ViewRecordResult } from '../../types/search';

export class ViewCountService {
  private repository: SearchRepository;
  private localDebounce: Map<string, number> = new Map();
  private debounceWindowMs = 30 * 60 * 1000; // 30 minutes

  constructor(repository: SearchRepository) {
    this.repository = repository;
  }

  /**
   * Generates a deterministic, privacy-preserving session hash
   * Uses an anonymous ID with no PII (no IP, no email, no user identity)
   */
  public static generateSessionHash(anonymousSeed?: string): string {
    const seed = anonymousSeed || 'anon-' + Math.random().toString(36).slice(2);
    // Simple 32-char hex digest simulation for environments without crypto
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sess_${hex}_${seed.slice(0, 16)}`;
  }

  /**
   * Record a verified story view
   */
  public async recordView(storyId: string, sessionHash: string): Promise<ViewRecordResult> {
    if (!storyId || typeof storyId !== 'string') {
      return { recorded: false, error: 'invalid_story_id' };
    }

    if (!sessionHash || typeof sessionHash !== 'string' || sessionHash.length < 8) {
      return { recorded: false, error: 'invalid_session_hash' };
    }

    const key = `${storyId}:${sessionHash}`;
    const now = Date.now();
    const lastSeen = this.localDebounce.get(key);

    if (lastSeen && now - lastSeen < this.debounceWindowMs) {
      return {
        recorded: false,
        reason: 'client_debounced',
      };
    }

    this.localDebounce.set(key, now);
    const result = await this.repository.recordStoryView(storyId, sessionHash);
    return result;
  }
}
