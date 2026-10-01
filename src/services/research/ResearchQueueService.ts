/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * ResearchQueueService: Bounded retry state management for research pipeline items.
 * Strictly avoids infinite retries and dead-letters permanently blocked/paywalled sources immediately.
 */

import type { ResearchQueueItem, ResearchQueueStatus } from './types';

export const DEFAULT_MAX_RESEARCH_RETRIES = 2;

export class ResearchQueueService {
  private queue: Map<string, ResearchQueueItem> = new Map();

  /**
   * Enqueues an event cluster for research.
   */
  public enqueue(clusterId: string, metadata?: Record<string, any>): ResearchQueueItem {
    const existing = this.queue.get(clusterId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const item: ResearchQueueItem = {
      id: `rq-${clusterId}`,
      clusterId,
      status: 'pending',
      attempts: 0,
      maxAttempts: DEFAULT_MAX_RESEARCH_RETRIES,
      createdAt: now,
      updatedAt: now,
      metadata,
    };

    this.queue.set(clusterId, item);
    return item;
  }

  /**
   * Retrieves an item by cluster ID.
   */
  public getItem(clusterId: string): ResearchQueueItem | undefined {
    return this.queue.get(clusterId);
  }

  /**
   * Marks item as processing.
   */
  public markProcessing(clusterId: string): void {
    const item = this.queue.get(clusterId);
    if (!item) return;

    item.status = 'processing';
    item.attempts += 1;
    item.lastAttemptAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
  }

  /**
   * Resolves item status after research attempt.
   * If error is a permanent block or paywall, transitions directly to blocked_source / dead_letter
   * with ZERO retries.
   */
  public resolveItem(
    clusterId: string,
    result: {
      status: ResearchQueueStatus;
      isPermanentBlock?: boolean;
      error?: string;
    }
  ): ResearchQueueItem | undefined {
    const item = this.queue.get(clusterId);
    if (!item) return undefined;

    const now = new Date().toISOString();
    item.lastError = result.error;
    item.updatedAt = now;

    // Permanent blocks/paywalls terminate immediately
    if (result.isPermanentBlock || result.status === 'blocked_source') {
      item.status = 'blocked_source';
      return item;
    }

    if (result.status === 'completed' || result.status === 'insufficient_evidence') {
      item.status = result.status;
      return item;
    }

    // Transient failure: check retry count
    if (item.attempts >= item.maxAttempts) {
      item.status = 'dead_letter';
    } else {
      item.status = 'failed';
    }

    return item;
  }

  /**
   * Retrieves all items in the queue with given status.
   */
  public getItemsByStatus(status: ResearchQueueStatus): ResearchQueueItem[] {
    return Array.from(this.queue.values()).filter((i) => i.status === status);
  }

  /**
   * Retrieves queue depth statistics.
   */
  public getQueueMetrics(): {
    pending: number;
    processing: number;
    completed: number;
    insufficientEvidence: number;
    blockedSources: number;
    failed: number;
    deadLetter: number;
    total: number;
  } {
    const items = Array.from(this.queue.values());
    return {
      pending: items.filter((i) => i.status === 'pending').length,
      processing: items.filter((i) => i.status === 'processing').length,
      completed: items.filter((i) => i.status === 'completed').length,
      insufficientEvidence: items.filter((i) => i.status === 'insufficient_evidence').length,
      blockedSources: items.filter((i) => i.status === 'blocked_source').length,
      failed: items.filter((i) => i.status === 'failed').length,
      deadLetter: items.filter((i) => i.status === 'dead_letter').length,
      total: items.length,
    };
  }
}
