/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * SchedulerCapabilityService: Plan-Aware Scheduling & Platform Capability Detection
 */

import type { PlanCapability } from '../../types/automation';

export class SchedulerCapabilityService {
  /**
   * Detect deployment environment and evaluate scheduler capabilities.
   */
  public getCapabilities(options?: {
    requestedIntervalMinutes?: number;
    enforceTargetCadence?: boolean;
  }): PlanCapability {
    const requestedInterval = options?.requestedIntervalMinutes ?? 60;

    // Detect plan from environment or default to Vercel Hobby
    const envPlan = (process.env.VERCEL_PLAN || 'hobby').toLowerCase();
    const isProOrEnterprise = envPlan === 'pro' || envPlan === 'enterprise';

    const plan: PlanCapability['plan'] = isProOrEnterprise ? (envPlan as 'pro' | 'enterprise') : 'hobby';
    const supportsDaily = true;
    const supportsHourly = isProOrEnterprise;
    const supportsMinuteLevel = isProOrEnterprise;
    const minIntervalMinutes = isProOrEnterprise ? 1 : 1440; // 24 hours on Hobby

    const configuredCronSchedule = isProOrEnterprise ? '0 * * * *' : '0 6 * * *';
    const activeCadenceDescription = isProOrEnterprise
      ? 'Hourly cron active (every 1 hour)'
      : 'Daily cron supported on Vercel Hobby (0 6 * * * / once every 24 hours)';

    const targetCadenceDescription =
      'Target Cadence: Pipeline execution every 1 hour (60 min)';

    const canDeliverTargetCadence = isProOrEnterprise || requestedInterval >= minIntervalMinutes;

    let status: PlanCapability['status'] = 'SCHEDULE_AVAILABLE';
    let reason = 'Platform scheduling capabilities match or exceed requested cadence.';

    if (!canDeliverTargetCadence) {
      status = 'SCHEDULE_UNAVAILABLE';
      reason = `Current Vercel plan is "${plan.toUpperCase()}", which enforces a strict maximum cron execution frequency of once per day (1440 minutes). The target interval of ${requestedInterval} minutes cannot be natively registered in Vercel Cron without violating platform constraints.`;
    }

    const upgradeOrExternalAlternative =
      'To achieve target 1-hour cadence natively on Vercel, upgrade to Vercel Pro. Alternatively, trigger the secure POST /api/automation/orchestrator endpoint at any cadence using GitHub Actions, Supabase pg_cron, or an external webhook caller with CRON_SECRET.';

    return {
      plan,
      supportsDaily,
      supportsHourly,
      supportsMinuteLevel,
      minIntervalMinutes,
      configuredCronSchedule,
      activeCadenceDescription,
      targetCadenceDescription,
      canDeliverTargetCadence,
      status,
      reason,
      externalSchedulerSupported: true,
      upgradeOrExternalAlternative,
    };
  }
}
