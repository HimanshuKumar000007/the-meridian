/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LifecycleRepository } from './LifecycleRepository';
import type { Story, StorySource, StoryUpdate, Fact } from '../../types/story';
import type { ExtractedFact, ExtractedNewsCandidate } from '../../types/extraction';
import type { NewsValidationResult } from '../../types/validation';
import type {
  StoryCluster,
  StoryLifecycleDecision,
  LifecycleCandidateInput,
} from '../../types/lifecycle';
import type { ExistingStoryContext } from '../../services/lifecycle/StoryMatchingEngine';

const CATEGORY_MAP: Record<string, string> = {
  tech: 'cat-tech',
  technology: 'cat-tech',
  ai: 'cat-ai',
  gaming: 'cat-gaming',
  science: 'cat-science',
  space: 'cat-space',
  business: 'cat-business',
  world: 'cat-world',
  culture: 'cat-entertainment',
  entertainment: 'cat-entertainment',
  cybersecurity: 'cat-cyber',
  cyber: 'cat-cyber',
  apps: 'cat-apps',
  hardware: 'cat-hardware',
};

export class SupabaseLifecycleRepository implements LifecycleRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  public async findLifecycleEvent(
    extractionId: string,
    validationId: string,
    lifecycleVersion: string
  ): Promise<StoryLifecycleDecision | null> {
    try {
      const { data, error } = await this.client
        .from('story_lifecycle_events')
        .select('*')
        .eq('extraction_id', extractionId)
        .eq('validation_id', validationId)
        .eq('lifecycle_version', lifecycleVersion)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseLifecycleRepository] findLifecycleEvent error:', error.message);
        return null;
      }
      if (!data) return null;

      return {
        id: data.id,
        action: data.action,
        storyId: data.story_id,
        clusterId: data.cluster_id,
        matchConfidence: data.match_confidence,
        matchReason: data.match_reason,
        reason: data.reason,
        changedFields: data.changed_fields || [],
        extractionId: data.extraction_id,
        validationId: data.validation_id,
        lifecycleVersion: data.lifecycle_version,
        createdAt: data.created_at,
      };
    } catch (err: any) {
      console.error('[SupabaseLifecycleRepository] findLifecycleEvent exception:', err.message);
      return null;
    }
  }

  public async saveLifecycleDecision(decision: StoryLifecycleDecision): Promise<void> {
    try {
      const { error } = await this.client
        .from('story_lifecycle_events')
        .upsert(
          {
            id: decision.id,
            story_id: decision.storyId || null,
            cluster_id: decision.clusterId || null,
            action: decision.action,
            extraction_id: decision.extractionId || null,
            validation_id: decision.validationId || null,
            match_confidence: decision.matchConfidence,
            match_reason: decision.matchReason,
            reason: decision.reason,
            changed_fields: decision.changedFields,
            lifecycle_version: decision.lifecycleVersion,
            created_at: decision.createdAt,
          },
          {
            onConflict: 'extraction_id,validation_id,lifecycle_version',
          }
        );

      if (error) {
        console.error('[SupabaseLifecycleRepository] saveLifecycleDecision error:', error.message);
        throw error;
      }
    } catch (err: any) {
      console.error('[SupabaseLifecycleRepository] saveLifecycleDecision exception:', err.message);
      throw err;
    }
  }

  public async findClusterByKey(clusterKey: string): Promise<StoryCluster | null> {
    try {
      const { data, error } = await this.client
        .from('story_clusters')
        .select('*')
        .eq('cluster_key', clusterKey)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseLifecycleRepository] findClusterByKey error:', error.message);
        return null;
      }
      if (!data) return null;

      return {
        id: data.id,
        clusterKey: data.cluster_key,
        canonicalTitle: data.canonical_title,
        primaryCategory: data.primary_category,
        primarySubcategory: data.primary_subcategory,
        eventDate: data.event_date,
        status: data.status,
        metadata: data.metadata || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err: any) {
      console.error('[SupabaseLifecycleRepository] findClusterByKey exception:', err.message);
      return null;
    }
  }

  public async saveCluster(cluster: StoryCluster): Promise<void> {
    try {
      const { error } = await this.client
        .from('story_clusters')
        .upsert(
          {
            id: cluster.id,
            cluster_key: cluster.clusterKey,
            canonical_title: cluster.canonicalTitle,
            primary_category: cluster.primaryCategory,
            primary_subcategory: cluster.primarySubcategory,
            event_date: cluster.eventDate,
            status: cluster.status,
            metadata: cluster.metadata || {},
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'cluster_key',
          }
        );

      if (error) {
        console.error('[SupabaseLifecycleRepository] saveCluster error:', error.message);
        throw error;
      }
    } catch (err: any) {
      console.error('[SupabaseLifecycleRepository] saveCluster exception:', err.message);
      throw err;
    }
  }

  public async findExistingStories(category?: string): Promise<ExistingStoryContext[]> {
    try {
      let query = this.client
        .from('stories')
        .select('*, categories(name, slug), story_sources(*), story_clusters(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data, error } = await query;
      if (error) {
        console.error('[SupabaseLifecycleRepository] findExistingStories error:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        story: {
          id: row.id,
          slug: row.slug,
          title: row.title,
          dek: row.dek,
          summary: row.summary,
          summary_points: row.summary_points,
          category: row.categories?.name?.toLowerCase() || 'general',
          author: {
            id: row.author_id,
            name: 'Editorial Staff',
            role: 'Correspondent',
          },
          status: row.status,
          hero_image: {
            url: row.hero_image_url || '',
            alt: row.hero_image_alt || '',
          },
          content: row.content || [],
          published_at: row.published_at,
          updated_at: row.updated_at,
          cluster_id: row.cluster_id,
          content_version: row.content_version,
          reading_time_minutes: 3,
        } as Story,
        cluster: row.story_clusters ? {
          id: row.story_clusters.id,
          clusterKey: row.story_clusters.cluster_key,
          canonicalTitle: row.story_clusters.canonical_title,
          primaryCategory: row.story_clusters.primary_category,
          primarySubcategory: row.story_clusters.primary_subcategory,
          eventDate: row.story_clusters.event_date,
          status: row.story_clusters.status,
          createdAt: row.story_clusters.created_at,
          updatedAt: row.story_clusters.updated_at,
        } : null,
        sources: (row.story_sources || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          is_primary: s.is_primary,
        })),
      }));
    } catch (err: any) {
      console.error('[SupabaseLifecycleRepository] findExistingStories exception:', err.message);
      return [];
    }
  }

  public async getStoryById(id: string): Promise<Story | null> {
    try {
      const { data, error } = await this.client
        .from('stories')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return data as Story;
    } catch {
      return null;
    }
  }

  public async getStoryFacts(storyId: string): Promise<Fact[]> {
    try {
      const { data } = await this.client
        .from('story_facts')
        .select('*')
        .eq('story_id', storyId)
        .order('display_order', { ascending: true });

      return (data || []).map((f: any) => ({
        id: f.id,
        label: f.label,
        value: f.value,
      }));
    } catch {
      return [];
    }
  }

  public async getStorySources(storyId: string): Promise<StorySource[]> {
    try {
      const { data } = await this.client
        .from('story_sources')
        .select('*')
        .eq('story_id', storyId);

      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        is_primary: s.is_primary,
      }));
    } catch {
      return [];
    }
  }

  public async createStory(
    story: Story,
    clusterId?: string | null,
    facts?: ExtractedFact[],
    sources?: Array<{ name: string; url: string }>
  ): Promise<Story> {
    const categoryKey = (story.category || 'world').toLowerCase();
    const categoryId = CATEGORY_MAP[categoryKey] || 'cat-world';
    const authorId = 'auth-meridian-desk';

    const insertPayload = {
      id: story.id,
      slug: story.slug,
      title: story.title,
      dek: story.dek || null,
      summary: story.summary,
      summary_points: story.summary_points || [],
      category_id: categoryId,
      author_id: authorId,
      status: 'draft', // STRICT INVARIANT: Always draft on creation
      hero_image_url: story.hero_image?.url || null,
      hero_image_alt: story.hero_image?.alt || story.title,
      content: story.content || [],
      cluster_id: clusterId || null,
      content_version: 1,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { error: storyErr } = await this.client.from('stories').insert(insertPayload);
    if (storyErr) {
      console.error('[SupabaseLifecycleRepository] createStory error:', storyErr.message);
      throw storyErr;
    }

    // Insert facts
    if (facts && facts.length > 0) {
      const factRows = facts.map((f, i) => ({
        id: `fact_${story.id}_${i}`,
        story_id: story.id,
        label: f.label,
        value: f.value,
        display_order: i,
      }));
      await this.client.from('story_facts').insert(factRows);
    }

    // Insert sources
    if (sources && sources.length > 0) {
      const sourceRows = sources.map((s, i) => ({
        id: `src_${story.id}_${i}`,
        story_id: story.id,
        name: s.name,
        url: s.url,
        is_primary: i === 0,
        display_order: i,
      }));
      await this.client.from('story_sources').insert(sourceRows);
    }

    return {
      ...story,
      cluster_id: clusterId || undefined,
      status: 'draft',
      content_version: 1,
    };
  }

  public async updateStory(
    storyId: string,
    changes: Partial<Story>,
    newFacts?: ExtractedFact[],
    newSources?: Array<{ name: string; url: string }>,
    updateEntry?: StoryUpdate
  ): Promise<void> {
    const existing = await this.getStoryById(storyId);
    const newVersion = (existing?.content_version || 1) + 1;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      content_version: newVersion,
    };

    if (changes.summary) updatePayload.summary = changes.summary;
    if (changes.summary_points) updatePayload.summary_points = changes.summary_points;
    if (changes.content) updatePayload.content = changes.content;

    const { error: updErr } = await this.client
      .from('stories')
      .update(updatePayload)
      .eq('id', storyId);

    if (updErr) {
      console.error('[SupabaseLifecycleRepository] updateStory error:', updErr.message);
      throw updErr;
    }

    // Add new facts
    if (newFacts && newFacts.length > 0) {
      const factRows = newFacts.map((f, i) => ({
        id: `fact_${storyId}_upd_${Date.now()}_${i}`,
        story_id: storyId,
        label: f.label,
        value: f.value,
      }));
      await this.client.from('story_facts').insert(factRows);
    }

    // Add new sources
    if (newSources && newSources.length > 0) {
      const sourceRows = newSources.map((s, i) => ({
        id: `src_${storyId}_upd_${Date.now()}_${i}`,
        story_id: storyId,
        name: s.name,
        url: s.url,
        is_primary: false,
      }));
      await this.client.from('story_sources').insert(sourceRows);
    }

    // Add timeline update entry
    if (updateEntry) {
      const updateRow = {
        id: updateEntry.id || `upd_${storyId}_${Date.now()}`,
        story_id: storyId,
        title: updateEntry.title || 'Developing Story Update',
        body: updateEntry.body,
        is_major: updateEntry.is_major ?? false,
        timestamp: updateEntry.timestamp || new Date().toISOString(),
      };
      await this.client.from('story_updates').insert(updateRow);
    }
  }

  public async attachSource(storyId: string, source: { name: string; url: string }): Promise<void> {
    const sourceRow = {
      id: `src_${storyId}_${Date.now()}`,
      story_id: storyId,
      name: source.name,
      url: source.url,
      is_primary: false,
    };
    await this.client.from('story_sources').insert(sourceRow);
  }

  public async getPendingCandidates(limit: number = 10): Promise<LifecycleCandidateInput[]> {
    try {
      // 1. Fetch valid validations
      const { data: validations, error: valErr } = await this.client
        .from('news_validations')
        .select('*')
        .eq('status', 'valid')
        .order('created_at', { ascending: false })
        .limit(limit * 2);

      if (valErr || !validations) return [];

      const candidateInputs: LifecycleCandidateInput[] = [];

      for (const val of validations) {
        // Check if already processed in story_lifecycle_events
        const { data: existingEv } = await this.client
          .from('story_lifecycle_events')
          .select('id')
          .eq('validation_id', val.id)
          .maybeSingle();

        if (existingEv) continue;

        // Fetch extraction
        const { data: ext } = await this.client
          .from('news_extractions')
          .select('*')
          .eq('id', val.extraction_id)
          .maybeSingle();

        if (!ext) continue;

        const extractedSources: Array<{ name: string; url: string }> = [];
        if (Array.isArray(ext.source_evidence)) {
          const seenUrls = new Set<string>();
          for (const se of ext.source_evidence) {
            const url = se.url || se.sourceUrl;
            const name = se.source || se.name || ext.category || 'News Source';
            if (url && /^https?:\/\//i.test(url) && !seenUrls.has(url)) {
              seenUrls.add(url);
              extractedSources.push({ name, url });
            }
          }
        }

        candidateInputs.push({
          extraction: {
            id: ext.id,
            discoveryItemId: ext.discovery_item_id,
            title: ext.title || '',
            dek: ext.dek || '',
            summary: ext.summary || '',
            summaryPoints: ext.summary_points || [],
            category: ext.category || 'world',
            subcategory: ext.subcategory || '',
            classificationConfidence: ext.classification_confidence || 0.9,
            topics: [],
            status: 'normal',
            publishedAt: ext.created_at,
            eventDate: null,
            author: 'Editorial Desk',
            entities: ext.entities || [],
            facts: ext.facts || [],
            timelineCandidates: ext.timeline_candidates || [],
            contentBlocks: ext.content || [],
            sources: extractedSources,
            heroImage: null,
            sourceEvidence: ext.source_evidence || [],
            overallConfidence: ext.overall_confidence || 0.9,
            confidenceLevel: 'high',
            hasConflicts: ext.has_conflicts || false,
            extractionStatus: ext.status,
            model: ext.model,
            promptVersion: ext.prompt_version,
            inputHash: ext.input_hash,
            outputHash: ext.output_hash || '',
            createdAt: ext.created_at,
            updatedAt: ext.updated_at,
          },
          validation: val,
        });

        if (candidateInputs.length >= limit) break;
      }

      return candidateInputs;
    } catch (err: any) {
      console.error('[SupabaseLifecycleRepository] getPendingCandidates exception:', err.message);
      return [];
    }
  }
}
