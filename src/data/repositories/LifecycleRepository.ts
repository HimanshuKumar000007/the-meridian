/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story, StorySource, StoryUpdate, Fact } from '../../types/story';
import type { ExtractedFact } from '../../types/extraction';
import type {
  StoryCluster,
  StoryLifecycleDecision,
  LifecycleCandidateInput,
} from '../../types/lifecycle';
import type { ExistingStoryContext } from '../../services/lifecycle/StoryMatchingEngine';

export interface LifecycleRepository {
  /**
   * Find an existing lifecycle decision for idempotency check
   */
  findLifecycleEvent(
    extractionId: string,
    validationId: string,
    lifecycleVersion: string
  ): Promise<StoryLifecycleDecision | null>;

  /**
   * Save a lifecycle decision to the audit log
   */
  saveLifecycleDecision(decision: StoryLifecycleDecision): Promise<void>;

  /**
   * Find an existing story cluster by its unique cluster key
   */
  findClusterByKey(clusterKey: string): Promise<StoryCluster | null>;

  /**
   * Save or upsert a story cluster
   */
  saveCluster(cluster: StoryCluster): Promise<void>;

  /**
   * Fetch active existing stories for matching
   */
  findExistingStories(category?: string): Promise<ExistingStoryContext[]>;

  /**
   * Fetch a single story by ID
   */
  getStoryById(id: string): Promise<Story | null>;

  /**
   * Fetch facts for a specific story
   */
  getStoryFacts(storyId: string): Promise<Fact[]>;

  /**
   * Fetch sources for a specific story
   */
  getStorySources(storyId: string): Promise<StorySource[]>;

  /**
   * Atomically create a new story record in 'draft' status
   */
  createStory(
    story: Story,
    clusterId?: string | null,
    facts?: ExtractedFact[],
    sources?: Array<{ name: string; url: string }>
  ): Promise<Story>;

  /**
   * Update an existing story with merged fields, new facts, and update entry
   */
  updateStory(
    storyId: string,
    changes: Partial<Story>,
    newFacts?: ExtractedFact[],
    newSources?: Array<{ name: string; url: string }>,
    updateEntry?: StoryUpdate
  ): Promise<void>;

  /**
   * Attach a newly verified source to an existing story
   */
  attachSource(storyId: string, source: { name: string; url: string }): Promise<void>;

  /**
   * Fetch candidates ready for lifecycle processing (validations with extractions)
   */
  getPendingCandidates(limit?: number): Promise<LifecycleCandidateInput[]>;
}
