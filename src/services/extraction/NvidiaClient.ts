/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NvidiaClientOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface NvidiaModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface NvidiaChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ExtractionLLMProvider {
  extractStructuredNews(
    systemPrompt: string,
    userPrompt: string,
    modelOverride?: string,
    maxTokensOverride?: number
  ): Promise<{
    rawJson: string;
    model: string;
    durationMs: number;
    tokensUsed?: number;
  }>;
}


const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';
// 110 s — gives NVIDIA the full serverless budget (Vercel maxDuration=120 s)
// while leaving 10 s for pipeline overhead and graceful response return.
const DEFAULT_TIMEOUT_MS = 110000;
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Server-Side NVIDIA AI Inference Client.
 * Communicates with NVIDIA NIM OpenAI-compatible API.
 */
export class NvidiaClient implements ExtractionLLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;
  private temperature: number;
  private maxTokens: number;

  constructor(options: NvidiaClientOptions = {}) {
    this.apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env.NVIDIA_API_KEY || '' : '');
    this.baseUrl = (
      options.baseUrl ||
      (typeof process !== 'undefined' ? process.env.NVIDIA_API_BASE_URL : undefined) ||
      DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
    this.model =
      options.model ||
      (typeof process !== 'undefined' ? process.env.NVIDIA_MODEL : undefined) ||
      DEFAULT_MODEL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.temperature = options.temperature ?? DEFAULT_TEMPERATURE;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  public getModelName(): string {
    return this.model;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== '');
  }

  /**
   * Discover available models from NVIDIA's /v1/models endpoint
   */
  public async listAvailableModels(): Promise<NvidiaModelInfo[]> {
    if (!this.isConfigured()) {
      throw new Error('[NvidiaClient] NVIDIA_API_KEY is missing. Cannot fetch model catalog.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          'User-Agent': 'TheMeridian/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Failed to list NVIDIA models: HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return (data.data || []) as NvidiaModelInfo[];
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`[NvidiaClient] Model discovery failed: ${err.message}`);
    }
  }

  /**
   * Send extraction prompt to NVIDIA LLM and return raw JSON output with metrics.
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
        '[NvidiaClient] NVIDIA_API_KEY environment variable is missing or empty. ' +
        'Set NVIDIA_API_KEY in .env.local for server-side extraction.'
      );
    }

    const targetModel = modelOverride || this.model;
    const effectiveMaxTokens = maxTokensOverride ?? this.maxTokens;
    const startTime = Date.now();
    let lastError: Error | null = null;
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'TheMeridian/1.0 (EditorialExtractionEngine)',
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: this.temperature,
            max_tokens: effectiveMaxTokens,
          }),

          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          // Do not retry 4xx client errors (e.g. 401 Unauthorized, 403 Forbidden, 400 Bad Request)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(
              `[NvidiaClient] HTTP ${response.status} Client Error: ${errorBody.slice(0, 300)}`
            );
          }
          throw new Error(`[NvidiaClient] HTTP ${response.status} Server Error: ${errorBody.slice(0, 200)}`);
        }

        const data = (await response.json()) as NvidiaChatCompletionResponse;
        const rawContent = data.choices?.[0]?.message?.content || '';

        const cleanedJson = this.sanitizeJsonOutput(rawContent);
        const durationMs = Date.now() - startTime;

        return {
          rawJson: cleanedJson,
          model: data.model || targetModel,
          durationMs,
          tokensUsed: data.usage?.total_tokens,
        };
      } catch (err: any) {
        lastError = err;
        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');

        if (isTimeout) {
          lastError = new Error(`[NvidiaClient] Request timed out after ${this.timeoutMs}ms`);
          // Never retry timed-out requests: downstream serverless functions must not exceed platform deadlines
          break;
        }

        // Only retry if transient and not the final attempt
        if (attempt < maxRetries && !err.message?.includes('Client Error')) {
          const backoffDelay = 1000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else {
          break;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error('[NvidiaClient] Extraction request failed');
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
