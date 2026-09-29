/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * DiscoveryRecencyPolicy: Deterministic Recency Window for Active Ingestion
 *
 * Prevents historical RSS archives (e.g. OpenAI archive dating back to 2015)
 * from flooding the active extraction queue.
 */

export interface RecencyConfig {
  defaultMaxAgeHours: number;
  sourceMaxAgeHours: Record<string, number>;
}

export const DEFAULT_RECENCY_CONFIG: RecencyConfig = {
  // General news feeds default window: 72 hours (3 days)
  defaultMaxAgeHours: 72,

  // Specific feed overrides
  sourceMaxAgeHours: {
    // OpenAI news feed contains historical posts dating to 2015; active window capped to 48 hours
    'src-openai-news': 48,
    'openai-news': 48,

    // High-cadence breaking news feeds
    'src-bbc-world': 48,
    'bbc-world': 48,
    'src-eurogamer': 48,
    'eurogamer': 48,

    // Slower-cadence journal / science feeds
    'src-nature-news': 96,
    'nature-news': 96,
    'src-nasa-breaking': 72,
    'nasa-breaking': 72,
  },
};

/**
 * Resolves the allowable age window in hours for a given source.
 */
export function getMaxAgeHoursForSource(
  sourceSlugOrId?: string | null,
  config: RecencyConfig = DEFAULT_RECENCY_CONFIG
): number {
  if (!sourceSlugOrId) {
    return Number(process.env.DISCOVERY_RECENCY_MAX_HOURS) || config.defaultMaxAgeHours;
  }

  const normalized = sourceSlugOrId.toLowerCase().trim();
  if (config.sourceMaxAgeHours[normalized] !== undefined) {
    return config.sourceMaxAgeHours[normalized];
  }

  return Number(process.env.DISCOVERY_RECENCY_MAX_HOURS) || config.defaultMaxAgeHours;
}

/**
 * Calculates the ISO cutoff timestamp for a source's recency window.
 */
export function getRecencyCutoffIso(
  sourceSlugOrId?: string | null,
  now: Date = new Date(),
  config: RecencyConfig = DEFAULT_RECENCY_CONFIG
): string {
  const maxHours = getMaxAgeHoursForSource(sourceSlugOrId, config);
  const cutoffMs = now.getTime() - maxHours * 60 * 60 * 1000;
  return new Date(cutoffMs).toISOString();
}

/**
 * Evaluates whether an ingestion item is fresh enough to enter the active extraction queue.
 * Uses publishedAt if present and valid; falls back to discoveredAt.
 */
export function isWithinRecencyWindow(
  item: {
    publishedAt?: string | null;
    discoveredAt?: string | null;
    sourceId?: string | null;
    sourceSlug?: string | null;
  },
  now: Date = new Date(),
  config: RecencyConfig = DEFAULT_RECENCY_CONFIG
): boolean {
  const sourceKey = item.sourceSlug || item.sourceId;
  const maxHours = getMaxAgeHoursForSource(sourceKey, config);
  const maxAgeMs = maxHours * 60 * 60 * 1000;

  // Use publishedAt if available and valid; fallback to discoveredAt
  const candidateDateStr = item.publishedAt || item.discoveredAt;
  if (!candidateDateStr) {
    // If no timestamp whatsoever is present, allow it if discoveredAt is missing
    return false;
  }

  const candidateTime = new Date(candidateDateStr).getTime();
  if (isNaN(candidateTime)) {
    return false;
  }

  const ageMs = now.getTime() - candidateTime;

  // Reject historical items older than the allowable window
  if (ageMs > maxAgeMs) {
    return false;
  }

  // Reject future items with drift greater than 2 hours
  const twoHoursFuture = 2 * 60 * 60 * 1000;
  if (candidateTime - now.getTime() > twoHoursFuture) {
    return false;
  }

  return true;
}
