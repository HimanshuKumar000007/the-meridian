/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * OperationsDashboard: Private, Read-Only Operator Telemetry Interface
 * Accessible at /internal/operations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Server,
  FileText,
  ExternalLink,
  Lock,
  Unlock,
  Layers,
  ArrowRight,
  TrendingUp,
  XCircle,
  Database,
  Eye,
  EyeOff,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  DashboardOverview,
  DashboardStoryItem,
  DashboardErrorItem,
  TimeRangeOption,
} from '../../types/operations';

interface OperationsDashboardProps {
  onNavigateHome: () => void;
}

export const OperationsDashboard: React.FC<OperationsDashboardProps> = ({ onNavigateHome }) => {
  // Authentication State
  const [operatorToken, setOperatorToken] = useState<string>(() => {
    try {
      return sessionStorage.getItem('meridian_operator_secret') || '';
    } catch {
      return '';
    }
  });
  const [inputToken, setInputToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Dashboard Data State
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('24h');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [stories, setStories] = useState<DashboardStoryItem[]>([]);
  const [errors, setErrors] = useState<DashboardErrorItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'stories' | 'errors'>('overview');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState<number>(60);

  // Authenticate operator credential
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/internal/operations?section=verify', {
        headers: {
          Authorization: `Bearer ${inputToken.trim()}`,
        },
      });

      if (!res.ok) {
        throw new Error('Authentication failed. Invalid operator credential.');
      }

      const data = await res.json();
      if (data.authorized) {
        sessionStorage.setItem('meridian_operator_secret', inputToken.trim());
        setOperatorToken(inputToken.trim());
        setInputToken('');
      } else {
        throw new Error('Unauthorized.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('meridian_operator_secret');
    } catch {}
    setOperatorToken('');
    setOverview(null);
    setStories([]);
    setErrors([]);
  };

  // Fetch telemetry from serverless API
  const fetchDashboardData = useCallback(async () => {
    if (!operatorToken) return;

    setIsLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${operatorToken}`,
      };

      // 1. Fetch Overview
      const overviewRes = await fetch(`/api/internal/operations?section=overview&timeRange=${timeRange}`, { headers });
      if (overviewRes.status === 401) {
        handleLogout();
        throw new Error('Session expired or credential revoked.');
      }
      if (overviewRes.ok) {
        const overviewJson = await overviewRes.json();
        setOverview(overviewJson.data);
      }

      // 2. Fetch Stories
      const storiesRes = await fetch('/api/internal/operations?section=stories&limit=50', { headers });
      if (storiesRes.ok) {
        const storiesJson = await storiesRes.json();
        setStories(storiesJson.data || []);
      }

      // 3. Fetch Errors
      const errorsRes = await fetch('/api/internal/operations?section=errors&limit=50', { headers });
      if (errorsRes.ok) {
        const errorsJson = await errorsRes.json();
        setErrors(errorsJson.data || []);
      }

      setLastRefreshedAt(new Date());
      setAutoRefreshCountdown(60);
    } catch (err: any) {
      console.error('[OperationsDashboard] Error fetching telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [operatorToken, timeRange]);

  // Initial load and time-range change trigger
  useEffect(() => {
    if (operatorToken) {
      fetchDashboardData();
    }
  }, [operatorToken, timeRange, fetchDashboardData]);

  // 60-second auto-refresh countdown
  useEffect(() => {
    if (!operatorToken) return;

    const interval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [operatorToken, fetchDashboardData]);

  // If not authenticated, render login prompt
  if (!operatorToken) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-950/60 border border-red-800/50 rounded-lg text-red-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">The Meridian Operations</h1>
              <p className="text-xs text-neutral-400">Private Operator Access Only</p>
            </div>
          </div>

          <p className="text-sm text-neutral-300 mb-6 leading-relaxed">
            This dashboard monitors live production systems, quality gates, and automated queues. Access is restricted to authorized operators.
          </p>

          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Operator Secret / Admin Key
              </label>
              <div className="relative">
                <input
                  type={showTokenInput ? 'text' : 'password'}
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Enter automation cron or operator secret..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showTokenInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating || !inputToken.trim()}
              className="w-full bg-neutral-100 hover:bg-white text-neutral-950 font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Access Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-neutral-800/80 flex justify-between items-center text-xs text-neutral-500">
            <span>Route: /internal/operations</span>
            <button onClick={onNavigateHome} className="hover:text-neutral-300 transition-colors">
              Return to Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderHealthBadge = (status?: string) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            HEALTHY
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            WARNING
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/60 text-red-400 border border-red-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            CRITICAL
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
            DISABLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-800 text-neutral-400">
            {status || 'UNKNOWN'}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-16">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold tracking-tight text-white font-serif">The Meridian</span>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-red-950 text-red-400 border border-red-800/60 rounded">
                Operations
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400 border-l border-neutral-800 pl-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live Observation</span>
              <span className="text-neutral-600">•</span>
              <span className="font-mono">/internal/operations</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Time range selector */}
            <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 text-xs">
              {(['1h', '24h', '7d', '30d'] as TimeRangeOption[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    timeRange === r ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchDashboardData()}
              disabled={isLoading}
              title="Refresh telemetry"
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-700/60 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Refreshing' : `${autoRefreshCountdown}s`}</span>
            </button>

            {/* Lock / Exit button */}
            <button
              onClick={handleLogout}
              title="Lock session"
              className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-lg border border-neutral-800 transition-colors"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-red-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            System Overview & Funnel
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`pb-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'stories'
                ? 'border-red-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Recent Stories</span>
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-neutral-800 text-neutral-300 font-mono">
              {stories.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`pb-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'errors'
                ? 'border-red-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Error Logs</span>
            {errors.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-950 text-red-400 border border-red-800 font-mono">
                {errors.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            {/* Automatic Publishing State Banner (STRICTLY READ-ONLY) */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-800/40 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-900/40 border border-emerald-700/50 rounded-lg text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                      Automatic Publishing State
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded font-semibold font-mono">
                      AUTOMATIC PUBLISHING: ON
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Live production website is actively accepting qualified, 700+ word articles. Quality gates and topic-routing fully enforced.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-400 border-t sm:border-t-0 sm:border-l border-neutral-800 pt-3 sm:pt-0 sm:pl-6 font-mono">
                <div>
                  <span className="text-neutral-500">Published Today:</span>{' '}
                  <strong className="text-white text-sm">{overview.publishing.publishedToday}</strong>
                </div>
                <div>
                  <span className="text-neutral-500">24 Hours:</span>{' '}
                  <strong className="text-white text-sm">{overview.publishing.publishedLast24Hours}</strong>
                </div>
              </div>
            </div>

            {/* System Health Cards Grid */}
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-neutral-400" />
                <span>System Component Health</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400 mb-1.5 font-medium">Website</div>
                  {renderHealthBadge(overview.health.websiteStatus)}
                </div>
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400 mb-1.5 font-medium">Scheduler</div>
                  {renderHealthBadge(overview.health.schedulerStatus)}
                </div>
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400 mb-1.5 font-medium">Extraction</div>
                  {renderHealthBadge(overview.health.extractionStatus)}
                </div>
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400 mb-1.5 font-medium">Validation</div>
                  {renderHealthBadge(overview.health.validationStatus)}
                </div>
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400 mb-1.5 font-medium">Lifecycle</div>
                  {renderHealthBadge(overview.health.lifecycleStatus)}
                </div>
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400 mb-1.5 font-medium">Media</div>
                  {renderHealthBadge(overview.health.mediaStatus)}
                </div>
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400 mb-1.5 font-medium">Publishing</div>
                  {renderHealthBadge(overview.health.publishingStatus)}
                </div>
              </div>
            </section>

            {/* Pipeline Funnel Section */}
            <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-red-400" />
                  <span>End-to-End Pipeline Funnel</span>
                </h2>
                <span className="text-xs text-neutral-500 font-mono">Range: {overview.timeRange.toUpperCase()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                {overview.funnel.map((step, idx) => (
                  <div
                    key={step.stage}
                    className="bg-neutral-950/80 border border-neutral-800/80 rounded-lg p-3.5 relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-neutral-400 font-medium mb-1">
                        <span>{step.label}</span>
                        <span className="font-mono text-neutral-500">#{idx + 1}</span>
                      </div>
                      <div className="text-xl font-bold font-mono text-white mb-2">{step.processed}</div>
                    </div>

                    <div className="pt-2 border-t border-neutral-900 space-y-1 text-xs">
                      <div className="flex justify-between text-emerald-400">
                        <span>Succeeded</span>
                        <span className="font-mono">{step.succeeded}</span>
                      </div>
                      <div className="flex justify-between text-red-400">
                        <span>Failed</span>
                        <span className="font-mono">{step.failed}</span>
                      </div>
                      <div className="flex justify-between text-neutral-500">
                        <span>Skipped/Held</span>
                        <span className="font-mono">{step.skipped}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* True Queue Depths Grid */}
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Database className="w-4 h-4 text-neutral-400" />
                <span>True Pending Queue Depths (Production Metric)</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400">Discovery Sources</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{overview.queues.discovery}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400">Extraction Items</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{overview.queues.extraction}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400">Validation Queue</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{overview.queues.validation}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400">Lifecycle Queue</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{overview.queues.lifecycle}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400">Media Queue</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{overview.queues.media}</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5">
                  <div className="text-xs text-neutral-400">Publishing Queue</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{overview.queues.publishing}</div>
                </div>
              </div>
            </section>

            {/* Quality & Performance Split Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Article Quality Metrics */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Article Quality & 700-Word Policy Integrity</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                    <div className="text-xs text-neutral-500">Avg Body Words</div>
                    <div className="text-lg font-bold font-mono text-white mt-0.5">
                      {overview.quality.averageBodyWordCount}
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                    <div className="text-xs text-neutral-500">Min Observed</div>
                    <div className="text-lg font-bold font-mono text-white mt-0.5">
                      {overview.quality.minBodyWordCount}
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                    <div className="text-xs text-neutral-500">Max Observed</div>
                    <div className="text-lg font-bold font-mono text-white mt-0.5">
                      {overview.quality.maxBodyWordCount}
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                    <div className="text-xs text-neutral-500">&lt; 700 Words Held</div>
                    <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                      {overview.quality.countBelow700Words}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-neutral-800">
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Validation Pass Rate</span>
                    <span className="font-mono font-semibold text-emerald-400">{overview.quality.validationPassRate}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Needs Review Routing Rate</span>
                    <span className="font-mono text-amber-400">{overview.quality.needsReviewRate}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Insufficient Source Evidence Filter</span>
                    <span className="font-mono text-neutral-300">{overview.quality.insufficientEvidenceCount}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Duplicate Prevention Events</span>
                    <span className="font-mono text-neutral-300">{overview.quality.duplicatePreventionEvents}</span>
                  </div>
                </div>
              </div>

              {/* Performance & Execution Timings */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Pipeline Performance & Timings</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                    <div className="text-xs text-neutral-500">Avg Orchestrator Run</div>
                    <div className="text-lg font-bold font-mono text-white mt-0.5">
                      {(overview.performance.averageAutomationRuntimeMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                    <div className="text-xs text-neutral-500">Avg Extraction</div>
                    <div className="text-lg font-bold font-mono text-white mt-0.5">
                      {(overview.performance.averageExtractionDurationMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                    <div className="text-xs text-neutral-500">Extraction Timeouts</div>
                    <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                      {overview.extraction.timeoutCount}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-neutral-800">
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Avg Validation Stage Duration</span>
                    <span className="font-mono text-neutral-300">
                      {(overview.performance.averageValidationDurationMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Avg Lifecycle Stage Duration</span>
                    <span className="font-mono text-neutral-300">
                      {(overview.performance.averageLifecycleDurationMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Avg Publishing Stage Duration</span>
                    <span className="font-mono text-neutral-300">
                      {(overview.performance.averagePublishingDurationMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Bounded Retries Count</span>
                    <span className="font-mono text-neutral-300">{overview.extraction.retryCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Research & Multi-Source Observation Section */}
            {overview.research && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Research Telemetry */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>Research Architecture (Observation Mode)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Research Pending</div>
                      <div className="text-lg font-bold font-mono text-white mt-0.5">
                        {overview.research.researchPending}
                      </div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Research Completed</div>
                      <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                        {overview.research.researchCompleted}
                      </div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Insufficient Evidence</div>
                      <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                        {overview.research.insufficientEvidence}
                      </div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Blocked Sources</div>
                      <div className="text-lg font-bold font-mono text-red-400 mt-0.5">
                        {overview.research.blockedSources}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs pt-2 border-t border-neutral-800">
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Research Failure Rate</span>
                      <span className="font-mono text-neutral-300">{overview.research.researchFailureRate}%</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Avg Research Duration</span>
                      <span className="font-mono text-neutral-300">
                        {(overview.research.averageResearchDurationMs / 1000).toFixed(2)}s
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Source Count per Event</span>
                      <span className="font-mono text-neutral-300">{overview.research.sourceCountPerEvent}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Multi-Source Events */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Multi-Source Events & Corroboration</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Events with 2+ Sources</div>
                      <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                        {overview.research.eventsWith2PlusSources}
                      </div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Official Source Backed</div>
                      <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                        {overview.research.eventsWithOfficialSource}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs pt-2 border-t border-neutral-800">
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Source Disagreement Count</span>
                      <span className="font-mono text-amber-400">{overview.research.sourceDisagreementCount}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Conflict Preservation Rule</span>
                      <span className="font-mono text-emerald-400">Active (Both Preserved)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Editorial Synthesis Mode</span>
                      <span className="font-mono text-neutral-300">British English</span>
                    </div>
                  </div>
                </div>

                {/* 3. NVIDIA AI Telemetry */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>NVIDIA AI Synthesis Telemetry</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Total Requests</div>
                      <div className="text-lg font-bold font-mono text-white mt-0.5">
                        {overview.research.nvidiaRequests}
                      </div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Successful Syntheses</div>
                      <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                        {overview.research.nvidiaSuccess}
                      </div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Timeouts</div>
                      <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                        {overview.research.nvidiaTimeout}
                      </div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                      <div className="text-xs text-neutral-500">Token Cost / Usage</div>
                      <div className="text-sm font-bold font-mono text-neutral-300 mt-1">
                        {overview.research.nvidiaCostOrTokenUsage || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs pt-2 border-t border-neutral-800">
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Avg Synthesis Duration</span>
                      <span className="font-mono text-neutral-300">
                        {(overview.research.nvidiaAverageDurationMs / 1000).toFixed(2)}s
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-400">Target Word Count</span>
                      <span className="font-mono text-neutral-300">&ge; 700 Words</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stories Tab: Read-Only Story Inspection Table */}
        {activeTab === 'stories' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Stories</h2>
                <p className="text-xs text-neutral-400">Deterministic body word counts calculated using production tokenizer.</p>
              </div>
              <span className="text-xs text-neutral-500 font-mono">Showing {stories.length} stories</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-[11px] border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Body Words</th>
                    <th className="py-3 px-4">Length Gate</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Published At</th>
                    <th className="py-3 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {stories.map((story) => (
                    <tr key={story.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-white max-w-xs truncate" title={story.title}>
                        {story.title}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px] uppercase">
                          {story.category.replace('cat-', '')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {story.bodyWordCount} words
                      </td>
                      <td className="py-3 px-4">
                        {story.isLengthValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            &ge; 700 Words
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            &lt; 700 Words (Held)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            story.status === 'published'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : story.status === 'held'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {story.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-400">v{story.publishedVersion}</td>
                      <td className="py-3 px-4 text-neutral-400 font-mono">
                        {story.publishedAt ? new Date(story.publishedAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`/story/${story.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 font-medium"
                        >
                          <span>Read</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                  {stories.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-neutral-500">
                        No stories loaded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Errors Tab: Scrubbed Error Log */}
        {activeTab === 'errors' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Error Logs</h2>
                <p className="text-xs text-neutral-400">All credentials, secrets, and authorization headers are scrubbed.</p>
              </div>
              <span className="text-xs text-neutral-500 font-mono">{errors.length} events</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-[11px] border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Error Code</th>
                    <th className="py-3 px-4">Run / Reference</th>
                    <th className="py-3 px-4">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {errors.map((err) => (
                    <tr key={err.id} className="hover:bg-neutral-800/30 transition-colors font-mono">
                      <td className="py-3 px-4 text-neutral-400 whitespace-nowrap">
                        {new Date(err.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] uppercase font-bold">
                          {err.stage}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-red-400 font-semibold">{err.errorCode}</td>
                      <td className="py-3 px-4 text-neutral-400 truncate max-w-xs" title={err.runId || err.referenceId || ''}>
                        {err.runId || err.referenceId || '—'}
                      </td>
                      <td className="py-3 px-4 text-neutral-300 font-sans text-xs max-w-md break-words">
                        {err.errorMessage}
                      </td>
                    </tr>
                  ))}
                  {errors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-500 font-sans">
                        Zero recent errors recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
