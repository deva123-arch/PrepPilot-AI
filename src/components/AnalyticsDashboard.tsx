/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  DateFilterOption,
  AreaFilterOption,
  RoadmapTaskCategory,
} from '../types';
import {
  computeAnalyticsDataset,
  STANDARD_AREAS,
} from '../utils/analyticsEngine';
import {
  TrendingUp,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  Flame,
  Plus,
  Filter,
  BarChart2,
  LineChart as LineChartIcon,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  onNavigate?: (tab: any) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onNavigate }) => {
  const {
    activeProfile,
    currentRoadmap7,
    currentRoadmap30,
    interviews,
    activities,
    currentAnalysis,
    analysisHistory,
    logStudyTime,
    addToast,
    toggleTask7,
    toggleTask30,
  } = useApp();

  // Filters State
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<AreaFilterOption>('all');

  // Study Log Modal State
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [customMinutes, setCustomMinutes] = useState<number>(45);

  // Active Tooltip for SVG line chart
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  // Compute Analytics Dataset via deterministic engine
  const dataset = useMemo(() => {
    return computeAnalyticsDataset({
      profile: activeProfile,
      roadmap7: currentRoadmap7,
      roadmap30: currentRoadmap30,
      interviews,
      activities,
      currentAnalysis,
      analysisHistory,
      dateFilter,
      customRange: { start: customStart, end: customEnd },
      areaFilter,
    });
  }, [
    activeProfile,
    currentRoadmap7,
    currentRoadmap30,
    interviews,
    activities,
    currentAnalysis,
    analysisHistory,
    dateFilter,
    customStart,
    customEnd,
    areaFilter,
  ]);

  const handleManualStudyLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) {
      addToast('info', 'Topic Required', 'Please enter a description of what you studied.');
      return;
    }
    logStudyTime(customMinutes, customTopic.trim());
    setCustomTopic('');
    setShowLogModal(false);
  };

  // Helper for rendering SVG Trend Chart
  const renderTrendChart = () => {
    const points = dataset.interviewScoreTrajectory;
    if (points.length < 2) return null;

    const width = 640;
    const height = 180;
    const paddingX = 40;
    const paddingY = 30;

    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const minScore = 0;
    const maxScore = 100;

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * chartWidth;
      const y = height - paddingY - ((p.score - minScore) / (maxScore - minScore)) * chartHeight;
      return { ...p, x, y };
    });

    const pathData = coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const areaData = `${pathData} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;

    const activePoint = coords.find((c) => c.id === hoveredPointId);

    return (
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 sm:h-52 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines for 25%, 50%, 75%, 100% */}
          {[25, 50, 75, 100].map((level) => {
            const y = height - paddingY - ((level - minScore) / (maxScore - minScore)) * chartHeight;
            return (
              <g key={level} className="text-slate-300 dark:text-slate-700/60">
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Baseline area fill */}
          <path d={areaData} fill="url(#scoreAreaGradient)" />

          {/* Connected line path */}
          <path
            d={pathData}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data point dots */}
          {coords.map((c) => {
            const isHovered = c.id === hoveredPointId;
            return (
              <g key={c.id}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 6 : 4}
                  className="fill-white dark:fill-slate-900 stroke-indigo-600 dark:stroke-indigo-400 transition-all cursor-pointer"
                  strokeWidth={isHovered ? 3 : 2}
                  onMouseEnter={() => setHoveredPointId(c.id)}
                  onClick={() => setHoveredPointId(c.id)}
                />
                {/* Date label at bottom */}
                <text
                  x={c.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono"
                >
                  {c.date.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip on hover */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none p-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs shadow-xl border border-slate-700 -translate-x-1/2 -translate-y-full mb-2 whitespace-nowrap"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
            }}
          >
            <div className="font-bold flex items-center gap-1.5">
              <span>Score: {activePoint.score}%</span>
              <span className="text-[10px] font-normal text-slate-300">({activePoint.category})</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {activePoint.date} • {activePoint.role}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Title, Candidate Name, and Study Log Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Student Progress Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Deterministic progress computed directly from{' '}
            <strong className="text-slate-800 dark:text-slate-200">{activeProfile?.name || 'Active Candidate'}</strong>'s
            recorded roadmap milestones, rubric-evaluated mock interviews, and logged study hours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Study Session</span>
          </button>
        </div>
      </div>

      {/* Manual Study Log Modal */}
      {showLogModal && (
        <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 animate-in fade-in space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              Record Self-Study or Coding Practice Time
            </h3>
            <button
              onClick={() => setShowLogModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleManualStudyLog} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g. Solved 3 Dynamic Programming problems on LeetCode"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />

            <select
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))}
              className="px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value={15}>15 mins</option>
              <option value={30}>30 mins</option>
              <option value={45}>45 mins</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shrink-0"
            >
              Record Activity
            </button>
          </form>
        </div>
      )}

      {/* Filter Toolbar: Date Range & Preparation Area */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Date Range:
            </span>
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: '7d', label: 'Past 7 Days' },
                { id: '30d', label: 'Past 30 Days' },
                { id: '90d', label: 'Past 90 Days' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  dateFilter === opt.id
                    ? 'bg-indigo-600 text-white dark:bg-[#818CF8] dark:text-[#080D1B] font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Preparation Area Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-500" /> Area:
            </span>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value as AreaFilterOption)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Preparation Areas</option>
              {STANDARD_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Pickers when 'custom' is active */}
        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap text-xs">
            <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span>Start:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span>End:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs"
              />
            </label>
            {(customStart || customEnd) && (
              <button
                onClick={() => {
                  setCustomStart('');
                  setCustomEnd('');
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear custom bounds
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4 Primary Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Roadmap Completion Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Roadmap Completion</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {dataset.completionRate}%
          </p>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-[#818CF8] h-full rounded-full transition-all duration-500"
              style={{ width: `${dataset.completionRate}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {dataset.completedTasks} completed • {dataset.pendingTasks} pending ({dataset.totalTasks} total)
          </p>
        </div>

        {/* Metric 2: Recorded Study Time */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Recorded Study Time</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {dataset.formattedStudyTime}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
            Across {dataset.activeStudyDaysCount} active study {dataset.activeStudyDaysCount === 1 ? 'day' : 'days'}
          </p>
        </div>

        {/* Metric 3: Mock Interview Performance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Interview Average</span>
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {dataset.averageInterviewScore !== null ? `${dataset.averageInterviewScore}%` : '—'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
            {dataset.totalInterviews > 0
              ? `${dataset.totalInterviews} sessions • Highest: ${dataset.highestInterviewScore}%`
              : 'No mock rounds finished yet'}
          </p>
        </div>

        {/* Metric 4: Consistency Streak */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Study Consistency</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-500">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {dataset.currentStreak} <span className="text-xs font-normal text-slate-500">days</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
            {dataset.currentStreak > 0 ? 'Consecutive streak active' : 'Complete today’s task to build momentum'}
          </p>
        </div>
      </div>

      {/* Two Progress Charts Section (with strict data sufficiency handling) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Mock Interview Score Progression Over Time */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <LineChartIcon className="w-4 h-4 text-indigo-500" />
                <span>Mock Interview Score Progression</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Rubric-evaluated score trajectory across completed rounds.
              </p>
            </div>
            {dataset.hasSufficientInterviewData && (
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                {dataset.interviewScoreTrajectory.length} sessions plotted
              </span>
            )}
          </div>

          {!dataset.hasSufficientInterviewData ? (
            <div className="py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Info className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Insufficient Historical Interview Data
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {dataset.interviewDataReason}
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('mock-interview')}
                  className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Start Mock Interview</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div>
              {renderTrendChart()}
              {dataset.rubricAverages && (
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 block">Accuracy</span>
                    <strong className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                      {dataset.rubricAverages.accuracy}%
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 block">Completeness</span>
                    <strong className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                      {dataset.rubricAverages.completeness}%
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 block">Clarity</span>
                    <strong className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                      {dataset.rubricAverages.clarity}%
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 block">Depth</span>
                    <strong className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                      {dataset.rubricAverages.depth}%
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart B: Daily Activity & Tasks Completed Momentum */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-500" />
                <span>Daily Activity & Milestones Completed</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tasks completed and study minutes recorded per calendar day.
              </p>
            </div>
          </div>

          {!dataset.hasSufficientActivityData ? (
            <div className="py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Info className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No Activity Recorded in this Timeframe
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {dataset.activityDataReason}
              </p>
              <button
                onClick={() => setShowLogModal(true)}
                className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <span>Record Study Session</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className="grid gap-2 items-end h-40 pt-4 px-2 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80"
                style={{ gridTemplateColumns: `repeat(${dataset.dailyActivitySeries.length}, minmax(0, 1fr))` }}
              >
                {dataset.dailyActivitySeries.map((d) => {
                  const maxTasks = Math.max(1, ...dataset.dailyActivitySeries.map((x) => x.tasksCompleted));
                  const height = d.tasksCompleted === 0 ? 8 : Math.max(18, Math.round((d.tasksCompleted / maxTasks) * 100));

                  return (
                    <div key={d.date} className="flex flex-col items-center h-full justify-end group">
                      <div className="text-[9px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1 text-center truncate">
                        {d.tasksCompleted}t • {d.studyMinutes}m
                      </div>
                      <div className="w-full max-w-[36px] bg-slate-200 dark:bg-slate-800 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '70%' }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            d.tasksCompleted > 0
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                              : 'bg-slate-300 dark:bg-slate-700/50'
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-2 text-center truncate w-full">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Total tasks in range: {dataset.completedTasks}</span>
                <span>Total study: {dataset.formattedStudyTime}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preparation Area Progress Breakdown */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Preparation Area Breakdown</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Task completion rate and recorded preparation time categorized by subject domain.
            </p>
          </div>
          {areaFilter !== 'all' && (
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Filtered to: {areaFilter}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {dataset.areaBreakdown.map((area) => (
            <div
              key={area.category}
              className={`p-4 rounded-2xl border transition-colors ${
                areaFilter === area.category
                  ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate pr-2">
                  {area.category}
                </span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                  {area.completionRate}%
                </span>
              </div>

              <div className="mt-2.5 w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${area.completionRate}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {area.completedTasks} of {area.totalTasks} tasks done
                </span>
                {area.studyMinutes > 0 && <span>{area.studyMinutes}m logged</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skill-Gap Improvements & Historical Comparison Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Skill-Gap Progression & Comparative Diagnostics
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tracks how your readiness rating evolvess across successive skill diagnostic runs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              AI Heuristic Estimate
            </span>
          </div>
        </div>

        {dataset.skillGapDelta === null ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-2">
            <p>No skill-gap diagnostics have been recorded for this profile yet.</p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('skill-analysis')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-semibold cursor-pointer"
              >
                Run Skill Gap Analysis
              </button>
            )}
          </div>
        ) : !dataset.skillGapDelta.hasComparison ? (
          <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-900 dark:text-purple-200">
                Baseline Diagnostic Captured ({dataset.skillGapDelta.currentAnalyzedAt.slice(0, 10)})
              </span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {dataset.skillGapDelta.currentScore}% ({dataset.skillGapDelta.currentRating})
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This represents your initial baseline diagnostic. As you complete roadmap modules and re-run the AI skill diagnostic in the Skill Analysis tab, this section will automatically display your score delta, resolved competencies, and readiness trajectory.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Readiness Delta</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-2xl font-black ${
                      dataset.skillGapDelta.scoreDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {dataset.skillGapDelta.scoreDelta >= 0 ? '+' : ''}
                    {dataset.skillGapDelta.scoreDelta}%
                  </span>
                  {dataset.skillGapDelta.scoreDelta >= 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-rose-500" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {dataset.skillGapDelta.previousScore}% → {dataset.skillGapDelta.currentScore}%
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Readiness Tier</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {dataset.skillGapDelta.currentRating}
                </p>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Shifted from {dataset.skillGapDelta.previousRating}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Skills Mastered</span>
                <p className="text-2xl font-black text-emerald-500 mt-1">
                  +{dataset.skillGapDelta.resolvedMissingSkills.length}
                </p>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Previously flagged gaps now closed
                </span>
              </div>
            </div>

            {dataset.skillGapDelta.resolvedMissingSkills.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block mb-1.5">
                  Gaps Closed Since Baseline:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dataset.skillGapDelta.resolvedMissingSkills.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[11px] font-medium"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weekly Progress Summary & Recommended Next Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress & Priorities */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Weekly Progress & Unfinished Priorities</span>
          </h2>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Tasks Done</span>
              <strong className="text-lg font-black text-slate-900 dark:text-white">
                {dataset.weeklySummary.tasksCompletedThisWeek}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Study Time</span>
              <strong className="text-lg font-black text-slate-900 dark:text-white">
                {Math.floor(dataset.weeklySummary.studyMinutesThisWeek / 60)}h{' '}
                {dataset.weeklySummary.studyMinutesThisWeek % 60}m
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Velocity Shift</span>
              <strong
                className={`text-lg font-black ${
                  dataset.weeklySummary.velocityDeltaPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {dataset.weeklySummary.velocityDeltaPercent >= 0 ? '+' : ''}
                {dataset.weeklySummary.velocityDeltaPercent}%
              </strong>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Unfinished Priority Milestones:
            </span>
            {dataset.weeklySummary.unfinishedPriorityTasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                All high-priority milestones are currently marked completed!
              </p>
            ) : (
              <div className="space-y-2">
                {dataset.weeklySummary.unfinishedPriorityTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block">
                        {t.source === '7-day' ? '7-Day Sprint' : '30-Day Master'} • Day {t.day}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {t.topic}
                      </span>
                    </div>
                    <button
                      onClick={() => (t.source === '7-day' ? toggleTask7(t.day) : toggleTask30(t.day))}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-[11px] font-semibold cursor-pointer shrink-0"
                    >
                      Mark Done
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recommended Next Actions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Recommended Next Actions</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated recommendations prioritized using your current completion rate and interview weaknesses.
          </p>

          <div className="space-y-2.5 pt-1">
            {dataset.weeklySummary.recommendedActions.map((action, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200"
              >
                <span className="w-5 h-5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="leading-relaxed flex-1">{action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transparency & Measurement Disclosure Banner */}
      <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Measurement Integrity & Analytics Disclosures</span>
        </div>
        <p className="leading-relaxed">
          <strong>Deterministic Record Guarantee:</strong> Study time and task completion rates are computed directly from verified roadmap checkmarks and user-logged study sessions. Idle browser tabs or uncompleted periods are never fabricated as phantom hours.
        </p>
        <p className="leading-relaxed text-[11px] text-slate-500">
          <strong>Estimates vs Practical Results:</strong> Mock interview scores represent rubric-based evaluations of your submitted answers. Skill-gap scores represent AI heuristic diagnostic estimates based on your stated resume competencies.
        </p>
      </div>
    </div>
  );
};
