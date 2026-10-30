/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { NavTab } from './Navbar';
import { QuickActionsSection } from './QuickActionsSection';
import { fetchRecommendations } from '../services/api';
import {
  Compass,
  Trophy,
  Flame,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Brain,
  MessageSquareCode,
  BookOpen,
  RefreshCw,
  Info,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    activeProfile,
    currentRoadmap7,
    currentRoadmap30,
    interviews,
    activities,
    recommendations,
    setRecommendations,
    addToast,
    openCreateProfileModal,
    openEditProfileModal,
    toggleTask7,
    toggleTask30,
  } = useApp();

  const [isRefreshingRecs, setIsRefreshingRecs] = useState(false);

  // 1. Calculate Real Roadmap Statistics
  const stats7 = useMemo(() => {
    if (!currentRoadmap7 || !currentRoadmap7.days.length) {
      return { total: 0, completed: 0, percent: 0 };
    }
    const total = currentRoadmap7.days.length;
    const completed = currentRoadmap7.days.filter((d) => d.completed).length;
    return {
      total,
      completed,
      percent: Math.round((completed / total) * 100),
    };
  }, [currentRoadmap7]);

  const stats30 = useMemo(() => {
    if (!currentRoadmap30 || !currentRoadmap30.days.length) {
      return { total: 0, completed: 0, percent: 0 };
    }
    const total = currentRoadmap30.days.length;
    const completed = currentRoadmap30.days.filter((d) => d.completed).length;
    return {
      total,
      completed,
      percent: Math.round((completed / total) * 100),
    };
  }, [currentRoadmap30]);

  const overallProgress = useMemo(() => {
    const totalTasks = stats7.total + stats30.total;
    const totalDone = stats7.completed + stats30.completed;
    if (totalTasks === 0) return 0;
    return Math.round((totalDone / totalTasks) * 100);
  }, [stats7, stats30]);

  // 2. Real Streak & Study Time Calculations
  const { currentStreak, totalStudyMinutes } = useMemo(() => {
    let minutes = activities.reduce((sum, act) => sum + (act.durationMinutes || 0), 0);

    // Calculate daily streak from activity dates
    const activityDates = new Set(activities.map((a) => a.date));
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (activityDates.has(dateStr)) {
        streak++;
      } else if (i === 0) {
        // Today hasn't had an activity yet, check if yesterday did
        continue;
      } else {
        break;
      }
    }

    return { currentStreak: streak, totalStudyMinutes: minutes };
  }, [activities]);

  // 3. Interview Stats
  const interviewStats = useMemo(() => {
    const completed = interviews.filter((i) => i.status === 'completed' && i.summary);
    const scores = completed.map((i) => i.summary!.overallScore);
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
    const latest = completed[0] || null;
    return {
      totalCompleted: completed.length,
      averageScore: avgScore,
      latestScore: latest?.summary?.overallScore ?? null,
      history: completed.slice(0, 5),
    };
  }, [interviews]);

  // 4. Learning Velocity Calculations (Strictly based on recorded activities in last 7 days)
  const velocityData = useMemo(() => {
    const now = new Date();
    const daysArr: Array<{ date: string; dayLabel: string; count: number; minutes: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      // Match activities for activeProfile on this exact date
      const dayActivities = activities.filter((a) => a.date === dateStr);
      const count = dayActivities.filter((a) => a.type.includes('task')).length;
      const minutes = dayActivities.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);

      daysArr.push({
        date: dateStr,
        dayLabel,
        count,
        minutes,
      });
    }

    const tasksThisWeek = daysArr.reduce((sum, d) => sum + d.count, 0);
    const minutesThisWeek = daysArr.reduce((sum, d) => sum + d.minutes, 0);
    const avgTasksPerDay = parseFloat((tasksThisWeek / 7).toFixed(1));
    const avgMinutesPerDay = Math.round(minutesThisWeek / 7);

    // Prior 7 days for comparison
    let tasksPriorWeek = 0;
    for (let i = 13; i >= 7; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayActivities = activities.filter((a) => a.date === dateStr);
      tasksPriorWeek += dayActivities.filter((a) => a.type.includes('task')).length;
    }

    const weeklyVelocityDelta =
      tasksPriorWeek === 0 && tasksThisWeek > 0
        ? 100
        : tasksPriorWeek === 0
        ? 0
        : Math.round(((tasksThisWeek - tasksPriorWeek) / tasksPriorWeek) * 100);

    return {
      days: daysArr,
      tasksThisWeek,
      minutesThisWeek,
      avgTasksPerDay,
      avgMinutesPerDay,
      tasksPriorWeek,
      weeklyVelocityDelta,
      hasActivity: activities.length > 0,
    };
  }, [activities]);

  // 5. Skills Practiced
  const skillsPracticed = useMemo(() => {
    const practiced = new Set<string>();
    // From 7-day completed tasks
    currentRoadmap7?.days.forEach((d) => {
      if (d.completed) {
        d.conceptsToStudy?.forEach((c) => practiced.add(c));
      }
    });
    // From 30-day completed tasks
    currentRoadmap30?.days.forEach((d) => {
      if (d.completed) {
        d.conceptsToStudy?.forEach((c) => practiced.add(c));
      }
    });
    return Array.from(practiced).slice(0, 10);
  }, [currentRoadmap7, currentRoadmap30]);

  // 6. Next upcoming or incomplete tasks
  const upcomingTasks = useMemo(() => {
    const items: Array<{
      id: string;
      source: '7-day' | '30-day';
      day: number;
      title: string;
      time: number;
      completed: boolean;
    }> = [];

    if (currentRoadmap7) {
      const next7 = currentRoadmap7.days.find((d) => (d.status || (d.completed ? 'completed' : 'incomplete')) === 'incomplete');
      if (next7) {
        items.push({
          id: `7-${next7.day}`,
          source: '7-day',
          day: next7.day,
          title: next7.topic,
          time: next7.estimatedMinutes,
          completed: false,
        });
      }
    }

    if (currentRoadmap30) {
      const next30 = currentRoadmap30.days.find((d) => (d.status || (d.completed ? 'completed' : 'incomplete')) === 'incomplete');
      if (next30) {
        items.push({
          id: `30-${next30.day}`,
          source: '30-day',
          day: next30.day,
          title: next30.topic,
          time: next30.estimatedMinutes,
          completed: false,
        });
      }
    }

    return items;
  }, [currentRoadmap7, currentRoadmap30]);

  // Handle Refresh Recommendations via Gemini
  const handleRefreshRecommendations = async () => {
    if (!activeProfile) return;
    setIsRefreshingRecs(true);
    try {
      const skipped7 = currentRoadmap7?.days.filter((d) => d.status === 'skipped') || [];
      const skipped30 = currentRoadmap30?.days.filter((d) => d.status === 'skipped') || [];
      const completed7 = currentRoadmap7?.days.filter((d) => (d.status || (d.completed ? 'completed' : 'incomplete')) === 'completed') || [];
      const completed30 = currentRoadmap30?.days.filter((d) => (d.status || (d.completed ? 'completed' : 'incomplete')) === 'completed') || [];

      const rec = await fetchRecommendations(
        activeProfile,
        {
          completed7DayTasks: stats7.completed,
          skipped7DayTasks: skipped7.length,
          total7DayTasks: stats7.total,
          completed30DayTasks: stats30.completed,
          skipped30DayTasks: skipped30.length,
          total30DayTasks: stats30.total,
          completedTasks: [...completed7.map((d) => d.topic), ...completed30.map((d) => d.topic)],
          skippedTasks: [...skipped7.map((d) => d.topic), ...skipped30.map((d) => d.topic)],
          mockInterviewsCount: interviewStats.totalCompleted,
          avgInterviewScore: interviewStats.averageScore,
          currentStreak,
        },
        { forceRefresh: true }
      );
      setRecommendations(rec);
      addToast('success', 'Recommendations Updated', 'Gemini refreshed your personalized next steps.');
    } catch (err: any) {
      addToast('error', 'Recommendation Error', err.message || 'Failed to update recommendations');
    } finally {
      setIsRefreshingRecs(false);
    }
  };

  // If no profile exists, render welcome hero and Quick Actions accelerator
  if (!activeProfile) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="max-w-4xl mx-auto py-10 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome to PrepPilot AI
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Create your candidate profile to generate personalized placement roadmaps, AI skill-gap diagnostics, and dynamic mock interviews.
          </p>
          <button
            onClick={openCreateProfileModal}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Your First Profile
          </button>
        </div>

        {/* Quick Actions Accelerator */}
        <QuickActionsSection onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Candidate Profile Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 dark:from-[#111A2E] dark:via-[#17233B] dark:to-[#111A2E] text-white p-6 sm:p-8 shadow-md border border-indigo-600/30 dark:border-[#293653] transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                Candidate Profile
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950/60 dark:bg-slate-800/80 text-indigo-100 dark:text-slate-200 border border-indigo-400/30 dark:border-slate-700">
                Target: {activeProfile.targetRole}
              </span>
              <span className="text-xs capitalize px-2.5 py-1 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-semibold">
                Level: {activeProfile.experienceLevel}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {activeProfile.name}
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100/95 max-w-2xl leading-relaxed">
              Committed to <strong className="text-white font-bold">{activeProfile.dailyStudyHours} hours/day</strong> over a{' '}
              <strong className="text-white font-bold">{activeProfile.targetDurationWeeks}-week</strong> target placement timeline at{' '}
              <strong className="text-white font-bold capitalize">{activeProfile.preferredDifficulty}</strong> difficulty.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-indigo-200">
              <span className="font-semibold text-white">Known skills:</span>
              {activeProfile.currentSkills.map((s) => (
                <span key={s} className="text-white bg-white/15 border border-white/25 px-2.5 py-0.5 rounded-lg font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-2 shrink-0">
            <button
              onClick={() => openEditProfileModal(activeProfile)}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/30 shadow-xs transition-all cursor-pointer text-center"
            >
              Edit Profile Settings
            </button>
            <button
              onClick={() => onNavigate('mock-interview')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-900 dark:bg-[#818CF8] dark:hover:bg-indigo-400 dark:text-[#080D1B] text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <MessageSquareCode className="w-3.5 h-3.5 text-indigo-700 dark:text-[#080D1B]" /> Start Mock Interview
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Actions & Placement Accelerator Section */}
      <QuickActionsSection onNavigate={onNavigate} />

      {/* Real Statistics Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Progress */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Progress</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {overallProgress}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({stats7.completed + stats30.completed}/{stats7.total + stats30.total || 0} tasks)
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Learning Streak */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Learning Streak</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {currentStreak}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              consecutive {currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {currentStreak > 0 ? 'Active consistent habit!' : 'Complete a task today to start a streak.'}
          </p>
        </div>

        {/* Study Time */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Study Time Logged</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Recorded from completed sprint tasks & interviews.
          </p>
        </div>

        {/* Mock Interview Score */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mock Interviews</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <MessageSquareCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {interviewStats.averageScore !== null ? `${interviewStats.averageScore}%` : '—'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({interviewStats.totalCompleted} completed)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {interviewStats.latestScore !== null
              ? `Latest score: ${interviewStats.latestScore}%`
              : 'No mock rounds finished yet.'}
          </p>
        </div>
      </div>

      {/* Learning Velocity Section (Requirement 6) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Learning Velocity & Consistency
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strictly measured using real timestamps from your recorded roadmap completions and mock interviews.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              Last 7 Days Activity
            </span>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Analytics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!velocityData.hasActivity ? (
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Complete your first task to start tracking your learning velocity.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              As you mark daily roadmap milestones complete, real velocity graphs and pace analytics will calculate automatically.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('roadmap-7')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Go to 7-Day Sprint
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Daily Bar Chart: Tasks completed per day over the last 7 days */}
            <div>
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Daily Completed Tasks (Last 7 Days)
                </span>
                <span className="text-slate-500">
                  Total: {velocityData.tasksThisWeek} tasks ({velocityData.minutesThisWeek} mins logged)
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-32 pt-4 px-2 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                {velocityData.days.map((day) => {
                  const maxCount = Math.max(1, ...velocityData.days.map((d) => d.count));
                  const heightPercent = day.count === 0 ? 8 : Math.max(15, Math.round((day.count / maxCount) * 100));

                  return (
                    <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        {day.count} {day.count === 1 ? 'task' : 'tasks'}
                      </div>
                      <div className="w-full max-w-[42px] bg-slate-200 dark:bg-slate-800 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '70%' }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            day.count > 0
                              ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-700 dark:to-indigo-500'
                              : 'bg-slate-300 dark:bg-slate-700/50'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Velocity Calculations Summary & Explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-500">Weekly Task Velocity</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {velocityData.avgTasksPerDay} <span className="text-xs font-normal text-slate-500">tasks / day</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Formula: {velocityData.tasksThisWeek} tasks completed in the last 7 days ÷ 7.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-500">Daily Study Pace</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {velocityData.avgMinutesPerDay} <span className="text-xs font-normal text-slate-500">minutes / day</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Formula: Total recorded exercise minutes ÷ 7 days.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-500">Period-over-Period Delta</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-xl font-bold ${
                      velocityData.weeklyVelocityDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {velocityData.weeklyVelocityDelta >= 0 ? '+' : ''}
                    {velocityData.weeklyVelocityDelta}%
                  </span>
                  <span className="text-xs text-slate-500">vs prior 7 days</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {velocityData.tasksThisWeek} tasks this week vs {velocityData.tasksPriorWeek} in previous period.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Columns: Roadmaps Status & What Should I Learn Next? */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Active Roadmaps Overview & Upcoming Tasks */}
        <div className="space-y-6">
          {/* 7-Day Sprint Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  7-Day Sprint Roadmap
                </h3>
              </div>
              <button
                onClick={() => onNavigate('roadmap-7')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                View Full Sprint <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentRoadmap7 ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    {stats7.completed} of {stats7.total} Days Completed
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{stats7.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats7.percent}%` }}
                  />
                </div>

                {/* Day Dots */}
                <div className="grid grid-cols-7 gap-1 pt-2">
                  {currentRoadmap7.days.map((d) => (
                    <button
                      key={d.day}
                      onClick={() => toggleTask7(d.day)}
                      title={`Day ${d.day}: ${d.topic} (Click to toggle)`}
                      className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        d.completed
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {d.completed ? '✓' : `D${d.day}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No 7-day sprint plan generated yet for this profile.
                </p>
                <button
                  onClick={() => onNavigate('roadmap-7')}
                  className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                >
                  Generate 7-Day Sprint Plan
                </button>
              </div>
            )}
          </div>

          {/* 30-Day Master Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  30-Day Master Placement Curriculum
                </h3>
              </div>
              <button
                onClick={() => onNavigate('roadmap-30')}
                className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                View 4 Phases <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentRoadmap30 ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    {stats30.completed} of {stats30.total} Days Completed
                  </span>
                  <span className="font-bold text-amber-500">{stats30.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats30.percent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                  {currentRoadmap30.phases.map((ph) => {
                    const phaseDays = currentRoadmap30.days.filter((d) => d.phaseNumber === ph.phaseNumber);
                    const phaseDone = phaseDays.filter((d) => d.completed).length;
                    return (
                      <div key={ph.phaseNumber} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                        <span className="font-semibold block truncate">Phase {ph.phaseNumber}</span>
                        <span className="text-slate-400 block text-[10px]">{ph.dayRange}</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold block mt-1">
                          {phaseDone}/{phaseDays.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No 30-day comprehensive curriculum generated yet.
                </p>
                <button
                  onClick={() => onNavigate('roadmap-30')}
                  className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
                >
                  Generate 30-Day Master Plan
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Incomplete Tasks List */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-3">
              Upcoming Incomplete Tasks
            </h3>
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                All generated roadmap tasks are currently marked complete! Generate new plans or run a mock interview.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() =>
                          t.source === '7-day' ? toggleTask7(t.day) : toggleTask30(t.day)
                        }
                        className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 flex items-center justify-center hover:border-indigo-500 transition-colors cursor-pointer"
                      >
                        <span className="sr-only">Toggle task</span>
                      </button>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {t.source === '7-day' ? '7-Day Sprint' : '30-Day Master'} • Day {t.day}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {t.title}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">{t.time} mins</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: "What Should I Learn Next?" Personalized Recommendations (Requirement 7) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-[#818CF8]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  What Should I Learn Next?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  AI-driven prioritization using your actual progress and target role.
                </p>
              </div>
            </div>

            <button
              onClick={handleRefreshRecommendations}
              disabled={isRefreshingRecs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 dark:border-indigo-800/60 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh recommendations with Gemini"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRecs ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {recommendations ? (
            <div className="space-y-4 text-xs">
              {/* Top Priority Topic */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  High-Yield Focus Target
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {recommendations.nextValuableTopic}
                </h4>
                <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  {recommendations.overdueOrIncompleteAdvice}
                </p>
              </div>

              {/* Skills Requiring Practice */}
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Skills Requiring Additional Drill:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recommendations.skillsToPractice?.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Coding Exercises */}
              {recommendations.relevantCodingExercises && recommendations.relevantCodingExercises.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1.5">
                    Recommended High-Yield Exercises:
                  </span>
                  <div className="space-y-2">
                    {recommendations.relevantCodingExercises.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{ex.title}</span>
                          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60 font-semibold">
                            {ex.focus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {ex.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interview Topics to Revise */}
              {recommendations.interviewTopicsToRevise && recommendations.interviewTopicsToRevise.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 block mb-1">
                    Key Interview Topics to Revise:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-200">
                    {recommendations.interviewTopicsToRevise.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Plan Cadence Tip */}
              {recommendations.planAdjustments && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]">
                  <strong className="text-slate-900 dark:text-slate-100">Cadence Advice:</strong> {recommendations.planAdjustments}
                </div>
              )}

              {/* Adaptive Focus Notes */}
              {recommendations.adaptiveFocusNotes && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 text-[11px]">
                  <strong className="text-purple-950 dark:text-purple-100">Adaptive Milestone Notes:</strong> {recommendations.adaptiveFocusNotes}
                </div>
              )}

              {/* Skipped Task Remediation Bridges */}
              {recommendations.skippedTaskRemediations && recommendations.skippedTaskRemediations.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-[11px]">
                  <strong className="text-amber-950 dark:text-amber-100">Alternative Bridges for Skipped Milestones:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-800 dark:text-amber-200">
                    {recommendations.skippedTaskRemediations.map((rem, idx) => (
                      <li key={idx}>{rem}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <Brain className="w-10 h-10 text-indigo-600 dark:text-[#818CF8] mx-auto opacity-80" />
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
                Gemini hasn't generated recommendations for this profile yet. Click below to analyze your goals and retrieve tailored next steps.
              </p>
              <button
                onClick={handleRefreshRecommendations}
                disabled={isRefreshingRecs}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#818CF8] dark:hover:bg-indigo-400 dark:text-[#080D1B] text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isRefreshingRecs ? 'Analyzing with Gemini...' : 'Generate Recommendations'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
