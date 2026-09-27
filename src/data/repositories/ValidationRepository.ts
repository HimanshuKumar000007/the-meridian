/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsValidationResult, NewsValidationRecord, ValidationFilter } from '../../types/validation';
import type { NewsExtractionRecord } from '../../types/extraction';

export interface ValidationRepository {
  /**
   * Find an existing validation record for idempotency check
   */
  findValidation(
    extractionId: string,
    inputHash: string,
    validatorVersion: string
  ): Promise<NewsValidationResult | null>;

  /**
   * Save or upsert a validation record
   */
  saveValidation(result: NewsValidationResult): Promise<void>;

  /**
   * Get a validation result by its ID
   */
  getValidationById(id: string): Promise<NewsValidationResult | null>;

  /**
   * Get validation results by extraction ID
   */
  getValidationsByExtractionId(extractionId: string): Promise<NewsValidationResult[]>;

  /**
   * Get recent validations with filtering
   */
  getValidations(filter?: ValidationFilter): Promise<NewsValidationResult[]>;

  /**
   * Fetch extractions that are ready for fact validation
   */
  getPendingExtractions(options?: {
    limit?: number;
    category?: string;
  }): Promise<NewsExtractionRecord[]>;
}
