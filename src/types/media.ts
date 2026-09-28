/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Universal Image & Media Engine Types
 */

export type ImageSourceType =
  | 'official'
  | 'publisher'
  | 'licensed'
  | 'stock'
  | 'public_domain'
  | 'user_provided'
  | 'ai_generated'
  | 'existing_asset'
  | 'fallback'
  | 'unknown';

export type ImageRightsStatus =
  | 'verified'
  | 'licensed'
  | 'public_domain'
  | 'permission_granted'
  | 'unknown'
  | 'restricted'
  | 'rejected';

export type ImageProvenanceStatus =
  | 'verified'
  | 'partially_verified'
  | 'unknown'
  | 'missing';

export type ImageValidationStatus =
  | 'candidate'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'needs_review'
  | 'fallback';

export type MediaDecisionType =
  | 'APPROVED'
  | 'FALLBACK'
  | 'NEEDS_REVIEW'
  | 'REJECTED';

export type MediaDecisionReason =
  | 'SELECTED_VERIFIED_SOURCE_IMAGE'
  | 'SELECTED_LICENSED_IMAGE'
  | 'SELECTED_PUBLIC_DOMAIN_IMAGE'
  | 'SELECTED_EXISTING_ASSET'
  | 'SELECTED_AI_ILLUSTRATION'
  | 'SELECTED_FALLBACK'
  | 'REJECTED_UNKNOWN_RIGHTS'
  | 'REJECTED_IRRELEVANT'
  | 'REJECTED_INVALID'
  | 'REVIEW_REQUIRED';

export type MediaAssetType =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'illustration';

export type MediaAuditEventType =
  | 'MEDIA_DISCOVERED'
  | 'MEDIA_VALIDATED'
  | 'MEDIA_APPROVED'
  | 'MEDIA_REJECTED'
  | 'MEDIA_ATTACHED'
  | 'MEDIA_REPLACED'
  | 'MEDIA_REVOKED'
  | 'MEDIA_FALLBACK_SELECTED'
  | 'MEDIA_GENERATED';

export type MediaJobType =
  | 'discover'
  | 'download'
  | 'validate'
  | 'optimize'
  | 'generate'
  | 'attach'
  | 'replace';

export type MediaJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ImageCandidate {
  id?: string;
  storyId?: string;
  sourceUrl?: string;
  originalUrl: string;
  sourceName?: string;
  sourceType: ImageSourceType;
  mimeType?: string;
  width?: number;
  height?: number;
  caption?: string;
  credit?: string;
  altText?: string;
  retrievedAt?: string;
  relevanceScore?: number; // Internal engineering signal (0.00 - 1.00)
  rightsStatus: ImageRightsStatus;
  provenanceStatus: ImageProvenanceStatus;
  isIllustrative?: boolean;
  isPrimary?: boolean;
  validationStatus?: ImageValidationStatus;
  metadata?: Record<string, any>;
}

export interface MediaAssetDerivative {
  url: string;
  width: number;
  height: number;
  format: string;
  fileSize?: number;
}

export interface MediaDerivatives {
  largeDesktop?: MediaAssetDerivative;
  desktop?: MediaAssetDerivative;
  tablet?: MediaAssetDerivative;
  mobile?: MediaAssetDerivative;
  thumbnail?: MediaAssetDerivative;
  openGraph?: MediaAssetDerivative;
  [key: string]: MediaAssetDerivative | undefined;
}

export interface MediaAsset {
  id: string;
  storyId?: string;
  assetType: MediaAssetType;
  sourceType: ImageSourceType;
  sourceUrl?: string;
  originalUrl?: string;
  storageUrl: string;
  rightsStatus: ImageRightsStatus;
  provenanceStatus: ImageProvenanceStatus;
  validationStatus: ImageValidationStatus;
  license?: string;
  licenseUrl?: string;
  credit?: string;
  caption?: string;
  altText?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  format?: string;
  fileSize?: number;
  mimeType?: string;
  imageHash?: string;
  isIllustrative: boolean;
  promptVersion?: string;
  isPrimary: boolean;
  sortOrder: number;
  derivatives?: MediaDerivatives;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAuditEvent {
  id: string;
  mediaId?: string;
  storyId?: string;
  eventType: MediaAuditEventType;
  reason: string;
  source?: string;
  actor: string;
  oldMediaId?: string;
  newMediaId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface MediaProcessingJob {
  id: string;
  storyId?: string;
  mediaId?: string;
  jobType: MediaJobType;
  status: MediaJobStatus;
  attempts?: number;
  maxAttempts?: number;
  scheduledFor?: string;
  lastError?: string;
  payload?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MediaDecision {
  decision: MediaDecisionType;
  mediaId?: string;
  reason: MediaDecisionReason | string;
  sourceType?: ImageSourceType;
  rightsStatus?: ImageRightsStatus;
  asset?: MediaAsset;
  candidate?: ImageCandidate;
  policyVersion?: string;
  processorVersion?: string;
}

export interface MediaPolicyConfig {
  mediaEngineEnabled: boolean;
  aiImageGenerationEnabled: boolean;
  remoteImageDownloadEnabled: boolean;
  autoUseVerifiedImages: boolean;
  allowPublicDomain: boolean;
  allowLicensed: boolean;
  allowAIIllustrations: boolean;
  requireRightsForReuse: boolean;
  fallbackEnabled: boolean;
  maxImageJobsPerRun: number;
  maxAiGenerationsPerRun: number;
  maxAiGenerationsPerHour: number;
  heroMinWidth: number;
  heroMinHeight: number;
  thumbnailMinWidth: number;
  maxFileSizeBytes: number;
  downloadTimeoutMs: number;
  sensitiveNewsPolicy: 'fallback_or_conceptual' | 'strict_block';
  mediaPolicyVersion: string;
  mediaProcessorVersion: string;
}
