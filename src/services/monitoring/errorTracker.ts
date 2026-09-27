/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TrackedErrorContext {
  requestId?: string;
  service?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface SafeErrorResponse {
  error: string;
  code: string;
  requestId: string;
  timestamp: string;
}

/**
 * Generate a unique request correlation ID
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `req_${crypto.randomUUID()}`;
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Extract or generate correlation ID from HTTP headers or request objects
 */
export function getRequestId(headers?: Headers | Record<string, string | string[] | undefined>): string {
  if (!headers) return generateRequestId();

  if (typeof (headers as Headers).get === 'function') {
    const existing =
      (headers as Headers).get('x-request-id') ||
      (headers as Headers).get('x-correlation-id') ||
      (headers as Headers).get('traceparent');
    if (existing && existing.trim()) return existing.trim();
  } else {
    const headerObj = headers as Record<string, string | string[] | undefined>;
    const raw =
      headerObj['x-request-id'] ||
      headerObj['X-Request-Id'] ||
      headerObj['x-correlation-id'] ||
      headerObj['traceparent'];

    if (raw) {
      return Array.isArray(raw) ? raw[0] : raw;
    }
  }

  return generateRequestId();
}

/**
 * Sanitize error message to prevent leaking database URLs, keys, secrets, or internal paths
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return 'An unexpected error occurred';

  let sanitized = message;
  // Strip JWT tokens or keys
  sanitized = sanitized.replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT]');
  sanitized = sanitized.replace(/(key|secret|password|token)=([a-zA-Z0-9_~.-]+)/gi, '$1=[REDACTED]');
  sanitized = sanitized.replace(/https:\/\/[^:]+:[^@]+@/g, 'https://[REDACTED]@');
  sanitized = sanitized.replace(/(nvapi-[a-zA-Z0-9_-]+)/g, '[REDACTED_NVIDIA_KEY]');

  return sanitized;
}

/**
 * Format a safe, sanitized error response suitable for API outputs and client presentation
 */
export function formatSafeErrorResponse(
  error: unknown,
  requestId: string = generateRequestId(),
  fallbackCode = 'INTERNAL_ERROR'
): SafeErrorResponse {
  const timestamp = new Date().toISOString();
  let rawMessage = 'An unexpected system error occurred.';
  let code = fallbackCode;

  if (error instanceof Error) {
    rawMessage = error.message;
    if ((error as any).code && typeof (error as any).code === 'string') {
      code = (error as any).code;
    }
  } else if (typeof error === 'string') {
    rawMessage = error;
  }

  const cleanMessage = sanitizeErrorMessage(rawMessage);

  return {
    error: cleanMessage,
    code,
    requestId,
    timestamp,
  };
}

/**
 * Log error safely with correlation ID and contextual attributes
 */
export function trackError(error: unknown, context: TrackedErrorContext = {}): void {
  const reqId = context.requestId || generateRequestId();
  const timestamp = new Date().toISOString();

  let message = 'Unknown error';
  let stack: string | undefined;

  if (error instanceof Error) {
    message = sanitizeErrorMessage(error.message);
    stack = error.stack;
  } else if (typeof error === 'string') {
    message = sanitizeErrorMessage(error);
  }

  // Structured logging (compatible with Vercel logs and Node stdout)
  const logPayload = {
    level: 'ERROR',
    timestamp,
    requestId: reqId,
    service: context.service || 'unknown',
    action: context.action,
    message,
    metadata: context.metadata,
    // Include stack only in server logs, never exposed to clients
    stack: typeof window === 'undefined' ? stack : undefined,
  };

  console.error('[The Meridian Error]', JSON.stringify(logPayload));
}
