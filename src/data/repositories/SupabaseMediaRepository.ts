/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Supabase Media Repository Implementation
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MediaRepository } from './MediaRepository';
import type {
  MediaAsset,
  MediaAuditEvent,
  MediaProcessingJob,
  MediaJobStatus,
} from '../../types/media';

export class SupabaseMediaRepository implements MediaRepository {
  constructor(private client: SupabaseClient) {}

  private mapDbAssetToModel(row: any): MediaAsset {
    return {
      id: row.id,
      storyId: row.story_id || undefined,
      assetType: row.asset_type,
      sourceType: row.source_type,
      sourceUrl: row.source_url || undefined,
      originalUrl: row.original_url || undefined,
      storageUrl: row.storage_url,
      rightsStatus: row.rights_status,
      provenanceStatus: row.provenance_status,
      validationStatus: row.validation_status,
      license: row.license || undefined,
      licenseUrl: row.license_url || undefined,
      credit: row.credit || undefined,
      caption: row.caption || undefined,
      altText: row.alt_text || undefined,
      width: row.width || undefined,
      height: row.height || undefined,
      aspectRatio: row.aspect_ratio || undefined,
      format: row.format || undefined,
      fileSize: row.file_size || undefined,
      mimeType: row.mime_type || undefined,
      imageHash: row.image_hash || undefined,
      isIllustrative: row.is_illustrative,
      isPrimary: row.is_primary,
      sortOrder: row.sort_order || 0,
      derivatives: row.derivatives || {},
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapModelToDbAsset(asset: Partial<MediaAsset>): Record<string, any> {
    const row: Record<string, any> = {};
    if (asset.id !== undefined) row.id = asset.id;
    if (asset.storyId !== undefined) row.story_id = asset.storyId;
    if (asset.assetType !== undefined) row.asset_type = asset.assetType;
    if (asset.sourceType !== undefined) row.source_type = asset.sourceType;
    if (asset.sourceUrl !== undefined) row.source_url = asset.sourceUrl;
    if (asset.originalUrl !== undefined) row.original_url = asset.originalUrl;
    if (asset.storageUrl !== undefined) row.storage_url = asset.storageUrl;
    if (asset.rightsStatus !== undefined) row.rights_status = asset.rightsStatus;
    if (asset.provenanceStatus !== undefined) row.provenance_status = asset.provenanceStatus;
    if (asset.validationStatus !== undefined) row.validation_status = asset.validationStatus;
    if (asset.license !== undefined) row.license = asset.license;
    if (asset.licenseUrl !== undefined) row.license_url = asset.licenseUrl;
    if (asset.credit !== undefined) row.credit = asset.credit;
    if (asset.caption !== undefined) row.caption = asset.caption;
    if (asset.altText !== undefined) row.alt_text = asset.altText;
    if (asset.width !== undefined) row.width = asset.width;
    if (asset.height !== undefined) row.height = asset.height;
    if (asset.aspectRatio !== undefined) row.aspect_ratio = asset.aspectRatio;
    if (asset.format !== undefined) row.format = asset.format;
    if (asset.fileSize !== undefined) row.file_size = asset.fileSize;
    if (asset.mimeType !== undefined) row.mime_type = asset.mimeType;
    if (asset.imageHash !== undefined) row.image_hash = asset.imageHash;
    if (asset.isIllustrative !== undefined) row.is_illustrative = asset.isIllustrative;
    if (asset.isPrimary !== undefined) row.is_primary = asset.isPrimary;
    if (asset.sortOrder !== undefined) row.sort_order = asset.sortOrder;
    if (asset.derivatives !== undefined) row.derivatives = asset.derivatives;
    if (asset.metadata !== undefined) row.metadata = asset.metadata;
    return row;
  }

  async getAssetById(id: string): Promise<MediaAsset | null> {
    const { data, error } = await this.client
      .from('media_assets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapDbAssetToModel(data);
  }

  async getAssetByHash(hash: string): Promise<MediaAsset | null> {
    const { data, error } = await this.client
      .from('media_assets')
      .select('*')
      .eq('image_hash', hash)
      .eq('validation_status', 'approved')
      .maybeSingle();

    if (error || !data) return null;
    return this.mapDbAssetToModel(data);
  }

  async getAssetsByStoryId(storyId: string): Promise<MediaAsset[]> {
    const { data, error } = await this.client
      .from('media_assets')
      .select('*')
      .eq('story_id', storyId)
      .order('sort_order', { ascending: true });

    if (error || !data) return [];
    return data.map(r => this.mapDbAssetToModel(r));
  }

  async createAsset(asset: Omit<MediaAsset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MediaAsset> {
    const id = asset.id || `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const dbRow = {
      ...this.mapModelToDbAsset(asset),
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('media_assets')
      .insert(dbRow)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create media asset: ${error.message}`);
    }

    return this.mapDbAssetToModel(data);
  }

  async updateAsset(id: string, updates: Partial<MediaAsset>): Promise<MediaAsset | null> {
    const dbRow = {
      ...this.mapModelToDbAsset(updates),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('media_assets')
      .update(dbRow)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) return null;
    return this.mapDbAssetToModel(data);
  }

  async attachHeroMedia(storyId: string, mediaId: string): Promise<void> {
    // 1. Get media asset to extract display attributes
    const asset = await this.getAssetById(mediaId);
    if (!asset) {
      throw new Error(`Cannot attach non-existent media ${mediaId} to story ${storyId}`);
    }

    // 2. Update media asset to mark primary
    await this.updateAsset(mediaId, {
      storyId,
      isPrimary: true,
    });

    // 3. Update story row with hero_media_id and standard hero fields for backward compatibility
    const { error } = await this.client
      .from('stories')
      .update({
        hero_media_id: mediaId,
        hero_image_url: asset.storageUrl,
        hero_image_alt: asset.altText || null,
        hero_image_caption: asset.caption || null,
        hero_image_credit: asset.credit || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId);

    if (error) {
      throw new Error(`Failed to attach hero media to story: ${error.message}`);
    }
  }

  async revokeMedia(id: string, reason: string): Promise<void> {
    await this.updateAsset(id, {
      validationStatus: 'rejected',
      rightsStatus: 'rejected',
    });

    await this.createAuditEvent({
      mediaId: id,
      eventType: 'MEDIA_REVOKED',
      reason,
      actor: 'system',
    });
  }

  async createAuditEvent(event: Omit<MediaAuditEvent, 'id' | 'createdAt'> & { id?: string }): Promise<MediaAuditEvent> {
    const id = event.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const dbRow = {
      id,
      media_id: event.mediaId || null,
      story_id: event.storyId || null,
      event_type: event.eventType,
      reason: event.reason,
      source: event.source || null,
      actor: event.actor || 'system',
      old_media_id: event.oldMediaId || null,
      new_media_id: event.newMediaId || null,
      metadata: event.metadata || {},
      created_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('media_audit_events')
      .insert(dbRow)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create media audit event: ${error.message}`);
    }

    return {
      id: data.id,
      mediaId: data.media_id,
      storyId: data.story_id,
      eventType: data.event_type,
      reason: data.reason,
      source: data.source,
      actor: data.actor,
      oldMediaId: data.old_media_id,
      newMediaId: data.new_media_id,
      metadata: data.metadata,
      createdAt: data.created_at,
    };
  }

  async getAuditEvents(mediaId?: string, storyId?: string, limit = 50): Promise<MediaAuditEvent[]> {
    let query = this.client
      .from('media_audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (mediaId) query = query.eq('media_id', mediaId);
    if (storyId) query = query.eq('story_id', storyId);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      mediaId: d.media_id,
      storyId: d.story_id,
      eventType: d.event_type,
      reason: d.reason,
      source: d.source,
      actor: d.actor,
      oldMediaId: d.old_media_id,
      newMediaId: d.new_media_id,
      metadata: d.metadata,
      createdAt: d.created_at,
    }));
  }

  async enqueueJob(job: Omit<MediaProcessingJob, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MediaProcessingJob> {
    const id = job.id || `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const dbRow = {
      id,
      story_id: job.storyId || null,
      media_id: job.mediaId || null,
      job_type: job.jobType,
      status: job.status || 'queued',
      attempts: job.attempts || 0,
      max_attempts: job.maxAttempts || 3,
      scheduled_for: job.scheduledFor || new Date().toISOString(),
      last_error: job.lastError || null,
      payload: job.payload || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('media_processing_queue')
      .insert(dbRow)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to enqueue media job: ${error.message}`);
    }

    return {
      id: data.id,
      storyId: data.story_id,
      mediaId: data.media_id,
      jobType: data.job_type,
      status: data.status,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      scheduledFor: data.scheduled_for,
      lastError: data.last_error,
      payload: data.payload,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getNextPendingJobs(limit = 5): Promise<MediaProcessingJob[]> {
    const { data, error } = await this.client
      .from('media_processing_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data.map(d => ({
      id: d.id,
      storyId: d.story_id,
      mediaId: d.media_id,
      jobType: d.job_type,
      status: d.status,
      attempts: d.attempts,
      maxAttempts: d.max_attempts,
      scheduledFor: d.scheduled_for,
      lastError: d.last_error,
      payload: d.payload,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  }

  async updateJobStatus(id: string, status: MediaJobStatus, lastError?: string): Promise<void> {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (lastError !== undefined) {
      updates.last_error = lastError;
    }

    await this.client
      .from('media_processing_queue')
      .update(updates)
      .eq('id', id);
  }

  async getQueueDepth(): Promise<number> {
    const { count, error } = await this.client
      .from('media_processing_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['queued', 'processing']);

    if (error) return 0;
    return count || 0;
  }

  async getOldestPendingJobAgeSec(): Promise<number | null> {
    const { data, error } = await this.client
      .from('media_processing_queue')
      .select('created_at')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return Math.floor((Date.now() - Date.parse(data.created_at)) / 1000);
  }

  async getOrphanMedia(limit = 50): Promise<MediaAsset[]> {
    const { data, error } = await this.client
      .from('media_assets')
      .select('*')
      .is('story_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(d => this.mapDbAssetToModel(d));
  }

  async getStoriesWithoutHeroMedia(limit = 50): Promise<Array<{ id: string; title: string; slug: string; category: string }>> {
    const { data, error } = await this.client
      .from('stories')
      .select('id, title, slug, category_id')
      .is('hero_media_id', null)
      .eq('status', 'published')
      .limit(limit);

    if (error || !data) return [];
    return data.map(d => ({
      id: d.id,
      title: d.title,
      slug: d.slug,
      category: d.category_id,
    }));
  }

  async getRightsDistribution(): Promise<Record<string, number>> {
    const { data, error } = await this.client
      .from('media_assets')
      .select('rights_status');

    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.rights_status] = (counts[row.rights_status] || 0) + 1;
    }
    return counts;
  }
}
