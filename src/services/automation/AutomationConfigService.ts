/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * AutomationConfigService: Configuration, Environment, Kill Switches, and Auth Verification
 */

import type { AutomationConfig, AutomationStage } from '../../types/automation';

export class AutomationConfigService {
  private parseBool(val: string | undefined, defaultVal = true): boolean {
    if (val === undefined || val === '') return defaultVal;
    const lower = val.trim().toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }

  private parseInt(val: string | undefined, defaultVal: number, min = 1, max = 50): number {
    if (!val) return defaultVal;
    const num = parseInt(val, 10);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(num, max));
  }

  public getConfig(): AutomationConfig {
    const globalEnabled = this.parseBool(process.env.AUTOMATION_ENABLED, true);
    const globalMaxBatch = this.parseInt(process.env.AUTOMATION_MAX_BATCH, 5);

    return {
      enabled: globalEnabled,
      cronSecret: process.env.CRON_SECRET || process.env.AUTOMATION_CRON_SECRET,
      lockTtlSeconds: this.parseInt(process.env.AUTOMATION_LOCK_TTL_SECONDS, 300, 30, 3600), // 5 min default
      stageEnabled: {
        discovery: globalEnabled && this.parseBool(process.env.AUTOMATION_DISCOVERY_ENABLED, true),
        extraction: globalEnabled && this.parseBool(process.env.AUTOMATION_EXTRACTION_ENABLED, true),
        validation: globalEnabled && this.parseBool(process.env.AUTOMATION_VALIDATION_ENABLED, true),
        lifecycle: globalEnabled && this.parseBool(process.env.AUTOMATION_LIFECYCLE_ENABLED, true),
        publishing: globalEnabled && this.parseBool(process.env.AUTOMATION_PUBLISHING_ENABLED, true),
      },
      maxBatch: {
        discovery: this.parseInt(process.env.DISCOVERY_MAX_BATCH, globalMaxBatch),
        extraction: this.parseInt(process.env.EXTRACTION_MAX_BATCH, 5),
        validation: this.parseInt(process.env.VALIDATION_MAX_BATCH, 10),
        lifecycle: this.parseInt(process.env.LIFECYCLE_MAX_BATCH, 10),
        publishing: this.parseInt(process.env.PUBLISHING_MAX_BATCH, 5),
      },
      targetIntervals: {
        discovery: this.parseInt(process.env.DISCOVERY_INTERVAL_MINUTES, 60, 5, 1440),
        extraction: this.parseInt(process.env.EXTRACTION_INTERVAL_MINUTES, 10, 1, 1440),
        validation: this.parseInt(process.env.VALIDATION_INTERVAL_MINUTES, 10, 1, 1440),
        lifecycle: this.parseInt(process.env.LIFECYCLE_INTERVAL_MINUTES, 10, 1, 1440),
        publishing: this.parseInt(process.env.PUBLISHING_INTERVAL_MINUTES, 10, 1, 1440),
      },
    };
  }

  /**
   * Validates server-to-server request authentication.
   * Returns true if authorized, false otherwise.
   */
  public verifyAuthHeader(authHeader?: string | null, customSecretHeader?: string | null): boolean {
    const expectedSecret =
      process.env.CRON_SECRET ||
      process.env.AUTOMATION_CRON_SECRET ||
      process.env.ADMIN_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!expectedSecret) {
      // In production, lack of secret rejects requests
      return false;
    }

    // Check custom secret header (e.g. x-cron-secret or x-admin-secret)
    if (customSecretHeader && customSecretHeader.trim() === expectedSecret.trim()) {
      return true;
    }

    // Check Authorization: Bearer <secret>
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token === expectedSecret.trim()) {
        return true;
      }
    }

    return false;
  }
}
