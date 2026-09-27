/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LifecycleRepository } from './LifecycleRepository';
import type { Story, StorySource, StoryUpdate, Fact } from '../../types/story';
import type { ExtractedFact } from '../../types/extraction';
import type {
  StoryCluster,
  StoryLifecycleDecision,
  LifecycleCandidateInput,
} from '../../types/lifecycle';
import type { ExistingStoryContext } from '../../services/lifecycle/StoryMatchingEngine';

export class MockLifecycleRepository implements LifecycleRepository {
  public stories: Map<string, Story> = new Map();
  public clusters: Map<string, StoryCluster> = new Map();
  public lifecycleEvents: Map<string, StoryLifecycleDecision> = new Map();
  public facts: Map<string, Fact[]> = new Map();
  public sources: Map<string, StorySource[]> = new Map();
  public updates: Map<string, StoryUpdate[]> = new Map();
  public pendingCandidates: LifecycleCandidateInput[] = [];

  constructor(initialStories: Story[] = [], initialClusters: StoryCluster[] = []) {
    for (const s of initialStories) {
      this.stories.set(s.id, s);
    }
    for (const c of initialClusters) {
      this.clusters.set(c.id, c);
    }
  }

  public async findLifecycleEvent(
    extractionId: string,
    validationId: string,
    lifecycleVersion: string
  ): Promise<StoryLifecycleDecision | null> {
    for (const ev of this.lifecycleEvents.values()) {
      if (
        ev.extractionId === extractionId &&
        ev.validationId === validationId &&
        ev.lifecycleVersion === lifecycleVersion
      ) {
        return ev;
      }
    }
    return null;
  }

  public async saveLifecycleDecision(decision: StoryLifecycleDecision): Promise<void> {
    this.lifecycleEvents.set(decision.id, decision);
  }

  public async findClusterByKey(clusterKey: string): Promise<StoryCluster | null> {
    for (const c of this.clusters.values()) {
      if (c.clusterKey === clusterKey) {
        return c;
      }
    }
    return null;
  }

  public async saveCluster(cluster: StoryCluster): Promise<void> {
    this.clusters.set(cluster.id, cluster);
  }

  public async findExistingStories(category?: string): Promise<ExistingStoryContext[]> {
    const list: ExistingStoryContext[] = [];
    for (const story of this.stories.values()) {
      if (category && story.category !== category) continue;
      const cluster = story.cluster_id ? this.clusters.get(story.cluster_id) : null;
      const sources = this.sources.get(story.id) || [];
      list.push({ story, cluster, sources });
    }
    return list;
  }

  public async getStoryById(id: string): Promise<Story | null> {
    return this.stories.get(id) || null;
  }

  public async getStoryFacts(storyId: string): Promise<Fact[]> {
    return this.facts.get(storyId) || [];
  }

  public async getStorySources(storyId: string): Promise<StorySource[]> {
    return this.sources.get(storyId) || [];
  }

  public async createStory(
    story: Story,
    clusterId?: string | null,
    facts?: ExtractedFact[],
    sources?: Array<{ name: string; url: string }>
  ): Promise<Story> {
    const newStory: Story = {
      ...story,
      cluster_id: clusterId || undefined,
      status: 'draft', // STRICT INVARIANT: Always draft on creation
      content_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.stories.set(newStory.id, newStory);

    if (facts && facts.length > 0) {
      const storyFacts: Fact[] = facts.map((f, i) => ({
        id: `fact_${newStory.id}_${i}`,
        label: f.label,
        value: f.value,
      }));
      this.facts.set(newStory.id, storyFacts);
    }

    if (sources && sources.length > 0) {
      const storySources: StorySource[] = sources.map((s, i) => ({
        id: `src_${newStory.id}_${i}`,
        name: s.name,
        url: s.url,
        is_primary: i === 0,
      }));
      this.sources.set(newStory.id, storySources);
    }

    return newStory;
  }

  public async updateStory(
    storyId: string,
    changes: Partial<Story>,
    newFacts?: ExtractedFact[],
    newSources?: Array<{ name: string; url: string }>,
    updateEntry?: StoryUpdate
  ): Promise<void> {
    const existing = this.stories.get(storyId);
    if (!existing) return;

    const currentVersion = existing.content_version || 1;
    const updated: Story = {
      ...existing,
      ...changes,
      slug: existing.slug, // STRICT INVARIANT: Slugs NEVER change on update
      content_version: currentVersion + 1,
      updated_at: new Date().toISOString(),
    };
    this.stories.set(storyId, updated);

    // Merge new facts
    if (newFacts && newFacts.length > 0) {
      const currentFacts = this.facts.get(storyId) || [];
      const added: Fact[] = newFacts.map((f, i) => ({
        id: `fact_${storyId}_${currentFacts.length + i}`,
        label: f.label,
        value: f.value,
      }));
      this.facts.set(storyId, [...currentFacts, ...added]);
    }

    // Merge new sources
    if (newSources && newSources.length > 0) {
      const currentSources = this.sources.get(storyId) || [];
      const addedSources: StorySource[] = newSources.map((s, i) => ({
        id: `src_${storyId}_${currentSources.length + i}`,
        name: s.name,
        url: s.url,
        is_primary: false,
      }));
      this.sources.set(storyId, [...currentSources, ...addedSources]);
    }

    // Add timeline update entry
    if (updateEntry) {
      const currentUpdates = this.updates.get(storyId) || [];
      this.updates.set(storyId, [updateEntry, ...currentUpdates]);
    }
  }

  public async attachSource(storyId: string, source: { name: string; url: string }): Promise<void> {
    const currentSources = this.sources.get(storyId) || [];
    const newSource: StorySource = {
      id: `src_${storyId}_${currentSources.length}`,
      name: source.name,
      url: source.url,
      is_primary: false,
    };
    this.sources.set(storyId, [...currentSources, newSource]);
  }

  public async getPendingCandidates(limit: number = 10): Promise<LifecycleCandidateInput[]> {
    return this.pendingCandidates.slice(0, limit);
  }
}
