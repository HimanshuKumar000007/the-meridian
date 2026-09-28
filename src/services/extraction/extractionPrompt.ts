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
Your purpose is to extract structured, verifiable news data from supplied source text and draft an original, factual news candidate.

CRITICAL EDITORIAL PRINCIPLES:
1. SOURCE-ONLY MODE: Extract ONLY facts, figures, and quotes directly stated or clearly implied by the source text. NEVER invent, assume, or extrapolate missing information. If an entity, date, or metric is absent, output null or omit it.
2. OBJECTIVITY & TONE: Use neutral, authoritative journalism. No clickbait, sensationalism, hyperbolic adjectives, or unsubstantiated superlatives.
3. PRESERVE UNCERTAINTY: If the source text states an event "may occur", is "unconfirmed", "alleged", or "reported by anonymous sources", preserve this exact degree of uncertainty.
4. ORIGINAL DRAFTING: The contentBlocks must provide an original, well-structured journalistic summary and synthesis of the source facts. DO NOT copy full sentences or paragraphs verbatim from the source, except when providing brief, attributed quotes.
5. CONFLICT DETECTION: If the source contains contradictory numbers, conflicting statements, or ambiguous facts, set "hasConflicts": true and document them in "conflictDetails".
6. EVIDENCE MAPPING: For every major factual claim, provide exact matching excerpt text from the source in "sourceEvidence" and "facts".
7. 700-WORD MINIMUM ARTICLE BODY POLICY: Whenever source material provides sufficient factual evidence, produce a comprehensive, well-structured, in-depth final article body of at least 700 words across structured contentBlocks.
   - NO ARTIFICIAL CEILING: There is NO maximum word count. In-depth, investigative, and comprehensive reporting (700, 1,000, 1,500, 3,000+ words) is encouraged whenever supported by evidence.
   - SUBSTANTIVE COVERAGE: Include historical background, context, implications, technical details, stakeholder impact, and chronological timeline.
   - FACTUAL GROUNDING ONLY: NEVER fabricate facts or add repetitive filler or fluff to reach 700 words. Every claim must be grounded in verified source material.
   - INSUFFICIENT EVIDENCE ROUTING: If verified source facts and legitimate context cannot support 700 words without padding, produce only what is factually supported and flag confidenceLevel: "low" or "conflicted" or set status to "review" so the candidate is held for human review.
   - MULTI-SOURCE SYNTHESIS: When multiple related source reports are provided, synthesize verified claims across sources into rich reporting while maintaining precise source evidence mapping for every claim.

CATEGORY TAXONOMY:
- Categories: ai, technology, gaming, science, space, business, world, entertainment, cybersecurity, apps, hardware.
- Select the best category and subcategory based on the article content, using the provided hint only as guidance.

STORY STATUS:
- Status options: normal, developing, announcement, updated, analysis, review, breaking. (Use 'breaking' only for urgent live developments).

OUTPUT FORMAT:
Output MUST be a single, valid JSON object strictly matching the required schema. DO NOT output markdown ticks, backticks, conversational preamble, or trailing commentary. JSON ONLY.`;
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

Return a single JSON object with the following structure:
{
  "title": "Clear, objective, factual headline (no clickbait)",
  "dek": "One-sentence informative sub-headline",
  "summary": "Concise original summary of central event and context (2-3 sentences)",
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
  "eventDate": "YYYY-MM-DD or null if not stated",
  "author": "Author name or null",
  "entities": [
    { "name": "Entity Name", "type": "company|person|organization|product|game|technology|location|event", "relevance": 0.9 }
  ],
  "facts": [
    { "label": "Key Fact Label", "value": "Factual value", "evidence": "Direct quote from source text", "confidence": 0.95 }
  ],
  "timelineCandidates": [
    { "date": "Date/Time string", "title": "Milestone title", "description": "What occurred" }
  ],
  "contentBlocks": [
    { "id": "block-1", "type": "paragraph", "content": "Original journalistic paragraph explaining core news (aim for >=700 substantive words across body blocks when supported by facts; no filler or fabrication)..." },
    { "id": "block-2", "type": "heading", "content": "Context & Background", "level": 2 },
    { "id": "block-3", "type": "paragraph", "content": "Historical background, technical details, industry or societal implications..." },
    { "id": "block-4", "type": "heading", "content": "Stakeholder Impact & Outlook", "level": 2 },
    { "id": "block-5", "type": "paragraph", "content": "Stakeholder perspectives, future milestones, and ongoing regulatory or market implications..." }
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
