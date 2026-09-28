/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Mock Media Repository for Hermetic Testing
 */

import type { MediaRepository } from './MediaRepository';
import type {
  MediaAsset,
  MediaAuditEvent,
  MediaProcessingJob,
  MediaJobStatus,
} from '../../types/media';

export class MockMediaRepository implements MediaRepository {
  private assets = new Map<string, MediaAsset>();
  private jobs = new Map<string, MediaProcessingJob>();
  private auditEvents: MediaAuditEvent[] = [];
  private storyHeroMap = new Map<string, string>(); // storyId -> mediaId
  private stories: Array<{ id: string; title: string; slug: string; category: string; hero_media_id?: string }> = [];

  constructor(initialData?: {
    assets?: MediaAsset[];
    stories?: Array<{ id: string; title: string; slug: string; category: string; hero_media_id?: string }>;
  }) {
    if (initialData?.assets) {
      for (const a of initialData.assets) {
        this.assets.set(a.id, { ...a });
      }
    }
    if (initialData?.stories) {
      this.stories = [...initialData.stories];
      for (const s of initialData.stories) {
        if (s.hero_media_id) {
          this.storyHeroMap.set(s.id, s.hero_media_id);
        }
      }
    }
  }

  async getAssetById(id: string): Promise<MediaAsset | null> {
    const asset = this.assets.get(id);
    return asset ? { ...asset } : null;
  }

  async getAssetByHash(hash: string): Promise<MediaAsset | null> {
    for (const asset of this.assets.values()) {
      if ((asset.imageHash === hash || (asset as any).contentHash === hash) && asset.validationStatus === 'approved') {
        return { ...asset };
      }
    }
    return null;
  }

  async getAssetsByStoryId(storyId: string): Promise<MediaAsset[]> {
    const res: MediaAsset[] = [];
    for (const asset of this.assets.values()) {
      if (asset.storyId === storyId) {
        res.push({ ...asset });
      }
    }
    return res.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createAsset(asset: Omit<MediaAsset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MediaAsset> {
    const id = asset.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const created: MediaAsset = {
      ...asset,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.assets.set(id, created);
    return { ...created };
  }

  async updateAsset(id: string, updates: Partial<MediaAsset>): Promise<MediaAsset | null> {
    const existing = this.assets.get(id);
    if (!existing) return null;
    const updated: MediaAsset = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.assets.set(id, updated);
    return { ...updated };
  }

  async attachHeroMedia(storyId: string, mediaId: string): Promise<void> {
    this.storyHeroMap.set(storyId, mediaId);
    const story = this.stories.find(s => s.id === storyId);
    if (story) {
      story.hero_media_id = mediaId;
    }
    const asset = this.assets.get(mediaId);
    if (asset) {
      asset.storyId = storyId;
      asset.isPrimary = true;
      asset.updatedAt = new Date().toISOString();
    }
  }

  async revokeMedia(id: string, reason: string): Promise<void> {
    const asset = this.assets.get(id);
    if (asset) {
      asset.validationStatus = 'rejected';
      asset.rightsStatus = 'rejected';
      asset.updatedAt = new Date().toISOString();
    }
    await this.createAuditEvent({
      mediaId: id,
      eventType: 'MEDIA_REVOKED',
      reason,
      actor: 'system',
    });
  }

  async createAuditEvent(event: Omit<MediaAuditEvent, 'id' | 'createdAt'> & { id?: string }): Promise<MediaAuditEvent> {
    const id = event.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created: MediaAuditEvent = {
      ...event,
      id,
      createdAt: new Date().toISOString(),
    };
    this.auditEvents.push(created);
    return { ...created };
  }

  async getAuditEvents(mediaId?: string, storyId?: string, limit = 50): Promise<MediaAuditEvent[]> {
    let filtered = [...this.auditEvents];
    if (mediaId) {
      filtered = filtered.filter(e => e.mediaId === mediaId);
    }
    if (storyId) {
      filtered = filtered.filter(e => e.storyId === storyId);
    }
    return filtered.slice(-limit).reverse();
  }

  async enqueueJob(job: Omit<MediaProcessingJob, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MediaProcessingJob> {
    const id = job.id || `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const created: MediaProcessingJob = {
      ...job,
      id,
      attempts: job.attempts || 0,
      maxAttempts: job.maxAttempts || 3,
      scheduledFor: job.scheduledFor || now,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, created);
    return { ...created };
  }

  async createJob(job: Omit<MediaProcessingJob, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MediaProcessingJob> {
    return this.enqueueJob(job);
  }

  async getJobById(id: string): Promise<MediaProcessingJob | null> {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  async getNextPendingJobs(limit = 5): Promise<MediaProcessingJob[]> {
    const res: MediaProcessingJob[] = [];
    const now = Date.now();
    for (const job of this.jobs.values()) {
      const isPending = job.status === 'queued' || (job.status as any) === 'pending';
      const isScheduled = !job.scheduledFor || Date.parse(job.scheduledFor) <= now;
      if (isPending && isScheduled) {
        res.push({ ...job });
        if (res.length >= limit) break;
      }
    }
    return res;
  }

  async updateJobStatus(id: string, status: MediaJobStatus, lastError?: string): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.status = status;
      if (lastError) job.lastError = lastError;
      if (status === 'processing') job.attempts = (job.attempts || 0) + 1;
      job.updatedAt = new Date().toISOString();
    }
  }

  async getQueueDepth(): Promise<number> {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'queued' || job.status === 'processing') {
        count++;
      }
    }
    return count;
  }

  async getOldestPendingJobAgeSec(): Promise<number | null> {
    let oldest: number | null = null;
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (job.status === 'queued') {
        const ageSec = Math.floor((now - Date.parse(job.createdAt)) / 1000);
        if (oldest === null || ageSec > oldest) {
          oldest = ageSec;
        }
      }
    }
    return oldest;
  }

  async getOrphanMedia(limit = 50): Promise<MediaAsset[]> {
    const orphans: MediaAsset[] = [];
    for (const asset of this.assets.values()) {
      if (!asset.storyId) {
        orphans.push({ ...asset });
        if (orphans.length >= limit) break;
      }
    }
    return orphans;
  }

  async getStoriesWithoutHeroMedia(limit = 50): Promise<Array<{ id: string; title: string; slug: string; category: string }>> {
    const res: Array<{ id: string; title: string; slug: string; category: string }> = [];
    for (const s of this.stories) {
      if (!s.hero_media_id && !this.storyHeroMap.has(s.id)) {
        res.push({ id: s.id, title: s.title, slug: s.slug, category: s.category });
        if (res.length >= limit) break;
      }
    }
    return res;
  }

  async getRightsDistribution(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const asset of this.assets.values()) {
      counts[asset.rightsStatus] = (counts[asset.rightsStatus] || 0) + 1;
    }
    return counts;
  }
}
