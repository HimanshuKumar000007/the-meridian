// src/api/sitemap.ts
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

// src/data/assets.ts
var ASSET_IMAGES = {
  heroQuantum: "/src/assets/images/hero_quantum_cryostat_1790429071725.jpg",
  techSemiconductor: "/src/assets/images/tech_semiconductor_wafer_1790429089703.jpg",
  gamingVista: "/src/assets/images/gaming_cinematic_vista_1790429104834.jpg",
  spaceRocket: "/src/assets/images/space_rocket_launch_1790429117475.jpg",
  worldSummit: "/src/assets/images/world_diplomatic_summit_1790429131460.jpg"
};

// src/data/storyDatabase.ts
var DETAILED_STORIES = [
  // =========================================================================
  // 1. AI & COMPUTING — FEATURED HERO / LEAD INVESTIGATION
  // =========================================================================
  {
    id: "story-hero",
    slug: "quantum-coherence-breakthrough-cryogenic-milestone",
    title: "The Sub-Kelvin Milestone: How Optical Cryostats Unlocked Continuous Fault-Tolerant Coherence",
    dek: "A joint consortium of international physics laboratories has demonstrated three hours of unbroken logical qubit entanglement at sub-millikelvin temperatures, clearing a decade-long hurdle toward practical commercial error correction.",
    summary: "A joint consortium of international physics laboratories has demonstrated three hours of unbroken logical qubit entanglement at sub-millikelvin temperatures, clearing a decade-long hurdle toward practical commercial error correction.",
    category: "AI & Computing",
    subcategory: "Quantum Systems",
    status: "Analysis",
    publishedAt: "2026-09-26T05:30:00Z",
    updatedAt: "2026-09-26T06:12:00Z",
    timeDisplay: "Updated 25m ago",
    readTime: "6 min read",
    featured: true,
    author: {
      name: "Dr. Helen Vance",
      role: "Senior Science & Deep Tech Correspondent",
      bio: "Dr. Helen Vance covers fundamental physics, quantum architectures, and frontier computing. Previously research fellow at Oxford Condensed Matter Physics.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.heroQuantum,
      alt: "Golden cryostat wiring and optical chambers inside a low-temperature physics research facility",
      caption: "Dilution refrigeration stages inside the international consortium laboratory prior to final vacuum sealing.",
      credit: "The Meridian / Laurent Mercier"
    },
    quickSummary: [
      "Researchers maintained uninterrupted logical qubit coherence for 184 minutes at 12 millikelvin.",
      "A novel optical interconnect eliminates thermal vibration spikes that historically caused phase decoherence.",
      "Surface code syndrome extraction achieved an error suppression factor exceeding 99.94 percent.",
      "Commercial fabrication partners in Munich and Grenoble have commenced pilot packaging verification."
    ],
    facts: [
      { label: "Consortium", value: "Munich-Grenoble Quantum Labs & Stanford Applied Physics" },
      { label: "Operating Temp", value: "12 millikelvin (-273.138\xB0C)" },
      { label: "Coherence Duration", value: "184 minutes continuous" },
      { label: "Error Suppression", value: "99.94% logical fidelity" },
      { label: "Commercial Target", value: "H2 2027 enterprise pilot systems" }
    ],
    updates: [
      {
        time: "12:42 PM",
        timestamp: "2026-09-26T06:12:00Z",
        title: "Peer review verification finalized",
        text: "Physical Review Applied published the complete 48-page empirical telemetry dataset and sensor calibration benchmarks.",
        source: "Physical Review Applied"
      },
      {
        time: "11:15 AM",
        timestamp: "2026-09-26T05:45:00Z",
        title: "Independent laboratory validation",
        text: "The Swiss Federal Institute replicated phase coherence metrics under secondary cryogenic chamber parameters.",
        source: "ETH Zurich Quantum Briefing"
      },
      {
        time: "09:30 AM",
        timestamp: "2026-09-26T05:30:00Z",
        title: "Consortium announcement",
        text: "Joint statement issued simultaneously in Geneva, Paris, and Palo Alto detailing the thermal isolation breakthrough.",
        source: "Joint Consortium Desk"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "For nearly thirty years, the physics of scalable quantum computing has been haunted by an uncompromising physical reality: keeping qubits cold enough to preserve delicate superposition while simultaneously routing thousands of control cables without introducing ambient thermal noise. Today, that thermodynamic bottleneck has yielded to an elegant optical solution."
      },
      {
        type: "paragraph",
        text: "In coordinated experiments concluded at 03:00 UTC across synchronized facilities in Grenoble and Palo Alto, researchers maintained continuous logical state entanglement for over three hours. The achievement surpasses prior continuous-run records by nearly two orders of magnitude."
      },
      {
        type: "heading",
        level: 2,
        text: "The Optical Vacuum Bypass"
      },
      {
        type: "paragraph",
        text: "Traditional dilution refrigerators rely on coaxial copper and niobium-titanium wiring to transmit microwave pulses to superconducting transmon circuits. However, metal wires inevitably conduct parasitic phonons from room-temperature control racks directly into the millikelvin stage. To circumvent this, the consortium swapped metallic transmission lines with ultra-thin, low-loss optical waveguides."
      },
      {
        type: "quote",
        quote: "We stopped fighting thermal conductivity through heavier shielding and instead converted the entire microwave modulation pipeline into infrared photons outside the cryostat chamber.",
        attribution: "Dr. Marc Beauchamp",
        role: "Co-lead Investigator, CNRS Grenoble"
      },
      {
        type: "paragraph",
        text: "Signals are converted back into microwave pulses directly at the sub-Kelvin mixing chamber using cryogenic photodetectors engineered to dissipate less than eight picowatts during active gating cycles."
      },
      {
        type: "heading",
        level: 3,
        text: "Surface Code Syndrome Extraction"
      },
      {
        type: "paragraph",
        text: "The sustained coherence allowed the consortium to run continuous stabilizer measurement cycles\u2014the foundational bedrock of fault-tolerant quantum computation. During the 184-minute window, the system performed 4.2 million syndrome measurements without a single runaway phase catastrophe."
      },
      {
        type: "list",
        items: [
          "Average physical two-qubit gate error remained below 0.08%",
          "Readout fidelity averaged 99.82% across all 128 active logical channels",
          "Leakage out of the computational subspace was suppressed via active resetting pulses",
          "Thermal drift in the dilution plate was constrained to within \xB10.4 millikelvin"
        ]
      },
      {
        type: "callout",
        title: "Editorial Context: Why 184 Minutes Matters",
        text: "Most commercial cryptographic algorithms and molecular quantum chemical simulations require billions of continuous gate executions. A system that decoheres in milliseconds requires endless restarts; a system stable for hours can execute complete molecular Hamiltonian simulations without interruptions."
      },
      {
        type: "paragraph",
        text: "Independent industry analysts note that while scaling from 128 logical qubits to commercial-scale millions remains a daunting manufacturing challenge, the fundamental physics question\u2014whether optical isolation can prevent thermal runaway\u2014has been decisively resolved."
      }
    ],
    sources: [
      {
        name: "Physical Review Applied \u2014 Primary Telemetry",
        url: "https://journals.aps.org",
        time: "Sept 26, 2026",
        note: "Complete calibration logs and syndrome extraction records"
      },
      {
        name: "CNRS Cryogenic Instrumentation Laboratory",
        url: "https://cnrs.fr",
        time: "Sept 26, 2026",
        note: "Photodetector dissipation and thermal budget whitepaper"
      },
      {
        name: "Stanford Center for Quantum Architectures",
        url: "https://stanford.edu",
        time: "Sept 26, 2026",
        note: "Optical waveguide attenuation analysis"
      }
    ],
    corrections: [
      {
        date: "September 26, 2026 at 06:12 AM UTC",
        text: "Updated with confirmed syndrome measurement totals from the Paris data repository. Earlier draft noted 3.8 million cycles."
      }
    ],
    relatedSlugs: [
      "tsmc-1-6nm-ramp-up",
      "openai-verification-protocol",
      "cern-charm-quark-asymmetry"
    ]
  },
  // =========================================================================
  // 2. AI — MULTI-AGENT VERIFICATION (Prompt example: /story/openai-new-product)
  // =========================================================================
  {
    id: "ai-story-product",
    slug: "openai-new-product",
    title: "OpenAI Outlines Multi-Agent Verification Protocol for Autonomous Software Workflows",
    dek: "The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.",
    summary: "The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.",
    category: "AI",
    subcategory: "Frontier Models",
    status: "Announcement",
    publishedAt: "2026-09-26T04:30:00Z",
    updatedAt: "2026-09-26T05:15:00Z",
    timeDisplay: "Updated 1 hour ago",
    readTime: "5 min read",
    author: {
      name: "Julian Foster",
      role: "Technology & AI Policy Correspondent",
      bio: "Julian Foster covers frontier artificial intelligence research, enterprise infrastructure, and emerging European computing governance.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.techSemiconductor,
      alt: "Cleanroom engineer testing advanced algorithmic processing hardware",
      caption: "Compute cluster infrastructure dedicated to formal verification runs in San Francisco.",
      credit: "OpenAI Press Materials"
    },
    quickSummary: [
      "New protocol uses dual-layer critic agents to mathematically verify code transitions before merge actions.",
      "Benchmark results show a 74% decline in runaway infinite loops during multi-hour programming tasks.",
      "Enterprise API endpoints will begin rolling out to select partners in early October.",
      "Pricing model shifts from raw token counting toward completed verification proofs."
    ],
    facts: [
      { label: "Organization", value: "OpenAI" },
      { label: "Technology", value: "State Verification Protocol (SVP)" },
      { label: "Primary Target", value: "Enterprise autonomous software engineering" },
      { label: "Key Innovation", value: "Asymmetric critic checkpoints & state hashing" },
      { label: "Availability", value: "North America and EU enterprise preview in October" }
    ],
    updates: [
      {
        time: "1:45 PM",
        timestamp: "2026-09-26T05:15:00Z",
        title: "API documentation published",
        text: "Developer specification docs and Python verification client packages made available in technical preview.",
        source: "OpenAI Developer Portal"
      },
      {
        time: "12:00 PM",
        timestamp: "2026-09-26T04:30:00Z",
        title: "Official briefing livestream",
        text: "Executive leadership demonstrated live multi-hour refactor of a 400,000-line legacy C++ code repository without hallucinated dependencies.",
        source: "Company Briefing"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "As artificial intelligence developers race to transition from conversational chatbots to autonomous coding agents capable of working uninterrupted for days, the chief operational risk has not been lack of capability, but compounding error propagation. Today in San Francisco, OpenAI unveiled its formal technical architecture to address that fragility."
      },
      {
        type: "paragraph",
        text: "The architecture, known internally as the State Verification Protocol, interposes an asymmetric critic model between each agent action and the underlying repository. Rather than trusting sequential token generation, the system creates immutable cryptographic state hashes after each code transform."
      },
      {
        type: "heading",
        level: 2,
        text: "Asymmetric Critic Checkpoints"
      },
      {
        type: "paragraph",
        text: "In standard agent frameworks, when an autonomous system encounters a failed test, it frequently enters an escalating cycle of speculative patches\u2014often deleting working test suites or manufacturing phantom mocks. Under the new protocol, a separate adversarial critic model with isolated context windows must validate each diff against invariant project specifications."
      },
      {
        type: "quote",
        quote: "Autonomous execution without formal verification is an illusion of velocity. The real breakthrough is providing agents with a reliable sense of when they have taken a wrong turn.",
        attribution: "Elena Rostova",
        role: "Head of Alignment Verification"
      },
      {
        type: "paragraph",
        text: "In benchmark evaluations across open-source repositories spanning Python, Rust, and TypeScript, the verification system reduced repository corruption events from 31 percent to less than 2.4 percent over four-hour continuous runs."
      },
      {
        type: "heading",
        level: 3,
        text: "Enterprise Deployment & Pricing Shift"
      },
      {
        type: "list",
        items: [
          "Initial rollout targets enterprise tier organizations with SOC 2 compliance mandates",
          "Integration with GitHub Actions, GitLab CI, and proprietary internal codebases",
          "Billing incorporates a guaranteed state proof fee alongside standard inference tokens",
          "Support for on-premise verification nodes for regulated financial and defense clients"
        ]
      },
      {
        type: "paragraph",
        text: "Industry watchers indicate that competitor labs in London and Seattle are developing parallel verification standards, suggesting that formal mathematical proof checking will become the default industry standard for agentic software workflows over the next year."
      }
    ],
    sources: [
      {
        name: "OpenAI Engineering Disclosure \u2014 State Verification Protocol",
        url: "https://openai.com/research",
        time: "Sept 26, 2026",
        note: "Official technical specification document"
      },
      {
        name: "Stanford Software Verification Group Benchmark Report",
        url: "https://stanford.edu",
        time: "Sept 26, 2026",
        note: "Independent comparative analysis across 1,000 public GitHub test suites"
      }
    ],
    relatedSlugs: [
      "quantum-coherence-breakthrough-cryogenic-milestone",
      "tsmc-1-6nm-ramp-up",
      "semiconductor-lithography-power-grid-integration"
    ]
  },
  // Alias for prompt example
  {
    id: "ai-story-alias",
    slug: "openai-verification-protocol",
    title: "OpenAI Outlines Multi-Agent Verification Protocol for Autonomous Software Workflows",
    dek: "The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.",
    summary: "The company introduces cryptographic state validation and parallel critic networks designed to prevent compounding logic errors in extended autonomous coding pipelines.",
    category: "AI",
    subcategory: "Frontier Models",
    status: "Announcement",
    publishedAt: "2026-09-26T04:30:00Z",
    updatedAt: "2026-09-26T05:15:00Z",
    timeDisplay: "Updated 1 hour ago",
    readTime: "5 min read",
    author: {
      name: "Julian Foster",
      role: "Technology & AI Policy Correspondent",
      bio: "Julian Foster covers frontier artificial intelligence research, enterprise infrastructure, and emerging European computing governance.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.techSemiconductor,
      alt: "Cleanroom engineer testing advanced algorithmic processing hardware",
      caption: "Compute cluster infrastructure dedicated to formal verification runs in San Francisco.",
      credit: "OpenAI Press Materials"
    },
    quickSummary: [
      "New protocol uses dual-layer critic agents to mathematically verify code transitions before merge actions.",
      "Benchmark results show a 74% decline in runaway infinite loops during multi-hour programming tasks.",
      "Enterprise API endpoints will begin rolling out to select partners in early October.",
      "Pricing model shifts from raw token counting toward completed verification proofs."
    ],
    facts: [
      { label: "Organization", value: "OpenAI" },
      { label: "Technology", value: "State Verification Protocol (SVP)" },
      { label: "Primary Target", value: "Enterprise autonomous software engineering" },
      { label: "Key Innovation", value: "Asymmetric critic checkpoints & state hashing" },
      { label: "Availability", value: "North America and EU enterprise preview in October" }
    ],
    updates: [
      {
        time: "1:45 PM",
        timestamp: "2026-09-26T05:15:00Z",
        title: "API documentation published",
        text: "Developer specification docs and Python verification client packages made available in technical preview.",
        source: "OpenAI Developer Portal"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "As artificial intelligence developers race to transition from conversational chatbots to autonomous coding agents capable of working uninterrupted for days, the chief operational risk has not been lack of capability, but compounding error propagation. Today in San Francisco, OpenAI unveiled its formal technical architecture to address that fragility."
      },
      {
        type: "paragraph",
        text: "The architecture, known internally as the State Verification Protocol, interposes an asymmetric critic model between each agent action and the underlying repository. Rather than trusting sequential token generation, the system creates immutable cryptographic state hashes after each code transform."
      },
      {
        type: "quote",
        quote: "Autonomous execution without formal verification is an illusion of velocity. The real breakthrough is providing agents with a reliable sense of when they have taken a wrong turn.",
        attribution: "Elena Rostova",
        role: "Head of Alignment Verification"
      },
      {
        type: "paragraph",
        text: "Industry watchers indicate that competitor labs in London and Seattle are developing parallel verification standards, suggesting that formal mathematical proof checking will become the default industry standard for agentic software workflows over the next year."
      }
    ],
    sources: [
      {
        name: "OpenAI Engineering Disclosure \u2014 State Verification Protocol",
        url: "https://openai.com/research",
        time: "Sept 26, 2026"
      }
    ],
    relatedSlugs: [
      "quantum-coherence-breakthrough-cryogenic-milestone",
      "tsmc-1-6nm-ramp-up"
    ]
  },
  // =========================================================================
  // 3. TECHNOLOGY — SEMICONDUCTORS (1.6nm High-NA Node)
  // =========================================================================
  {
    id: "tech-story-1",
    slug: "tsmc-1-6nm-ramp-up",
    title: "TSMC Confirms Commercial Silicon Ramp-Up for 1.6nm High-NA Manufacturing Nodes",
    dek: "Backside power delivery and advanced extreme ultraviolet lithography will enter pilot production ahead of initial 2027 server allocations.",
    summary: "Backside power delivery and advanced extreme ultraviolet lithography will enter pilot production ahead of initial 2027 server allocations.",
    category: "Technology",
    subcategory: "Semiconductor Fabrication",
    status: "Updated",
    publishedAt: "2026-09-26T04:15:00Z",
    updatedAt: "2026-09-26T05:30:00Z",
    timeDisplay: "Updated 2 hours ago",
    readTime: "5 min read",
    author: {
      name: "Sarah Lin",
      role: "Senior Semiconductor & Hardware Reporter",
      bio: "Sarah Lin covers global semiconductor supply chains, lithography physics, and hardware infrastructure from Taipei and Silicon Valley.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.techSemiconductor,
      alt: "Silicon wafer with microcircuit patterns under cleanroom yellow lighting",
      caption: "Inspection of patterned 300mm wafers following high-numerical-aperture ultraviolet deposition.",
      credit: "FabTech Global / The Meridian"
    },
    quickSummary: [
      "TSMC validated functional defect density on initial 1.6nm test chips utilizing backside power rails.",
      "High-NA EUV scanners from ASML achieved 8nm pitch resolution without double-patterning stitches.",
      "Pilot risk production commences at Fab 20 in Hsinchu during the third quarter of 2027.",
      "Initial allocation is fully booked by high-performance computing and enterprise AI silicon designers."
    ],
    facts: [
      { label: "Foundry", value: "Taiwan Semiconductor Manufacturing Co. (TSMC)" },
      { label: "Process Node", value: "A16 (1.6nm class with Super Power Rail)" },
      { label: "Lithography Tool", value: "High-NA EUV (0.55 Numerical Aperture)" },
      { label: "Density Gain", value: "+18% logic density over 2nm N2P" },
      { label: "Volume Production", value: "First half 2027" }
    ],
    updates: [
      {
        time: "11:30 AM",
        timestamp: "2026-09-26T05:30:00Z",
        title: "Executive confirmation in Hsinchu",
        text: "Co-CEO confirmed equipment installation milestones during the company annual technology symposium keynote.",
        source: "TSMC Investor Relations"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "The international semiconductor roadmap reached a decisive technical threshold today as Taiwan Semiconductor Manufacturing Company announced that functional silicon yields on its 1.6-nanometer A16 process node have met baseline risk-production criteria."
      },
      {
        type: "paragraph",
        text: "The milestone relies on two interrelated engineering transformations: the commercial integration of ASML High-NA extreme ultraviolet lithography systems and a complete architectural inversion of on-chip power delivery known as backside power routing."
      },
      {
        type: "heading",
        level: 2,
        text: "Backside Power Delivery Solves the IR Drop Dilemma"
      },
      {
        type: "paragraph",
        text: "For decades, both signal wires and power delivery lines shared the top metallization layers of the silicon die. As transistors shrank below three nanometers, the resistance in minuscule power wires caused severe voltage drops and thermal runaway. Backside power places thick, low-resistance power rails beneath the active transistor layer, dedicating top-side wiring purely to high-speed data routing."
      },
      {
        type: "quote",
        quote: "A16 is not just a lithographic reduction; it is an entirely new spatial layout of the integrated circuit. It buys our architects five years of thermal breathing room.",
        attribution: "C.C. Wei",
        role: "Chief Executive Officer, TSMC"
      },
      {
        type: "paragraph",
        text: "Fab equipment suppliers confirm that four High-NA EUV tools have been calibrated in Hsinchu, with two additional units scheduled for shipment to the Baoshan expansion facility before the close of the calendar year."
      }
    ],
    sources: [
      {
        name: "TSMC Global Technology Symposium Transcript",
        url: "https://tsmc.com",
        time: "Sept 26, 2026",
        note: "Official engineering address and investor presentation"
      },
      {
        name: "ASML Q3 Tool Delivery & Calibration Bulletin",
        url: "https://asml.com",
        time: "Sept 25, 2026",
        note: "Twinscan EXE:5000 field test confirmation"
      }
    ],
    relatedSlugs: [
      "semiconductor-lithography-power-grid-integration",
      "quantum-coherence-breakthrough-cryogenic-milestone",
      "openai-verification-protocol"
    ]
  },
  // =========================================================================
  // 4. GAMING — PROMPT EXAMPLE (/story/gta-vi-update or /story/sony-portable-tracking)
  // =========================================================================
  {
    id: "gaming-story-gta",
    slug: "gta-vi-update",
    title: "Interactive Physics & Global Illumination Engines Shift Toward Hardware Dynamic Radiance",
    dek: "Leading game development studios are systematically phasing out static lightmap baking in favor of real-time photon field streaming on next-generation hardware.",
    summary: "Leading game development studios are systematically phasing out static lightmap baking in favor of real-time photon field streaming on next-generation hardware.",
    category: "Gaming",
    subcategory: "Engine Architecture",
    status: "Developing",
    publishedAt: "2026-09-26T03:00:00Z",
    updatedAt: "2026-09-26T05:00:00Z",
    timeDisplay: "Updated 3 hours ago",
    readTime: "4 min read",
    author: {
      name: "Marcus Bell",
      role: "Gaming & Interactive Entertainment Editor",
      bio: "Marcus Bell covers video game engines, interactive physics, graphics rendering APIs, and the economics of global digital entertainment.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.gamingVista,
      alt: "Vast cinematic fantasy landscape with mountains and sci-fi ruins in mist",
      caption: "Dynamic global illumination running in real time with dynamic weather shifts and volumetric fog.",
      credit: "The Meridian / Interactive Media Archive"
    },
    quickSummary: [
      "Major studio production pipelines have eliminated hundreds of hours of pre-computed light baking.",
      "Unified neural radiance streaming allows dynamic weather and time of day with zero storage overhead.",
      "Console hardware makers are testing bespoke decompression silicon to support 120 FPS ray streaming.",
      "Developers report production cycles shortened by up to fourteen percent in world-building phases."
    ],
    facts: [
      { label: "Industry Sector", value: "AAA Game Engine Development" },
      { label: "Core Technology", value: "Hardware-Accelerated Neural Radiance Caching" },
      { label: "Target Frame Budget", value: "16.6ms (60 FPS) and 8.3ms (120 FPS)" },
      { label: "Storage Reduction", value: "45 GB reduction per title by removing static baked lightmaps" }
    ],
    updates: [
      {
        time: "10:45 AM",
        timestamp: "2026-09-26T05:00:00Z",
        title: "Developer SDK distribution begins",
        text: "Next-generation graphics toolkits delivered to verified studio partners across North America and Europe.",
        source: "Developer Network Bulletin"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "For more than two decades, the creation of sprawling virtual worlds required a quiet compromise: lighting was treated as a static texture painted onto geometry during long overnight compute runs known as baking. Today, that entire paradigm is collapsing as real-time photon caches become fast enough to run on consumer hardware."
      },
      {
        type: "paragraph",
        text: "Technical directors from five premier game development studios confirmed to The Meridian that upcoming flagship releases are dropping pre-baked lightmaps entirely. The change allows artists to modify geometry, light sources, and atmospheric conditions instantly without waiting hours for level recompilation."
      },
      {
        type: "heading",
        level: 2,
        text: "Instantaneous Weather and Destructible Environments"
      },
      {
        type: "paragraph",
        text: "When every photon is calculated dynamically or interpolated through neural radiance caches, game worlds gain unprecedented physical coherence. If a player detonates a wall, sunlight instantly pours through the breach, bouncing multiple times off interior surfaces with physically accurate diffuse color bleeding."
      },
      {
        type: "quote",
        quote: "We spent twenty years faking bounce light with artistic tricks and invisible ambient probes. Now the engine does what light actually does in nature.",
        attribution: "Taro Kishimoto",
        role: "Chief Technical Director, Vanguard Interactive"
      }
    ],
    sources: [
      {
        name: "Game Developers Conference Technical Proceedings",
        url: "https://gdconf.com",
        time: "Sept 25, 2026",
        note: "Session notes on volumetric photon streaming"
      },
      {
        name: "Digital Foundry Architecture Analysis",
        url: "https://eurogamer.net",
        time: "Sept 26, 2026"
      }
    ],
    relatedSlugs: [
      "sony-portable-tracking",
      "open-world-rendering-neural-radiance-breakthrough",
      "how-game-studios-are-adapting-to-longer-cycles"
    ]
  },
  // =========================================================================
  // 5. SPACE — PROMPT EXAMPLE (/story/nasa-mission-update)
  // =========================================================================
  {
    id: "space-story-nasa",
    slug: "nasa-mission-update",
    title: "NASA Artemis IV Crew Modules Clear Critical Deep-Space Acoustic Stress Tests",
    dek: "Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.",
    summary: "Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.",
    category: "Space",
    subcategory: "Lunar Exploration",
    status: "Updated",
    publishedAt: "2026-09-26T02:30:00Z",
    updatedAt: "2026-09-26T04:45:00Z",
    timeDisplay: "Updated 4 hours ago",
    readTime: "4 min read",
    author: {
      name: "Alina Thorne",
      role: "Senior Aerospace & Astrophysics Correspondent",
      bio: "Alina Thorne covers planetary science, deep-space propulsion, orbital logistics, and international lunar treaties from Cape Canaveral.",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.spaceRocket,
      alt: "Orbital space rocket ignition flame reflecting over ocean waters at twilight",
      caption: "Static acoustic simulation chamber at Kennedy Space Center during the Artemis IV clearance sequence.",
      credit: "NASA / KSC Imagery"
    },
    quickSummary: [
      "Acoustic testing simulated maximum dynamic pressure launch loads up to 142.8 decibels.",
      "Telemetry recorded zero anomalous structural delaminations across composite pressure hulls.",
      "The crew life support systems maintained nominal internal atmospheric pressure throughout the vibration run.",
      "NASA remains on schedule for the first crewed docking with the Lunar Gateway station in 2028."
    ],
    facts: [
      { label: "Agency", value: "NASA / Artemis Program Directorate" },
      { label: "Spacecraft", value: "Orion Spacecraft Crew Module (Artemis IV)" },
      { label: "Test Facility", value: "Operations and Checkout Building, Kennedy Space Center" },
      { label: "Peak Sound Pressure", value: "142.8 dB Overall Sound Pressure Level (OASPL)" },
      { label: "Target Launch Window", value: "September 2028" }
    ],
    updates: [
      {
        time: "9:15 AM",
        timestamp: "2026-09-26T04:45:00Z",
        title: "Sensor telemetry verified",
        text: "Structural vibration sensors confirmed all six hundred telemetry channels reported within predicted analytical tolerance bounds.",
        source: "NASA Engineering Directorate"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "Inside the high-bay testing chambers of Kennedy Space Center in Florida, engineers have subjected the Artemis IV crew module to one of the most violent physical environments on Earth: the thunderous acoustic reverberation of a heavy-lift rocket ignition."
      },
      {
        type: "paragraph",
        text: "The tests subjected the spacecraft pressure vessel to sound pressure levels exceeding 142 decibels\u2014loud enough to instantly tear apart unreinforced mechanical joints. According to official test logs released this morning, the capsule passed all structural inspections with zero defects."
      },
      {
        type: "heading",
        level: 2,
        text: "Gateway Station Rendezvous"
      },
      {
        type: "paragraph",
        text: "Artemis IV represents a pivotal evolution in NASA's deep space architecture. Unlike earlier lunar landing sorties, Artemis IV will deliver the International Habitation module (I-Hab) to the Lunar Gateway station in halo orbit around the Moon, establishing the first permanent crewed staging post beyond low Earth orbit."
      },
      {
        type: "quote",
        quote: "Passing acoustic stress clearance means our primary structures are qualified for the most severe launch dynamic loads we will ever encounter. We are ready for integration.",
        attribution: "Commander Robert Lindgren",
        role: "Artemis Crew Safety Director"
      }
    ],
    sources: [
      {
        name: "NASA Kennedy Space Center Press Release",
        url: "https://nasa.gov/artemis",
        time: "Sept 26, 2026"
      },
      {
        name: "ESA Lunar Gateway Partnership Briefing",
        url: "https://esa.int",
        time: "Sept 25, 2026"
      }
    ],
    relatedSlugs: [
      "deep-space-heavy-lift-propulsion-tests",
      "commercial-space-station-hab-pressure-tests",
      "james-webb-trappist-atmosphere-spectroscopy"
    ]
  },
  // Space story alias for the homepage link
  {
    id: "space-story-clearance",
    slug: "nasa-artemis-iv-clearance",
    title: "NASA Artemis IV Crew Modules Clear Critical Deep-Space Acoustic Stress Tests",
    dek: "Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.",
    summary: "Engineers at Kennedy Space Center verified Orion module integrity under simulated launch vibrations exceeding 142 decibels, keeping the lunar gateway timeline on track.",
    category: "Space",
    subcategory: "Lunar Exploration",
    status: "Updated",
    publishedAt: "2026-09-26T02:30:00Z",
    updatedAt: "2026-09-26T04:45:00Z",
    timeDisplay: "Updated 4 hours ago",
    readTime: "4 min read",
    author: {
      name: "Alina Thorne",
      role: "Senior Aerospace & Astrophysics Correspondent",
      bio: "Alina Thorne covers planetary science, deep-space propulsion, orbital logistics, and international lunar treaties from Cape Canaveral.",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.spaceRocket,
      alt: "Orbital space rocket ignition flame reflecting over ocean waters at twilight",
      caption: "Static acoustic simulation chamber at Kennedy Space Center during the Artemis IV clearance sequence.",
      credit: "NASA / KSC Imagery"
    },
    quickSummary: [
      "Acoustic testing simulated maximum dynamic pressure launch loads up to 142.8 decibels.",
      "Telemetry recorded zero anomalous structural delaminations across composite pressure hulls.",
      "The crew life support systems maintained nominal internal atmospheric pressure throughout the vibration run.",
      "NASA remains on schedule for the first crewed docking with the Lunar Gateway station in 2028."
    ],
    facts: [
      { label: "Agency", value: "NASA / Artemis Program Directorate" },
      { label: "Spacecraft", value: "Orion Spacecraft Crew Module (Artemis IV)" },
      { label: "Test Facility", value: "Operations and Checkout Building, Kennedy Space Center" },
      { label: "Peak Sound Pressure", value: "142.8 dB Overall Sound Pressure Level (OASPL)" },
      { label: "Target Launch Window", value: "September 2028" }
    ],
    updates: [
      {
        time: "9:15 AM",
        timestamp: "2026-09-26T04:45:00Z",
        title: "Sensor telemetry verified",
        text: "Structural vibration sensors confirmed all six hundred telemetry channels reported within predicted analytical tolerance bounds.",
        source: "NASA Engineering Directorate"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "Inside the high-bay testing chambers of Kennedy Space Center in Florida, engineers have subjected the Artemis IV crew module to one of the most violent physical environments on Earth: the thunderous acoustic reverberation of a heavy-lift rocket ignition."
      },
      {
        type: "paragraph",
        text: "The tests subjected the spacecraft pressure vessel to sound pressure levels exceeding 142 decibels\u2014loud enough to instantly tear apart unreinforced mechanical joints. According to official test logs released this morning, the capsule passed all structural inspections with zero defects."
      },
      {
        type: "heading",
        level: 2,
        text: "Gateway Station Rendezvous"
      },
      {
        type: "paragraph",
        text: "Artemis IV represents a pivotal evolution in NASA's deep space architecture. Unlike earlier lunar landing sorties, Artemis IV will deliver the International Habitation module (I-Hab) to the Lunar Gateway station in halo orbit around the Moon, establishing the first permanent crewed staging post beyond low Earth orbit."
      },
      {
        type: "quote",
        quote: "Passing acoustic stress clearance means our primary structures are qualified for the most severe launch dynamic loads we will ever encounter. We are ready for integration.",
        attribution: "Commander Robert Lindgren",
        role: "Artemis Crew Safety Director"
      }
    ],
    sources: [
      {
        name: "NASA Kennedy Space Center Press Release",
        url: "https://nasa.gov/artemis",
        time: "Sept 26, 2026"
      },
      {
        name: "ESA Lunar Gateway Partnership Briefing",
        url: "https://esa.int",
        time: "Sept 25, 2026"
      }
    ],
    relatedSlugs: [
      "deep-space-heavy-lift-propulsion-tests",
      "commercial-space-station-hab-pressure-tests",
      "james-webb-trappist-atmosphere-spectroscopy"
    ]
  },
  // =========================================================================
  // 6. SCIENCE — PARTICLE PHYSICS
  // =========================================================================
  {
    id: "sci-cern",
    slug: "cern-charm-quark-asymmetry",
    title: "CERN Physicists Detect Anomalous Charm Quark Asymmetry in Run 3 Dataset",
    dek: "Measurements from the LHCb detector show a subtle deviation from Standard Model decay predictions, prompting independent validation runs.",
    summary: "Measurements from the LHCb detector show a subtle deviation from Standard Model decay predictions, prompting independent validation runs.",
    category: "Science",
    subcategory: "Particle Physics",
    status: "Analysis",
    publishedAt: "2026-09-26T01:30:00Z",
    updatedAt: "2026-09-26T04:00:00Z",
    timeDisplay: "Updated 5 hours ago",
    readTime: "6 min read",
    author: {
      name: "Dr. Helen Vance",
      role: "Senior Science Editor",
      bio: "Dr. Helen Vance covers fundamental physics, quantum architectures, and frontier computing. Previously research fellow at Oxford Condensed Matter Physics.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.heroQuantum,
      alt: "Particle detector spectrometer beamline components",
      caption: "The LHCb spectrometer cavern located 100 meters beneath the Franco-Swiss border.",
      credit: "CERN / Maximilien Brice"
    },
    quickSummary: [
      "The LHCb collaboration analyzed over 60 billion charm meson decay events from Run 3 collisions.",
      "Direct CP violation in D0 meson decays deviated from Standard Model theory by 3.4 standard deviations.",
      "If confirmed, the discrepancy points toward previously unobserved intermediate gauge bosons.",
      "Secondary analysis from the Belle II experiment in Japan is scheduled to cross-examine findings in November."
    ],
    facts: [
      { label: "Laboratory", value: "CERN (European Organization for Nuclear Research)" },
      { label: "Experiment", value: "LHCb (Large Hadron Collider beauty)" },
      { label: "Observed Phenomenon", value: "Charge-Parity (CP) Asymmetry in D0 Mesons" },
      { label: "Statistical Significance", value: "3.4 sigma (evidence threshold)" },
      { label: "Collision Energy", value: "13.6 TeV center-of-mass" }
    ],
    updates: [
      {
        time: "8:30 AM",
        timestamp: "2026-09-26T04:00:00Z",
        title: "Seminar preprint distributed",
        text: "CERN theory department convened a public academic briefing discussing quantum chromodynamics corrections.",
        source: "CERN Academic Training Lecture Series"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "One of the most persistent enigmas in modern cosmology is why the universe consists almost entirely of matter rather than equal parts matter and antimatter. Today in Geneva, physicists working at the world\u2019s largest particle accelerator reported a rare empirical clue that could help unravel the asymmetry."
      },
      {
        type: "paragraph",
        text: "Using high-luminosity collision records gathered throughout 2025 and 2026, the LHCb collaboration measured the decay rates of neutral charm mesons into pairs of charged pions and kaons. They discovered that matter and antimatter versions of the particles do not decay at identical rates."
      },
      {
        type: "quote",
        quote: "While the Standard Model permits subtle CP violation, the magnitude we observe is noticeably larger than conventional perturbative QCD calculations suggest.",
        attribution: "Dr. Vincenzo Canale",
        role: "LHCb Physics Coordinator"
      },
      {
        type: "paragraph",
        text: 'Physicists caution that a 3.4 sigma measurement falls short of the rigorous 5.0 sigma "gold standard" required for a formal discovery. However, the result has immediately sparked feverish activity among theoretical physicists attempting to model potential beyond-the-Standard-Model interactions.'
      }
    ],
    sources: [
      {
        name: "CERN LHCb Collaboration Pre-print Server",
        url: "https://arxiv.org",
        time: "Sept 26, 2026"
      },
      {
        name: "European Physical Journal C",
        url: "https://epjc.epj.org",
        time: "Sept 26, 2026"
      }
    ],
    relatedSlugs: [
      "fusion-ignition-reproducibility-records",
      "quantum-coherence-breakthrough-cryogenic-milestone",
      "deep-space-heavy-lift-propulsion-tests"
    ]
  },
  // =========================================================================
  // 7. BUSINESS — CENTRAL BANKING & MACROECONOMICS
  // =========================================================================
  {
    id: "biz-ecb",
    slug: "ecb-rate-calibration",
    title: "European Central Bank Signals Cautious Rate Calibration Amid Energy Rebound",
    dek: "Governing Council members signal a data-contingent approach as euro-area headline inflation stabilizes near the two-percent target while industrial activity remains mixed.",
    summary: "Governing Council members signal a data-contingent approach as euro-area headline inflation stabilizes near the two-percent target while industrial activity remains mixed.",
    category: "Business",
    subcategory: "Central Banking",
    status: "Analysis",
    publishedAt: "2026-09-26T03:30:00Z",
    updatedAt: "2026-09-26T04:20:00Z",
    timeDisplay: "Updated 4 hours ago",
    readTime: "5 min read",
    author: {
      name: "Victoria Sterling",
      role: "Chief Economics Correspondent",
      bio: "Victoria Sterling reports on monetary policy, sovereign debt markets, foreign exchange dynamics, and global macroeconomic policy from Frankfurt and London.",
      avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.worldSummit,
      alt: "Financial district skyscrapers and European Central Bank plaza",
      caption: "The European Central Bank headquarters in Frankfurt am Main.",
      credit: "The Meridian / Financial Press Bureau"
    },
    quickSummary: [
      "The ECB benchmark deposit facility rate remains steady at 2.75 percent following policy deliberations.",
      "Services sector inflation fell to 2.4 percent, while manufacturing energy costs ticked slightly higher.",
      "Sovereign yield spreads between German Bunds and Italian BTPs held narrow at 118 basis points.",
      "Market pricing implies a 65 percent probability of a 25 basis point reduction at the December meeting."
    ],
    facts: [
      { label: "Institution", value: "European Central Bank (ECB)" },
      { label: "Deposit Facility Rate", value: "2.75%" },
      { label: "Headline Euro Inflation", value: "2.1% year-on-year" },
      { label: "Next Policy Decision", value: "October 29, 2026" },
      { label: "Sovereign Spread (Bund/BTP)", value: "118 bps" }
    ],
    updates: [
      {
        time: "9:00 AM",
        timestamp: "2026-09-26T04:20:00Z",
        title: "Frankfurt press conference concludes",
        text: "President reiterated that decisions remain strictly meeting-by-meeting without forward guidance commitments.",
        source: "ECB Press Office"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "In their final formal deliberations before the autumn fiscal season, policymakers at the European Central Bank held key interest rates steady today, balancing relief over cooling services inflation against lingering concerns over volatile commercial energy imports."
      },
      {
        type: "paragraph",
        text: "Addressing reporters in Frankfurt, central bank officials underscored that while restrictive monetary policy has successfully re-anchored medium-term inflation expectations, monetary easing will proceed only as hard data confirms wage deceleration across Germany, France, and Italy."
      },
      {
        type: "quote",
        quote: "We are not committing to a predetermined rate path. We will remain firmly data-dependent, navigating quarter by quarter.",
        attribution: "Christine Lagarde",
        role: "President, European Central Bank"
      },
      {
        type: "paragraph",
        text: "European equity indices traded largely unchanged following the announcement, reflecting widespread market expectation that the bank is pacing its actions in tandem with the US Federal Reserve and the Bank of England."
      }
    ],
    sources: [
      {
        name: "ECB Monetary Policy Statement",
        url: "https://ecb.europa.eu",
        time: "Sept 26, 2026"
      },
      {
        name: "Eurostat Harmonised Index of Consumer Prices (HICP)",
        url: "https://ec.europa.eu/eurostat",
        time: "Sept 25, 2026"
      }
    ],
    relatedSlugs: [
      "global-supply-chain-nearshoring-metrics",
      "transatlantic-trade-corridor-maritime-accord",
      "tokyo-sovereign-bond-yield-shift"
    ]
  },
  // =========================================================================
  // 8. WORLD — DIPLOMACY & GLOBAL ACCORDS
  // =========================================================================
  {
    id: "world-maritime",
    slug: "transatlantic-trade-corridor-maritime-accord",
    title: "G7 Delegations Reach Preliminary Maritime Framework on Low-Emission Shipping Corridors",
    dek: "The accord sets enforceable sulfur and synthetic methanol targets for North Atlantic cargo lanes commencing in the second quarter of 2027.",
    summary: "The accord sets enforceable sulfur and synthetic methanol targets for North Atlantic cargo lanes commencing in the second quarter of 2027.",
    category: "World",
    subcategory: "Trade & Governance",
    status: "Announcement",
    publishedAt: "2026-09-26T01:15:00Z",
    updatedAt: "2026-09-26T03:30:00Z",
    timeDisplay: "Updated 5 hours ago",
    readTime: "6 min read",
    author: {
      name: "Claire Delacroix",
      role: "European Affairs & Trade Editor",
      bio: "Claire Delacroix reports on European Union policy, transatlantic trade, multilateral treaties, and international climate summits from Brussels.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80"
    },
    heroImage: {
      url: ASSET_IMAGES.worldSummit,
      alt: "Diplomatic summit hall with leaders seated at circular table",
      caption: "Trade ministers finalizing environmental compliance timelines in Geneva.",
      credit: "Press Syndicate / The Meridian"
    },
    quickSummary: [
      "The agreement binds container vessels operating between Rotterdam, Hamburg, New York, and Halifax.",
      "Bunkering infrastructure for green e-methanol will receive coordinated public co-financing.",
      "Enforcement begins in Q2 2027 with progressive fee penalties for non-compliant merchant fleets.",
      "Maritime transport accounts for approximately 2.9% of total anthropogenic emissions."
    ],
    facts: [
      { label: "Accord Name", value: "Transatlantic Green Maritime Corridor Initiative" },
      { label: "Participating Ports", value: "Rotterdam, Antwerp, Hamburg, New York/NJ, Halifax" },
      { label: "Effective Date", value: "May 1, 2027" },
      { label: "Target Fuels", value: "Bio-e-methanol, green hydrogen, and low-sulfur e-ammonia" },
      { label: "Oversight Agency", value: "Joint Atlantic Maritime Environmental Commission" }
    ],
    updates: [
      {
        time: "7:45 AM",
        timestamp: "2026-09-26T03:30:00Z",
        title: "Final communique endorsed",
        text: "All seven member states signed the implementation annex following late-night negotiations in Geneva.",
        source: "Geneva Summit Secretariat"
      }
    ],
    content: [
      {
        type: "paragraph",
        lead: true,
        text: "After eleven days of contentious negotiations in Geneva, trade and environmental ministers from the Group of Seven nations concluded an unprecedented multilateral agreement establishing legally binding emissions standards for commercial shipping corridors across the North Atlantic."
      },
      {
        type: "paragraph",
        text: "Under the agreement, cargo carriers operating on designated routes between western European ports and the eastern seaboard of North America will face tiered port access fees unless they transition twenty percent of their propulsion power to certified synthetic zero-carbon fuels by 2028."
      },
      {
        type: "quote",
        quote: "Global shipping has operated in regulatory ambiguity for half a century. Today\u2019s framework proves that major trading democracies can establish enforceable environmental baselines without disrupting supply chains.",
        attribution: "Henrik Visser",
        role: "Netherlands Minister of Transport & Water Management"
      },
      {
        type: "paragraph",
        text: "Major maritime liner carriers, including Maersk, Hapag-Lloyd, and CMA CGM, issued a joint statement welcoming regulatory clarity, noting that common transatlantic standards prevent fragmented patchwork levies."
      }
    ],
    sources: [
      {
        name: "Geneva G7 Trade Ministerial Communiqu\xE9",
        url: "https://g7trade.org",
        time: "Sept 26, 2026"
      },
      {
        name: "International Chamber of Shipping Statement",
        url: "https://ics-shipping.org",
        time: "Sept 26, 2026"
      }
    ],
    relatedSlugs: [
      "global-supply-chain-nearshoring-metrics",
      "ecb-rate-calibration",
      "geneva-digital-sovereignty-compact"
    ]
  }
];

// src/data/mockNews.ts
var MOCK_STORIES = [
  // FEATURED HERO STORY
  {
    id: "story-hero",
    slug: "quantum-coherence-breakthrough-cryogenic-milestone",
    title: "The Sub-Kelvin Milestone: How Optical Cryostats Unlocked Continuous Fault-Tolerant Coherence",
    summary: "A joint consortium of international physics laboratories has demonstrated three hours of unbroken logical qubit entanglement at sub-millikelvin temperatures, clearing a decade-long hurdle toward practical commercial error correction.",
    category: "AI & Computing",
    subcategory: "Quantum Systems",
    image: ASSET_IMAGES.heroQuantum,
    alt: "Golden cryostat wiring and optical chambers inside a low-temperature physics research facility",
    caption: "Dilution refrigeration stages inside the international consortium laboratory prior to final vacuum sealing.",
    credit: "The Meridian / Laurent Mercier",
    publishedAt: "2026-09-26T05:30:00Z",
    updatedAt: "2026-09-26T06:12:00Z",
    timeDisplay: "Updated 18m ago",
    author: {
      name: "Dr. Helen Vance",
      role: "Senior Science & Deep Tech Correspondent"
    },
    readTime: "6 min read",
    featured: true,
    isBreaking: false
  },
  // LATEST NEWS FEED
  {
    id: "latest-1",
    slug: "eu-ai-safety-audits-first-wave",
    title: "European AI Safety Board issues initial compliance directives to frontier model developers",
    summary: "The directive mandates standardized stress testing for autonomous code execution and recursive weight distillation.",
    category: "AI",
    image: ASSET_IMAGES.heroQuantum,
    alt: "EU regulatory chambers",
    publishedAt: "2026-09-26T06:05:00Z",
    timeDisplay: "10:42 AM",
    author: { name: "Julian Foster", role: "Brussels Bureau Chief" },
    readTime: "3 min read",
    isLive: true
  },
  {
    id: "latest-2",
    slug: "nvidia-quantum-interconnect-standard",
    title: "Chipmakers ratify unified optical interconnect standard for distributed cluster memory",
    summary: "The open architecture promises to reduce inter-rack networking latency by thirty-eight percent across heterogeneous data centers.",
    category: "Technology",
    image: ASSET_IMAGES.techSemiconductor,
    alt: "Semiconductor interconnect",
    publishedAt: "2026-09-26T05:45:00Z",
    timeDisplay: "10:31 AM",
    author: { name: "Sarah Lin", role: "Silicon Valley Reporter" },
    readTime: "4 min read"
  },
  {
    id: "latest-3",
    slug: "nintendo-devkit-distribution-expands",
    title: "Independent studios confirm expanded shipments of next-generation handheld developer kits",
    summary: "Several Kyoto and Montreal partners have reportedly begun compiling launch titles with custom hardware upscaling support.",
    category: "Gaming",
    image: ASSET_IMAGES.gamingVista,
    alt: "Game studio development station",
    publishedAt: "2026-09-26T05:22:00Z",
    timeDisplay: "10:19 AM",
    author: { name: "Marcus Bell", role: "Gaming Editor" },
    readTime: "3 min read"
  },
  {
    id: "latest-4",
    slug: "james-webb-trappist-atmosphere-spectroscopy",
    title: "Webb telescope spectroscopy confirms heavy carbon dioxide mantle on outer TRAPPIST-1 world",
    summary: "The empirical observations provide astronomers with the first atmospheric density baseline for earth-sized terrestrial exoplanets.",
    category: "Space",
    image: ASSET_IMAGES.spaceRocket,
    alt: "Exoplanet spectroscopy visualization",
    publishedAt: "2026-09-26T04:58:00Z",
    timeDisplay: "09:58 AM",
    author: { name: "Alina Thorne", role: "Astrophysics Correspondent" },
    readTime: "5 min read"
  },
  {
    id: "latest-5",
    slug: "tokyo-sovereign-bond-yield-shift",
    title: "Bank of Japan maintains short-term benchmark following morning sovereign debt auction",
    summary: "Yields on ten-year Japanese government bonds settled at 1.42 percent amid balanced corporate bond issuances.",
    category: "Business",
    image: ASSET_IMAGES.worldSummit,
    alt: "Financial district in Tokyo",
    publishedAt: "2026-09-26T04:20:00Z",
    timeDisplay: "09:20 AM",
    author: { name: "Kenji Takahashi", role: "Tokyo Bureau" },
    readTime: "3 min read"
  },
  // TOP STORIES (4 CARDS)
  {
    id: "top-1",
    slug: "semiconductor-lithography-power-grid-integration",
    title: "The High-NA Lithography Bottleneck: Why Next-Generation Fabs Are Building Dedicated Power Substations",
    summary: "Extreme ultraviolet machinery requires unprecedented electrical stability, driving leading foundries to negotiate bespoke grid infrastructure.",
    category: "Technology",
    subcategory: "Hardware Infrastructure",
    image: ASSET_IMAGES.techSemiconductor,
    alt: "Silicon wafer with microcircuit patterns under cleanroom yellow lighting",
    caption: "Inspection of 300mm patterned wafers following multi-layer ultraviolet deposition.",
    credit: "FabTech Global / Meridian",
    publishedAt: "2026-09-26T04:15:00Z",
    timeDisplay: "2 hours ago",
    author: { name: "Sarah Lin", role: "Technology Correspondent" },
    readTime: "5 min read"
  },
  {
    id: "top-2",
    slug: "deep-space-heavy-lift-propulsion-tests",
    title: "Methane-Oxygen Propulsion Passes Extended Static Fire Test Ahead of First Orbital Cargo Run",
    summary: "Telemetry indicates nominal chamber pressures throughout the four-minute duration burn conducted at the Boca Chica proving grounds.",
    category: "Science & Space",
    subcategory: "Aerospace",
    image: ASSET_IMAGES.spaceRocket,
    alt: "Orbital space rocket ignition flame reflecting over ocean waters at twilight",
    caption: "Orbital vehicle stage one firing at dusk over the coastal test facility.",
    credit: "AeroArchive / The Meridian",
    publishedAt: "2026-09-26T03:45:00Z",
    timeDisplay: "3 hours ago",
    author: { name: "Alina Thorne", role: "Aerospace Reporter" },
    readTime: "4 min read"
  },
  {
    id: "top-3",
    slug: "open-world-rendering-neural-radiance-breakthrough",
    title: "Real-Time Neural Radiance Fields Are Replacing Traditional Game Engine Level Baking",
    summary: "Next-generation engines are abandoning static lightmaps entirely, streaming billions of volumetric photons in 60 frames per second.",
    category: "Gaming",
    subcategory: "Engine Architecture",
    image: ASSET_IMAGES.gamingVista,
    alt: "Vast cinematic fantasy landscape with mountains and sci-fi ruins in mist",
    caption: "Procedural lighting demonstration rendered dynamically in real time without precomputed lightmaps.",
    credit: "Vanguard Studios",
    publishedAt: "2026-09-26T02:30:00Z",
    timeDisplay: "4 hours ago",
    author: { name: "Marcus Bell", role: "Interactive Media Editor" },
    readTime: "5 min read"
  },
  {
    id: "top-4",
    slug: "transatlantic-trade-corridor-maritime-accord",
    title: "G7 Delegations Reach Preliminary Maritime Framework on Low-Emission Shipping Corridors",
    summary: "The accord sets enforceable sulfur and synthetic methanol targets for North Atlantic cargo lanes commencing in the second quarter of 2027.",
    category: "World",
    subcategory: "Trade & Governance",
    image: ASSET_IMAGES.worldSummit,
    alt: "Diplomatic summit hall with leaders seated at circular table",
    caption: "Trade ministers finalizing environmental compliance timelines in Geneva.",
    credit: "Press Syndicate / Meridian",
    publishedAt: "2026-09-26T01:15:00Z",
    timeDisplay: "5 hours ago",
    author: { name: "Claire Delacroix", role: "European Affairs Editor" },
    readTime: "6 min read"
  },
  // AI & TECHNOLOGY SECTION
  {
    id: "ai-feat-1",
    slug: "autonomous-scientific-reasoning-agents-materials",
    title: "Autonomous Lab Synthesizers Discover Four Thermoelectric Alloys in Unsupervised Fortnight Run",
    summary: "By pairing foundation chemistry models with robotic crystal vapor deposition chambers, researchers achieved a search efficiency sixteen times higher than human exploration.",
    category: "AI & Technology",
    subcategory: "Materials AI",
    image: ASSET_IMAGES.techSemiconductor,
    alt: "Microscopic inspection of alloy crystals",
    publishedAt: "2026-09-26T03:10:00Z",
    timeDisplay: "3 hours ago",
    author: { name: "Dr. Helen Vance", role: "Senior Science Editor" },
    readTime: "6 min read"
  },
  {
    id: "ai-sub-1",
    slug: "open-source-weights-governance-split",
    title: "Open-weights developers split over mandatory model licensing clauses in federal grant guidelines",
    summary: "Academics argue new indemnification rules could unintentionally favor established tech conglomerates.",
    category: "AI & Technology",
    subcategory: "Policy",
    image: ASSET_IMAGES.heroQuantum,
    alt: "Federal registry document on screen",
    publishedAt: "2026-09-26T02:00:00Z",
    timeDisplay: "4 hours ago",
    author: { name: "Julian Foster", role: "Policy Bureau" },
    readTime: "4 min read"
  },
  {
    id: "ai-sub-2",
    slug: "memory-bandwidth-hbm4-packaging-costs",
    title: "HBM4 packaging yields hit eighty-five percent as thermal interface materials improve",
    summary: "Advanced micro-bump technology allows twelve-die stacking with significantly diminished warping during reflow.",
    category: "AI & Technology",
    subcategory: "Hardware",
    image: ASSET_IMAGES.techSemiconductor,
    alt: "Silicon die under electron microscope",
    publishedAt: "2026-09-26T01:30:00Z",
    timeDisplay: "5 hours ago",
    author: { name: "Sarah Lin", role: "Silicon Valley Reporter" },
    readTime: "4 min read"
  },
  // GAMING SECTION (3 EQUAL CARDS)
  {
    id: "game-1",
    slug: "narrative-design-systemic-ai-npc-experiments",
    title: "The Death of the Scripted Bark: How Dynamic Dialogue Engines Are Reshaping Open-World RPGs",
    summary: "Leading narrative designers discuss why players favor emergent character interactions over traditional multi-branch dialogue trees.",
    category: "Gaming",
    subcategory: "Design Analysis",
    image: ASSET_IMAGES.gamingVista,
    alt: "High detail RPG environment vista",
    publishedAt: "2026-09-26T03:00:00Z",
    timeDisplay: "3 hours ago",
    author: { name: "Marcus Bell", role: "Gaming Editor" },
    readTime: "5 min read"
  },
  {
    id: "game-2",
    slug: "handheld-oled-battery-chemistry-advancements",
    title: "Silicon-Anode Batteries Give Next-Wave Portable Consoles Seven-Hour AAA Runtimes",
    summary: "Higher energy density cells withstand sixty-watt peak draws without noticeable thermal throttling or premature cell degradation.",
    category: "Gaming",
    subcategory: "Hardware",
    image: ASSET_IMAGES.techSemiconductor,
    alt: "Internal battery and heatsink assembly of gaming handheld",
    publishedAt: "2026-09-26T02:15:00Z",
    timeDisplay: "4 hours ago",
    author: { name: "David Chen", role: "Hardware Specialist" },
    readTime: "4 min read"
  },
  {
    id: "game-3",
    slug: "indie-publishing-steam-algorithm-discoverability",
    title: "Micro-Studios Are Circumventing Storefront Algorithms by Rebuilding Dedicated Demo Tours",
    summary: "Physical expos and direct community playtests are replacing algorithmic wishlist campaigns as the primary driver of indie profitability.",
    category: "Gaming",
    subcategory: "Industry",
    image: ASSET_IMAGES.gamingVista,
    alt: "Crowded indie game convention booth",
    publishedAt: "2026-09-26T01:00:00Z",
    timeDisplay: "5 hours ago",
    author: { name: "Elena Rostova", role: "Culture & Entertainment" },
    readTime: "4 min read"
  },
  // SCIENCE & SPACE SECTION
  {
    id: "sci-1",
    slug: "antarctic-ice-shelf-subglacial-radar-mapping",
    title: "Subglacial Radar Array Reveals Geothermal Vent System Beneath West Antarctic Basin",
    summary: "The airborne electromagnetic survey identifies localized basal melting channels previously unrepresented in climate equilibrium models.",
    category: "Science & Space",
    subcategory: "Glaciology",
    image: ASSET_IMAGES.spaceRocket,
    alt: "Subglacial radar scanning aircraft over polar ice",
    publishedAt: "2026-09-26T04:00:00Z",
    timeDisplay: "2 hours ago",
    author: { name: "Dr. Helen Vance", role: "Senior Science Editor" },
    readTime: "6 min read"
  },
  {
    id: "sci-2",
    slug: "lunar-polar-water-ice-neutron-spectrometer",
    title: "Orbital neutron spectrometer detects surface frost concentrations inside Shackleton Crater",
    summary: "Permanent shadow regions indicate substantial hydrogen abundance suitable for in-situ propellant processing.",
    category: "Science & Space",
    subcategory: "Planetary Science",
    image: ASSET_IMAGES.spaceRocket,
    alt: "Craters on lunar south pole",
    publishedAt: "2026-09-26T02:40:00Z",
    timeDisplay: "4 hours ago",
    author: { name: "Alina Thorne", role: "Astrophysics Correspondent" },
    readTime: "4 min read"
  },
  {
    id: "sci-3",
    slug: "crispr-epigenetic-silencing-cardiac-fibrosis",
    title: "Epigenetic silencing therapy halts progressive cardiac fibrosis in Phase II clinical trial",
    summary: "Rather than cutting double-stranded DNA, the targeted methylation represses maladaptive collagen deposition safely.",
    category: "Science & Space",
    subcategory: "Biotechnology",
    image: ASSET_IMAGES.heroQuantum,
    alt: "Biomedical research laboratory assay",
    publishedAt: "2026-09-26T01:10:00Z",
    timeDisplay: "5 hours ago",
    author: { name: "Dr. Aris Thorne", role: "Medical Science Contributor" },
    readTime: "5 min read"
  },
  {
    id: "sci-cern",
    slug: "cern-charm-quark-asymmetry",
    title: "CERN Physicists Detect Anomalous Charm Quark Asymmetry in Run 3 Dataset",
    summary: "Measurements from the LHCb detector show a subtle deviation from Standard Model decay predictions, prompting independent validation runs.",
    category: "Science",
    subcategory: "Physics",
    image: ASSET_IMAGES.heroQuantum,
    alt: "Particle detector spectrometer beamline components",
    publishedAt: "2026-09-26T01:30:00Z",
    timeDisplay: "5 hours ago",
    author: { name: "Dr. Helen Vance", role: "Senior Science Editor" },
    readTime: "6 min read"
  },
  // BUSINESS SECTION
  {
    id: "biz-1",
    slug: "central-bank-liquidity-swap-lines-sovereign-debt",
    title: "Treasury Refinancing Surge Prompts Federal Reserve to Expand Overnight Repo Facilities",
    summary: "Institutional market makers absorbed sixty-two billion dollars in newly auctioned paper with stable primary dealer bid-to-cover ratios.",
    category: "Business",
    subcategory: "Monetary Policy",
    image: ASSET_IMAGES.worldSummit,
    alt: "Financial exchange floor with traders and monitors",
    publishedAt: "2026-09-26T03:50:00Z",
    timeDisplay: "3 hours ago",
    author: { name: "Victoria Sterling", role: "Chief Economics Correspondent" },
    readTime: "5 min read"
  },
  {
    id: "biz-2",
    slug: "datacenter-energy-contracts-nuclear-sponsorship",
    title: "Cloud hyperscalers execute twenty-year power purchase pacts with modular reactor builders",
    summary: "Small modular reactor ventures gain institutional credit backing as tech giants seek steady baseload electricity for training clusters.",
    category: "Business",
    subcategory: "Energy & Infrastructure",
    image: ASSET_IMAGES.techSemiconductor,
    alt: "Clean nuclear energy facility blueprint",
    publishedAt: "2026-09-26T02:30:00Z",
    timeDisplay: "4 hours ago",
    author: { name: "Kenji Takahashi", role: "Tokyo Bureau" },
    readTime: "4 min read"
  },
  {
    id: "biz-3",
    slug: "venture-capital-b2b-software-multiples-rationalization",
    title: "Enterprise software valuations re-anchor to cash flow as ARR multiples drop to historic medians",
    summary: "Founders prioritize GAAP operating margins over hyper-growth, leading to a revival in strategic trade sales and take-private bids.",
    category: "Business",
    subcategory: "Markets",
    image: ASSET_IMAGES.worldSummit,
    alt: "Corporate boardroom financial presentation",
    publishedAt: "2026-09-26T01:00:00Z",
    timeDisplay: "5 hours ago",
    author: { name: "Victoria Sterling", role: "Chief Economics Correspondent" },
    readTime: "4 min read"
  },
  // WORLD NEWS SECTION
  {
    id: "world-1",
    slug: "geneva-digital-sovereignty-treaty-negotiations",
    title: "Delegates in Geneva Conclude Third Round of Cross-Border Data Sovereignty Negotiations",
    summary: "The draft protocol establishes verifiable international dispute mechanisms for cloud storage extraterritoriality and lawful government access requests.",
    category: "World",
    subcategory: "International Law",
    image: ASSET_IMAGES.worldSummit,
    alt: "United Nations conference chamber in Geneva",
    publishedAt: "2026-09-26T04:10:00Z",
    timeDisplay: "2 hours ago",
    author: { name: "Claire Delacroix", role: "European Affairs Editor" },
    readTime: "5 min read"
  },
  {
    id: "world-2",
    slug: "pacific-islands-subsea-telecom-cable-consortium",
    title: "Pacific Island nations commission redundant trans-oceanic fiber ring to bolster island connectivity",
    summary: "The seven-thousand-kilometer subsea system will provide hardened satellite fallbacks during severe seasonal cyclone disturbances.",
    category: "World",
    subcategory: "Infrastructure",
    image: ASSET_IMAGES.spaceRocket,
    alt: "Subsea cable installation vessel in open ocean",
    publishedAt: "2026-09-26T02:20:00Z",
    timeDisplay: "4 hours ago",
    author: { name: "Kenji Takahashi", role: "Asia-Pacific Bureau" },
    readTime: "4 min read"
  },
  {
    id: "world-3",
    slug: "scandinavian-grid-interconnect-green-hydrogen",
    title: "Nordic power grid operators complete synchronous HVDC link for offshore hydrogen production",
    summary: "The cable connects high-capacity North Sea wind installations directly with Baltic synthetic fuel synthesis plants.",
    category: "World",
    subcategory: "Energy",
    image: ASSET_IMAGES.techSemiconductor,
    alt: "High voltage transmission converter station",
    publishedAt: "2026-09-26T00:45:00Z",
    timeDisplay: "6 hours ago",
    author: { name: "Julian Foster", role: "Brussels Bureau Chief" },
    readTime: "4 min read"
  },
  // MOST READ STORIES (RANKED 01 to 05)
  {
    id: "most-read-1",
    slug: "the-silicon-ceiling-transistor-density-physics",
    title: "Why Physicists Warn the Silicon Transistor Has Reached Atomic Lattice Boundaries",
    summary: "At zero-point-six nanometers, quantum tunneling ceases to be an engineering nuance and becomes an absolute thermodynamic wall.",
    category: "Technology",
    image: ASSET_IMAGES.techSemiconductor,
    alt: "Silicon atomic lattice simulation",
    publishedAt: "2026-09-25T14:00:00Z",
    timeDisplay: "Yesterday",
    author: { name: "Sarah Lin", role: "Technology Correspondent" },
    readTime: "7 min read",
    rank: 1
  },
  {
    id: "most-read-2",
    slug: "how-game-studios-are-adapting-to-longer-cycles",
    title: "Seven-Year Development Windows: Inside the Financial Squeeze of Modern Blockbusters",
    summary: "With budgets routinely surpassing two hundred million dollars, studios are rethinking single-release milestones.",
    category: "Gaming",
    image: ASSET_IMAGES.gamingVista,
    alt: "Game motion capture stage with sensors",
    publishedAt: "2026-09-25T18:30:00Z",
    timeDisplay: "Yesterday",
    author: { name: "Marcus Bell", role: "Gaming Editor" },
    readTime: "6 min read",
    rank: 2
  },
  {
    id: "most-read-3",
    slug: "fusion-ignition-reproducibility-records",
    title: "Inertial Confinement Reactor Delivers Consecutive Net Energy Yields in Livermore Campaign",
    summary: "Researchers exceed target gain factors on back-to-back shots using shaped diamond target capsules.",
    category: "Science",
    subcategory: "Physics",
    image: ASSET_IMAGES.heroQuantum,
    alt: "Fusion chamber target chamber",
    publishedAt: "2026-09-25T11:20:00Z",
    timeDisplay: "Yesterday",
    author: { name: "Dr. Helen Vance", role: "Senior Science Editor" },
    readTime: "5 min read",
    rank: 3
  },
  {
    id: "most-read-4",
    slug: "commercial-space-station-hab-pressure-tests",
    title: "Inflatable Orbital Habitat Bladder Withstands Extreme Hypervelocity Particle Impacts",
    summary: "Kevlar-vectran weave composite displays zero puncture leaks during simulated debris collisions at eight kilometers per second.",
    category: "Space",
    image: ASSET_IMAGES.spaceRocket,
    alt: "Pressurized habitat module in vacuum chamber",
    publishedAt: "2026-09-25T16:15:00Z",
    timeDisplay: "Yesterday",
    author: { name: "Alina Thorne", role: "Aerospace Reporter" },
    readTime: "4 min read",
    rank: 4
  },
  {
    id: "most-read-5",
    slug: "global-supply-chain-nearshoring-metrics",
    title: "Manufacturing Data Shows Northern Mexico Absorbing Record Capital Goods Investment",
    summary: "Automotive and industrial electronics assembly footprints expand along the Monterrey-Saltillo corridor.",
    category: "Business",
    image: ASSET_IMAGES.worldSummit,
    alt: "Modern automated logistics fulfillment center",
    publishedAt: "2026-09-25T09:40:00Z",
    timeDisplay: "Yesterday",
    author: { name: "Victoria Sterling", role: "Chief Economics Correspondent" },
    readTime: "5 min read",
    rank: 5
  }
];

// src/data/categoryDatabase.ts
var CATEGORY_DEFINITIONS = [
  {
    id: "ai",
    slug: "ai",
    name: "AI",
    shortName: "AI",
    description: "Frontier models, machine learning research, neural architectures, and computational intelligence.",
    longDescription: "In-depth reporting and rigorous editorial analysis covering the fundamental models, hardware infrastructure, corporate strategies, and regulatory frameworks reshaping artificial intelligence.",
    featuredTopic: "Frontier Reasoning & Safety Protocols",
    subcategories: [
      { id: "all", name: "All AI", slug: "all" },
      { id: "models", name: "Frontier Models", slug: "models", description: "Large multimodal models, reasoning engines, and weights" },
      { id: "research", name: "Research", slug: "research", description: "Peer-reviewed preprints, benchmark evaluations, and theorems" },
      { id: "enterprise", name: "Enterprise & Infrastructure", slug: "enterprise", description: "Compute clusters, cloud data centers, and enterprise deployments" },
      { id: "policy", name: "Policy & Safety", slug: "policy", description: "Sovereign governance, ethics, copyright, and safety accords" }
    ]
  },
  {
    id: "tech",
    slug: "technology",
    name: "Technology",
    shortName: "Tech",
    description: "Semiconductor physics, platform architecture, enterprise hardware, and computing systems.",
    longDescription: "Authoritative coverage of silicon lithography, network fabrics, operating platforms, and high-performance computing engineering from foundries to server racks.",
    featuredTopic: "High-NA EUV & Power Delivery",
    subcategories: [
      { id: "all", name: "All Technology", slug: "all" },
      { id: "semiconductors", name: "Semiconductors", slug: "semiconductors", description: "Foundries, packaging, lithography, and memory" },
      { id: "infrastructure", name: "Infrastructure", slug: "infrastructure", description: "Data centers, optical networks, and power substations" },
      { id: "hardware", name: "Hardware", slug: "hardware", description: "Processors, interconnects, and physical computing" },
      { id: "security", name: "Security", slug: "security", description: "Cryptographic systems, firmware, and platform integrity" }
    ]
  },
  {
    id: "gaming",
    slug: "gaming",
    name: "Gaming",
    shortName: "Gaming",
    description: "Interactive entertainment, hardware engineering, rendering engines, and industry economics.",
    longDescription: "Critical coverage of real-time graphics pipelines, interactive physics, console architecture, studio economics, and the creative minds driving global interactive media.",
    featuredTopic: "Real-Time Neural Radiance",
    subcategories: [
      { id: "all", name: "All Gaming", slug: "all" },
      { id: "engines", name: "Engine Tech", slug: "engines", description: "Graphics APIs, physics simulations, and illumination" },
      { id: "hardware", name: "Hardware", slug: "hardware", description: "Handheld devices, bespoke silicon, and peripherals" },
      { id: "releases", name: "Releases", slug: "releases", description: "Major studio dispatches and interactive titles" },
      { id: "industry", name: "Industry & Economics", slug: "industry", description: "Publishing budgets, development cycles, and labor" }
    ]
  },
  {
    id: "science",
    slug: "science",
    name: "Science",
    shortName: "Science",
    description: "Fundamental physics, climate systems, molecular genetics, and laboratory breakthroughs.",
    longDescription: "Reporting directly from international laboratories and research consortiums on experimental particle physics, cellular therapies, and thermodynamic discoveries.",
    featuredTopic: "Sub-Kelvin Quantum Milestones",
    subcategories: [
      { id: "all", name: "All Science", slug: "all" },
      { id: "physics", name: "Particle Physics", slug: "physics", description: "High-energy accelerators, colliders, and cosmology" },
      { id: "biotech", name: "Genetics & Biotech", slug: "biotech", description: "Epigenetic vectors, molecular biology, and therapies" },
      { id: "materials", name: "Materials Science", slug: "materials", description: "Superconductors, synthetic crystals, and polymers" },
      { id: "climate", name: "Climate Systems", slug: "climate", description: "Ocean circulation, atmospheric metrics, and modeling" }
    ]
  },
  {
    id: "space",
    slug: "space",
    name: "Space",
    shortName: "Space",
    description: "Orbital logistics, lunar missions, astrophysics observation, and deep-space propulsion.",
    longDescription: "Comprehensive tracking of civil space exploration, heavy-lift launch architectures, deep-space astronomical observatories, and lunar infrastructure development.",
    featuredTopic: "Artemis Heavy Lift Telemetry",
    subcategories: [
      { id: "all", name: "All Space", slug: "all" },
      { id: "lunar", name: "Lunar Exploration", slug: "lunar", description: "Artemis missions, landers, and lunar gateway orbit" },
      { id: "astrophysics", name: "Astrophysics", slug: "astrophysics", description: "Orbital telescopes, spectroscopy, and exoplanets" },
      { id: "propulsion", name: "Launch & Propulsion", slug: "propulsion", description: "Heavy-lift rocketry, methalox engines, and reusability" },
      { id: "commercial", name: "Commercial Orbit", slug: "commercial", description: "Private stations, satellite constellations, and cargo" }
    ]
  },
  {
    id: "business",
    slug: "business",
    name: "Business",
    shortName: "Business",
    description: "Macroeconomics, central bank policy, sovereign debt, and international supply chains.",
    longDescription: "Global financial reporting with an emphasis on central bank monetary policy, capital allocation into industrial technologies, sovereign bond markets, and trade flows.",
    featuredTopic: "Monetary Calibration & Nearshoring",
    subcategories: [
      { id: "all", name: "All Business", slug: "all" },
      { id: "macro", name: "Central Banking", slug: "macro", description: "Interest rate decisions, inflation gauges, and yield curves" },
      { id: "markets", name: "Global Markets", slug: "markets", description: "Equities, sovereign debt, commodities, and currencies" },
      { id: "supply-chains", name: "Supply Chains", slug: "supply-chains", description: "Nearshoring, logistics hubs, and industrial trade" },
      { id: "enterprise", name: "Enterprise Capital", slug: "enterprise", description: "Corporate finance, debt issuance, and M&A" }
    ]
  },
  {
    id: "world",
    slug: "world",
    name: "World",
    shortName: "World",
    description: "Diplomatic summits, international trade pacts, geopolitics, and global statecraft.",
    longDescription: "Dispatches from international bureaus analyzing multilateral accords, border governance, environmental corridors, and diplomatic negotiations among global powers.",
    featuredTopic: "Transatlantic Maritime Treaties",
    subcategories: [
      { id: "all", name: "All World", slug: "all" },
      { id: "diplomacy", name: "Diplomacy & Treaties", slug: "diplomacy", description: "G7 summits, bilateral accords, and treaties" },
      { id: "trade", name: "Trade & Corridors", slug: "trade", description: "Tariffs, maritime routes, and customs pacts" },
      { id: "governance", name: "Global Governance", slug: "governance", description: "Multilateral institutions and international law" }
    ]
  },
  {
    id: "entertainment",
    slug: "entertainment",
    name: "Entertainment",
    shortName: "Entertainment",
    description: "Global film production, streaming distribution, media economics, and digital arts.",
    longDescription: "Reporting on the intersection of media production, streaming licensing architectures, interactive IP adaptations, and international cultural exhibitions.",
    subcategories: [
      { id: "all", name: "All Entertainment", slug: "all" },
      { id: "film", name: "Film & Production", slug: "film" },
      { id: "streaming", name: "Streaming Platforms", slug: "streaming" },
      { id: "culture", name: "Arts & Culture", slug: "culture" }
    ]
  },
  {
    id: "cybersecurity",
    slug: "cybersecurity",
    name: "Cybersecurity",
    shortName: "Cybersecurity",
    description: "Cryptographic defense, critical infrastructure resilience, and zero-day threat analysis.",
    longDescription: "Technical investigations into state-sponsored cyber warfare, cryptographic agility, post-quantum defenses, and industrial control system safeguards.",
    subcategories: [
      { id: "all", name: "All Cybersecurity", slug: "all" },
      { id: "threats", name: "Threat Intelligence", slug: "threats" },
      { id: "cryptography", name: "Post-Quantum Crypto", slug: "cryptography" }
    ]
  },
  {
    id: "apps",
    slug: "apps",
    name: "Apps",
    shortName: "Apps",
    description: "Mobile operating systems, distributed application ecosystems, and platform API shifts.",
    longDescription: "Detailed technical analysis of consumer software platforms, developer frameworks, app store antitrust regulations, and next-generation operating system releases.",
    subcategories: [
      { id: "all", name: "All Apps", slug: "all" },
      { id: "mobile", name: "Mobile Systems", slug: "mobile" },
      { id: "desktop", name: "Desktop Software", slug: "desktop" }
    ]
  },
  {
    id: "hardware",
    slug: "hardware",
    name: "Hardware",
    shortName: "Hardware",
    description: "Consumer electronics engineering, photonics, custom silicon packaging, and robotics.",
    longDescription: "In-depth dispatches evaluating thermal packaging, consumer silicon architectures, optics modules, and advanced robotics manufacturing.",
    subcategories: [
      { id: "all", name: "All Hardware", slug: "all" },
      { id: "silicon", name: "Custom Silicon", slug: "silicon" },
      { id: "devices", name: "Devices & Sensors", slug: "devices" }
    ]
  }
];

// src/services/distribution/SitemapService.ts
var SitemapService = class _SitemapService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, "") : getSiteUrl();
  }
  static generateSitemapXml(publishedStories, customAuthors = []) {
    return new _SitemapService().generateSitemapXml(publishedStories, customAuthors);
  }
  /**
   * Generates a valid XML sitemap string for published stories, categories, and publisher transparency pages.
   * Internal draft/held stories and private pipeline metadata are strictly omitted.
   */
  generateSitemapXml(publishedStories, customAuthors = []) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const categoryRoutes = CATEGORY_DEFINITIONS.map((c) => ({
      loc: getCanonicalUrl(`/${c.slug}`),
      lastmod: now,
      changefreq: ["ai", "technology", "world", "business"].includes(c.slug) ? "hourly" : "daily",
      priority: ["ai", "technology"].includes(c.slug) ? 0.9 : 0.8
    }));
    const coreRoutes = [
      { loc: getCanonicalUrl("/"), lastmod: now, changefreq: "hourly", priority: 1 },
      ...categoryRoutes
    ];
    const transparencyRoutes = [
      { loc: getCanonicalUrl("/about"), lastmod: now, changefreq: "monthly", priority: 0.6 },
      { loc: getCanonicalUrl("/contact"), lastmod: now, changefreq: "monthly", priority: 0.6 },
      { loc: getCanonicalUrl("/editorial-policy"), lastmod: now, changefreq: "monthly", priority: 0.7 },
      { loc: getCanonicalUrl("/corrections"), lastmod: now, changefreq: "daily", priority: 0.7 },
      { loc: getCanonicalUrl("/privacy"), lastmod: now, changefreq: "monthly", priority: 0.5 },
      { loc: getCanonicalUrl("/terms"), lastmod: now, changefreq: "monthly", priority: 0.5 }
    ];
    const defaultAuthorSlugs = [
      "helen-vance",
      "julian-foster",
      "sarah-lin",
      "marcus-bell",
      "alina-thorne",
      "victoria-sterling",
      "claire-delacroix",
      "kenji-takahashi",
      "meridian-desk"
    ];
    const authorSlugs = Array.from(/* @__PURE__ */ new Set([...defaultAuthorSlugs, ...customAuthors]));
    const authorRoutes = authorSlugs.map((slug) => ({
      loc: getCanonicalUrl(`/author/${slug}`),
      lastmod: now,
      changefreq: "weekly",
      priority: 0.5
    }));
    const storyEntries = publishedStories.filter((s) => {
      const isPublished = s.status === "published" || s.lifecycleStatus === "published";
      return isPublished && Boolean(s.slug);
    }).map((s) => ({
      loc: getCanonicalUrl(`/story/${s.slug}`),
      lastmod: s.updated_at || s.updatedAt || s.published_at || s.publishedAt || now,
      changefreq: "daily",
      priority: 0.8
    }));
    const allEntries = [...coreRoutes, ...transparencyRoutes, ...authorRoutes, ...storyEntries];
    const urlsXml = allEntries.map(
      (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq || "daily"}</changefreq>
    <priority>${(e.priority || 0.5).toFixed(1)}</priority>
  </url>`
    ).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
  }
  /**
   * Generates a standard XML sitemap index for horizontal scalability
   */
  generateSitemapIndexXml(sitemaps) {
    const entriesXml = sitemaps.map(
      (s) => `  <sitemap>
    <loc>${s.loc}</loc>
    ${s.lastmod ? `<lastmod>${s.lastmod}</lastmod>` : ""}
  </sitemap>`
    ).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entriesXml}
</sitemapindex>`;
  }
};

// src/api/sitemap.ts
async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://dzbggkymgdtsyvrvrrjw.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const sitemapService = new SitemapService();
  try {
    if (!supabaseKey) {
      console.error("[SitemapHandler] Warning: No Supabase API key found in environment.");
      const xml2 = sitemapService.generateSitemapXml([]);
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
      return res.status(200).send(xml2);
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    const repository = new SupabasePublicationRepository(supabase);
    const publishedStories = await repository.getPublishedStories(100);
    const xml = sitemapService.generateSitemapXml(publishedStories);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("[SitemapHandler] Runtime error generating sitemap:", err?.message || err);
    try {
      const fallbackXml = sitemapService.generateSitemapXml([]);
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
      return res.status(200).send(fallbackXml);
    } catch {
      return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
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
 * Vercel Serverless Function: /api/sitemap
 * Generates dynamic sitemap.xml strictly for published stories and canonical routes.
 */
