/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsStory, ArticleBlock, StorySource } from '../types/story';
import type { NewsCategory } from '../types/category';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  // Slug must be lowercase alphanumeric with hyphens, 2-120 chars
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim());
}

export function isValidIsoDate(dateStr?: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function isValidHttpUrl(urlStr?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Checks for script injection and dangerous payloads in block content
 */
export function sanitizeBlockText(text: string): boolean {
  if (typeof text !== 'string') return false;
  const lowercase = text.toLowerCase();
  if (
    lowercase.includes('<script') ||
    lowercase.includes('javascript:') ||
    lowercase.includes('onload=') ||
    lowercase.includes('onerror=')
  ) {
    return false;
  }
  return true;
}

export function validateArticleBlock(block: ArticleBlock, index = 0): string[] {
  const errors: string[] = [];

  if (!block || typeof block !== 'object') {
    errors.push(`Block [${index}] is not a valid object.`);
    return errors;
  }

  const validTypes = ['paragraph', 'heading', 'list', 'quote', 'image', 'callout'];
  if (!validTypes.includes(block.type)) {
    errors.push(`Block [${index}] has unsupported type: "${(block as any).type}".`);
  }

  if (block.type === 'paragraph') {
    if (!block.text || block.text.trim().length === 0) {
      errors.push(`Paragraph block [${index}] has empty text.`);
    } else if (!sanitizeBlockText(block.text)) {
      errors.push(`Paragraph block [${index}] contains disallowed executable script content.`);
    }
  } else if (block.type === 'heading') {
    if (![2, 3].includes(block.level)) {
      errors.push(`Heading block [${index}] level must be 2 or 3.`);
    }
    if (!block.text || block.text.trim().length === 0) {
      errors.push(`Heading block [${index}] has empty text.`);
    }
  } else if (block.type === 'list') {
    if (!Array.isArray(block.items) || block.items.length === 0) {
      errors.push(`List block [${index}] must have at least one item.`);
    }
  } else if (block.type === 'quote') {
    if (!block.quote || block.quote.trim().length === 0) {
      errors.push(`Quote block [${index}] has empty quote.`);
    }
  } else if (block.type === 'image') {
    if (!block.url) {
      errors.push(`Image block [${index}] is missing an image url.`);
    }
    if (!block.alt) {
      errors.push(`Image block [${index}] is missing required accessibility alt text.`);
    }
  } else if (block.type === 'callout') {
    if (!block.text || block.text.trim().length === 0) {
      errors.push(`Callout block [${index}] has empty text.`);
    }
  }

  return errors;
}

export function validateStorySource(source: StorySource, index = 0): string[] {
  const errors: string[] = [];
  if (!source.name || source.name.trim().length === 0) {
    errors.push(`Source [${index}] must have a non-empty name.`);
  }
  if (source.url && !isValidHttpUrl(source.url)) {
    errors.push(`Source [${index}] (${source.name}) has an invalid HTTP/HTTPS URL.`);
  }
  return errors;
}

export function validateNewsStory(story: Partial<NewsStory>): ValidationResult {
  const errors: string[] = [];

  if (!story.id) errors.push('Story is missing required "id".');
  if (!story.slug || !isValidSlug(story.slug)) {
    errors.push(`Story "${story.id || 'unknown'}" has invalid slug: "${story.slug}".`);
  }
  if (!story.title || story.title.trim().length < 5) {
    errors.push('Story title must be at least 5 characters.');
  }
  if (!story.summary || story.summary.trim().length < 10) {
    errors.push('Story summary must be at least 10 characters.');
  }
  if (!story.category) errors.push('Story category is required.');
  if (!isValidIsoDate(story.publishedAt)) {
    errors.push(`Published date "${story.publishedAt}" is not a valid ISO date.`);
  }

  // Author validation
  if (!story.author || !story.author.name) {
    errors.push('Story author with a name is required.');
  }

  // Content blocks validation
  if (!Array.isArray(story.content) || story.content.length === 0) {
    errors.push('Story must have at least one structured content block.');
  } else {
    story.content.forEach((block, idx) => {
      errors.push(...validateArticleBlock(block, idx));
    });
  }

  // Sources validation
  if (story.sources && Array.isArray(story.sources)) {
    story.sources.forEach((src, idx) => {
      errors.push(...validateStorySource(src, idx));
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateNewsCategory(category: Partial<NewsCategory>): ValidationResult {
  const errors: string[] = [];

  if (!category.slug || !isValidSlug(category.slug)) {
    errors.push(`Category has invalid slug: "${category.slug}".`);
  }
  if (!category.name || category.name.trim().length === 0) {
    errors.push('Category name is required.');
  }
  if (!category.description || category.description.trim().length === 0) {
    errors.push('Category description is required.');
  }
  if (!Array.isArray(category.subcategories)) {
    errors.push('Category subcategories must be an array.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
