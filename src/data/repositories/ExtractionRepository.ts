/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsExtractionRecord, ExtractionStatus } from '../../types/extraction';
import type { DiscoveryItem } from '../../types/discovery';

export interface ExtractionFilter {
  status?: ExtractionStatus;
  limit?: number;
  offset?: number;
  category?: string;
}

export interface ExtractionRepository {
  /**
   * Find an existing extraction record for idempotency check
   */
  findExtraction(
    discoveryItemId: string,
    inputHash: string,
    promptVersion: string
  ): Promise<NewsExtractionRecord | null>;

  /**
   * Save or upsert an extraction record
   */
  saveExtraction(record: NewsExtractionRecord): Promise<void>;

  /**
   * Get an extraction record by its ID
   */
  getExtractionById(id: string): Promise<NewsExtractionRecord | null>;

  /**
   * Get recent extraction records with filtering
   */
  getExtractions(filter?: ExtractionFilter): Promise<NewsExtractionRecord[]>;

  /**
   * Fetch pending discovery items that need extraction
   */
  getPendingDiscoveryItems(options?: {
    limit?: number;
    category?: string;
    sourceSlug?: string;
    priority?: number;
    includeFailed?: boolean;
  }): Promise<DiscoveryItem[]>;
}
