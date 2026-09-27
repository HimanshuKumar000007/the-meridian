/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ValidationRepository } from './ValidationRepository';
import type {
  NewsValidationResult,
  ValidationFilter,
  ValidationStatus,
} from '../../types/validation';
import type { NewsExtractionRecord } from '../../types/extraction';

export class SupabaseValidationRepository implements ValidationRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private mapRecordToResult(row: any): NewsValidationResult {
    return {
      id: row.id,
      extractionId: row.extraction_id,
      status: row.status as ValidationStatus,
      overallScore: Number(row.overall_score),
      issues: row.issues || [],
      validatedFields: row.validated_fields || {},
      rejectedFields: row.rejected_fields || [],
      claimCoverage: Number(row.claim_coverage || 0),
      sourceCoverage: Number(row.source_coverage || 0),
      categoryValidation: {
        expectedCategory: '',
        extractedCategory: '',
        status: (row.category_status as any) || 'acceptable',
        confidence: 0,
      },
      dateValidation: {
        status: (row.date_status as any) || 'not_applicable',
      },
      numberValidation: {
        numbersChecked: 0,
        numbersPassed: 0,
        status: (row.number_status as any) || 'not_applicable',
      },
      quoteValidation: {
        quotesChecked: 0,
        quotesPassed: 0,
        status: (row.quote_status as any) || 'no_quotes',
      },
      entityValidation: {
        entitiesChecked: 0,
        entitiesPassed: 0,
        status: (row.entity_status as any) || 'valid',
      },
      originalityCheck: {
        copyRiskScore: 0,
        status: 'original',
      },
      sensitiveTopicFlags: row.sensitive_topic_flags || [],
      validatorVersion: row.validator_version,
      inputHash: row.input_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public async findValidation(
    extractionId: string,
    inputHash: string,
    validatorVersion: string
  ): Promise<NewsValidationResult | null> {
    try {
      const { data, error } = await this.client
        .from('news_validations')
        .select('*')
        .eq('extraction_id', extractionId)
        .eq('input_hash', inputHash)
        .eq('validator_version', validatorVersion)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseValidationRepository] findValidation error:', error.message);
        return null;
      }

      if (!data) return null;
      return this.mapRecordToResult(data);
    } catch (err: any) {
      console.error('[SupabaseValidationRepository] findValidation exception:', err.message);
      return null;
    }
  }

  public async saveValidation(result: NewsValidationResult): Promise<void> {
    try {
      const { error } = await this.client
        .from('news_validations')
        .upsert(
          {
            id: result.id,
            extraction_id: result.extractionId,
            status: result.status,
            overall_score: result.overallScore,
            issues: result.issues,
            validated_fields: result.validatedFields,
            rejected_fields: result.rejectedFields,
            claim_coverage: result.claimCoverage,
            source_coverage: result.sourceCoverage,
            category_status: result.categoryValidation.status,
            date_status: result.dateValidation.status,
            number_status: result.numberValidation.status,
            quote_status: result.quoteValidation.status,
            entity_status: result.entityValidation.status,
            sensitive_topic_flags: result.sensitiveTopicFlags,
            validator_version: result.validatorVersion,
            input_hash: result.inputHash,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'extraction_id,input_hash,validator_version',
          }
        );

      if (error) {
        console.error('[SupabaseValidationRepository] saveValidation error:', error.message);
        throw error;
      }
    } catch (err: any) {
      console.error('[SupabaseValidationRepository] saveValidation exception:', err.message);
      throw err;
    }
  }

  public async getValidationById(id: string): Promise<NewsValidationResult | null> {
    try {
      const { data, error } = await this.client
        .from('news_validations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseValidationRepository] getValidationById error:', error.message);
        return null;
      }

      if (!data) return null;
      return this.mapRecordToResult(data);
    } catch (err: any) {
      console.error('[SupabaseValidationRepository] getValidationById exception:', err.message);
      return null;
    }
  }

  public async getValidationsByExtractionId(extractionId: string): Promise<NewsValidationResult[]> {
    try {
      const { data, error } = await this.client
        .from('news_validations')
        .select('*')
        .eq('extraction_id', extractionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SupabaseValidationRepository] getValidationsByExtractionId error:', error.message);
        return [];
      }

      return (data || []).map((row) => this.mapRecordToResult(row));
    } catch (err: any) {
      console.error('[SupabaseValidationRepository] getValidationsByExtractionId exception:', err.message);
      return [];
    }
  }

  public async getValidations(filter?: ValidationFilter): Promise<NewsValidationResult[]> {
    try {
      let query = this.client
        .from('news_validations')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.extractionId) {
        query = query.eq('extraction_id', filter.extractionId);
      }
      if (filter?.limit) {
        query = query.limit(filter.limit);
      }
      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 20) - 1);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[SupabaseValidationRepository] getValidations error:', error.message);
        return [];
      }

      return (data || []).map((row) => this.mapRecordToResult(row));
    } catch (err: any) {
      console.error('[SupabaseValidationRepository] getValidations exception:', err.message);
      return [];
    }
  }

  public async getPendingExtractions(options?: {
    limit?: number;
    category?: string;
  }): Promise<NewsExtractionRecord[]> {
    try {
      // 1. Fetch completed extractions
      let query = this.client
        .from('news_extractions')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data: extractions, error: extError } = await query.limit(options?.limit ? options.limit * 2 : 50);
      if (extError || !extractions) {
        console.error('[SupabaseValidationRepository] getPendingExtractions extractions error:', extError?.message);
        return [];
      }

      // 2. Fetch existing validations to exclude already processed extractions
      const extractionIds = extractions.map((e) => e.id);
      if (extractionIds.length === 0) return [];

      const { data: existingValidations, error: valError } = await this.client
        .from('news_validations')
        .select('extraction_id')
        .in('extraction_id', extractionIds);

      if (valError) {
        console.error('[SupabaseValidationRepository] getPendingExtractions val error:', valError.message);
        return extractions.slice(0, options?.limit || 10);
      }

      const validatedIds = new Set((existingValidations || []).map((v) => v.extraction_id));
      const pending = extractions.filter((e) => !validatedIds.has(e.id));

      return pending.slice(0, options?.limit || 10) as NewsExtractionRecord[];
    } catch (err: any) {
      console.error('[SupabaseValidationRepository] getPendingExtractions exception:', err.message);
      return [];
    }
  }
}
