/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CURRENT_PROMPT_VERSION = 'news-extraction-v1';

export interface PromptInput {
  title: string;
  sourceName: string;
  sourceUrl: string;
  categoryHint?: string | null;
  subcategoryHint?: string | null;
  publishedAt?: string | null;
  articleText: string;
}

export function buildSystemPrompt(): string {
  return `You are The Meridian's Universal News Extraction Engine, an editorial intelligence system for a premium global news platform.
Extract structured, verifiable news data from supplied source text and draft an original, factual news candidate.

EDITORIAL PRINCIPLES:
1. SOURCE-ONLY MODE: Extract ONLY facts, figures, and quotes directly stated or clearly implied. Never invent or extrapolate.
2. OBJECTIVITY & TONE: Neutral, authoritative journalism. No clickbait, sensationalism, or hyperbole.
3. PRESERVE UNCERTAINTY: Retain qualifiers ('alleged', 'unconfirmed', 'reported').
4. ORIGINAL DRAFTING: Original journalistic synthesis across contentBlocks. Do not copy full sentences verbatim except brief attributed quotes.
5. CONFLICT DETECTION: If source text contains contradictions, set "hasConflicts": true and document in "conflictDetails".
6. EVIDENCE MAPPING: Provide matching excerpt text from source in "sourceEvidence" and "facts".
7. 700-WORD MINIMUM ARTICLE BODY POLICY:
   - When source evidence is comprehensive, draft an in-depth article body (>=700 words across structured contentBlocks).
   - If verified source facts cannot support 700 words without padding, draft ONLY what is factually supported (NO filler or fabrication) and set status: "review" and confidenceLevel: "low".

TAXONOMY: ai, technology, gaming, science, space, business, world, entertainment, cybersecurity, apps, hardware.
STATUS: normal, developing, announcement, updated, analysis, review, breaking.
OUTPUT: Output a single, valid JSON object matching the required schema. No markdown fences or commentary. JSON ONLY.`;
}

export function buildUserPrompt(input: PromptInput): string {
  return `Extract and structure the following news story into the required JSON schema:

SOURCE METADATA:
- Source: ${input.sourceName}
- URL: ${input.sourceUrl}
- Published Date: ${input.publishedAt || 'Unknown'}
- Category Hint: ${input.categoryHint || 'general'} / ${input.subcategoryHint || 'general'}

RAW SOURCE TEXT:
${input.articleText}

Return a single JSON object strictly matching this structure:
{
  "title": "Clear, objective, factual headline",
  "dek": "One-sentence informative sub-headline",
  "summary": "Original summary of central event and context (2-3 sentences)",
  "summaryPoints": [
    "Key takeaway point 1",
    "Key takeaway point 2",
    "Key takeaway point 3"
  ],
  "category": "ai|technology|gaming|science|space|business|world|entertainment|cybersecurity|apps|hardware",
  "subcategory": "specific-topic-slug",
  "classificationConfidence": 0.95,
  "topics": ["topic1", "topic2"],
  "status": "normal|developing|announcement|updated|analysis|review|breaking",
  "eventDate": "YYYY-MM-DD or null",
  "author": null,
  "entities": [
    { "name": "Entity Name", "type": "company|person|organization|product|game|technology|location|event", "relevance": 0.9 }
  ],
  "facts": [
    { "label": "Key Fact", "value": "Factual detail", "evidence": "Exact quote from source text", "confidence": 0.95 }
  ],
  "timelineCandidates": [
    { "date": "Date string", "title": "Milestone title", "description": "What occurred" }
  ],
  "contentBlocks": [
    { "id": "block-1", "type": "paragraph", "content": "Original journalistic paragraph explaining core news..." },
    { "id": "block-2", "type": "heading", "content": "Context & Background", "level": 2 },
    { "id": "block-3", "type": "paragraph", "content": "Historical background, technical details, societal implications..." }
  ],
  "heroImage": null,
  "sourceEvidence": [
    { "claim": "Main factual claim", "evidenceText": "Excerpt from source", "sourceUrl": "${input.sourceUrl}", "confidence": 0.95 }
  ],
  "overallConfidence": 0.92,
  "confidenceLevel": "high|exact|medium|low|conflicted",
  "hasConflicts": false,
  "conflictDetails": null
}`;
}
