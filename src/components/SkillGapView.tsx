/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { fetchSkillAnalysis } from '../services/api';
import { SkillGapAnalysis } from '../types';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FolderGit2,
  Layers,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Compass,
  Clock,
  Filter,
  Code2,
  Hammer,
  BookOpen,
  Check,
  Tag,
  Briefcase,
  Copy,
  ChevronRight,
  User,
} from 'lucide-react';

const TARGET_ROLES_CATALOG = [
  'Software Development Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
];

export const SkillGapView: React.FC = () => {
  const {
    activeProfile,
    currentAnalysis,
    setAnalysis,
    editProfile,
    addToast,
    openCreateProfileModal,
    openEditProfileModal,
  } = useApp();

  // Selected target role to analyze against (defaults to activeProfile.targetRole)
  const [selectedRole, setSelectedRole] = useState<string>(
    () => activeProfile?.targetRole || TARGET_ROLES_CATALOG[0]
  );
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuota, setIsQuota] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  // Sync selectedRole if activeProfile changes and user hasn't actively switched
  React.useEffect(() => {
    if (activeProfile && !selectedRole) {
      setSelectedRole(activeProfile.targetRole);
    }
  }, [activeProfile]);

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

  if (!activeProfile) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <Brain className="w-12 h-12 text-slate-400 mx-auto mb-3" />
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

  // Check if active profile was modified after the analysis was run
  const isProfileStale = useMemo(() => {
    if (!currentAnalysis || !currentAnalysis.analyzedAt) return false;
    return new Date(activeProfile.updatedAt).getTime() > new Date(currentAnalysis.analyzedAt).getTime();
  }, [activeProfile, currentAnalysis]);

  // Analysis matching the currently selected role
  const isRoleMatchingCurrentAnalysis = currentAnalysis?.targetRole?.toLowerCase() === selectedRole.toLowerCase();

  const handleGenerate = async (forceRefresh = false) => {
    if (retryCountdown > 0) return;
    setLoading(true);
    setError(null);
    setIsQuota(false);

    try {
      const result: SkillGapAnalysis = await fetchSkillAnalysis(activeProfile, {
        forceRefresh: forceRefresh || isProfileStale || !isRoleMatchingCurrentAnalysis,
        targetRoleOverride: selectedRole,
      });

      setAnalysis(result);
      addToast(
        'success',
        'Skill-Gap Diagnosis Ready',
        `Analyzed readiness for ${selectedRole}: ${result.missingSkills.length} key gaps identified.`
      );
    } catch (err: any) {
      console.error('Skill Gap Analysis error:', err);
      const isQuotaErr = err?.isQuotaExhausted || err?.status === 429;
      setIsQuota(isQuotaErr);
      if (isQuotaErr) {
        const delay = typeof err.retryAfter === 'number' ? err.retryAfter : 60;
        setRetryCountdown(delay);
        setError(
          err.message ||
            'Gemini API free-tier request quota is currently exhausted. Please wait 60 seconds before retrying.'
        );
        addToast(
          'info',
          'Quota Cooldown',
          `Gemini free-tier quota exhausted. Retry available in ${delay}s.`
        );
      } else {
        setError(err.message || 'Failed to generate skill-gap analysis. Please check server logs.');
        addToast('error', 'Generation Error', err.message || 'Failed to connect to Gemini');
      }
    } finally {
      setLoading(false);
    }
  };

  // Sync selected role to student's active profile
  const handleSetAsProfileRole = () => {
    if (!activeProfile || activeProfile.targetRole === selectedRole) return;
    editProfile({
      ...activeProfile,
      targetRole: selectedRole,
      updatedAt: new Date().toISOString(),
    });
    addToast('success', 'Profile Updated', `Updated primary placement target role to "${selectedRole}".`);
  };

  // Copy practical exercise challenge to clipboard
  const handleCopyExercise = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    addToast('info', 'Copied to Clipboard', 'Practice exercise copied to clipboard.');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  // Filtered gaps list
  const filteredGaps = useMemo(() => {
    if (!currentAnalysis || !currentAnalysis.prioritySkills) return [];
    return currentAnalysis.prioritySkills.filter((gap) => {
      const matchesPriority = priorityFilter === 'all' || gap.priority === priorityFilter;
      const matchesCategory = selectedCategory === 'all' || (gap.category && gap.category.toLowerCase().includes(selectedCategory.toLowerCase()));
      return matchesPriority && matchesCategory;
    });
  }, [currentAnalysis, priorityFilter, selectedCategory]);

  // Unique categories in the current analysis
  const availableCategories = useMemo(() => {
    if (!currentAnalysis?.prioritySkills) return [];
    const set = new Set<string>();
    currentAnalysis.prioritySkills.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set);
  }, [currentAnalysis]);

  // High, medium, low counts
  const gapCounts = useMemo(() => {
    if (!currentAnalysis?.prioritySkills) return { high: 0, medium: 0, low: 0, total: 0 };
    const high = currentAnalysis.prioritySkills.filter((g) => g.priority === 'high').length;
    const medium = currentAnalysis.prioritySkills.filter((g) => g.priority === 'medium').length;
    const low = currentAnalysis.prioritySkills.filter((g) => g.priority === 'low').length;
    return { high, medium, low, total: currentAnalysis.prioritySkills.length };
  }, [currentAnalysis]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <Brain className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Career Skill-Gap Analyzer
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Evaluate <strong className="text-slate-800 dark:text-slate-200">{activeProfile.name}'s</strong> technical competencies against software engineering placement benchmarks, diagnose missing skills, and unlock actionable coding exercises.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleGenerate(true)}
            disabled={loading || retryCountdown > 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing with Gemini...</span>
              </>
            ) : retryCountdown > 0 ? (
              <>
                <Clock className="w-4 h-4" />
                <span>Retry in {retryCountdown}s</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{currentAnalysis ? 'Regenerate Analysis' : 'Run Skill-Gap Analysis'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Target Role Selector Bar (Requirement 1: Choose target role such as SDE, Frontend, Backend, Data Analyst) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-500" /> Target Role Placement Benchmark
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any career track to evaluate your existing skills against industry expectations for campus and internship drives.
            </p>
          </div>

          {activeProfile.targetRole !== selectedRole && (
            <button
              onClick={handleSetAsProfileRole}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
              title="Save selected role into your profile"
            >
              Set as Profile Target Role
            </button>
          )}
        </div>

        {/* Role Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {TARGET_ROLES_CATALOG.map((role) => {
            const isSelected = selectedRole.toLowerCase() === role.toLowerCase();
            const isProfileRole = activeProfile.targetRole.toLowerCase() === role.toLowerCase();
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <span>{role}</span>
                {isProfileRole && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    Current
                  </span>
                )}
              </button>
            );
          })}

          {/* Custom Role if profile has one not in standard catalog */}
          {!TARGET_ROLES_CATALOG.some((r) => r.toLowerCase() === activeProfile.targetRole.toLowerCase()) && (
            <button
              onClick={() => setSelectedRole(activeProfile.targetRole)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
                selectedRole.toLowerCase() === activeProfile.targetRole.toLowerCase()
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              <span>{activeProfile.targetRole}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                Custom
              </span>
            </button>
          )}
        </div>

        {/* Selected Role Status Note */}
        {!isRoleMatchingCurrentAnalysis && currentAnalysis && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200">
            <span>
              You switched to <strong>{selectedRole}</strong>. The report below currently displays results for <strong>{currentAnalysis.targetRole}</strong>.
            </span>
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading}
              className="ml-3 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shrink-0"
            >
              Analyze for {selectedRole}
            </button>
          </div>
        )}
      </div>

      {/* 3. Candidate Context Baseline Card (Requirement 2: Reuse skills, level, projects, preparation time) */}
      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Candidate Placement Profile Inputs
            </span>
          </div>
          <button
            onClick={() => openEditProfileModal(activeProfile)}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            Edit Profile Inputs
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-600 dark:text-slate-400">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Experience Level</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize text-xs">
              {activeProfile.experienceLevel}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Preparation Velocity</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              {activeProfile.dailyStudyHours} hrs/day • {activeProfile.targetDurationWeeks} weeks
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Known Skills</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              {activeProfile.currentSkills.length} skills recorded
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Completed Projects</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              {activeProfile.completedProjects?.length || 0} portfolio items
            </span>
          </div>
        </div>

        {activeProfile.completedProjects && activeProfile.completedProjects.length > 0 && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">Portfolio baseline:</span>
            {activeProfile.completedProjects.map((proj) => (
              <span
                key={proj}
                className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
              >
                {proj}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Out-of-sync notification when profile was updated after analysis */}
      {isProfileStale && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              Your candidate profile (skills or projects) was modified after this analysis was synthesized. Regenerate to update your gap diagnostics.
            </span>
          </div>
          <button
            onClick={() => handleGenerate(true)}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shrink-0 self-start sm:self-auto"
          >
            Regenerate Now
          </button>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
              {isQuota ? 'Gemini API Rate Limit Cooldown' : 'Failed to Complete AI Analysis'}
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => handleGenerate(false)}
            disabled={retryCountdown > 0}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            {retryCountdown > 0 ? `Wait ${retryCountdown}s` : 'Retry'}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-pulse">
          <Brain className="w-12 h-12 text-indigo-500 mx-auto animate-bounce" />
          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Analyzing Skills against {selectedRole}...
            </h3>
            <p className="text-xs text-slate-400">
              Benchmarking technical stack, identifying priority gaps, and generating practical coding exercises and portfolio suggestions.
            </p>
          </div>
        </div>
      )}

      {/* Analysis Results View */}
      {!loading && currentAnalysis && (
        <div className="space-y-6">
          {/* 4. Placement Readiness Heuristic & Requirement 9 Non-Objective Disclaimer */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-indigo-950/40 border border-indigo-800/40 shadow-lg text-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                  Placement Readiness Baseline
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-black text-white">
                    {currentAnalysis.interviewReadiness.score}%
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
                    {currentAnalysis.interviewReadiness.rating}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 max-w-xs sm:text-right">
                Synthesized for <strong className="text-slate-200">{currentAnalysis.targetRole}</strong> on{' '}
                {new Date(currentAnalysis.analyzedAt).toLocaleDateString()}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentAnalysis.interviewReadiness.explanation}
            </p>

            {/* Requirement 9: Avoid claiming that AI scores are objective or validated */}
            <div className="flex items-start gap-2 pt-3 border-t border-white/10 text-[11px] text-amber-300/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Heuristic Notice:</strong> {currentAnalysis.interviewReadiness.disclaimer}
              </span>
            </div>
          </div>

          {/* 5. Skill Gap Distribution Overview (Counts) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Validated Skills</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {currentAnalysis.knownSkills.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total Gaps</span>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {currentAnalysis.missingSkills.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] text-rose-500 block">High Priority</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {gapCounts.high}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] text-amber-500 block">Medium / Low Priority</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {gapCounts.medium + gapCounts.low}
              </span>
            </div>
          </div>

          {/* 6. Two-Column Matrix: Known Skills vs Missing Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Validated Known Skills */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Skills You Currently Have ({currentAnalysis.knownSkills.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Foundational proficiencies validated against {currentAnalysis.targetRole} role criteria:
              </p>
              <div className="flex flex-wrap gap-2">
                {currentAnalysis.knownSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium"
                  >
                    ✓ {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Identified Missing Skills */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
              <div className="flex items-center gap-2 text-rose-500">
                <XCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Important Skills Missing ({currentAnalysis.missingSkills.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                High-frequency placement competencies currently missing from profile:
              </p>
              <div className="flex flex-wrap gap-2">
                {currentAnalysis.missingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-medium"
                  >
                    ! {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 7. Actionable Priority Gaps Breakdown (Requirement 4 & 5: Priority level, why it matters, exercises & project ideas) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-500" /> Priority Gaps & Actionable Improvement Drills
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed breakdown with technical recruiter rationale, coding drills, and resume-ready project features.
                </p>
              </div>

              {/* Filter Tabs by Priority */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl text-xs shrink-0">
                <button
                  onClick={() => setPriorityFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    priorityFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All ({gapCounts.total})
                </button>
                <button
                  onClick={() => setPriorityFilter('high')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    priorityFilter === 'high'
                      ? 'bg-rose-500 text-white font-semibold'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  High ({gapCounts.high})
                </button>
                <button
                  onClick={() => setPriorityFilter('medium')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    priorityFilter === 'medium'
                      ? 'bg-amber-500 text-white font-semibold'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  Medium ({gapCounts.medium})
                </button>
                <button
                  onClick={() => setPriorityFilter('low')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    priorityFilter === 'low'
                      ? 'bg-slate-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Low ({gapCounts.low})
                </button>
              </div>
            </div>

            {/* Category Filter Pills if available */}
            {availableCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filter by Category:
                </span>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All Categories
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Gap Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGaps.map((ps, idx) => {
                const isHigh = ps.priority === 'high';
                const isMed = ps.priority === 'medium';
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isHigh
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                        : isMed
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                        : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {ps.skill}
                          </span>
                          {ps.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {ps.category}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            isHigh
                              ? 'bg-rose-100 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : isMed
                              ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {ps.priority} priority
                        </span>
                      </div>

                      {/* Recruiter Rationale */}
                      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-200 block text-[11px] mb-0.5">
                          Why It Matters in Interviews:
                        </strong>
                        {ps.reason}
                      </div>

                      {/* Practical Coding Exercise */}
                      {ps.practicalExercise && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Code2 className="w-3.5 h-3.5" /> Practical Exercise Challenge
                            </span>
                            <button
                              onClick={() => handleCopyExercise(ps.practicalExercise!, idx)}
                              className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                              title="Copy exercise prompt"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg">
                            {ps.practicalExercise}
                          </p>
                        </div>
                      )}

                      {/* Portfolio Project Idea */}
                      {ps.projectIdea && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px]">
                            <Hammer className="w-3.5 h-3.5 text-amber-500" /> Resume Project Idea:
                          </span>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                            {ps.projectIdea}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8. Recommended Technologies & Architectural Concepts */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" /> Recommended Technology Stack & Tooling
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentAnalysis.recommendedTechnologies.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800"
                >
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-2">
                    {cat.category}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item) => (
                      <span
                        key={item}
                        className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 9. Suggested Placement Portfolio Projects */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-500" /> Suggested Portfolio Capstones for Campus Placement
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentAnalysis.suggestedProjects.map((proj, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {proj.title}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        {proj.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      {proj.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {proj.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-indigo-600 dark:text-indigo-400">
                    <strong>Placement Impact:</strong> {proj.portfolioImpact}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 10. Personalized Actionable Next Steps */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Actionable Next Steps
            </h3>
            <div className="space-y-2">
              {currentAnalysis.personalizedNextSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800"
                >
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no analysis has been run yet */}
      {!loading && !currentAnalysis && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <Brain className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Career Skill Gap Analysis Generated Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Run Skill-Gap Analysis" above to let Gemini benchmark your current skills and past projects against {selectedRole}.
          </p>
        </div>
      )}
    </div>
  );
};
