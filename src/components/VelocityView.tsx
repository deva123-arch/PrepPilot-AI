/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  LineChart,
  TrendingUp,
  Clock,
  Calendar,
  CheckCircle2,
  Info,
  Plus,
  Flame,
  Award,
} from 'lucide-react';

export const VelocityView: React.FC = () => {
  const { activeProfile, activities, logStudyTime, addToast } = useApp();

  const [customMinutes, setCustomMinutes] = useState(45);
  const [customTopic, setCustomTopic] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);

  // Velocity Calculations
  const {
    daysArr,
    tasksThisWeek,
    minutesThisWeek,
    avgTasksPerDay,
    avgMinutesPerDay,
    tasksPriorWeek,
    weeklyVelocityDelta,
    hasActivity,
  } = useMemo(() => {
    const now = new Date();
    const days: Array<{ date: string; dayLabel: string; count: number; minutes: number; titles: string[] }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

      const dayActivities = activities.filter((a) => a.date === dateStr);
      const count = dayActivities.filter((a) => a.type.includes('task')).length;
      const minutes = dayActivities.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
      const titles = dayActivities.map((a) => a.title);

      days.push({
        date: dateStr,
        dayLabel,
        count,
        minutes,
        titles,
      });
    }

    const tasksThisWeek = days.reduce((sum, d) => sum + d.count, 0);
    const minutesThisWeek = days.reduce((sum, d) => sum + d.minutes, 0);
    const avgTasksPerDay = parseFloat((tasksThisWeek / 7).toFixed(1));
    const avgMinutesPerDay = Math.round(minutesThisWeek / 7);

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
      daysArr: days,
      tasksThisWeek,
      minutesThisWeek,
      avgTasksPerDay,
      avgMinutesPerDay,
      tasksPriorWeek,
      weeklyVelocityDelta,
      hasActivity: activities.length > 0,
    };
  }, [activities]);

  const handleLogManualTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) {
      addToast('info', 'Topic Required', 'Please enter what you studied.');
      return;
    }
    logStudyTime(customMinutes, customTopic.trim());
    setCustomTopic('');
    setShowLogModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Learning Velocity & Activity Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Objective metrics computed directly from <strong className="text-slate-800 dark:text-slate-200">{activeProfile?.name}'s</strong> recorded roadmap milestones, coding exercises, and self-study sessions.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log Study Session</span>
        </button>
      </div>

      {/* Manual Study Log Modal */}
      {showLogModal && (
        <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 animate-in fade-in space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              Log Self-Study or LeetCode / DSA Practice
            </h3>
            <button
              onClick={() => setShowLogModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleLogManualTime} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g. Solved 3 Graph BFS/DFS Problems or Read System Design Vol 1"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />

            <select
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))}
              className="px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              Record Activity
            </button>
          </form>
        </div>
      )}

      {/* Main Velocity Panel */}
      {!hasActivity ? (
        <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <Info className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Complete your first task to start tracking your learning velocity.
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your velocity metrics will automatically track tasks completed per day, weekly momentum, and study pace as soon as you record your first roadmap milestone.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block">7-Day Task Rate</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {avgTasksPerDay} <span className="text-xs font-normal text-slate-500">tasks / day</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <strong>Calculation:</strong> {tasksThisWeek} tasks completed in the past 7 days ÷ 7.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block">Weekly Completion Pace</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {minutesThisWeek} <span className="text-xs font-normal text-slate-500">total minutes</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <strong>Calculation:</strong> Sum of all logged coding exercises & interview sessions this week ({avgMinutesPerDay} mins/day average).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block">Period Comparison</span>
              <p className={`text-2xl font-black mt-1 ${weeklyVelocityDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {weeklyVelocityDelta >= 0 ? '+' : ''}{weeklyVelocityDelta}%
              </p>
              <p className="text-[10px] text-slate-500 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <strong>Calculation:</strong> {tasksThisWeek} tasks this week vs {tasksPriorWeek} tasks in previous 7-day period.
              </p>
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Tasks Completed Per Day (Last 7 Days)
            </h3>

            <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-6 px-2 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              {daysArr.map((d) => {
                const max = Math.max(1, ...daysArr.map((x) => x.count));
                const height = d.count === 0 ? 8 : Math.max(15, Math.round((d.count / max) * 100));

                return (
                  <div key={d.date} className="flex flex-col items-center h-full justify-end group">
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1.5 text-center">
                      <div>{d.count} tasks</div>
                      <div className="text-[9px] text-slate-400 font-normal">{d.minutes}m</div>
                    </div>
                    <div className="w-full max-w-[48px] bg-slate-200 dark:bg-slate-800 rounded-t-xl overflow-hidden flex flex-col justify-end" style={{ height: '70%' }}>
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          d.count > 0
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                            : 'bg-slate-300 dark:bg-slate-700/50'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-2 text-center">
                      {d.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Activity Log Records */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Activity History Ledger ({activities.length} entries)
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activities
                .slice()
                .reverse()
                .map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {act.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {act.date} • {act.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {act.durationMinutes} mins
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
