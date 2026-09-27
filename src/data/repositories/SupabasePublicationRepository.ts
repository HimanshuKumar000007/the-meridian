/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Story, StoryUpdate } from '../../types/story';
import type { StoryLifecycleDecision } from '../../types/lifecycle';
import type { NewsValidationResult } from '../../types/validation';
import type { ExtractedNewsCandidate } from '../../types/extraction';
import type {
  PublicationDecisionResult,
  PublicationEvent,
  PublicationQueueItem,
  PublicationQueueStatus,
  PublicationRun,
  PublicationTelemetry,
} from '../../types/publishing';
import type { PublicationRepository } from './PublicationRepository';
import { mapDatabaseStoryToNewsStory, type DatabaseStoryRow } from '../mappers/storyMapper';

export class SupabasePublicationRepository implements PublicationRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  public async getQueuedItems(limit = 10): Promise<PublicationQueueItem[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('publication_queue')
      .select('*')
      .in('status', ['queued', 'processing'])
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !data) {
      console.error('[SupabasePublicationRepository] getQueuedItems error:', error?.message);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      storyId: row.story_id,
      lifecycleEventId: row.lifecycle_event_id,
      priority: row.priority,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      scheduledFor: row.scheduled_for,
      lastAttemptAt: row.last_attempt_at,
      lastError: row.last_error,
      contentHash: row.content_hash,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public async getQueueItemById(id: string): Promise<PublicationQueueItem | null> {
    const { data, error } = await this.client
      .from('publication_queue')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      storyId: data.story_id,
      lifecycleEventId: data.lifecycle_event_id,
      priority: data.priority,
      status: data.status,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      scheduledFor: data.scheduled_for,
      lastAttemptAt: data.last_attempt_at,
      lastError: data.last_error,
      contentHash: data.content_hash,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  public async getStoryById(id: string): Promise<Story | null> {
    const { data, error } = await this.client
      .from('stories')
      .select(`
        *,
        author:authors(*),
        category:categories(*),
        subcategory:subcategories(*),
        sources:story_sources(*),
        updates:story_updates(*),
        facts:story_facts(*),
        corrections:story_corrections(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return mapDatabaseStoryToNewsStory(data as DatabaseStoryRow);
  }

  public async getStoryBySlug(slug: string): Promise<Story | null> {
    const { data, error } = await this.client
      .from('stories')
      .select(`
        *,
        author:authors(*),
        category:categories(*),
        subcategory:subcategories(*),
        sources:story_sources(*),
        updates:story_updates(*),
        facts:story_facts(*),
        corrections:story_corrections(*)
      `)
      .eq('slug', slug.toLowerCase().trim())
      .maybeSingle();

    if (error || !data) return null;
    return mapDatabaseStoryToNewsStory(data as DatabaseStoryRow);
  }

  public async getLifecycleEventById(id: string): Promise<StoryLifecycleDecision | null> {
    const { data, error } = await this.client
      .from('story_lifecycle_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      storyId: data.story_id,
      clusterId: data.cluster_id,
      action: data.action,
      matchConfidence: data.match_confidence,
      matchReason: data.match_reason,
      reason: data.reason,
      changedFields: data.changed_fields || [],
      extractionId: data.extraction_id,
      validationId: data.validation_id,
      lifecycleVersion: data.lifecycle_version,
      createdAt: data.created_at,
    };
  }

  public async getValidationById(id: string): Promise<NewsValidationResult | null> {
    const { data, error } = await this.client
      .from('news_validations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      extractionId: data.extraction_id,
      status: data.status,
      overallScore: data.overall_score || 0.9,
      issues: data.issues || [],
      validatedFields: data.validated_fields || {},
      rejectedFields: data.rejected_fields || [],
      claimCoverage: data.claim_coverage || 1.0,
      sourceCoverage: data.source_coverage || 1.0,
      categoryValidation: data.category_validation || {
        expectedCategory: '',
        extractedCategory: '',
        status: 'match',
        confidence: 1.0,
      },
      dateValidation: data.date_validation || { status: 'valid' },
      numberValidation: data.number_validation || {
        numbersChecked: 0,
        numbersPassed: 0,
        status: 'valid',
      },
      quoteValidation: data.quote_validation || {
        quotesChecked: 0,
        quotesPassed: 0,
        status: 'valid',
      },
      entityValidation: data.entity_validation || {
        entitiesChecked: 0,
        entitiesPassed: 0,
        status: 'valid',
      },
      originalityCheck: data.originality_check || {
        copyRiskScore: 0,
        status: 'original',
      },
      sensitiveTopicFlags: data.sensitive_topic_flags || [],
      validatorVersion: data.validator_version || '1.0.0',
      inputHash: data.input_hash || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
    };
  }

  public async getExtractionById(id: string): Promise<ExtractedNewsCandidate | null> {
    const { data, error } = await this.client
      .from('news_extractions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      discoveryItemId: data.discovery_item_id,
      title: data.title || '',
      dek: data.dek || '',
      summary: data.summary || '',
      summaryPoints: data.summary_points || [],
      category: data.category || 'technology',
      subcategory: data.subcategory || '',
      classificationConfidence: data.classification_confidence || 0.95,
      topics: data.topics || [],
      status: 'normal',
      publishedAt: data.created_at,
      eventDate: data.event_date || null,
      author: data.author || 'The Meridian Editorial Staff',
      entities: data.entities || [],
      facts: data.facts || [],
      timelineCandidates: data.timeline_candidates || [],
      contentBlocks: data.content || [],
      sources: data.sources || [],
      heroImage: data.hero_image || null,
      sourceEvidence: data.source_evidence || [],
      overallConfidence: data.overall_confidence || 0.95,
      confidenceLevel: 'high',
      hasConflicts: data.has_conflicts || false,
      extractionStatus: data.status || 'completed',
      model: data.model || 'nvidia',
      promptVersion: data.prompt_version || '1.0.0',
      inputHash: data.input_hash || '',
      outputHash: data.output_hash || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
    };
  }

  public async saveQueueItem(item: PublicationQueueItem): Promise<PublicationQueueItem> {
    const payload = {
      id: item.id,
      story_id: item.storyId,
      lifecycle_event_id: item.lifecycleEventId || null,
      priority: item.priority,
      status: item.status,
      attempts: item.attempts,
      max_attempts: item.maxAttempts,
      scheduled_for: item.scheduledFor || null,
      last_attempt_at: item.lastAttemptAt || null,
      last_error: item.lastError || null,
      content_hash: item.contentHash || null,
      metadata: item.metadata || {},
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };

    const { error } = await this.client.from('publication_queue').upsert(payload);
    if (error) {
      console.error('[SupabasePublicationRepository] saveQueueItem error:', error.message);
      throw error;
    }
    return item;
  }

  public async updateQueueItemStatus(
    id: string,
    status: PublicationQueueStatus,
    lastError?: string
  ): Promise<void> {
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (lastError) {
      payload.last_error = lastError;
      payload.last_attempt_at = new Date().toISOString();
      const { data } = await this.client
        .from('publication_queue')
        .select('attempts')
        .eq('id', id)
        .maybeSingle();
      payload.attempts = (data?.attempts || 0) + 1;
    }

    await this.client.from('publication_queue').update(payload).eq('id', id);
  }

  public async publishStory(
    story: Story,
    decision: PublicationDecisionResult,
    event: PublicationEvent
  ): Promise<Story> {
    const now = new Date().toISOString();

    // 1. Record publication event first (maintains consistency if event write fails)
    await this.recordPublicationEvent(event);

    // 2. Transition story to published
    const { error: storyError } = await this.client
      .from('stories')
      .update({
        status: 'published',
        published_version: decision.publicationVersion || 1,
        published_at: story.published_at || now,
        updated_at: now,
      })
      .eq('id', story.id);

    if (storyError) {
      console.error('[SupabasePublicationRepository] publishStory error:', storyError.message);
      throw storyError;
    }

    const reloaded = await this.getStoryById(story.id);
    return reloaded || { ...story, status: 'published', published_version: decision.publicationVersion };
  }

  public async updatePublishedStory(
    story: Story,
    timelineUpdates: StoryUpdate[],
    decision: PublicationDecisionResult,
    event: PublicationEvent
  ): Promise<Story> {
    const now = new Date().toISOString();
    const newVersion = decision.publicationVersion || (story.published_version || 1) + 1;

    // 1. Record event
    await this.recordPublicationEvent(event);

    // 2. Update story core record
    const { error: storyError } = await this.client
      .from('stories')
      .update({
        status: 'published',
        published_version: newVersion,
        content_version: (story.content_version || 1) + 1,
        updated_at: now,
      })
      .eq('id', story.id);

    if (storyError) throw storyError;

    // 3. Insert any meaningful timeline updates
    if (timelineUpdates && timelineUpdates.length > 0) {
      const inserts = timelineUpdates.map((u) => ({
        id: u.id || `upd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        story_id: story.id,
        timestamp: u.timestamp || now,
        title: u.title || 'Coverage Update',
        body: u.body || u.text || '',
        is_major: Boolean(u.isMajor || u.is_major),
        created_at: now,
      }));

      await this.client.from('story_updates').insert(inserts);
    }

    const reloaded = await this.getStoryById(story.id);
    return reloaded || { ...story, status: 'published', published_version: newVersion };
  }

  public async holdOrRejectStory(
    storyId: string,
    status: 'held' | 'draft',
    event: PublicationEvent
  ): Promise<void> {
    await this.recordPublicationEvent(event);

    await this.client
      .from('stories')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId);
  }

  public async unpublishStory(storyId: string, event: PublicationEvent): Promise<void> {
    await this.recordPublicationEvent(event);

    await this.client
      .from('stories')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId);
  }

  public async recordPublicationEvent(event: PublicationEvent): Promise<PublicationEvent> {
    // Check FK references to ensure data integrity without throwing on manual/detached records
    let validValidationId: string | null = null;
    if (event.validationId) {
      const { data: valExists } = await this.client
        .from('news_validations')
        .select('id')
        .eq('id', event.validationId)
        .maybeSingle();
      if (valExists) validValidationId = event.validationId;
    }

    let validExtractionId: string | null = null;
    if (event.extractionId) {
      const { data: extExists } = await this.client
        .from('news_extractions')
        .select('id')
        .eq('id', event.extractionId)
        .maybeSingle();
      if (extExists) validExtractionId = event.extractionId;
    }

    let validLifecycleId: string | null = null;
    if (event.lifecycleEventId) {
      const { data: lifeExists } = await this.client
        .from('story_lifecycle_events')
        .select('id')
        .eq('id', event.lifecycleEventId)
        .maybeSingle();
      if (lifeExists) validLifecycleId = event.lifecycleEventId;
    }

    const payload = {
      id: event.id,
      story_id: event.storyId,
      lifecycle_event_id: validLifecycleId,
      action: event.action,
      previous_status: event.previousStatus,
      new_status: event.newStatus,
      publication_version: event.publicationVersion,
      reason: event.reason,
      blocking_issues: event.blockingIssues || [],
      validation_id: validValidationId,
      extraction_id: validExtractionId,
      content_hash: event.contentHash || null,
      metadata: {
        ...(event.metadata || {}),
        original_validation_id: event.validationId,
        original_extraction_id: event.extractionId,
        original_lifecycle_id: event.lifecycleEventId,
      },
      published_at: event.publishedAt || null,
      created_at: event.createdAt,
    };

    const { error } = await this.client
      .from('publication_events')
      .upsert(payload, { onConflict: 'story_id,publication_version,action' });

    if (error) {
      console.error('[SupabasePublicationRepository] recordPublicationEvent error:', error.message);
      throw error;
    }
    return event;
  }

  public async getPublicationEventsForStory(storyId: string): Promise<PublicationEvent[]> {
    const { data, error } = await this.client
      .from('publication_events')
      .select('*')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      storyId: row.story_id,
      lifecycleEventId: row.lifecycle_event_id,
      action: row.action,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      publicationVersion: row.publication_version,
      reason: row.reason,
      blockingIssues: row.blocking_issues || [],
      validationId: row.validation_id,
      extractionId: row.extraction_id,
      contentHash: row.content_hash,
      metadata: row.metadata,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    }));
  }

  public async recordPublicationRun(run: PublicationRun): Promise<PublicationRun> {
    const payload = {
      id: run.id,
      started_at: run.startedAt,
      finished_at: run.finishedAt || new Date().toISOString(),
      processed: run.processed,
      published: run.published,
      updated: run.updated,
      held: run.held,
      rejected: run.rejected,
      failed: run.failed,
      errors: run.errors || [],
      metadata: run.metadata || {},
      created_at: run.createdAt,
    };

    const { error } = await this.client.from('publication_runs').insert(payload);
    if (error) {
      console.error('[SupabasePublicationRepository] recordPublicationRun error:', error.message);
    }
    return run;
  }

  public async addStoryCorrection(storyId: string, text: string): Promise<void> {
    const now = new Date().toISOString();
    await this.client.from('story_corrections').insert({
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      story_id: storyId,
      body: text,
      created_at: now,
    });
  }

  public async getPublishedStories(limit = 50): Promise<Story[]> {
    const { data, error } = await this.client
      .from('stories')
      .select(`
        *,
        author:authors(*),
        category:categories(*),
        subcategory:subcategories(*)
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((row: any) => mapDatabaseStoryToNewsStory(row as DatabaseStoryRow));
  }

  public async countPublishedStories(): Promise<number> {
    const { count, error } = await this.client
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    if (error) return 0;
    return count || 0;
  }

  public async getTelemetry(): Promise<PublicationTelemetry> {
    const today = new Date().toISOString().slice(0, 10);

    const { count: pubToday } = await this.client
      .from('publication_events')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'PUBLISH')
      .gte('created_at', `${today}T00:00:00Z`);

    const { count: heldCount } = await this.client
      .from('publication_events')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'HOLD');

    const { count: rejectedCount } = await this.client
      .from('publication_events')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'REJECT');

    const { count: failedCount } = await this.client
      .from('publication_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    const { count: queueDepth } = await this.client
      .from('publication_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    return {
      publishedToday: pubToday || 0,
      updatedToday: 0,
      heldCount: heldCount || 0,
      rejectedCount: rejectedCount || 0,
      failedCount: failedCount || 0,
      queueDepth: queueDepth || 0,
    };
  }
}
