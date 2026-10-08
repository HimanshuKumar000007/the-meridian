/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Primary Server-Side Google Gemini Inference Client.
 * Communicates with Google Gemini API (gemini-2.5-flash by default) for high-speed,
 * structured, hallucination-free news extraction and original journalistic synthesis.
 */

import type { ExtractionLLMProvider } from './NvidiaClient';

export interface GeminiClientOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  temperature?: number;
  maxOutputTokens?: number;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 40000; // 40 seconds — ample headroom within Vercel's 120s limit
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

export class GeminiClient implements ExtractionLLMProvider {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private temperature: number;
  private maxOutputTokens: number;

  constructor(options: GeminiClientOptions = {}) {
    this.apiKey =
      options.apiKey ||
      (typeof process !== 'undefined'
        ? process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || ''
        : '');
    this.model =
      options.model ||
      (typeof process !== 'undefined' ? process.env.GEMINI_MODEL : undefined) ||
      DEFAULT_GEMINI_MODEL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.temperature = options.temperature ?? DEFAULT_TEMPERATURE;
    this.maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
  }

  public getModelName(): string {
    return this.model;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== '');
  }

  /**
   * Send extraction or synthesis prompt to Google Gemini and return raw JSON output with metrics.
   */
  public async extractStructuredNews(
    systemPrompt: string,
    userPrompt: string,
    modelOverride?: string,
    maxTokensOverride?: number
  ): Promise<{
    rawJson: string;
    model: string;
    durationMs: number;
    tokensUsed?: number;
  }> {
    if (!this.isConfigured()) {
      throw new Error(
        '[GeminiClient] GEMINI_API_KEY environment variable is missing or empty. ' +
        'Set GEMINI_API_KEY in .env.local for primary Gemini inference.'
      );
    }

    const targetModel =
      modelOverride && (modelOverride.startsWith('gemini') || !modelOverride.includes('/'))
        ? modelOverride
        : this.model;
    const effectiveMaxTokens = maxTokensOverride ?? this.maxOutputTokens;
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(
        this.apiKey
      )}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'TheMeridian/1.0 (EditorialExtractionEngine-Gemini)',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: effectiveMaxTokens,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          `[GeminiClient] HTTP ${response.status} ${response.statusText}: ${errorBody.slice(0, 300)}`
        );
      }

      const data = await response.json();
      const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!rawContent) {
        throw new Error('[GeminiClient] Empty or unparsed candidate response received from Gemini API');
      }

      const cleanedJson = this.sanitizeJsonOutput(rawContent);
      const durationMs = Date.now() - startTime;

      return {
        rawJson: cleanedJson,
        model: targetModel,
        durationMs,
        tokensUsed: data.usageMetadata?.totalTokenCount,
      };
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      if (isTimeout) {
        throw new Error(`[GeminiClient] Request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sanitizes output to extract pure JSON, stripping markdown code block fences if present.
   */
  public sanitizeJsonOutput(raw: string): string {
    let clean = raw.trim();

    // If enclosed in markdown code fences ```json ... ```
    const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      clean = codeBlockMatch[1].trim();
    }

    // Find opening brace and matching closing brace
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }

    return clean;
  }
}
