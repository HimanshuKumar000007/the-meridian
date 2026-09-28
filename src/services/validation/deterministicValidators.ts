/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CategoryValidationResult,
  DateValidationResult,
  NumberValidationResult,
  QuoteValidationResult,
  EntityValidationResult,
  OriginalityValidationResult,
  ValidationIssue,
} from '../../types/validation';
import type { ExtractedEntity, ExtractedFact } from '../../types/extraction';

import {
  normalizeCategory,
  PLATFORM_CATEGORIES,
  CATEGORY_KEYWORDS,
  COMPATIBLE_PAIRS,
  INCOMPATIBLE_CATEGORIES,
  type PlatformCategory,
} from './categoryTaxonomy';

import {
  countArticleBodyWords,
  detectFillerText,
  MIN_ARTICLE_BODY_WORDS,
} from '../../utils/wordCount';

export {
  normalizeCategory,
  PLATFORM_CATEGORIES,
  CATEGORY_KEYWORDS,
  COMPATIBLE_PAIRS,
  INCOMPATIBLE_CATEGORIES,
  type PlatformCategory,
};

/**
 * 1. Validate Source URL
 */
export function validateSourceUrl(url?: string | null): { valid: boolean; reason?: string } {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return { valid: false, reason: 'Source URL is missing or empty' };
  }
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: `Invalid protocol: ${parsed.protocol}. Only http: and https: are allowed.` };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { valid: false, reason: `Invalid hostname: ${parsed.hostname}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Source URL could not be parsed as a valid URL' };
  }
}

/**
 * 2. Validate Category Heuristic
 */
export function validateCategoryHeuristic(
  extractedCategory: string,
  title: string,
  sourceText: string,
  summary: string = ''
): CategoryValidationResult {
  const normCategory = normalizeCategory(extractedCategory);
  const sourceLower = sourceText.toLowerCase();

  // Keyword scoring on ground-truth source material with word-boundary awareness
  const sourceScores: Record<string, number> = {};
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    let matches = 0;
    for (const kw of kws) {
      if (kw.length <= 4) {
        // Use word boundary check for short words/abbreviations to prevent substring matching
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(sourceLower)) {
          matches++;
        }
      } else {
        if (sourceLower.includes(kw)) {
          matches++;
        }
      }
    }
    sourceScores[cat] = matches;
  }

  // Determine best category from source evidence, prioritizing normCategory on tie
  let bestCategory = normCategory;
  let maxScore = sourceScores[normCategory] || 0;
  for (const [cat, score] of Object.entries(sourceScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  const currentSourceScore = sourceScores[normCategory] || 0;

  // 1. Direct match in source
  if (normCategory === bestCategory && currentSourceScore > 0) {
    return {
      expectedCategory: bestCategory,
      extractedCategory: normCategory,
      status: 'match',
      confidence: 0.95,
    };
  }

  // 2. Cross-domain acceptable overlap
  const compatibleWith = COMPATIBLE_PAIRS[normCategory] || [];
  if (compatibleWith.includes(bestCategory) || currentSourceScore >= 1) {
    return {
      expectedCategory: bestCategory,
      extractedCategory: normCategory,
      status: 'acceptable',
      confidence: 0.85,
    };
  }

  // 3. Incompatible category where source contains 0 keywords of candidate category
  const incompatibleWith = INCOMPATIBLE_CATEGORIES[normCategory] || [];
  if (incompatibleWith.includes(bestCategory) && currentSourceScore === 0) {
    return {
      expectedCategory: bestCategory,
      extractedCategory: normCategory,
      status: 'mismatch',
      confidence: 0.2,
    };
  }

  // 4. If no category has a strong signal (maxScore < 2), accept the extracted category
  if (maxScore < 2) {
    return {
      expectedCategory: normCategory,
      extractedCategory: normCategory,
      status: 'acceptable',
      confidence: 0.6,
    };
  }

  // 5. Strong conflicting category in source with zero signal for current
  if (maxScore >= 3 && currentSourceScore === 0) {
    return {
      expectedCategory: bestCategory,
      extractedCategory: normCategory,
      status: 'mismatch',
      confidence: 0.3,
    };
  }

  return {
    expectedCategory: bestCategory,
    extractedCategory: normCategory,
    status: 'acceptable',
    confidence: 0.7,
  };
}

/**
 * 3. Validate Date & Temporal Plausibility
 */
export function validateTemporal(
  eventDate?: string | null,
  publishedAt?: string | null,
  sourceText?: string
): DateValidationResult {
  if (!eventDate && !publishedAt) {
    return { status: 'not_applicable' };
  }

  if (eventDate) {
    const parsedEvent = new Date(eventDate);
    if (isNaN(parsedEvent.getTime())) {
      return { eventDate, publishedAt, status: 'mismatch' };
    }

    if (publishedAt) {
      const parsedPub = new Date(publishedAt);
      if (!isNaN(parsedPub.getTime())) {
        const diffYears = (parsedEvent.getTime() - parsedPub.getTime()) / (1000 * 60 * 60 * 24 * 365);
        // If event date is > 5 years in the future, check if text suggests long-term forecast or roadmap
        if (diffYears > 5) {
          const lowerText = (sourceText || '').toLowerCase();
          const hasRoadmapTerms = lowerText.includes('roadmap') || lowerText.includes('target') || lowerText.includes('goal') || lowerText.includes('by 20');
          if (!hasRoadmapTerms) {
            return { eventDate, publishedAt, status: 'mismatch' };
          }
        }
        // If event date is > 10 years in the past without retrospective context
        if (diffYears < -10) {
          const lowerText = (sourceText || '').toLowerCase();
          const hasHistoryTerms = lowerText.includes('history') || lowerText.includes('retrospective') || lowerText.includes('anniversary') || lowerText.includes('originally');
          if (!hasHistoryTerms) {
            return { eventDate, publishedAt, status: 'uncertain' };
          }
        }
      }
    }
  }

  return { eventDate, publishedAt, status: 'valid' };
}

/**
 * 4. Validate Numbers & Quantitative Claims
 */
export function validateNumbers(
  facts: ExtractedFact[],
  summaryPoints: string[],
  sourceText: string
): { result: NumberValidationResult; unsupportedNumbers: string[] } {
  // Regex to extract numbers, currency values, percentages
  const numberRegex = /(?:\$|€|£|¥)?\b\d+(?:[.,]\d+)*(?:\s*(?:billion|million|trillion|percent|%|points|basis points|bps))?\b/gi;

  const candidateStrings = [
    ...facts.map((f) => `${f.label} ${f.value}`),
    ...summaryPoints,
  ];

  const extractedNumbers: string[] = [];
  for (const str of candidateStrings) {
    const matches = str.match(numberRegex);
    if (matches) {
      for (const m of matches) {
        const cleaned = m.trim();
        const hasUnit = /(?:\$|€|£|¥|billion|million|trillion|percent|%|points|bps)/i.test(cleaned);
        const digitsOnly = cleaned.replace(/\D/g, '');
        // Only include if has unit/currency, or multi-digit (>= 10), or decimal
        if (hasUnit || digitsOnly.length >= 2 || cleaned.includes('.')) {
          extractedNumbers.push(cleaned);
        }
      }
    }
  }

  if (extractedNumbers.length === 0) {
    return {
      result: {
        numbersChecked: 0,
        numbersPassed: 0,
        status: 'not_applicable',
      },
      unsupportedNumbers: [],
    };
  }

  const unsupportedNumbers: string[] = [];
  const normalizedSource = sourceText.toLowerCase().replace(/,/g, '');

  for (const num of extractedNumbers) {
    const normNum = num.toLowerCase().replace(/,/g, '');
    const unitMatch = num.match(/(billion|million|trillion|percent|%)/i);
    const unit = unitMatch ? unitMatch[1].toLowerCase() : null;

    // Check direct occurrence
    let found = normalizedSource.includes(normNum);

    // If unit is specified (e.g. billion vs million), both digit and unit or abbreviated unit must match
    if (!found && unit) {
      const digitsOnly = num.replace(/\D/g, '');
      if (unit.startsWith('b')) {
        found =
          normalizedSource.includes(`${digitsOnly} billion`) ||
          normalizedSource.includes(`${digitsOnly}b`) ||
          normalizedSource.includes(`${digitsOnly}bn`) ||
          normalizedSource.includes(`${digitsOnly} bn`);
      } else if (unit.startsWith('m')) {
        found =
          normalizedSource.includes(`${digitsOnly} million`) ||
          normalizedSource.includes(`${digitsOnly}m`) ||
          normalizedSource.includes(`${digitsOnly}mn`) ||
          normalizedSource.includes(`${digitsOnly} mn`);
      } else if (unit.startsWith('t')) {
        found =
          normalizedSource.includes(`${digitsOnly} trillion`) ||
          normalizedSource.includes(`${digitsOnly}t`) ||
          normalizedSource.includes(`${digitsOnly}tn`);
      } else if (unit === '%' || unit === 'percent') {
        found =
          normalizedSource.includes(`${digitsOnly}%`) ||
          normalizedSource.includes(`${digitsOnly} percent`) ||
          normalizedSource.includes(`${digitsOnly} per cent`);
      }
    } else if (!found && !unit) {
      const digitsOnly = num.replace(/\D/g, '');
      if (digitsOnly.length >= 2) {
        const boundaryRegex = new RegExp(`\\b${digitsOnly}\\b`);
        found = boundaryRegex.test(normalizedSource);
      }
    }

    if (!found) {
      unsupportedNumbers.push(num);
    }
  }

  const passed = extractedNumbers.length - unsupportedNumbers.length;
  const passRatio = passed / extractedNumbers.length;

  let status: NumberValidationResult['status'] = 'valid';
  if (unsupportedNumbers.length > 0) {
    status = passRatio >= 0.7 ? 'unsupported' : 'mismatch';
  }

  return {
    result: {
      numbersChecked: extractedNumbers.length,
      numbersPassed: passed,
      status,
    },
    unsupportedNumbers,
  };
}

/**
 * 5. Validate Quotes
 */
export function validateQuotes(
  contentBlocks: any[],
  facts: ExtractedFact[],
  sourceText: string
): { result: QuoteValidationResult; fabricatedQuotes: string[] } {
  const quoteCandidates: string[] = [];

  // 1. Check quote blocks
  for (const block of contentBlocks) {
    if ((block.type === 'quote' || block.type === 'blockquote') && (block.quote || block.content || block.text)) {
      quoteCandidates.push(block.quote || block.content || block.text);
    }
  }

  // 2. Check quotation marks in facts or blocks
  const quoteRegex = /["“]([^"”]{15,})["”]/g;
  for (const block of contentBlocks) {
    const textContent = block.text || block.content || '';
    if (textContent && block.type !== 'quote' && block.type !== 'blockquote') {
      let match;
      while ((match = quoteRegex.exec(textContent)) !== null) {
        quoteCandidates.push(match[1]);
      }
    }
  }

  for (const fact of facts) {
    const text = `${fact.label} ${fact.value}`;
    let match;
    while ((match = quoteRegex.exec(text)) !== null) {
      quoteCandidates.push(match[1]);
    }
  }

  if (quoteCandidates.length === 0) {
    return {
      result: {
        quotesChecked: 0,
        quotesPassed: 0,
        status: 'no_quotes',
      },
      fabricatedQuotes: [],
    };
  }

  const fabricatedQuotes: string[] = [];
  const normalizedSource = sourceText.toLowerCase().replace(/\s+/g, ' ');

  for (const quote of quoteCandidates) {
    const cleanQuote = quote.trim().toLowerCase().replace(/\s+/g, ' ');
    // Direct substring check
    if (normalizedSource.includes(cleanQuote)) {
      continue;
    }

    // Fuzzy word-set check (at least 75% of meaningful words in quote must appear close together)
    const words = cleanQuote.split(' ').filter((w) => w.length > 3);
    if (words.length >= 3) {
      const matchCount = words.filter((w) => normalizedSource.includes(w)).length;
      if (matchCount / words.length >= 0.8) {
        continue; // Plausible paraphrase / minor normalization difference
      }
    }

    fabricatedQuotes.push(quote);
  }

  const passed = quoteCandidates.length - fabricatedQuotes.length;

  return {
    result: {
      quotesChecked: quoteCandidates.length,
      quotesPassed: passed,
      status: fabricatedQuotes.length > 0 ? 'fabricated' : 'valid',
    },
    fabricatedQuotes,
  };
}

/**
 * 6. Validate Entities
 */
export function validateEntities(
  entities: ExtractedEntity[],
  sourceText: string
): { result: EntityValidationResult; unsupportedEntities: string[] } {
  if (!entities || entities.length === 0) {
    return {
      result: {
        entitiesChecked: 0,
        entitiesPassed: 0,
        status: 'valid',
      },
      unsupportedEntities: [],
    };
  }

  const normalizedSource = sourceText.toLowerCase();
  const unsupportedEntities: string[] = [];

  for (const entity of entities) {
    const name = (entity.name || '').trim().toLowerCase();
    if (!name) continue;

    // Check if whole name or parts appear in source
    let found = normalizedSource.includes(name);
    if (!found && name.includes(' ')) {
      // For multi-word entities, e.g. "President Emmanuel Macron", check "Macron"
      const parts = name.split(' ').filter((p) => p.length > 3);
      if (parts.some((p) => normalizedSource.includes(p))) {
        found = true;
      }
    }

    if (!found) {
      unsupportedEntities.push(entity.name);
    }
  }

  const passed = entities.length - unsupportedEntities.length;

  return {
    result: {
      entitiesChecked: entities.length,
      entitiesPassed: passed,
      status: unsupportedEntities.length > 0 ? 'unsupported' : 'valid',
    },
    unsupportedEntities,
  };
}

/**
 * 7. Sensitive Topic Detector
 */
const SENSITIVE_KEYWORDS: Record<string, string[]> = {
  war_casualties: ['casualties', 'killed', 'death toll', 'fatalities', 'dead', 'airstrike victims', 'massacre', 'mass grave'],
  medical_claims: ['cure for cancer', 'miracle cure', 'vaccine causes', '100% effective cure', 'proven remedy', 'secret medicine'],
  financial_advice: ['guaranteed returns', 'buy now before it skyrockets', 'crypto pump', 'insider tip', 'guaranteed profit', '100x return'],
  election_integrity: ['rigged election', 'stolen vote', 'ballot tampering', 'fraudulent ballots', 'election fraud'],
};

export function detectSensitiveTopics(title: string, summary: string, facts: ExtractedFact[]): string[] {
  const combined = `${title} ${summary} ${facts.map((f) => `${f.label} ${f.value}`).join(' ')}`.toLowerCase();
  const detectedFlags: string[] = [];

  for (const [topic, kws] of Object.entries(SENSITIVE_KEYWORDS)) {
    for (const kw of kws) {
      if (combined.includes(kw)) {
        detectedFlags.push(topic);
        break;
      }
    }
  }

  return detectedFlags;
}

/**
 * 8. Originality & Verbatim Copy Check
 * Flags excessive contiguous identical chunks (> 250 chars) from source.
 */
export function checkOriginality(
  candidateText: string,
  sourceText: string
): OriginalityValidationResult {
  if (!candidateText || !sourceText) {
    return { copyRiskScore: 0, status: 'original' };
  }

  const cleanCand = candidateText.replace(/\s+/g, ' ').trim();
  const cleanSrc = sourceText.replace(/\s+/g, ' ').trim();

  // Find longest common contiguous substring
  let longestMatch = '';
  const chunkSize = 250;

  for (let i = 0; i <= cleanCand.length - chunkSize; i += 25) {
    const chunk = cleanCand.substring(i, i + chunkSize);
    if (cleanSrc.includes(chunk)) {
      longestMatch = chunk;
      break;
    }
  }

  if (longestMatch.length >= chunkSize) {
    return {
      copyRiskScore: 0.85,
      status: 'suspicious',
      longestContiguousMatch: longestMatch,
    };
  }

  return {
    copyRiskScore: 0.1,
    status: 'original',
    longestContiguousMatch: null,
  };
}

/**
 * 9. Source Sufficiency Check
 */
export function checkSourceSufficiency(sourceText?: string | null): {
  sufficient: boolean;
  length: number;
} {
  const length = (sourceText || '').trim().length;
  return {
    sufficient: length >= 120,
    length,
  };
}

/**
 * 10. Article Length Validation (700-Word Minimum Policy)
 * Checks whether the final article body contains at least minWords (default 700).
 * There is NO maximum word count (no ceiling).
 */
export function validateArticleLength(
  contentBlocks: any[],
  minWords: number = MIN_ARTICLE_BODY_WORDS
): {
  valid: boolean;
  wordCount: number;
  minWords: number;
  remainingWordsNeeded: number;
} {
  const wordCount = countArticleBodyWords(contentBlocks);
  return {
    valid: wordCount >= minWords,
    wordCount,
    minWords,
    remainingWordsNeeded: Math.max(0, minWords - wordCount),
  };
}

export {
  countArticleBodyWords,
  detectFillerText,
  MIN_ARTICLE_BODY_WORDS,
};

