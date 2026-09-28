/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized Word Count & Article Body Integrity Utility
 * The Meridian — Global News Platform
 *
 * Enforces deterministic word count calculations for the 700-word minimum policy.
 *
 * Counting Rules:
 * 1. WHAT COUNTS:
 *    - Substantive body paragraphs (type === 'paragraph')
 *    - Article headings that are part of the body prose structure (type === 'heading')
 *    - Callout text (type === 'callout')
 *    - List items (type === 'list')
 *    - Substantive quotes in article body (type === 'quote')
 *
 * 2. WHAT DOES NOT COUNT:
 *    - Headline / title
 *    - Subtitle / dek / summary / excerpt / quickSummary
 *    - Image captions and image credits (type === 'image' is strictly excluded)
 *    - Author names, timestamps, tags, categories, topics
 *    - UI chrome, navigation, breadcrumbs, buttons
 *    - Raw HTML markup, markdown syntax, or boilerplate
 *
 * 3. TOKENIZATION:
 *    - HTML tags stripped
 *    - Markdown formatting tokens stripped
 *    - Normalized Unicode whitespace
 *    - Real word tokens matching letters/numbers (\p{L}\p{N})
 *    - Deterministic across all environments
 */

export const MIN_ARTICLE_BODY_WORDS = 700;

/**
 * Strips HTML tags and markdown formatting from raw text.
 */
export function stripMarkup(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Remove script and style tags with their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Remove markdown image syntax ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    // Convert markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    // Remove markdown headers #, ##, etc.
    .replace(/^#{1,6}\s+/gm, ' ')
    // Remove bold, italic, strikethrough markdown markers (*, _, ~)
    .replace(/[*_~`]/g, ' ')
    // Remove blockquote markers
    .replace(/^>\s+/gm, ' ')
    // Remove markdown horizontal rules (---, ***, ___)
    .replace(/^[-*_]{3,}\s*$/gm, ' ')
    // Normalize Unicode whitespace
    .replace(/[\s\uFEFF\xA0]+/g, ' ')
    .trim();
}

/**
 * Counts words in a cleaned string using deterministic tokenization.
 * A valid word token must contain at least one alphanumeric character (\p{L} or \p{N}).
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;

  const clean = stripMarkup(text);
  if (!clean) return 0;

  const tokens = clean.split(/\s+/).filter((t) => t.length > 0);
  let count = 0;

  for (const token of tokens) {
    // Word must contain at least one letter or digit (ignores standalone punctuation e.g. "--", "&")
    if (/[\p{L}\p{N}]/u.test(token)) {
      count++;
    }
  }

  return count;
}

/**
 * Extracts only substantive body prose from an article or block collection,
 * strictly excluding headlines, deks, summaries, author metadata, and image captions/credits.
 */
export function extractArticleBodyProse(contentOrStory: any): string {
  if (!contentOrStory) return '';

  // If a string was provided directly, clean it
  if (typeof contentOrStory === 'string') {
    return stripMarkup(contentOrStory);
  }

  // Determine blocks array
  let blocks: any[] = [];
  if (Array.isArray(contentOrStory)) {
    blocks = contentOrStory;
  } else if (typeof contentOrStory === 'object') {
    if (Array.isArray(contentOrStory.content)) {
      blocks = contentOrStory.content;
    } else if (Array.isArray(contentOrStory.contentBlocks)) {
      blocks = contentOrStory.contentBlocks;
    }
  }

  if (!blocks || blocks.length === 0) {
    return '';
  }

  const proseParts: string[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    const blockType = (block.type || '').toLowerCase();

    // STRICT EXCLUSION: Image blocks, captions, credits, and UI elements NEVER count
    if (blockType === 'image' || blockType === 'figure' || blockType === 'media') {
      continue;
    }

    // Paragraph blocks
    if (blockType === 'paragraph') {
      const text = block.text || block.content || '';
      if (typeof text === 'string') {
        proseParts.push(text);
      }
    }
    // Heading blocks (part of body prose hierarchy)
    else if (blockType === 'heading') {
      const text = block.text || block.content || '';
      if (typeof text === 'string') {
        proseParts.push(text);
      }
    }
    // Quote / Blockquote blocks (substantive quotes in article body; exclude attribution and role)
    else if (blockType === 'quote' || blockType === 'blockquote') {
      const text = block.quote || block.text || block.content || '';
      if (typeof text === 'string') {
        proseParts.push(text);
      }
    }
    // Callout blocks
    else if (blockType === 'callout') {
      const text = block.text || block.content || '';
      if (typeof text === 'string') {
        proseParts.push(text);
      }
    }
    // List blocks
    else if (blockType === 'list' && Array.isArray(block.items)) {
      const listText = block.items.filter((item: any) => typeof item === 'string').join(' ');
      if (listText) {
        proseParts.push(listText);
      }
    }
    // Generic text block fallback (if not excluded above)
    else if (block.text && typeof block.text === 'string' && blockType !== 'ad' && blockType !== 'nav') {
      proseParts.push(block.text);
    }
  }

  return stripMarkup(proseParts.join('\n\n'));
}

/**
 * Counts substantive words in the final article body.
 * Strictly excludes title, dek, summary, quickSummary, author, and image captions/credits.
 */
export function countArticleBodyWords(contentOrStory: any): number {
  const prose = extractArticleBodyProse(contentOrStory);
  return countWords(prose);
}

/**
 * Validates article body length against the policy threshold (default 700 words).
 * Note: There is NO upper limit / ceiling. Any word count >= minWords is valid.
 */
export function isArticleBodyLengthValid(
  contentOrStory: any,
  minWords: number = MIN_ARTICLE_BODY_WORDS
): {
  valid: boolean;
  wordCount: number;
  minWords: number;
  remainingWordsNeeded: number;
} {
  const wordCount = countArticleBodyWords(contentOrStory);
  const valid = wordCount >= minWords;
  const remainingWordsNeeded = Math.max(0, minWords - wordCount);

  return {
    valid,
    wordCount,
    minWords,
    remainingWordsNeeded,
  };
}

/**
 * Filler and Repetitive Text Detection.
 * Identifies attempts to pad an article with looped sentences, duplicated paragraphs,
 * or unnaturally low vocabulary diversity.
 */
export function detectFillerText(contentOrStory: any): {
  hasFiller: boolean;
  uniqueWordRatio: number;
  maxSentenceRepetitions: number;
  reason?: string;
} {
  const prose = extractArticleBodyProse(contentOrStory);
  const words = prose
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));

  if (words.length < 100) {
    return {
      hasFiller: false,
      uniqueWordRatio: 1.0,
      maxSentenceRepetitions: 1,
    };
  }

  // 1. Exact sentence repetition check
  const sentences = prose
    .split(/[.!?]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 25);

  const sentenceCounts: Record<string, number> = {};
  let maxSentenceRepetitions = 0;
  let repeatedSentence = '';

  for (const s of sentences) {
    sentenceCounts[s] = (sentenceCounts[s] || 0) + 1;
    if (sentenceCounts[s] > maxSentenceRepetitions) {
      maxSentenceRepetitions = sentenceCounts[s];
      repeatedSentence = s;
    }
  }

  // 2. Vocabulary diversity ratio (unique words / total words)
  const uniqueWords = new Set(words);
  const uniqueWordRatio = Number((uniqueWords.size / words.length).toFixed(3));

  // More than 2 repetitions of any substantive sentence (> 25 chars) indicates copy-paste padding
  if (maxSentenceRepetitions > 2) {
    return {
      hasFiller: true,
      uniqueWordRatio,
      maxSentenceRepetitions,
      reason: `Sentence repeated ${maxSentenceRepetitions} times: "${repeatedSentence.substring(0, 60)}..."`,
    };
  }

  // In substantive journalistic reporting of >= 500 words, unique word ratio is normally 0.40 - 0.70.
  // A ratio below 0.20 strongly indicates unnatural looping or filler text.
  if (words.length >= 500 && uniqueWordRatio < 0.20) {
    return {
      hasFiller: true,
      uniqueWordRatio,
      maxSentenceRepetitions,
      reason: `Vocabulary diversity ratio (${uniqueWordRatio}) is unnaturally low (< 0.20), indicating repetitive filler.`,
    };
  }

  return {
    hasFiller: false,
    uniqueWordRatio,
    maxSentenceRepetitions,
  };
}
