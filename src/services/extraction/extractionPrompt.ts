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
Extract structured, verifiable news data from supplied source text and draft an original, factual, in-depth news candidate.

EDITORIAL PRINCIPLES:
1. SOURCE-ONLY MODE: Extract facts, figures, dates, and quotes directly stated or clearly implied. Never invent contradictory or fabricated claims.
2. OBJECTIVITY & TONE: Neutral, authoritative, premium journalism. No clickbait, sensationalism, or hyperbole.
3. PRESERVE UNCERTAINTY: Retain qualifiers ('alleged', 'unconfirmed', 'reported').
4. ORIGINAL DRAFTING: Original journalistic synthesis across contentBlocks. Do not copy full sentences verbatim except brief attributed quotes.
5. CONFLICT DETECTION: If source text contains contradictions, set "hasConflicts": true and document in "conflictDetails".
6. EVIDENCE MAPPING: Provide matching excerpt text from source in "sourceEvidence" and "facts".
7. MANDATORY 700-WORD MINIMUM ARTICLE BODY POLICY:
   - Construct a comprehensive, in-depth news report of AT LEAST 700 substantive words across structured contentBlocks. This is a strict publication requirement.
   - Word count is measured strictly on body prose (headline, dek, summary, and captions are excluded).
   - Structure the article systematically into 5-6 substantive sections with descriptive headings:
     (a) Executive Lead & Breaking Event (2 detailed paragraphs: 5 Ws, what happened, primary actors, core significance)
     (b) Technical Mechanisms & Factual Findings (2-3 detailed paragraphs: specific metrics, observed data, procedures)
     (c) Historical Background & Institutional Context (2 detailed paragraphs: precedents, past developments, origins)
     (d) Broader Industry, Economic & Global Implications (2 detailed paragraphs: systemic consequences, downstream effects)
     (e) Expert Perspectives & Official Statements (1-2 paragraphs: attributed quotes, stakeholder analysis)
     (f) Strategic Outlook & Future Milestones (2 detailed paragraphs: upcoming timeline, what to monitor next)
   - Ensure the article body contains at least 10 to 14 structured blocks totaling >= 750 words. Do NOT use repetitive looping or filler.

TAXONOMY: ai, technology, gaming, science, space, business, world, entertainment, cybersecurity, apps, hardware.
STATUS: normal, developing, announcement, updated, analysis, review, breaking.
OUTPUT: Output a single, valid JSON object matching the required schema. No markdown fences or commentary. JSON ONLY.`;
}

export function buildUserPrompt(input: PromptInput): string {
  return `Extract and structure the following news story into the required JSON schema with an in-depth article body of at least 700 words:

SOURCE METADATA:
- Source: ${input.sourceName}
- URL: ${input.sourceUrl}
- Published Date: ${input.publishedAt || 'Unknown'}
- Category Hint: ${input.categoryHint || 'general'} / ${input.subcategoryHint || 'general'}

RAW SOURCE TEXT:
${input.articleText}

Return a single JSON object strictly matching this structure (ensure contentBlocks contains at least 10-14 substantive blocks totaling >= 750 words):
{
  "title": "Clear, objective, factual headline",
  "dek": "One-sentence informative sub-headline explaining core significance",
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
    { "id": "block-1", "type": "paragraph", "content": "Detailed executive lead introducing the core news event, participating organisations, and immediate context..." },
    { "id": "block-2", "type": "paragraph", "content": "Elaboration of the initial findings, establishing the physical location, timeline, and primary observations reported..." },
    { "id": "block-3", "type": "heading", "content": "Key Findings and Technical Details", "level": 2 },
    { "id": "block-4", "type": "paragraph", "content": "Comprehensive breakdown of the specific metrics, scientific observations, capital figures, or technical data documented..." },
    { "id": "block-5", "type": "paragraph", "content": "Granular analysis of the findings, evaluating how these developments compare to historic baseline standards..." },
    { "id": "block-6", "type": "heading", "content": "Context and Institutional Background", "level": 2 },
    { "id": "block-7", "type": "paragraph", "content": "Historical background and precedents leading to this milestone, highlighting the structural drivers and past research..." },
    { "id": "block-8", "type": "heading", "content": "Industry, Policy and Broader Ramifications", "level": 2 },
    { "id": "block-9", "type": "paragraph", "content": "Broader implications across the sector, discussing economic, technological, regulatory, or environmental consequences..." },
    { "id": "block-10", "type": "heading", "content": "Strategic Outlook and Future Timeline", "level": 2 },
    { "id": "block-11", "type": "paragraph", "content": "Detailed overview of next operational phases, upcoming reviews, scheduled trials, and anticipated long-term milestones..." }
  ],
  "heroImage": null,
  "sourceEvidence": [
    { "claim": "Main factual claim", "evidenceText": "Excerpt from source", "sourceUrl": "${input.sourceUrl}", "confidence": 0.95 }
  ],
  "overallConfidence": 0.95,
  "confidenceLevel": "high|exact|medium|low|conflicted",
  "hasConflicts": false,
  "conflictDetails": null
}`;
}
