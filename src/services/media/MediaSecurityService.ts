/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * MediaSecurityService: SSRF Protection, Safe Remote Fetching, and MIME Validation
 */

import { createHash } from 'crypto';

export interface RemoteFetchResult {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
}

export class MediaSecurityService {
  /**
   * Evaluates if a given URL is safe from SSRF and protocol vulnerabilities.
   */
  public isSafeUrl(rawUrl: string): { safe: boolean; reason?: string } {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { safe: false, reason: 'Empty or non-string URL' };
    }

    const trimmed = rawUrl.trim();

    // Check scheme
    if (!/^https?:\/\//i.test(trimmed)) {
      return { safe: false, reason: `Unsafe or unsupported protocol: ${trimmed.slice(0, 15)}` };
    }

    try {
      const parsed = new URL(trimmed);
      const hostname = parsed.hostname.toLowerCase();

      // Check for blocked hostnames
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname === 'metadata.google.internal' ||
        hostname === 'instance-data'
      ) {
        return { safe: false, reason: `Access to internal host is blocked: ${hostname}` };
      }

      // Check IPv4 addresses
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        const parts = hostname.split('.').map(Number);
        const [a, b] = parts;

        // 127.0.0.0/8 (Loopback)
        if (a === 127 || a === 0) {
          return { safe: false, reason: 'Loopback IPv4 addresses are prohibited' };
        }
        // 10.0.0.0/8 (Private RFC1918)
        if (a === 10) {
          return { safe: false, reason: 'Private 10.0.0.0/8 addresses are prohibited' };
        }
        // 172.16.0.0/12 (Private RFC1918)
        if (a === 172 && b >= 16 && b <= 31) {
          return { safe: false, reason: 'Private 172.16.0.0/12 addresses are prohibited' };
        }
        // 192.168.0.0/16 (Private RFC1918)
        if (a === 192 && b === 168) {
          return { safe: false, reason: 'Private 192.168.0.0/16 addresses are prohibited' };
        }
        // 169.254.0.0/16 (Link Local / Cloud Metadata)
        if (a === 169 && b === 254) {
          return { safe: false, reason: 'Link-local / cloud metadata 169.254.0.0/16 is prohibited' };
        }
        // 100.64.0.0/10 (Carrier NAT)
        if (a === 100 && b >= 64 && b <= 127) {
          return { safe: false, reason: 'Shared carrier NAT addresses are prohibited' };
        }
      }

      // Check IPv6 addresses
      if (hostname.includes(':') || hostname.startsWith('[')) {
        const unbracketed = hostname.replace(/^\[|\]$/g, '');
        if (
          unbracketed === '::1' ||
          unbracketed === '0000:0000:0000:0000:0000:0000:0000:0001' ||
          unbracketed.startsWith('fe80:') ||
          unbracketed.startsWith('fc00:') ||
          unbracketed.startsWith('fd00:')
        ) {
          return { safe: false, reason: 'Private or loopback IPv6 addresses are prohibited' };
        }
      }

      return { safe: true };
    } catch (err: any) {
      return { safe: false, reason: `Malformed URL: ${err.message}` };
    }
  }

  /**
   * Strips tracking query parameters while preserving necessary transformation parameters.
   */
  public canonicalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'mc_cid', 'mc_eid', '_hsenc', '_hsmi', '_openstat',
      ];
      for (const p of trackingParams) {
        parsed.searchParams.delete(p);
      }
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  }

  /**
   * Inspects binary buffer magic bytes to determine actual image MIME type.
   * Prevents disguised HTML, JSON, or scripts.
   */
  public detectMimeType(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 4) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0D &&
      buffer[5] === 0x0A &&
      buffer[6] === 0x1A &&
      buffer[7] === 0x0A
    ) {
      return 'image/png';
    }

    // GIF: GIF87a or GIF89a
    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    ) {
      return 'image/gif';
    }

    // WebP: RIFF .... WEBP
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    // AVIF: ....ftypavif or ftypavis
    if (buffer.length >= 12) {
      const ftypStr = buffer.toString('ascii', 4, 12);
      if (ftypStr.includes('ftypavif') || ftypStr.includes('ftypavis')) {
        return 'image/avif';
      }
    }

    // SVG check (text/xml based)
    const headerSnippet = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).trim();
    if (headerSnippet.includes('<svg') && !headerSnippet.includes('<script')) {
      return 'image/svg+xml';
    }

    return null;
  }

  /**
   * Safely downloads a remote image with bounded size, timeout, and SSRF validation.
   */
  public async fetchRemoteImage(
    url: string,
    options: {
      maxSizeBytes?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<RemoteFetchResult> {
    const { maxSizeBytes = 10 * 1024 * 1024, timeoutMs = 6000 } = options;

    const safety = this.isSafeUrl(url);
    if (!safety.safe) {
      throw new Error(`SSRF Block: ${safety.reason}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TheMeridian-MediaBot/1.0 (+https://themeridian.news)',
          Accept: 'image/webp,image/avif,image/jpeg,image/png,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`Remote image fetch failed: HTTP ${response.status} ${response.statusText}`);
      }

      // Check declared content-length if available
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const declaredSize = parseInt(contentLengthHeader, 10);
        if (!isNaN(declaredSize) && declaredSize > maxSizeBytes) {
          throw new Error(`Remote image exceeds maximum allowed size (${declaredSize} > ${maxSizeBytes} bytes)`);
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > maxSizeBytes) {
        throw new Error(`Downloaded image exceeds maximum allowed size (${buffer.length} > ${maxSizeBytes} bytes)`);
      }

      // Detect and validate true MIME type from magic bytes
      const detectedMime = this.detectMimeType(buffer);
      if (!detectedMime) {
        throw new Error('Downloaded file is not a supported image format or contains invalid binary data');
      }

      // Reject external SVG images: SVG is disabled as a public stored format from remote sources
      // News photography and hero media strictly require raster formats (JPEG, PNG, WebP, AVIF)
      if (detectedMime === 'image/svg+xml') {
        throw new Error('External SVG images are disabled as a public stored format for security; news media requires raster formats');
      }

      const contentHash = createHash('sha256').update(buffer).digest('hex');

      return {
        buffer,
        mimeType: detectedMime,
        sizeBytes: buffer.length,
        contentHash,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Sanitizes SVG content before delivery.
   * Strips scripts, foreignObject, iframes, objects, embeds, applets, inline event handlers,
   * javascript: URIs, DOCTYPE, and ENTITY declarations to prevent XSS and XXE.
   */
  public sanitizeSvg(rawSvg: string): string {
    if (!rawSvg || typeof rawSvg !== 'string') return '';

    return rawSvg
      // Strip XML declarations and DOCTYPE (prevents XXE / entity expansion / Billion Laughs)
      .replace(/<\?xml[\s\S]*?\?>/gi, '')
      .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
      .replace(/<!ENTITY[\s\S]*?>/gi, '')
      // Strip <script> tags and any contents
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<script\b[^>]*\/>/gi, '')
      // Strip <foreignObject> tags and contents (prevents HTML/DOM XSS)
      .replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, '')
      .replace(/<foreignObject\b[^>]*\/>/gi, '')
      // Strip dangerous embedding tags
      .replace(/<(iframe|object|embed|applet|meta|link|base)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<(iframe|object|embed|applet|meta|link|base)\b[^>]*\/>/gi, '')
      // Strip inline event handlers (onload, onerror, onclick, onmouseover, etc.)
      .replace(/\s+on[a-z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
      // Strip dangerous URI schemes in href / xlink:href
      .replace(/(href|xlink:href)\s*=\s*["']\s*(javascript|vbscript|data):[^"']*["']/gi, '')
      // Neutralize active expressions in style tags
      .replace(/<style\b[\s\S]*?<\/style>/gi, (match) => {
        if (/expression\s*\(|@import|behavior\s*:/i.test(match)) {
          return '';
        }
        return match;
      });
  }

  /**
   * Verifies if an SVG string is completely clean of any active scripts or HTML injection.
   */
  public isSvgSafe(svgText: string): boolean {
    if (!svgText || typeof svgText !== 'string') return false;
    const dangerousPatterns = [
      /<script\b/i,
      /<foreignObject\b/i,
      /<iframe\b/i,
      /<object\b/i,
      /<embed\b/i,
      /<applet\b/i,
      /\bon[a-z]+\s*=/i,
      /(?:href|xlink:href)\s*=\s*["']\s*(?:javascript|vbscript):/i,
      /<!ENTITY/i,
      /<!DOCTYPE/i,
    ];
    return !dangerousPatterns.some((pattern) => pattern.test(svgText));
  }
}
