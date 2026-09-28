/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * MediaStorageService: Storage Pathing, Responsive Derivatives, Hashing & Deduplication
 */

import { createHash } from 'crypto';
import type { MediaAsset, MediaDerivatives } from '../../types/media';
import type { MediaRepository } from '../../data/repositories/MediaRepository';

export class MediaStorageService {
  constructor(private repository?: MediaRepository) {}

  /**
   * Generates a deterministic SHA-256 fingerprint for image content.
   */
  public computeImageHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  public computeContentHash(buffer: Buffer): string {
    return this.computeImageHash(buffer);
  }

  /**
   * Constructs deterministic canonical media paths for a story asset.
   */
  public getCanonicalStoragePath(storyId: string, filename = 'hero.webp'): string {
    const cleanStoryId = storyId.replace(/[^a-zA-Z0-9_-]/g, '');
    return `/media/stories/${cleanStoryId}/${filename}`;
  }

  /**
   * Constructs responsive derivative descriptors for a base image URL.
   */
  public computeDerivatives(baseUrl: string, format = 'webp'): MediaDerivatives {
    return {
      largeDesktop: { url: baseUrl, width: 1600, height: 900, format },
      desktop: { url: baseUrl, width: 1200, height: 675, format },
      tablet: { url: baseUrl, width: 800, height: 450, format },
      mobile: { url: baseUrl, width: 400, height: 225, format },
      thumbnail: { url: baseUrl, width: 200, height: 112, format },
      openGraph: { url: baseUrl, width: 1200, height: 630, format },
    };
  }

  /**
   * Checks if an identical approved asset already exists in storage.
   */
  public async findDuplicateAsset(imageHash: string): Promise<MediaAsset | null> {
    if (!this.repository || !imageHash) return null;
    return this.repository.getAssetByHash(imageHash);
  }

  /**
   * Formats an HTML/JSX compatible responsive srcset string.
   */
  public getSrcSet(asset: MediaAsset): string {
    if (!asset.derivatives) return asset.storageUrl;
    const parts: string[] = [];
    if (asset.derivatives.mobile) parts.push(`${asset.derivatives.mobile.url} 400w`);
    if (asset.derivatives.tablet) parts.push(`${asset.derivatives.tablet.url} 800w`);
    if (asset.derivatives.desktop) parts.push(`${asset.derivatives.desktop.url} 1200w`);
    if (asset.derivatives.largeDesktop) parts.push(`${asset.derivatives.largeDesktop.url} 1600w`);
    return parts.length > 0 ? parts.join(', ') : asset.storageUrl;
  }
}
