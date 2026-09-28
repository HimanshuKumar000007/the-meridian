/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Review Notification State Repository: Idempotency & Anti-Spam Tracking
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ReviewNotificationStateRecord {
  storyId: string;
  stateHash: string;
  provider: string;
  notifiedAt: string;
  metadata?: Record<string, any>;
}

export interface ReviewNotificationStateRepository {
  getLastNotifiedState(storyId: string): Promise<string | null>;
  recordNotifiedState(record: ReviewNotificationStateRecord): Promise<void>;
}

export class MemoryReviewNotificationStateRepository implements ReviewNotificationStateRepository {
  private readonly records = new Map<string, ReviewNotificationStateRecord>();

  public async getLastNotifiedState(storyId: string): Promise<string | null> {
    const record = this.records.get(storyId);
    return record ? record.stateHash : null;
  }

  public async recordNotifiedState(record: ReviewNotificationStateRecord): Promise<void> {
    this.records.set(record.storyId, record);
  }

  public clear(): void {
    this.records.clear();
  }
}

export class SupabaseReviewNotificationStateRepository implements ReviewNotificationStateRepository {
  private readonly memoryCache = new Map<string, ReviewNotificationStateRecord>();

  constructor(private readonly client: SupabaseClient) {}

  public async getLastNotifiedState(storyId: string): Promise<string | null> {
    // Check in-memory cache first for fast lookup
    if (this.memoryCache.has(storyId)) {
      return this.memoryCache.get(storyId)!.stateHash;
    }

    try {
      const { data, error } = await this.client
        .from('automation_events')
        .select('metadata, created_at')
        .eq('stage', 'lifecycle')
        .eq('event_type', 'OPERATOR_REVIEW_NOTIFICATION')
        .contains('metadata', { storyId })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data || !data.metadata) {
        return null;
      }

      const stateHash = data.metadata.stateHash;
      if (typeof stateHash === 'string') {
        this.memoryCache.set(storyId, {
          storyId,
          stateHash,
          provider: data.metadata.provider || 'webhook',
          notifiedAt: data.created_at,
          metadata: data.metadata,
        });
        return stateHash;
      }

      return null;
    } catch {
      return null;
    }
  }

  public async recordNotifiedState(record: ReviewNotificationStateRecord): Promise<void> {
    // Update local cache immediately
    this.memoryCache.set(record.storyId, record);

    try {
      const eventId = `evt-notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await this.client.from('automation_events').insert({
        id: eventId,
        stage: 'lifecycle',
        event_type: 'OPERATOR_REVIEW_NOTIFICATION',
        severity: 'info',
        message: `Operator review notification sent for story ${record.storyId}`,
        metadata: {
          storyId: record.storyId,
          stateHash: record.stateHash,
          provider: record.provider,
          notifiedAt: record.notifiedAt,
          ...(record.metadata || {}),
        },
        created_at: record.notifiedAt,
      });
    } catch (err) {
      // Non-fatal: in-memory cache preserves idempotency for the process duration
      console.warn('[SupabaseReviewNotificationStateRepository] Failed to persist event:', err);
    }
  }
}
