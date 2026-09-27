/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtractionLLMProvider } from './NvidiaClient';

export interface MockExtractionResponseOptions {
  shouldFail?: boolean;
  failStatus?: number;
  failError?: string;
  delayMs?: number;
  overridePayload?: Record<string, any>;
}

/**
 * Deterministic Mock Extraction Provider for unit testing and offline development.
 * Never consumes API credits or makes network requests.
 */
export class MockExtractionProvider implements ExtractionLLMProvider {
  private options: MockExtractionResponseOptions;

  constructor(options: MockExtractionResponseOptions = {}) {
    this.options = options;
  }

  public setOptions(options: MockExtractionResponseOptions) {
    this.options = options;
  }

  public async extractStructuredNews(
    systemPrompt: string,
    userPrompt: string,
    modelOverride?: string
  ): Promise<{
    rawJson: string;
    model: string;
    durationMs: number;
    tokensUsed?: number;
  }> {
    if (this.options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delayMs));
    }

    if (this.options.shouldFail) {
      throw new Error(this.options.failError || 'Mock extraction provider error');
    }

    if (this.options.overridePayload) {
      return {
        rawJson: JSON.stringify(this.options.overridePayload),
        model: modelOverride || 'mock-meta/llama-3.3-70b-instruct',
        durationMs: 42,
        tokensUsed: 450,
      };
    }

    // Extract title hint from user prompt if available
    const titleMatch = userPrompt.match(/Headline:\s*([^\n]+)/i) || userPrompt.match(/RAW SOURCE TEXT:\s*([^\n]+)/i);
    const mockTitle = titleMatch ? titleMatch[1].slice(0, 100).trim() : 'Validated Global News Discovery Event';

    const mockPayload = {
      title: mockTitle,
      dek: 'Verified technological development reported across global industry sources',
      summary:
        'A comprehensive verification of operational frameworks and technological advances demonstrated across industry sectors, confirming milestones and verifiable specifications.',
      summaryPoints: [
        'Confirmed technical milestone established according to source announcements.',
        'Initial deployment scheduled across primary production environments.',
        'Independent telemetry recorded consistent operational performance.',
      ],
      category: 'technology',
      subcategory: 'infrastructure',
      classificationConfidence: 0.94,
      topics: ['technology', 'infrastructure', 'standards'],
      status: 'normal',
      eventDate: '2026-09-27',
      author: 'Staff Reporter',
      entities: [
        { name: 'Meridian Standards Group', type: 'organization', relevance: 0.95 },
        { name: 'Distributed Interconnect v2', type: 'technology', relevance: 0.9 },
      ],
      facts: [
        {
          label: 'Ratified Specification',
          value: 'Universal Optical Interconnect Standard',
          evidence: 'The standard was formally ratified by the consensus committee.',
          confidence: 0.98,
        },
      ],
      timelineCandidates: [
        {
          date: '2026-09-27',
          title: 'Official Ratification',
          description: 'Consensus committee approves final operational draft.',
        },
      ],
      contentBlocks: [
        {
          id: 'block-1',
          type: 'paragraph',
          content:
            'A unified operational framework was formally confirmed following extensive verification, marking a key milestone in distributed computing infrastructure.',
        },
        {
          id: 'block-2',
          type: 'heading',
          content: 'Technical Significance',
          level: 2,
        },
        {
          id: 'block-3',
          type: 'paragraph',
          content:
            'Under the verified specifications, participating institutions will standardize high-bandwidth optical interconnects, reducing systemic latency across interconnected clusters.',
        },
      ],
      heroImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      sourceEvidence: [
        {
          claim: 'Framework formally confirmed',
          evidenceText: 'The standard was formally ratified by the consensus committee.',
          sourceUrl: 'https://example.com/source/verified-announcement',
          confidence: 0.97,
        },
      ],
      overallConfidence: 0.95,
      confidenceLevel: 'high',
      hasConflicts: false,
      conflictDetails: null,
    };

    return {
      rawJson: JSON.stringify(mockPayload),
      model: modelOverride || 'mock-meta/llama-3.3-70b-instruct',
      durationMs: 38,
      tokensUsed: 520,
    };
  }
}
