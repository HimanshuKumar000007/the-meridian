/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * AutomationLockService: Distributed Run Lock with Auto-Expiration & Stale Recovery
 */

import type { AutomationRepository } from '../../data/repositories/AutomationRepository';
import type { AutomationLock } from '../../types/automation';

export class AutomationLockService {
  constructor(private repository: AutomationRepository) {}

  /**
   * Attempts to acquire an execution lock with the given TTL in seconds.
   * If a prior lock exists but has expired, it safely reclaims the lock.
   */
  async acquire(
    lockName: string,
    ownerId: string,
    ttlSeconds = 300
  ): Promise<{ acquired: boolean; existingLock?: AutomationLock | null }> {
    const lock = await this.repository.getLock(lockName);

    if (lock) {
      const isExpired = new Date(lock.expiresAt).getTime() <= Date.now();
      if (!isExpired && lock.ownerId !== ownerId) {
        return { acquired: false, existingLock: lock };
      }
    }

    const acquired = await this.repository.acquireLock(lockName, ownerId, ttlSeconds);
    return { acquired, existingLock: lock };
  }

  /**
   * Releases an execution lock if owned by ownerId.
   */
  async release(lockName: string, ownerId: string): Promise<boolean> {
    return this.repository.releaseLock(lockName, ownerId);
  }

  /**
   * Inspect current lock state.
   */
  async inspect(lockName: string): Promise<AutomationLock | null> {
    return this.repository.getLock(lockName);
  }

  /**
   * Check if a lock is currently active and unexpired.
   */
  async isLocked(lockName: string): Promise<boolean> {
    const lock = await this.repository.getLock(lockName);
    if (!lock) return false;
    return new Date(lock.expiresAt).getTime() > Date.now();
  }
}
