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

export interface PublicationRepository {
  getQueuedItems(limit?: number): Promise<PublicationQueueItem[]>;
  getQueueItemById(id: string): Promise<PublicationQueueItem | null>;
  getStoryById(id: string): Promise<Story | null>;
  getStoryBySlug(slug: string): Promise<Story | null>;
  getLifecycleEventById(id: string): Promise<StoryLifecycleDecision | null>;
  getValidationById(id: string): Promise<NewsValidationResult | null>;
  getExtractionById(id: string): Promise<ExtractedNewsCandidate | null>;

  saveQueueItem(item: PublicationQueueItem): Promise<PublicationQueueItem>;
  updateQueueItemStatus(
    id: string,
    status: PublicationQueueStatus,
    lastError?: string
  ): Promise<void>;

  publishStory(
    story: Story,
    decision: PublicationDecisionResult,
    event: PublicationEvent
  ): Promise<Story>;

  updatePublishedStory(
    story: Story,
    timelineUpdates: StoryUpdate[],
    decision: PublicationDecisionResult,
    event: PublicationEvent
  ): Promise<Story>;

  holdOrRejectStory(
    storyId: string,
    status: 'held' | 'draft',
    event: PublicationEvent
  ): Promise<void>;

  unpublishStory(storyId: string, event: PublicationEvent): Promise<void>;

  recordPublicationEvent(event: PublicationEvent): Promise<PublicationEvent>;
  getPublicationEventsForStory(storyId: string): Promise<PublicationEvent[]>;

  recordPublicationRun(run: PublicationRun): Promise<PublicationRun>;
  addStoryCorrection(storyId: string, text: string): Promise<void>;

  getPublishedStories(limit?: number): Promise<Story[]>;
  countPublishedStories(): Promise<number>;
  getTelemetry(): Promise<PublicationTelemetry>;
}
