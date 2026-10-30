/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { fetchRoadmap7, fetchRecommendations } from '../services/api';
import { TaskStatus, RoadmapTaskCategory, TaskPriority } from '../types';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Code2,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  SkipForward,
  RotateCcw,
  Copy,
  Sliders,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  Compass,
} from 'lucide-react';

export const Roadmap7View: React.FC = () => {
  const {
    activeProfile,
    currentAnalysis,
    currentRoadmap7,
    activities,
    recommendations,
    setRoadmap7,
    setTask7Status,
    setDailyStudyHours,
    setRecommendations,
    addToast,
    openCreateProfileModal,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuota, setIsQuota] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [expandedHints, setExpandedHints] = useState<Record<number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'today' | 'overdue' | 'completed' | 'skipped'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedDay, setCopiedDay] = useState<number | null>(null);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [customHoursInput, setCustomHoursInput] = useState<number>(activeProfile?.dailyStudyHours || 2);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showAdaptiveDrawer, setShowAdaptiveDrawer] = useState(true);

  // Countdown timer for quota retry delay
  React.useEffect(() => {
    if (retryCountdown <= 0) return;
    const interval = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [retryCountdown]);

  // Keep custom hours input synced
  React.useEffect(() => {
    if (activeProfile?.dailyStudyHours) {
      setCustomHoursInput(activeProfile.dailyStudyHours);
    }
  }, [activeProfile?.dailyStudyHours]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  if (!activeProfile) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Active Profile</h3>
        <p className="text-xs text-slate-500 mt-1">Please create or select a candidate profile first.</p>
        <button
          onClick={openCreateProfileModal}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Create Profile
        </button>
      </div>
    );
  }

  const handleGenerate = async (forceRefresh = false) => {
    if (loading || retryCountdown > 0) return;
    setLoading(true);
    setError(null);
    setIsQuota(false);
    setShowRegenConfirm(false);
    try {
      const roadmap = await fetchRoadmap7(activeProfile, currentAnalysis, {
        forceRefresh,
        activities,
      });

      // Preserve previously recorded task statuses if user is regenerating
      if (currentRoadmap7 && currentRoadmap7.days) {
        const statusMap = new Map<number, { status: TaskStatus; completed: boolean; completedAt?: string }>();
        currentRoadmap7.days.forEach((d) => {
          const s: TaskStatus = d.status || (d.completed ? 'completed' : 'incomplete');
          statusMap.set(d.day, { status: s, completed: s === 'completed', completedAt: d.completedAt });
        });

        roadmap.days = roadmap.days.map((d) => {
          const existing = statusMap.get(d.day);
          if (existing) {
            return {
              ...d,
              status: existing.status,
              completed: existing.completed,
              completedAt: existing.completedAt,
            };
          }
          return d;
        });
      }

      setRoadmap7(roadmap);
      addToast('success', '7-Day Planner Generated', 'Actionable placement sprint ready!');
    } catch (err: any) {
      console.error(err);
      const isQuotaErr = err?.isQuotaExhausted || err?.status === 429;
      setIsQuota(isQuotaErr);
      if (isQuotaErr) {
        const delay = typeof err.retryAfter === 'number' ? err.retryAfter : 60;
        setRetryCountdown(delay);
        setError(
          err.message ||
            'Gemini API free-tier request quota is currently exhausted. Your existing roadmap and progress remain safely intact.'
        );
        addToast(
          'info',
          'Quota Cooldown',
          `Gemini free-tier quota exhausted. Retry available in ${delay}s. Existing data is saved.`
        );
      } else {
        setError(err.message || 'Failed to generate 7-day roadmap. Please check server logs.');
        addToast('error', 'Roadmap Error', err.message || 'Failed to connect to Gemini');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAdaptiveRecommendations = async () => {
    if (loadingRecs || !currentRoadmap7) return;
    setLoadingRecs(true);
    try {
      const completedTasks = currentRoadmap7.days.filter((d) => (d.status || (d.completed ? 'completed' : 'incomplete')) === 'completed').map((d) => d.topic);
      const skippedTasks = currentRoadmap7.days.filter((d) => d.status === 'skipped').map((d) => d.topic);
      const overdueTasks = currentRoadmap7.days.filter((d) => {
        const s = d.status || (d.completed ? 'completed' : 'incomplete');
        return s === 'incomplete' && d.targetDate && d.targetDate < todayStr;
      }).map((d) => d.topic);

      const stats = {
        completed7DayTasks: completedTasks.length,
        skipped7DayTasks: skippedTasks.length,
        overdue7DayTasks: overdueTasks.length,
        total7DayTasks: 7,
        completedTasks,
        skippedTasks,
        overdueTasks,
        mockInterviewsCount: activities.filter((a) => a.type === 'mock_interview').length,
      };

      const rec = await fetchRecommendations(activeProfile, stats, { forceRefresh: true });
      setRecommendations(rec);
      setShowAdaptiveDrawer(true);
      addToast('success', 'Adaptive Recommendations Ready', 'Planner advice updated based on completed and skipped tasks.');
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Recommendation Error', err?.message || 'Could not fetch adaptive recommendations.');
    } finally {
      setLoadingRecs(false);
    }
  };

  const toggleHint = (day: number) => {
    setExpandedHints((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const copyToClipboard = (text: string, day: number) => {
    navigator.clipboard.writeText(text);
    setCopiedDay(day);
    addToast('info', 'Copied to Clipboard', `Practical exercise instructions copied.`);
    setTimeout(() => setCopiedDay(null), 2000);
  };

  const handleSaveDailyHours = (hours: number) => {
    setDailyStudyHours(hours);
    setIsEditingHours(false);
  };

  // Metrics & Calculations (Deterministic)
  const items = currentRoadmap7?.days || [];
  const metrics = useMemo(() => {
    let completed = 0;
    let skipped = 0;
    let overdue = 0;
    let todayCount = 0;
    let pending = 0;

    items.forEach((item) => {
      const status: TaskStatus = item.status || (item.completed ? 'completed' : 'incomplete');
      if (status === 'completed') {
        completed++;
      } else if (status === 'skipped') {
        skipped++;
      } else {
        pending++;
        if (item.targetDate && item.targetDate < todayStr) {
          overdue++;
        }
      }

      if (item.targetDate === todayStr) {
        todayCount++;
      }
    });

    const total = items.length || 7;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, skipped, overdue, todayCount, pending, total, percent };
  }, [items, todayStr]);

  // Filtered task items
  const filteredDays = useMemo(() => {
    return items.filter((item) => {
      const status: TaskStatus = item.status || (item.completed ? 'completed' : 'incomplete');
      const isOverdue = status === 'incomplete' && item.targetDate && item.targetDate < todayStr;
      const isToday = item.targetDate === todayStr;

      // Status Filter
      if (statusFilter === 'completed' && status !== 'completed') return false;
      if (statusFilter === 'skipped' && status !== 'skipped') return false;
      if (statusFilter === 'pending' && status !== 'incomplete') return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;
      if (statusFilter === 'today' && !isToday) return false;

      // Category Filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      return true;
    });
  }, [items, statusFilter, categoryFilter, todayStr]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [items]);

  const getCategoryBadgeClass = (category?: string) => {
    const cat = category || '';
    if (cat.includes('Data Structures')) return 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60';
    if (cat.includes('Computer Science')) return 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
    if (cat.includes('Projects')) return 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
    if (cat.includes('Aptitude')) return 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
    if (cat.includes('Interview')) return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
    return 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60';
  };

  const getPriorityBadgeClass = (priority?: TaskPriority) => {
    if (priority === 'high') return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60';
    if (priority === 'low') return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700';
    return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Banner & Daily Availability Editor */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                7-Day Placement Preparation Planner
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                Sprint Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              High-intensity daily schedule for <strong className="text-slate-800 dark:text-slate-200">{activeProfile.name}</strong> targeting <strong className="text-indigo-600 dark:text-indigo-400">{activeProfile.targetRole}</strong>. Tasks automatically adapt based on your completion and skipped milestones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Inline Daily Study Hours Editor */}
            <div className="relative">
              {!isEditingHours ? (
                <button
                  onClick={() => setIsEditingHours(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Click to change your daily study availability"
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{activeProfile.dailyStudyHours || 2} hrs/day</span>
                  <Sliders className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-indigo-300 dark:border-indigo-700">
                  {[1, 2, 3, 4, 6].map((h) => (
                    <button
                      key={h}
                      onClick={() => handleSaveDailyHours(h)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeProfile.dailyStudyHours === h
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                  <button
                    onClick={() => setIsEditingHours(false)}
                    className="px-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Generate or Regenerate Button with Double-Click Guard */}
            {currentRoadmap7 ? (
              <button
                onClick={() => setShowRegenConfirm(true)}
                disabled={loading || retryCountdown > 0}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Synthesizing...' : 'Regenerate Sprint'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleGenerate(false)}
                disabled={loading || retryCountdown > 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Personalizing Planner...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate 7-Day Planner</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Regeneration Confirmation Banner */}
      {showRegenConfirm && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Regenerate 7-Day Placement Sprint?
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Gemini will craft an updated curriculum tailored to your skills. Completed and skipped task statuses will be automatically preserved.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowRegenConfirm(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleGenerate(true)}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
            >
              Confirm & Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Quota / Timeout Error Banner */}
      {error && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${
            isQuota
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
          }`}
        >
          <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isQuota ? 'text-amber-500' : 'text-rose-500'}`} />
          <div className="flex-1">
            <h4 className={`text-xs font-bold ${isQuota ? 'text-amber-900 dark:text-amber-200' : 'text-rose-900 dark:text-rose-200'}`}>
              {isQuota ? 'Gemini Quota Constraint (HTTP 429)' : 'Planner Synthesis Notice'}
            </h4>
            <p className={`text-xs mt-0.5 ${isQuota ? 'text-amber-800 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300'}`}>
              {error}
            </p>
          </div>
          <button
            onClick={() => handleGenerate(false)}
            disabled={retryCountdown > 0 || loading}
            className={`px-3 py-1 rounded-lg text-white text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isQuota ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {retryCountdown > 0 ? `Wait ${retryCountdown}s` : 'Retry'}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-pulse">
          <Calendar className="w-12 h-12 text-indigo-500 mx-auto animate-bounce" />
          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Personalizing 7-Day Sprint with Gemini...
            </h3>
            <p className="text-xs text-slate-400">
              Mapping daily topics, DSA coding challenges, system design modules, and placement interview practice.
            </p>
          </div>
        </div>
      )}

      {/* 2. Progress & Metrics Dashboard Card */}
      {!loading && currentRoadmap7 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Completion</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{metrics.percent}%</span>
              <span className="text-xs text-slate-500">{metrics.completed}/7 Days</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-indigo-600 dark:bg-[#818CF8] h-full rounded-full transition-all duration-500" style={{ width: `${metrics.percent}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Completed</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {metrics.completed}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Verified tasks</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Skipped</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {metrics.skipped}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Adapted in advice</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Overdue</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {metrics.overdue}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Past target date</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">Today's Focus</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {metrics.todayCount}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">{todayStr}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {metrics.pending}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Remaining items</span>
          </div>
        </div>
      )}

      {/* 3. Adaptive Recommendations Panel (Adapts based on completed & skipped tasks) */}
      {!loading && currentRoadmap7 && (
        <div className="rounded-3xl bg-linear-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/40 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/60 p-5 shadow-xs transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Adaptive Preparation Coach
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    Live Feedback
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Tailored insights analyzing your completed and skipped roadmap milestones without modifying your schedule.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleFetchAdaptiveRecommendations}
                disabled={loadingRecs}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRecs ? 'animate-spin' : ''}`} />
                <span>{loadingRecs ? 'Analyzing...' : 'Refresh Adaptive Advice'}</span>
              </button>
              <button
                onClick={() => setShowAdaptiveDrawer(!showAdaptiveDrawer)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {showAdaptiveDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showAdaptiveDrawer && recommendations && (
            <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/50 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                    🎯 Highest Leverage Focus Right Now:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {recommendations.nextValuableTopic}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">
                    ⚡ Velocity & Pacing Advice:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                    {recommendations.overdueOrIncompleteAdvice}
                  </p>
                </div>
              </div>

              {recommendations.adaptiveFocusNotes && (
                <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-purple-900 dark:text-purple-200">
                  <strong>Adaptive Milestone Notes:</strong> {recommendations.adaptiveFocusNotes}
                </div>
              )}

              {recommendations.skippedTaskRemediations && recommendations.skippedTaskRemediations.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200">
                  <strong>Alternative Bridges for Skipped Milestones:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {recommendations.skippedTaskRemediations.map((rem, idx) => (
                      <li key={idx}>{rem}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Filter & Category Selection Controls */}
      {!loading && currentRoadmap7 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setStatusFilter('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'today'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Today ({metrics.todayCount})
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'overdue'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Overdue ({metrics.overdue})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Pending ({metrics.pending})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Completed ({metrics.completed})
            </button>
            <button
              onClick={() => setStatusFilter('skipped')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'skipped'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Skipped ({metrics.skipped})
            </button>
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 5. 7 Actionable Task Cards */}
      {!loading && currentRoadmap7 && (
        <div className="space-y-4">
          {filteredDays.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">No tasks match the active status or category filter.</p>
              <button
                onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredDays.map((dayItem) => {
              const currentStatus: TaskStatus = dayItem.status || (dayItem.completed ? 'completed' : 'incomplete');
              const isDone = currentStatus === 'completed';
              const isSkipped = currentStatus === 'skipped';
              const isOverdue = !isDone && !isSkipped && dayItem.targetDate && dayItem.targetDate < todayStr;
              const isToday = dayItem.targetDate === todayStr;
              const isHintOpen = !!expandedHints[dayItem.day];

              return (
                <div
                  key={dayItem.day}
                  className={`p-6 rounded-3xl border transition-all duration-200 ${
                    isDone
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 shadow-xs'
                      : isSkipped
                      ? 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-300 dark:border-slate-800 opacity-80'
                      : isOverdue
                      ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 shadow-xs'
                      : isToday
                      ? 'bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800/80 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800/60 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left: Day info, topic, badges */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Day & Date Tag */}
                        <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                          Day {dayItem.day}
                        </span>

                        {dayItem.targetDate && (
                          <span className="text-xs text-slate-500 font-mono">
                            {dayItem.targetDate}
                          </span>
                        )}

                        {/* Special Alert Pills */}
                        {isToday && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                            Today's Milestone
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        )}

                        {/* Category Badge */}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${getCategoryBadgeClass(dayItem.category)}`}>
                          {dayItem.category || 'Programming'}
                        </span>

                        {/* Priority Badge */}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border capitalize ${getPriorityBadgeClass(dayItem.priority)}`}>
                          {dayItem.priority || 'medium'} priority
                        </span>

                        {/* Estimated Duration */}
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {dayItem.estimatedMinutes} mins
                        </span>
                      </div>

                      <h3 className={`text-base font-bold ${
                        isDone
                          ? 'text-emerald-900 dark:text-emerald-300 line-through'
                          : isSkipped
                          ? 'text-slate-500 dark:text-slate-400 italic'
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {dayItem.topic}
                      </h3>
                    </div>

                    {/* Right: Three-State Status Action Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isDone ? (
                        <>
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Completed
                          </span>
                          <button
                            onClick={() => setTask7Status(dayItem.day, 'incomplete')}
                            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Undo / Mark Incomplete"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : isSkipped ? (
                        <>
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-3 py-1.5 rounded-xl flex items-center gap-1">
                            <SkipForward className="w-3.5 h-3.5" /> Skipped
                          </span>
                          <button
                            onClick={() => setTask7Status(dayItem.day, 'incomplete')}
                            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Undo / Mark Incomplete"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTask7Status(dayItem.day, 'completed')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Complete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setTask7Status(dayItem.day, 'skipped')}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                            title="Skip this task; future recommendations will adapt"
                          >
                            <SkipForward className="w-3 h-3" /> Skip
                          </button>
                          <button
                            onClick={() => setTask7Status(dayItem.day, 'completed')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" /> Complete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body: Objectives, Concepts, Practical Coding Exercise */}
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    {/* Objectives & Concepts */}
                    <div className="space-y-3">
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          🎯 Learning Objectives:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                          {dayItem.learningObjectives.map((obj, i) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          💡 Core Concepts:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {dayItem.conceptsToStudy.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Practical Task Card */}
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                          <Code2 className="w-4 h-4" />
                          <span>Practical Task Challenge</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(dayItem.practicalCodingExercise.instructions, dayItem.day)}
                          className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedDay === dayItem.day ? 'Copied!' : 'Copy Task'}</span>
                        </button>
                      </div>

                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {dayItem.practicalCodingExercise.title}
                      </h4>

                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-mono text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        {dayItem.practicalCodingExercise.instructions}
                      </p>

                      {/* Starter Hint Toggle */}
                      {dayItem.practicalCodingExercise.starterHint && (
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleHint(dayItem.day)}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium hover:underline cursor-pointer"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            {isHintOpen ? 'Hide Implementation Hint' : 'View Implementation Hint'}
                            {isHintOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {isHintOpen && (
                            <div className="mt-1.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                              {dayItem.practicalCodingExercise.starterHint}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                        <strong>Expected Outcome:</strong> {dayItem.expectedOutcome}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Empty State */}
      {!loading && !currentRoadmap7 && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No 7-Day Sprint Planner Created Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click "Generate 7-Day Planner" to synthesize an actionable 1-week placement readiness plan calibrated to your daily available study time.
            </p>
          </div>
          <button
            onClick={() => handleGenerate(false)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            Generate 7-Day Sprint Plan
          </button>
        </div>
      )}
    </div>
  );
};
