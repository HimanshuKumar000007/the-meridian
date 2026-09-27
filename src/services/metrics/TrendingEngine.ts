/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story } from '../../data/mockNews';

export class TrendingEngine {
  /**
   * Deterministic time-decay trending formula:
   * Score = V / (T + 2)^1.5
   * where:
   * - V = max(viewCount, 1)
   * - T = hours since publication (minimum 0)
   *
   * A story published 20 minutes ago with 50 views can outrank
   * an older story published 48 hours ago with 500 views!
   */
  public static computeScore(
    viewCount: number,
    publishedAt: string | Date,
    referenceDate: Date = new Date()
  ): number {
    const pubTime = new Date(publishedAt).getTime();
    const refTime = referenceDate.getTime();
    const hoursSince = Math.max(0, (refTime - pubTime) / (1000 * 3600));

    const views = Math.max(viewCount, 1);
    const denominator = Math.pow(hoursSince + 2.0, 1.5);
    const score = views / denominator;

    return Math.round(score * 10000) / 10000;
  }

  /**
   * Compare two stories by trending score given their view counts and publication times
   */
  public static compareStories(
    storyA: { viewCount: number; publishedAt: string | Date },
    storyB: { viewCount: number; publishedAt: string | Date },
    referenceDate?: Date
  ): number {
    const scoreA = TrendingEngine.computeScore(storyA.viewCount, storyA.publishedAt, referenceDate);
    const scoreB = TrendingEngine.computeScore(storyB.viewCount, storyB.publishedAt, referenceDate);
    return scoreB - scoreA;
  }
}
