/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Media Repository Interface
 */

import type {
  MediaAsset,
  MediaAuditEvent,
  MediaProcessingJob,
  MediaJobStatus,
} from '../../types/media';

export interface MediaRepository {
  getAssetById(id: string): Promise<MediaAsset | null>;
  getAssetByHash(hash: string): Promise<MediaAsset | null>;
  getAssetsByStoryId(storyId: string): Promise<MediaAsset[]>;
  createAsset(asset: Omit<MediaAsset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MediaAsset>;
  updateAsset(id: string, updates: Partial<MediaAsset>): Promise<MediaAsset | null>;
  attachHeroMedia(storyId: string, mediaId: string): Promise<void>;
  revokeMedia(id: string, reason: string): Promise<void>;
  createAuditEvent(event: Omit<MediaAuditEvent, 'id' | 'createdAt'> & { id?: string }): Promise<MediaAuditEvent>;
  getAuditEvents(mediaId?: string, storyId?: string, limit?: number): Promise<MediaAuditEvent[]>;
  enqueueJob(job: Omit<MediaProcessingJob, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MediaProcessingJob>;
  getNextPendingJobs(limit?: number): Promise<MediaProcessingJob[]>;
  updateJobStatus(id: string, status: MediaJobStatus, lastError?: string): Promise<void>;
  getQueueDepth(): Promise<number>;
  getOldestPendingJobAgeSec(): Promise<number | null>;
  getOrphanMedia(limit?: number): Promise<MediaAsset[]>;
  getStoriesWithoutHeroMedia(limit?: number): Promise<Array<{ id: string; title: string; slug: string; category: string }>>;
  getRightsDistribution(): Promise<Record<string, number>>;
}
