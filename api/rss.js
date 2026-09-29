// src/api/rss.ts
import { createClient } from "@supabase/supabase-js";

// src/data/mappers/storyMapper.ts
function formatRelativeTime(dateStr) {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMinutes = Math.floor(diffMs / 6e4);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMinutes < 5) return "Just now";
    if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
    if (diffHours < 24) return `Updated ${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "Recently";
  }
}
function calculateReadTime(content, summary) {
  if (!content || !Array.isArray(content) || content.length === 0) {
    const words = summary.split(/\s+/).length;
    return `${Math.max(2, Math.ceil(words / 40))} min read`;
  }
  let totalWords = 0;
  for (const block of content) {
    if (block.type === "paragraph" && block.text) {
      totalWords += block.text.split(/\s+/).length;
    } else if (block.type === "quote" && block.quote) {
      totalWords += block.quote.split(/\s+/).length;
    } else if (block.type === "list" && Array.isArray(block.items)) {
      totalWords += block.items.join(" ").split(/\s+/).length;
    }
  }
  const minutes = Math.max(2, Math.ceil(totalWords / 180));
  return `${minutes} min read`;
}
function mapDatabaseStoryToNewsStory(row) {
  const author = row.author ? {
    id: row.author.id,
    name: row.author.name,
    slug: row.author.slug || void 0,
    role: row.author.role,
    bio: row.author.bio || void 0,
    avatar: row.author.avatar_url || void 0
  } : {
    id: row.author_id,
    name: "The Meridian Staff",
    role: "Editorial Bureau"
  };
  const heroImage = row.hero_image_url ? {
    url: row.hero_image_url,
    alt: row.hero_image_alt || row.title,
    caption: row.hero_image_caption || void 0,
    credit: row.hero_image_credit || "The Meridian / Editorial Desk"
  } : void 0;
  const categoryName = row.category?.name || "General";
  const subcategoryName = row.subcategory?.name || void 0;
  const sources = row.sources && row.sources.length > 0 ? row.sources.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url || void 0,
    sourceType: s.source_type || "other",
    publishedAt: s.published_at || void 0,
    accessedAt: s.accessed_at || void 0,
    author: s.author || void 0,
    isPrimary: Boolean(s.is_primary)
  })) : void 0;
  const updates = row.updates && row.updates.length > 0 ? row.updates.map((u) => ({
    id: u.id,
    timestamp: u.timestamp,
    time: new Date(u.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    title: u.title || void 0,
    body: u.body,
    text: u.body,
    isMajor: Boolean(u.is_major)
  })) : void 0;
  const facts = row.facts && row.facts.length > 0 ? row.facts.map((f, i) => ({
    id: f.id,
    label: f.label,
    value: f.value,
    order: f.display_order ?? i + 1
  })) : void 0;
  const corrections = row.corrections && row.corrections.length > 0 ? row.corrections.map((c) => ({
    id: c.id,
    date: new Date(c.created_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }),
    text: c.body
  })) : void 0;
  const relatedStoryIds = row.relationships && row.relationships.length > 0 ? row.relationships.map((r) => r.related_story_id) : void 0;
  let editorialStatus = "Analysis";
  if (row.status === "developing") editorialStatus = "Developing";
  else if (row.status === "updated") editorialStatus = "Updated";
  else if (updates && updates.length > 0) editorialStatus = "Updated";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    dek: row.dek || void 0,
    summary: row.summary,
    category: categoryName,
    subcategory: subcategoryName,
    status: editorialStatus,
    lifecycleStatus: row.status || "published",
    published_version: row.published_version || 1,
    publishedVersion: row.published_version || 1,
    author,
    image: row.hero_image_url || "",
    alt: row.hero_image_alt || row.title,
    caption: row.hero_image_caption || void 0,
    credit: row.hero_image_credit || void 0,
    heroImage,
    quickSummary: row.summary_points || void 0,
    content: row.content || [],
    facts,
    updates,
    sources,
    corrections,
    relatedStoryIds,
    relatedSlugs: relatedStoryIds,
    publishedAt: row.published_at,
    updatedAt: row.updated_at || void 0,
    timeDisplay: formatRelativeTime(row.updated_at || row.published_at),
    readTime: calculateReadTime(row.content, row.summary),
    featured: Boolean(row.is_featured),
    isLive: row.status === "developing",
    isBreaking: false,
    viewCount: row.view_count || 0,
    trendingScore: row.trending_score || 0
  };
}

// src/data/repositories/SupabasePublicationRepository.ts
var SupabasePublicationRepository = class {
  constructor(client) {
    this.client = client;
  }
  async getQueuedItems(limit = 10) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { data, error } = await this.client.from("publication_queue").select("*").in("status", ["queued", "processing"]).or(`scheduled_for.is.null,scheduled_for.lte.${now}`).order("priority", { ascending: false }).order("created_at", { ascending: true }).limit(limit);
    if (error || !data) {
      console.error("[SupabasePublicationRepository] getQueuedItems error:", error?.message);
      return [];
    }
    return data.map((row) => ({
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
      updatedAt: row.updated_at
    }));
  }
  async getQueueItemById(id) {
    const { data, error } = await this.client.from("publication_queue").select("*").eq("id", id).maybeSingle();
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
      updatedAt: data.updated_at
    };
  }
  async getStoryById(id) {
    const { data, error } = await this.client.from("stories").select(`
        *,
        author:authors(*),
        category:categories(*),
        subcategory:subcategories(*),
        sources:story_sources(*),
        updates:story_updates(*),
        facts:story_facts(*),
        corrections:story_corrections(*)
      `).eq("id", id).maybeSingle();
    if (error || !data) return null;
    return mapDatabaseStoryToNewsStory(data);
  }
  async getStoryBySlug(slug) {
    const { data, error } = await this.client.from("stories").select(`
        *,
        author:authors(*),
        category:categories(*),
        subcategory:subcategories(*),
        sources:story_sources(*),
        updates:story_updates(*),
        facts:story_facts(*),
        corrections:story_corrections(*)
      `).eq("slug", slug.toLowerCase().trim()).maybeSingle();
    if (error || !data) return null;
    return mapDatabaseStoryToNewsStory(data);
  }
  async getLifecycleEventById(id) {
    const { data, error } = await this.client.from("story_lifecycle_events").select("*").eq("id", id).maybeSingle();
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
      createdAt: data.created_at
    };
  }
  async getValidationById(id) {
    const { data, error } = await this.client.from("news_validations").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      extractionId: data.extraction_id,
      status: data.status,
      overallScore: data.overall_score || 0.9,
      issues: data.issues || [],
      validatedFields: data.validated_fields || {},
      rejectedFields: data.rejected_fields || [],
      claimCoverage: data.claim_coverage || 1,
      sourceCoverage: data.source_coverage || 1,
      categoryValidation: data.category_validation || {
        expectedCategory: "",
        extractedCategory: "",
        status: "match",
        confidence: 1
      },
      dateValidation: data.date_validation || { status: "valid" },
      numberValidation: data.number_validation || {
        numbersChecked: 0,
        numbersPassed: 0,
        status: "valid"
      },
      quoteValidation: data.quote_validation || {
        quotesChecked: 0,
        quotesPassed: 0,
        status: "valid"
      },
      entityValidation: data.entity_validation || {
        entitiesChecked: 0,
        entitiesPassed: 0,
        status: "valid"
      },
      originalityCheck: data.originality_check || {
        copyRiskScore: 0,
        status: "original"
      },
      sensitiveTopicFlags: data.sensitive_topic_flags || [],
      validatorVersion: data.validator_version || "1.0.0",
      inputHash: data.input_hash || "",
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at
    };
  }
  async getExtractionById(id) {
    const { data, error } = await this.client.from("news_extractions").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      discoveryItemId: data.discovery_item_id,
      title: data.title || "",
      dek: data.dek || "",
      summary: data.summary || "",
      summaryPoints: data.summary_points || [],
      category: data.category || "technology",
      subcategory: data.subcategory || "",
      classificationConfidence: data.classification_confidence || 0.95,
      topics: data.topics || [],
      status: "normal",
      publishedAt: data.created_at,
      eventDate: data.event_date || null,
      author: data.author || "The Meridian Editorial Staff",
      entities: data.entities || [],
      facts: data.facts || [],
      timelineCandidates: data.timeline_candidates || [],
      contentBlocks: data.content || [],
      sources: data.sources || [],
      heroImage: data.hero_image || null,
      sourceEvidence: data.source_evidence || [],
      overallConfidence: data.overall_confidence || 0.95,
      confidenceLevel: "high",
      hasConflicts: data.has_conflicts || false,
      extractionStatus: data.status || "completed",
      model: data.model || "nvidia",
      promptVersion: data.prompt_version || "1.0.0",
      inputHash: data.input_hash || "",
      outputHash: data.output_hash || "",
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at
    };
  }
  async saveQueueItem(item) {
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
      updated_at: item.updatedAt
    };
    const { error } = await this.client.from("publication_queue").upsert(payload);
    if (error) {
      console.error("[SupabasePublicationRepository] saveQueueItem error:", error.message);
      throw error;
    }
    return item;
  }
  async updateQueueItemStatus(id, status, lastError) {
    const payload = {
      status,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (lastError) {
      payload.last_error = lastError;
      payload.last_attempt_at = (/* @__PURE__ */ new Date()).toISOString();
      const { data } = await this.client.from("publication_queue").select("attempts").eq("id", id).maybeSingle();
      payload.attempts = (data?.attempts || 0) + 1;
    }
    await this.client.from("publication_queue").update(payload).eq("id", id);
  }
  async publishStory(story, decision, event) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.recordPublicationEvent(event);
    const { error: storyError } = await this.client.from("stories").update({
      status: "published",
      published_version: decision.publicationVersion || 1,
      published_at: story.published_at || now,
      updated_at: now
    }).eq("id", story.id);
    if (storyError) {
      console.error("[SupabasePublicationRepository] publishStory error:", storyError.message);
      throw storyError;
    }
    const reloaded = await this.getStoryById(story.id);
    return reloaded || { ...story, status: "published", published_version: decision.publicationVersion };
  }
  async updatePublishedStory(story, timelineUpdates, decision, event) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newVersion = decision.publicationVersion || (story.published_version || 1) + 1;
    await this.recordPublicationEvent(event);
    const { error: storyError } = await this.client.from("stories").update({
      status: "published",
      published_version: newVersion,
      content_version: (story.content_version || 1) + 1,
      updated_at: now
    }).eq("id", story.id);
    if (storyError) throw storyError;
    if (timelineUpdates && timelineUpdates.length > 0) {
      const inserts = timelineUpdates.map((u) => ({
        id: u.id || `upd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        story_id: story.id,
        timestamp: u.timestamp || now,
        title: u.title || "Coverage Update",
        body: u.body || u.text || "",
        is_major: Boolean(u.isMajor || u.is_major),
        created_at: now
      }));
      await this.client.from("story_updates").insert(inserts);
    }
    const reloaded = await this.getStoryById(story.id);
    return reloaded || { ...story, status: "published", published_version: newVersion };
  }
  async holdOrRejectStory(storyId, status, event) {
    await this.recordPublicationEvent(event);
    await this.client.from("stories").update({
      status,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", storyId);
  }
  async unpublishStory(storyId, event) {
    await this.recordPublicationEvent(event);
    await this.client.from("stories").update({
      status: "archived",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", storyId);
  }
  async recordPublicationEvent(event) {
    let validValidationId = null;
    if (event.validationId) {
      const { data: valExists } = await this.client.from("news_validations").select("id").eq("id", event.validationId).maybeSingle();
      if (valExists) validValidationId = event.validationId;
    }
    let validExtractionId = null;
    if (event.extractionId) {
      const { data: extExists } = await this.client.from("news_extractions").select("id").eq("id", event.extractionId).maybeSingle();
      if (extExists) validExtractionId = event.extractionId;
    }
    let validLifecycleId = null;
    if (event.lifecycleEventId) {
      const { data: lifeExists } = await this.client.from("story_lifecycle_events").select("id").eq("id", event.lifecycleEventId).maybeSingle();
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
        ...event.metadata || {},
        original_validation_id: event.validationId,
        original_extraction_id: event.extractionId,
        original_lifecycle_id: event.lifecycleEventId
      },
      published_at: event.publishedAt || null,
      created_at: event.createdAt
    };
    const { error } = await this.client.from("publication_events").upsert(payload, { onConflict: "story_id,publication_version,action" });
    if (error) {
      console.error("[SupabasePublicationRepository] recordPublicationEvent error:", error.message);
      throw error;
    }
    return event;
  }
  async getPublicationEventsForStory(storyId) {
    const { data, error } = await this.client.from("publication_events").select("*").eq("story_id", storyId).order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({
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
      createdAt: row.created_at
    }));
  }
  async recordPublicationRun(run) {
    const payload = {
      id: run.id,
      started_at: run.startedAt,
      finished_at: run.finishedAt || (/* @__PURE__ */ new Date()).toISOString(),
      processed: run.processed,
      published: run.published,
      updated: run.updated,
      held: run.held,
      rejected: run.rejected,
      failed: run.failed,
      errors: run.errors || [],
      metadata: run.metadata || {},
      created_at: run.createdAt
    };
    const { error } = await this.client.from("publication_runs").insert(payload);
    if (error) {
      console.error("[SupabasePublicationRepository] recordPublicationRun error:", error.message);
    }
    return run;
  }
  async addStoryCorrection(storyId, text) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.client.from("story_corrections").insert({
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      story_id: storyId,
      body: text,
      created_at: now
    });
  }
  async getPublishedStories(limit = 50) {
    const { data, error } = await this.client.from("stories").select(`
        *,
        author:authors(*),
        category:categories(*),
        subcategory:subcategories(*)
      `).eq("status", "published").order("published_at", { ascending: false }).limit(limit);
    if (error || !data) return [];
    return data.map((row) => mapDatabaseStoryToNewsStory(row));
  }
  async countPublishedStories() {
    const { count, error } = await this.client.from("stories").select("*", { count: "exact", head: true }).eq("status", "published");
    if (error) return 0;
    return count || 0;
  }
  async getTelemetry() {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const { count: pubToday } = await this.client.from("publication_events").select("*", { count: "exact", head: true }).eq("action", "PUBLISH").gte("created_at", `${today}T00:00:00Z`);
    const { count: heldCount } = await this.client.from("publication_events").select("*", { count: "exact", head: true }).eq("action", "HOLD");
    const { count: rejectedCount } = await this.client.from("publication_events").select("*", { count: "exact", head: true }).eq("action", "REJECT");
    const { count: failedCount } = await this.client.from("publication_queue").select("*", { count: "exact", head: true }).eq("status", "failed");
    const { count: queueDepth } = await this.client.from("publication_queue").select("*", { count: "exact", head: true }).eq("status", "queued");
    return {
      publishedToday: pubToday || 0,
      updatedToday: 0,
      heldCount: heldCount || 0,
      rejectedCount: rejectedCount || 0,
      failedCount: failedCount || 0,
      queueDepth: queueDepth || 0
    };
  }
};

// src/config/seoConfig.ts
function getSiteUrl() {
  let url = "";
  if (typeof process !== "undefined" && process.env) {
    url = process.env.VITE_SITE_URL || process.env.SITE_URL || "";
  }
  if (!url) {
    try {
      const meta = new Function("return import.meta")();
      if (meta && meta.env && meta.env.VITE_SITE_URL) {
        url = meta.env.VITE_SITE_URL;
      }
    } catch {
    }
  }
  if (!url || url.trim() === "") {
    url = "https://themeridian.in";
  }
  url = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  } else if (url.startsWith("http://")) {
    url = url.replace(/^http:\/\//i, "https://");
  }
  return url;
}
var SEO_CONFIG = {
  siteName: "The Meridian",
  publisherName: "The Meridian",
  publisherLegalName: "The Meridian Publishing Consortium",
  get siteUrl() {
    return getSiteUrl();
  },
  defaultTitle: "The Meridian \u2014 Global News, Technology, AI & World Affairs",
  titleTemplate: "%s \u2014 The Meridian",
  defaultDescription: "Independent global journalism delivering rigorous reporting and timely analysis on artificial intelligence, science, business, technology, gaming, and world affairs.",
  defaultSocialImage: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&h=630&q=85",
  logoUrl: "/favicon.svg",
  locale: "en_US",
  twitterHandle: "@TheMeridianNews",
  themeColor: "#141517",
  backgroundColor: "#FAF9F6",
  editorialEmail: "editorial@themeridian.in",
  correctionsEmail: "corrections@themeridian.in",
  tipsEmail: "tips@themeridian.in"
};
function getCanonicalUrl(path = "/", queryParams) {
  const baseUrl = getSiteUrl();
  let cleanPath = (path || "/").trim();
  const extractedQuery = new URLSearchParams();
  if (/^https?:\/\//i.test(cleanPath)) {
    try {
      const parsed = new URL(cleanPath);
      cleanPath = parsed.pathname;
      parsed.searchParams.forEach((v, k) => extractedQuery.set(k, v));
    } catch {
      cleanPath = "/";
    }
  }
  const hashIdx = cleanPath.indexOf("#");
  if (hashIdx !== -1) cleanPath = cleanPath.slice(0, hashIdx);
  const qIdx = cleanPath.indexOf("?");
  if (qIdx !== -1) {
    const rawSearch = cleanPath.slice(qIdx + 1);
    const parsedParams = new URLSearchParams(rawSearch);
    parsedParams.forEach((v, k) => extractedQuery.set(k, v));
    cleanPath = cleanPath.slice(0, qIdx);
  }
  cleanPath = cleanPath.replace(/\/+/g, "/");
  if (!cleanPath.startsWith("/")) cleanPath = `/${cleanPath}`;
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }
  if (queryParams) {
    const entries = queryParams instanceof URLSearchParams ? Array.from(queryParams.entries()) : Object.entries(queryParams);
    for (const [key, val] of entries) {
      extractedQuery.set(key, val);
    }
  }
  const functionalParams = new URLSearchParams();
  for (const [key, val] of extractedQuery.entries()) {
    const k = key.toLowerCase();
    if (!k.startsWith("utm_") && k !== "fbclid" && k !== "gclid" && k !== "msclkid" && k !== "mc_cid" && k !== "mc_eid" && k !== "ref" && k !== "source" && val !== void 0 && val !== null && val !== "") {
      functionalParams.append(key, val);
    }
  }
  const queryString = functionalParams.toString();
  return queryString ? `${baseUrl}${cleanPath}?${queryString}` : `${baseUrl}${cleanPath}`;
}

// src/services/distribution/RssFeedService.ts
var RssFeedService = class _RssFeedService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, "") : getSiteUrl();
  }
  static generateRssXml(publishedStories) {
    return new _RssFeedService().generateRssXml(publishedStories);
  }
  /**
   * Generates a valid RSS 2.0 XML feed string strictly containing published stories.
   * Internal draft/held stories and private pipeline metadata are strictly omitted.
   */
  generateRssXml(publishedStories) {
    const buildDate = (/* @__PURE__ */ new Date()).toUTCString();
    const itemsXml = publishedStories.filter((s) => {
      const isPublished = s.status === "published" || s.lifecycleStatus === "published";
      return isPublished && Boolean(s.slug);
    }).map((s) => {
      const storyUrl = getCanonicalUrl(`/story/${s.slug}`);
      const pubDate = new Date(
        s.published_at || s.publishedAt || Date.now()
      ).toUTCString();
      const authorName = s.author?.name || "The Meridian Editorial Staff";
      const categoryName = s.category || "News";
      const cleanTitle = (s.title || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const cleanSummary = (s.summary || s.dek || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const heroImgUrl = s.heroMedia?.storageUrl || s.hero_image_url || s.image || s.heroImage?.url;
      const enclosureXml = heroImgUrl ? `
      <enclosure url="${heroImgUrl.replace(/&/g, "&amp;")}" type="image/jpeg" length="0" />` : "";
      return `    <item>
      <title>${cleanTitle}</title>
      <link>${storyUrl}</link>
      <guid isPermaLink="true">${storyUrl}</guid>
      <description>${cleanSummary}</description>
      <category>${categoryName}</category>
      <author>${authorName}</author>
      <pubDate>${pubDate}</pubDate>${enclosureXml}
    </item>`;
    }).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SEO_CONFIG.siteName} \u2014 Global News Platform</title>
    <link>${this.baseUrl}</link>
    <description>${SEO_CONFIG.defaultDescription}</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${this.baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
  }
};

// src/api/rss.ts
async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://dzbggkymgdtsyvrvrrjw.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const rssService = new RssFeedService();
  try {
    if (!supabaseKey) {
      console.error("[RssHandler] Warning: No Supabase API key found in environment.");
      const xml2 = rssService.generateRssXml([]);
      res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
      return res.status(200).send(xml2);
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    const repository = new SupabasePublicationRepository(supabase);
    const publishedStories = await repository.getPublishedStories(50);
    const xml = rssService.generateRssXml(publishedStories);
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("[RssHandler] Runtime error generating RSS:", err?.message || err);
    try {
      const fallbackXml = rssService.generateRssXml([]);
      res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
      return res.status(200).send(fallbackXml);
    } catch {
      return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>The Meridian</title><link>https://themeridian.in</link><description>The Meridian News Feed</description></channel></rss>');
    }
  }
}
export {
  handler as default
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized SEO & Site Identity Configuration for The Meridian.
 * Single source of truth for canonical domains, site name, publisher identity, and metadata.
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Vercel Serverless Function: /api/rss
 * Generates dynamic RSS 2.0 feed strictly for published stories.
 */
