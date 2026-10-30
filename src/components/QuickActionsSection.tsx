/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { NavTab } from './Navbar';
import { fetchSkillAnalysis, fetchRecommendations } from '../services/api';
import {
  Zap,
  UserCheck,
  UserPlus,
  Users,
  Calendar,
  Flame,
  Brain,
  MessageSquareCode,
  TrendingUp,
  Compass,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  X,
  Plus,
  ExternalLink,
  ChevronRight,
  Play,
  Layers,
  Award,
} from 'lucide-react';

interface QuickActionsSectionProps {
  onNavigate: (tab: NavTab) => void;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({ onNavigate }) => {
  const {
    profiles,
    activeProfile,
    switchProfile,
    currentRoadmap7,
    currentRoadmap30,
    currentAnalysis,
    setAnalysis,
    interviews,
    activities,
    recommendations,
    setRecommendations,
    addToast,
    openCreateProfileModal,
    openEditProfileModal,
  } = useApp();

  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [analyzingSkillGap, setAnalyzingSkillGap] = useState(false);
  const [refreshingRecs, setRefreshingRecs] = useState(false);

  // 1. Calculate Real Statistics
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

  const totalStudyMinutes = useMemo(() => {
    return activities.reduce((sum, act) => sum + (act.durationMinutes || 0), 0);
  }, [activities]);

  const currentStreak = useMemo(() => {
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
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [activities]);

  const interviewStats = useMemo(() => {
    const completed = interviews.filter((i) => i.status === 'completed' && i.summary);
    const scores = completed.map((i) => i.summary!.overallScore);
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const latest = completed[0] || null;
    return {
      totalCompleted: completed.length,
      averageScore: avgScore,
      latestScore: latest?.summary?.overallScore ?? null,
    };
  }, [interviews]);

  // Profile completeness check
  const isProfileComplete = useMemo(() => {
    if (!activeProfile) return false;
    return (
      Boolean(activeProfile.name?.trim()) &&
      Boolean(activeProfile.targetRole?.trim()) &&
      activeProfile.currentSkills?.length > 0 &&
      activeProfile.targetSkills?.length > 0 &&
      activeProfile.dailyStudyHours > 0
    );
  }, [activeProfile]);

  // 2. Intelligent Context-Aware Next Action Calculation
  const smartNextStep = useMemo(() => {
    // Stage 1: No Profile
    if (!activeProfile) {
      return {
        stageId: 'create-profile',
        badge: 'Step 1 • Initial Setup',
        badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400/30',
        title: 'Create Your Candidate Profile',
        description: 'Set your target role, current skills, and study hours to personalize placement roadmaps.',
        ctaText: 'Create Profile',
        icon: UserPlus,
        action: () => openCreateProfileModal(),
      };
    }

    // Stage 2: Incomplete Profile
    if (!isProfileComplete) {
      return {
        stageId: 'complete-profile',
        badge: 'Profile Incomplete • Action Required',
        badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30',
        title: 'Complete Placement Profile Information',
        description: 'Specify your target role and skills so Gemini can diagnose your gaps and construct plans.',
        ctaText: 'Complete Profile',
        icon: AlertCircle,
        action: () => openEditProfileModal(activeProfile),
      };
    }

    // Stage 3: Skill Gap Analysis Missing
    if (!currentAnalysis) {
      return {
        stageId: 'skill-analysis',
        badge: 'Step 2 • Diagnostic Assessment',
        badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/30',
        title: 'Run AI Skill-Gap Analysis',
        description: `Diagnose missing technical skills and evaluate interview readiness for ${activeProfile.targetRole}.`,
        ctaText: 'Analyze Skill Gaps',
        icon: Brain,
        action: () => onNavigate('skill-analysis'),
      };
    }

    // Stage 4: No Roadmaps Generated
    if (!currentRoadmap7 && !currentRoadmap30) {
      return {
        stageId: 'generate-roadmap',
        badge: 'Step 3 • Curriculum Generation',
        badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/30',
        title: 'Generate Placement Learning Roadmap',
        description: 'Choose between an intensive 7-Day Sprint or a 4-phase 30-Day Master Placement Curriculum.',
        ctaText: 'Choose & Generate Roadmap',
        icon: Calendar,
        action: () => setShowRoadmapModal(true),
      };
    }

    // Stage 5: Active 7-Day Roadmap with pending tasks
    if (currentRoadmap7) {
      const nextDay = currentRoadmap7.days.find((d) => !d.completed);
      if (nextDay) {
        return {
          stageId: 'continue-sprint',
          badge: `7-Day Sprint • Day ${nextDay.day} Pending`,
          badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30',
          title: `Next Up: Day ${nextDay.day} - ${nextDay.topic}`,
          description: `Estimated ${nextDay.estimatedMinutes} mins • Complete today's coding exercise to extend your ${currentStreak}-day streak.`,
          ctaText: `Open Day ${nextDay.day} Sprint`,
          icon: Calendar,
          action: () => onNavigate('roadmap-7'),
        };
      }
    }

    // Stage 6: Active 30-Day Roadmap with pending tasks
    if (currentRoadmap30) {
      const nextDay = currentRoadmap30.days.find((d) => !d.completed);
      if (nextDay) {
        return {
          stageId: 'continue-master',
          badge: `30-Day Master • Phase ${nextDay.phaseNumber} • Day ${nextDay.day}`,
          badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30',
          title: `Next Up: Day ${nextDay.day} - ${nextDay.topic}`,
          description: `Estimated ${nextDay.estimatedMinutes} mins • Master milestone concepts to complete Phase ${nextDay.phaseNumber}.`,
          ctaText: `Open Day ${nextDay.day} Master`,
          icon: Flame,
          action: () => onNavigate('roadmap-30'),
        };
      }
    }

    // Stage 7: Roadmaps complete, mock interviews pending
    if (interviewStats.totalCompleted === 0) {
      return {
        stageId: 'mock-interview',
        badge: 'Step 4 • Technical Simulation',
        badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400/30',
        title: 'Start Technical Mock Interview',
        description: `Put your preparation to the test with 10 role-specific interview questions for ${activeProfile.targetRole}.`,
        ctaText: 'Start Mock Interview',
        icon: MessageSquareCode,
        action: () => onNavigate('mock-interview'),
      };
    }

    // Stage 8: Ongoing Interview & Mastery
    return {
      stageId: 'review-velocity',
      badge: 'Step 5 • Continuous Mastery',
      badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30',
      title: 'Review Interview Debrief & Track Velocity',
      description: `Your average interview score is ${interviewStats.averageScore}%. Review weakness points or launch another round.`,
      ctaText: 'Launch Another Round',
      icon: MessageSquareCode,
      action: () => onNavigate('mock-interview'),
    };
  }, [
    activeProfile,
    isProfileComplete,
    currentAnalysis,
    currentRoadmap7,
    currentRoadmap30,
    interviewStats,
    currentStreak,
    onNavigate,
    openCreateProfileModal,
    openEditProfileModal,
  ]);

  // Handler for quick skill analysis right from action card
  const handleQuickAnalyze = async () => {
    if (!activeProfile) {
      openCreateProfileModal();
      return;
    }
    if (!isProfileComplete) {
      addToast(
        'info',
        'Profile Incomplete',
        'Please enter your target role and at least one skill first.'
      );
      openEditProfileModal(activeProfile);
      return;
    }

    if (currentAnalysis) {
      onNavigate('skill-analysis');
      return;
    }

    setAnalyzingSkillGap(true);
    try {
      const result = await fetchSkillAnalysis(activeProfile);
      setAnalysis(result);
      addToast(
        'success',
        'Skill-Gap Diagnosis Ready',
        `Diagnosed ${result.missingSkills.length} missing competencies with ${result.interviewReadiness.score}% readiness score.`
      );
      onNavigate('skill-analysis');
    } catch (err: any) {
      addToast('error', 'Analysis Error', err.message || 'Failed to analyze skill gaps');
      onNavigate('skill-analysis');
    } finally {
      setAnalyzingSkillGap(false);
    }
  };

  // Handler for quick recommendations refresh
  const handleQuickRefreshRecs = async () => {
    if (!activeProfile) {
      openCreateProfileModal();
      return;
    }
    setRefreshingRecs(true);
    try {
      const rec = await fetchRecommendations(activeProfile, {
        completed7DayTasks: stats7.completed,
        total7DayTasks: stats7.total,
        completed30DayTasks: stats30.completed,
        total30DayTasks: stats30.total,
        mockInterviewsCount: interviewStats.totalCompleted,
        avgInterviewScore: interviewStats.averageScore,
        currentStreak,
      });
      setRecommendations(rec);
      addToast('success', 'Recommendations Refreshed', 'Gemini updated your highest-yield focus targets.');
    } catch (err: any) {
      addToast('error', 'Recommendation Error', err.message || 'Failed to refresh recommendations');
    } finally {
      setRefreshingRecs(false);
    }
  };

  const SmartNextIcon = smartNextStep.icon;

  return (
    <section className="space-y-4" aria-label="Quick Actions & Placement Accelerator">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Quick Actions & Accelerator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Context-aware one-click tools to streamline your placement journey
            </p>
          </div>
        </div>

        {activeProfile && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Active Profile:</span>
            <span className="font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
              {activeProfile.name} ({activeProfile.targetRole})
            </span>
          </div>
        )}
      </div>

      {/* Context-Aware Smart Next Action Banner */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 dark:from-[#111A2E] dark:via-[#17233B] dark:to-[#111A2E] text-white shadow-md border border-indigo-600/30 dark:border-[#293653] transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                {smartNextStep.badge}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-indigo-200 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> AI Guided Progression
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <SmartNextIcon className="w-5 h-5 text-indigo-300 shrink-0" />
              <span>{smartNextStep.title}</span>
            </h3>

            <p className="text-xs sm:text-sm text-indigo-100/95 max-w-2xl leading-relaxed">
              {smartNextStep.description}
            </p>
          </div>

          <button
            onClick={smartNextStep.action}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-indigo-50 text-indigo-950 dark:bg-[#818CF8] dark:hover:bg-indigo-300 dark:text-[#080D1B] text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0 group focus:outline-hidden focus:ring-2 focus:ring-white"
          >
            <span>{smartNextStep.ctaText}</span>
            <ArrowRight className="w-4 h-4 text-indigo-700 dark:text-[#080D1B] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Ambient subtle glow */}
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 6 Quick Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Action 1: Create / Manage Profile */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                {activeProfile ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Action 1
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{activeProfile ? 'Student Profile' : 'Set Up Profile'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {activeProfile
                ? `Update skills, target role, and study hours for ${activeProfile.name}.`
                : 'Set up your student profile to personalize roadmaps and interview questions.'}
            </p>

            {/* Profile Status Badge */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 text-xs">
              {activeProfile ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-200 truncate">
                      {activeProfile.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                      Primary Profile
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>{activeProfile.targetRole}</span>
                    <span>{activeProfile.dailyStudyHours} hrs/day</span>
                  </div>
                </div>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> No active profile created yet
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
            {activeProfile ? (
              <>
                <button
                  onClick={() => openEditProfileModal(activeProfile)}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer text-center"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => onNavigate('profiles')}
                  className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  title="View complete student profile and learning track"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={openCreateProfileModal}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Set Up Profile
              </button>
            )}
          </div>
        </div>

        {/* Action 2: Generate Learning Roadmap */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Action 2
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Generate Learning Roadmap
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Create a personalized 7-Day Sprint bootcamp or a 30-Day Master 4-Phase curriculum.
            </p>

            {/* Status of Roadmaps */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-500" /> 7-Day Sprint:
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {currentRoadmap7 ? `${stats7.completed}/${stats7.total} Days (${stats7.percent}%)` : 'Not Generated'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" /> 30-Day Master:
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {currentRoadmap30 ? `${stats30.completed}/${stats30.total} Days (${stats30.percent}%)` : 'Not Generated'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
            <button
              onClick={() => onNavigate('roadmap-7')}
              className="flex-1 py-2 px-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              7-Day Sprint
            </button>
            <button
              onClick={() => onNavigate('roadmap-30')}
              className="flex-1 py-2 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              30-Day Master
            </button>
            <button
              onClick={() => setShowRoadmapModal(true)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Compare roadmap options"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action 3: Analyze Skill Gaps */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Action 3
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Analyze Skill Gaps
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Identify missing competencies, portfolio projects, and readiness heuristics.
            </p>

            {/* Diagnostic Status Badge */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 text-xs">
              {currentAnalysis ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Readiness Score</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {currentAnalysis.interviewReadiness.score}% ({currentAnalysis.interviewReadiness.rating})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {currentAnalysis.missingSkills.length} missing skills flagged
                  </div>
                </div>
              ) : (
                <span className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Initial diagnostic not run yet
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
            <button
              onClick={handleQuickAnalyze}
              disabled={analyzingSkillGap}
              className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {analyzingSkillGap ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : currentAnalysis ? (
                <>
                  <span>View Diagnostic</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Skill Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action 4: Start Mock Interview */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-sky-300 dark:hover:border-sky-800 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <MessageSquareCode className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Action 4
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Start Mock Interview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Practice 10 technical questions graded against a 4-part AI evaluation rubric.
            </p>

            {/* Mock Interview Status Badge */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 text-xs">
              {interviewStats.totalCompleted > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {interviewStats.totalCompleted} sessions completed
                  </span>
                  <span className="font-bold text-sky-600 dark:text-sky-400 text-xs">
                    Avg: {interviewStats.averageScore}%
                  </span>
                </div>
              ) : (
                <span className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Play className="w-3.5 h-3.5 text-sky-500" /> 10 role questions ready to test
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => onNavigate('mock-interview')}
              className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Launch Mock Interview</span>
            </button>
          </div>
        </div>

        {/* Action 5: Track Progress & Velocity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Action 5
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Track Progress & Velocity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Real-time velocity tracking, task milestones, and 7-day study consistency.
            </p>

            {/* Metrics Badge */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400">Roadmap Progress:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {overallProgress}% ({stats7.completed + stats30.completed} tasks done)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400">Streak & Time:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentStreak} days • {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => onNavigate('analytics')}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Open Progress Analytics</span>
            </button>
          </div>
        </div>

        {/* Action 6: Recommended Next Steps */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Action 6
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Recommended Next Steps
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              AI-prioritized learning directives based on your bottlenecked tasks.
            </p>

            {/* Current Top Focus Directive */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 text-xs">
              {recommendations ? (
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Highest Yield Focus
                  </span>
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                    {recommendations.nextValuableTopic}
                  </p>
                </div>
              ) : (
                <span className="text-slate-500 text-[11px]">
                  Analyze progress to generate personalized next action directives
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
            <button
              onClick={smartNextStep.action}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer text-center truncate"
            >
              {smartNextStep.ctaText}
            </button>
            <button
              onClick={handleQuickRefreshRecs}
              disabled={refreshingRecs}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh AI Recommendations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingRecs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Roadmap Choice Modal */}
      {showRoadmapModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="roadmap-modal-title"
        >
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="roadmap-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                    Choose Your Placement Roadmap
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeProfile
                      ? `Personalized for ${activeProfile.name} • ${activeProfile.targetRole}`
                      : 'Select curriculum format to begin'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRoadmapModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Check Warning if incomplete */}
            {activeProfile && !isProfileComplete && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-bold">Profile Details Incomplete</p>
                  <p className="mt-0.5">
                    Adding your known and target skills ensures Gemini produces a relevant curriculum tailored to your background.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRoadmapModal(false);
                    openEditProfileModal(activeProfile);
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>
            )}

            {/* Side by side comparison cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: 7-Day Sprint */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/40 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      Rapid Bootcamp
                    </span>
                    <span className="text-xs font-semibold text-slate-500">7 Days</span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    7-Day Intensive Sprint
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    High-yield placement bootcamp. Includes daily learning goals, hands-on coding challenges, starter hints, and concrete outcomes.
                  </p>

                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pt-1">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Best for drives happening in 1–2 weeks</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Single daily coding challenge & starter hints</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Preserves completed task checkmarks</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setShowRoadmapModal(false);
                    onNavigate('roadmap-7');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Open 7-Day Sprint Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Option B: 30-Day Master Curriculum */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50 dark:bg-slate-950/40 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      Master Placement
                    </span>
                    <span className="text-xs font-semibold text-slate-500">4 Phases</span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    30-Day Master Curriculum
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Full-scope preparation covering Foundation, Intermediate, Advanced, and Final Mastery phases with system design & behavioral rounds.
                  </p>

                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pt-1">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Complete semester-long placement preparation</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Phase filtering & milestone tracking</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Preserves completed task checkmarks</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setShowRoadmapModal(false);
                    onNavigate('roadmap-30');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Open 30-Day Master Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
