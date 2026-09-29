/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * ExtractionRetryPolicy: Bounded Retries & Dead-Letter Handling for Extraction Failures
 */

export const DEFAULT_MAX_EXTRACTION_RETRIES = 2; // Initial attempt + 1 retry
export const DEAD_LETTER_ERROR_CODE = 'DEAD_LETTER_MAX_RETRIES';

export interface ExtractionRetryInfo {
  attempts: number;
  deadLettered: boolean;
  lastAttemptAt: string;
  lastError?: string | null;
}

export function getMaxExtractionRetries(): number {
  const envVal = process.env.EXTRACTION_MAX_RETRIES;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_EXTRACTION_RETRIES;
}

/**
 * Parses existing attempt count from an extraction record or conflict details string.
 */
export function parseExtractionRetryInfo(
  conflictDetails?: string | null,
  errorCode?: string | null
): ExtractionRetryInfo {
  const defaultInfo: ExtractionRetryInfo = {
    attempts: 1,
    deadLettered: errorCode === DEAD_LETTER_ERROR_CODE,
    lastAttemptAt: new Date().toISOString(),
  };

  if (!conflictDetails) {
    return defaultInfo;
  }

  try {
    const parsed = JSON.parse(conflictDetails);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        attempts: Number(parsed.attempts) || 1,
        deadLettered: Boolean(parsed.deadLettered) || errorCode === DEAD_LETTER_ERROR_CODE,
        lastAttemptAt: parsed.lastAttemptAt || new Date().toISOString(),
        lastError: parsed.lastError || null,
      };
    }
  } catch {
    // If not JSON, check for simple attempt count marker
    const match = conflictDetails.match(/attempts?:?\s*(\d+)/i);
    if (match) {
      return {
        attempts: parseInt(match[1], 10),
        deadLettered: errorCode === DEAD_LETTER_ERROR_CODE,
        lastAttemptAt: new Date().toISOString(),
      };
    }
  }

  return defaultInfo;
}

/**
 * Determines whether a failed extraction item should be retried.
 */
export function shouldRetryExtraction(
  attempts: number,
  errorCode?: string | null,
  maxRetries: number = getMaxExtractionRetries()
): boolean {
  if (errorCode === DEAD_LETTER_ERROR_CODE) {
    return false;
  }
  return attempts < maxRetries;
}
