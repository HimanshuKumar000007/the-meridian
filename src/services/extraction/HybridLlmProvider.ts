/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hybrid LLM Provider for The Meridian.
 * Simple, resilient, best-in-class multi-model orchestration:
 * - PRIMARY: Google Gemini (gemini-2.5-flash) for instant, high-quality structured generation
 * - SECONDARY: NVIDIA NIM (NvidiaClient) automatic fallback on any rate limit, quota, or service outage
 */

import { GeminiClient, type GeminiClientOptions } from './GeminiClient';
import { NvidiaClient, type NvidiaClientOptions, type ExtractionLLMProvider } from './NvidiaClient';

export interface HybridLlmProviderOptions {
  geminiOptions?: GeminiClientOptions;
  nvidiaOptions?: NvidiaClientOptions;
}

export class HybridLlmProvider implements ExtractionLLMProvider {
  private primary: GeminiClient;
  private secondary: NvidiaClient;

  constructor(options: HybridLlmProviderOptions = {}) {
    this.primary = new GeminiClient(options.geminiOptions);
    this.secondary = new NvidiaClient(options.nvidiaOptions);
  }

  public getPrimary(): GeminiClient {
    return this.primary;
  }

  public getSecondary(): NvidiaClient {
    return this.secondary;
  }

  public getModelName(): string {
    if (this.primary.isConfigured() && this.secondary.isConfigured()) {
      return `${this.primary.getModelName()} (Primary: Gemini) [Fallback: NVIDIA NIM]`;
    }
    if (this.primary.isConfigured()) {
      return `${this.primary.getModelName()} (Primary: Gemini)`;
    }
    if (this.secondary.isConfigured()) {
      return `${this.secondary.getModelName()} (Secondary: NVIDIA NIM)`;
    }
    return 'unconfigured';
  }

  public isConfigured(): boolean {
    return this.primary.isConfigured() || this.secondary.isConfigured();
  }

  /**
   * Extracts structured news or synthesizes articles.
   * Tries Primary (Gemini) first. If it fails, falls back automatically to Secondary (NVIDIA).
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
    // 1. PRIMARY: Google Gemini
    if (this.primary.isConfigured()) {
      try {
        const result = await this.primary.extractStructuredNews(
          systemPrompt,
          userPrompt,
          modelOverride,
          maxTokensOverride
        );
        return result;
      } catch (geminiError: any) {
        console.warn(
          `[HybridLlmProvider] Primary provider (Gemini) failed: ${geminiError.message}. ` +
          `Falling back to Secondary provider (NVIDIA)...`
        );
      }
    }

    // 2. SECONDARY (FALLBACK): NVIDIA NIM
    if (this.secondary.isConfigured()) {
      try {
        const result = await this.secondary.extractStructuredNews(
          systemPrompt,
          userPrompt,
          modelOverride,
          maxTokensOverride
        );
        return result;
      } catch (nvidiaError: any) {
        throw new Error(
          `[HybridLlmProvider] Both providers failed. Gemini failed earlier, and NVIDIA error: ${nvidiaError.message}`
        );
      }
    }

    // 3. NEITHER CONFIGURED
    throw new Error(
      '[HybridLlmProvider] No LLM provider is configured. ' +
      'Please set GEMINI_API_KEY (primary) or NVIDIA_API_KEY (secondary) in .env.local.'
    );
  }
}
