/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ValidationRepository } from './ValidationRepository';
import type {
  NewsValidationResult,
  ValidationFilter,
} from '../../types/validation';
import type { NewsExtractionRecord } from '../../types/extraction';

export class MockValidationRepository implements ValidationRepository {
  private validations: Map<string, NewsValidationResult> = new Map();
  private pendingExtractions: NewsExtractionRecord[] = [];

  constructor(initialExtractions: NewsExtractionRecord[] = [], initialValidations: NewsValidationResult[] = []) {
    this.pendingExtractions = [...initialExtractions];
    for (const v of initialValidations) {
      this.validations.set(v.id, v);
    }
  }

  public setPendingExtractions(extractions: NewsExtractionRecord[]): void {
    this.pendingExtractions = [...extractions];
  }

  public async findValidation(
    extractionId: string,
    inputHash: string,
    validatorVersion: string
  ): Promise<NewsValidationResult | null> {
    for (const val of this.validations.values()) {
      if (
        val.extractionId === extractionId &&
        val.inputHash === inputHash &&
        val.validatorVersion === validatorVersion
      ) {
        return val;
      }
    }
    return null;
  }

  public async saveValidation(result: NewsValidationResult): Promise<void> {
    this.validations.set(result.id, result);
  }

  public async getValidationById(id: string): Promise<NewsValidationResult | null> {
    return this.validations.get(id) || null;
  }

  public async getValidationsByExtractionId(extractionId: string): Promise<NewsValidationResult[]> {
    return Array.from(this.validations.values()).filter((v) => v.extractionId === extractionId);
  }

  public async getValidations(filter?: ValidationFilter): Promise<NewsValidationResult[]> {
    let list = Array.from(this.validations.values());

    if (filter?.status) {
      list = list.filter((v) => v.status === filter.status);
    }
    if (filter?.extractionId) {
      list = list.filter((v) => v.extractionId === filter.extractionId);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const offset = filter?.offset || 0;
    const limit = filter?.limit || list.length;
    return list.slice(offset, offset + limit);
  }

  public async getPendingExtractions(options?: {
    limit?: number;
    category?: string;
  }): Promise<NewsExtractionRecord[]> {
    let list = this.pendingExtractions.filter((e) => e.status === 'completed');

    if (options?.category) {
      list = list.filter((e) => e.category === options.category);
    }

    // Exclude extractions that already have a validation result
    const validatedExtractionIds = new Set(
      Array.from(this.validations.values()).map((v) => v.extractionId)
    );
    list = list.filter((e) => !validatedExtractionIds.has(e.id));

    const limit = options?.limit || 10;
    return list.slice(0, limit);
  }
}
