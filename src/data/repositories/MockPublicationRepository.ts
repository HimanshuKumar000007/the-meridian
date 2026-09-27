/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

export class MockPublicationRepository implements PublicationRepository {
  public stories: Map<string, Story> = new Map();
  public queueItems: Map<string, PublicationQueueItem> = new Map();
  public publicationEvents: PublicationEvent[] = [];
  public publicationRuns: PublicationRun[] = [];
  public corrections: Map<string, Array<{ id: string; date: string; text: string }>> = new Map();
  public validations: Map<string, NewsValidationResult> = new Map();
  public extractions: Map<string, ExtractedNewsCandidate> = new Map();
  public lifecycleDecisions: Map<string, StoryLifecycleDecision> = new Map();

  // Test simulation hook
  public shouldFailNextPublish: boolean = false;

  public async getQueuedItems(limit = 10): Promise<PublicationQueueItem[]> {
    const now = Date.now();
    return Array.from(this.queueItems.values())
      .filter((q) => {
        if (q.status !== 'queued' && q.status !== 'processing') return false;
        if (q.scheduledFor && Date.parse(q.scheduledFor) > now) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority || Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .slice(0, limit);
  }

  public async getQueueItemById(id: string): Promise<PublicationQueueItem | null> {
    return this.queueItems.get(id) || null;
  }

  public async getStoryById(id: string): Promise<Story | null> {
    return this.stories.get(id) || null;
  }

  public async getStoryBySlug(slug: string): Promise<Story | null> {
    const clean = slug.toLowerCase().trim();
    for (const story of this.stories.values()) {
      if (story.slug.toLowerCase() === clean) return story;
    }
    return null;
  }

  public async getLifecycleEventById(id: string): Promise<StoryLifecycleDecision | null> {
    return this.lifecycleDecisions.get(id) || null;
  }

  public async getValidationById(id: string): Promise<NewsValidationResult | null> {
    return this.validations.get(id) || null;
  }

  public async getExtractionById(id: string): Promise<ExtractedNewsCandidate | null> {
    return this.extractions.get(id) || null;
  }

  public async saveQueueItem(item: PublicationQueueItem): Promise<PublicationQueueItem> {
    this.queueItems.set(item.id, { ...item });
    return item;
  }

  public async updateQueueItemStatus(
    id: string,
    status: PublicationQueueStatus,
    lastError?: string
  ): Promise<void> {
    const item = this.queueItems.get(id);
    if (item) {
      item.status = status;
      item.updatedAt = new Date().toISOString();
      if (lastError) {
        item.lastError = lastError;
        item.attempts += 1;
        item.lastAttemptAt = new Date().toISOString();
      }
    }
  }

  public async publishStory(
    story: Story,
    decision: PublicationDecisionResult,
    event: PublicationEvent
  ): Promise<Story> {
    if (this.shouldFailNextPublish) {
      this.shouldFailNextPublish = false;
      throw new Error('Simulated transient publication database failure.');
    }

    const updatedStory: Story = {
      ...story,
      status: 'published',
      lifecycleStatus: 'published',
      published_version: decision.publicationVersion || 1,
      publishedVersion: decision.publicationVersion || 1,
      published_at: story.published_at || new Date().toISOString(),
      publishedAt: story.publishedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.stories.set(updatedStory.id, updatedStory);
    await this.recordPublicationEvent(event);
    return updatedStory;
  }

  public async updatePublishedStory(
    story: Story,
    timelineUpdates: StoryUpdate[],
    decision: PublicationDecisionResult,
    event: PublicationEvent
  ): Promise<Story> {
    if (this.shouldFailNextPublish) {
      this.shouldFailNextPublish = false;
      throw new Error('Simulated transient publication database failure.');
    }

    const existingUpdates = story.updates || [];
    const mergedUpdates = [...existingUpdates, ...timelineUpdates];

    const updatedStory: Story = {
      ...story,
      status: 'published',
      lifecycleStatus: 'published',
      published_version: decision.publicationVersion,
      publishedVersion: decision.publicationVersion,
      content_version: (story.content_version || 1) + 1,
      updates: mergedUpdates,
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.stories.set(updatedStory.id, updatedStory);
    await this.recordPublicationEvent(event);
    return updatedStory;
  }

  public async holdOrRejectStory(
    storyId: string,
    status: 'held' | 'draft',
    event: PublicationEvent
  ): Promise<void> {
    const story = this.stories.get(storyId);
    if (story) {
      story.status = status;
      story.lifecycleStatus = status;
      story.updated_at = new Date().toISOString();
      this.stories.set(storyId, story);
    }
    await this.recordPublicationEvent(event);
  }

  public async unpublishStory(storyId: string, event: PublicationEvent): Promise<void> {
    const story = this.stories.get(storyId);
    if (story) {
      story.status = 'archived';
      story.lifecycleStatus = 'archived';
      story.updated_at = new Date().toISOString();
      this.stories.set(storyId, story);
    }
    await this.recordPublicationEvent(event);
  }

  public async recordPublicationEvent(event: PublicationEvent): Promise<PublicationEvent> {
    this.publicationEvents.push({ ...event });
    return event;
  }

  public async getPublicationEventsForStory(storyId: string): Promise<PublicationEvent[]> {
    return this.publicationEvents.filter((e) => e.storyId === storyId);
  }

  public async recordPublicationRun(run: PublicationRun): Promise<PublicationRun> {
    this.publicationRuns.push({ ...run });
    return run;
  }

  public async addStoryCorrection(storyId: string, text: string): Promise<void> {
    const existing = this.corrections.get(storyId) || [];
    existing.push({
      id: `corr-${Date.now()}`,
      date: new Date().toISOString(),
      text,
    });
    this.corrections.set(storyId, existing);

    const story = this.stories.get(storyId);
    if (story) {
      story.corrections = existing;
    }
  }

  public async getPublishedStories(limit = 50): Promise<Story[]> {
    return Array.from(this.stories.values())
      .filter((s) => s.status === 'published')
      .slice(0, limit);
  }

  public async countPublishedStories(): Promise<number> {
    return Array.from(this.stories.values()).filter((s) => s.status === 'published').length;
  }

  public async getTelemetry(): Promise<PublicationTelemetry> {
    const today = new Date().toISOString().slice(0, 10);
    const publishedToday = this.publicationEvents.filter(
      (e) => e.action === 'PUBLISH' && e.createdAt.startsWith(today)
    ).length;
    const heldCount = this.publicationEvents.filter((e) => e.action === 'HOLD').length;
    const rejectedCount = this.publicationEvents.filter((e) => e.action === 'REJECT').length;
    const failedCount = Array.from(this.queueItems.values()).filter(
      (q) => q.status === 'failed'
    ).length;
    const queueDepth = Array.from(this.queueItems.values()).filter(
      (q) => q.status === 'queued'
    ).length;

    return {
      publishedToday,
      updatedToday: 0,
      heldCount,
      rejectedCount,
      failedCount,
      queueDepth,
    };
  }
}
