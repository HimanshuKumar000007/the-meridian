/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * AutomationHealthService: Health State, Queue Metrics, Backlog Age, and Incident Detection
 */

import type { AutomationRepository } from '../../data/repositories/AutomationRepository';
import type {
  AutomationStage,
  AutomationHealthState,
  AutomationSchedule,
  AutomationRun,
} from '../../types/automation';
import { AutomationConfigService } from './AutomationConfigService';

export interface StageHealthReport {
  stage: AutomationStage;
  enabled: boolean;
  healthState: AutomationHealthState;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  queueDepth: number;
  oldestPendingAgeMinutes: number | null;
  targetIntervalMinutes: number;
}

export interface AutomationSystemHealth {
  overallState: AutomationHealthState;
  globalEnabled: boolean;
  activeLock: boolean;
  lockOwner?: string | null;
  lockExpiresAt?: string | null;
  queueDepths: Record<AutomationStage, number>;
  oldestPendingAges: Record<AutomationStage, number | null>;
  stageReports: StageHealthReport[];
  alerts: string[];
  recentRuns: AutomationRun[];
}

export class AutomationHealthService {
  private configService: AutomationConfigService;

  constructor(
    private repository: AutomationRepository,
    configService?: AutomationConfigService
  ) {
    this.configService = configService || new AutomationConfigService();
  }

  async getHealth(): Promise<AutomationSystemHealth> {
    const config = this.configService.getConfig();
    const schedules = await this.repository.getSchedules();
    const scheduleMap = new Map(schedules.map((s) => [s.stage, s]));
    const queueDepths = await this.repository.getQueueDepths();
    const oldestPendingAges = await this.repository.getOldestPendingAges();
    const recentRuns = await this.repository.getRecentRuns(5);
    const lock = await this.repository.getLock('master_orchestrator');

    const isLockActive = Boolean(lock && new Date(lock.expiresAt).getTime() > Date.now());
    const isLockStale = Boolean(lock && new Date(lock.expiresAt).getTime() <= Date.now());

    const stages: AutomationStage[] = [
      'discovery',
      'extraction',
      'validation',
      'lifecycle',
      'publishing',
    ];

    const alerts: string[] = [];
    const stageReports: StageHealthReport[] = [];

    if (!config.enabled) {
      alerts.push('GLOBAL_KILL_SWITCH_ACTIVE: Automation is currently disabled.');
    }

    if (isLockStale) {
      alerts.push(`STALE_LOCK_DETECTED: Lock held by ${lock?.ownerId} has expired and will be auto-recovered.`);
    }

    let overallState: AutomationHealthState = config.enabled ? 'healthy' : 'disabled';

    for (const stage of stages) {
      const schedule = scheduleMap.get(stage);
      const isEnabled = config.stageEnabled[stage];
      const failures = schedule?.consecutiveFailures || 0;
      const depth = queueDepths[stage] || 0;
      const ageMinutes = oldestPendingAges[stage] || null;
      const intervalMinutes = schedule?.targetIntervalMinutes || 60;

      let stageHealth: AutomationHealthState = 'healthy';

      if (!isEnabled) {
        stageHealth = 'disabled';
      } else if (failures >= 3) {
        stageHealth = 'failed';
        alerts.push(`STAGE_FAILURES: Stage '${stage}' has failed ${failures} consecutive times.`);
      } else if (failures > 0) {
        stageHealth = 'degraded';
      } else if (schedule?.lastSuccessAt) {
        const elapsedMinutes = Math.floor(
          (Date.now() - new Date(schedule.lastSuccessAt).getTime()) / (1000 * 60)
        );
        // Stale if no success within 3x target interval
        if (elapsedMinutes > intervalMinutes * 3) {
          stageHealth = 'stale';
          alerts.push(`STAGE_STALE: Stage '${stage}' has had no successful run in ${elapsedMinutes} minutes.`);
        }
      }

      if (depth > 200) {
        alerts.push(`HIGH_BACKLOG_WARNING: Stage '${stage}' queue depth is high (${depth} items).`);
      }

      stageReports.push({
        stage,
        enabled: isEnabled,
        healthState: stageHealth,
        lastRunAt: schedule?.lastRunAt || null,
        lastSuccessAt: schedule?.lastSuccessAt || null,
        lastFailureAt: schedule?.lastFailureAt || null,
        consecutiveFailures: failures,
        queueDepth: depth,
        oldestPendingAgeMinutes: ageMinutes,
        targetIntervalMinutes: intervalMinutes,
      });
    }

    // Determine overall state
    if (stageReports.some((s) => s.healthState === 'failed')) {
      overallState = 'failed';
    } else if (stageReports.some((s) => s.healthState === 'degraded' || s.healthState === 'stale')) {
      overallState = 'degraded';
    } else if (!config.enabled) {
      overallState = 'disabled';
    } else {
      overallState = 'healthy';
    }

    return {
      overallState,
      globalEnabled: config.enabled,
      activeLock: isLockActive,
      lockOwner: lock?.ownerId || null,
      lockExpiresAt: lock?.expiresAt || null,
      queueDepths,
      oldestPendingAges,
      stageReports,
      alerts,
      recentRuns,
    };
  }
}
