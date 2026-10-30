/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  fetchInterviewQuestions,
  evaluateAnswer,
  fetchInterviewSummary,
} from '../services/api';
import {
  MockInterviewSession,
  InterviewQuestion,
  QuestionEvaluation,
  InterviewSummary,
  InterviewCategory,
  InterviewDifficulty,
} from '../types';
import {
  MessageSquareCode,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Code2,
  X,
  RefreshCw,
  History,
  Info,
  ShieldAlert,
  Sliders,
  Trash2,
  HelpCircle,
  FileText,
  Target,
  Zap,
} from 'lucide-react';

const COMMON_ROLES = [
  'Software Development Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Data Analyst',
  'Full Stack Developer',
];

export const MockInterviewView: React.FC = () => {
  const {
    activeProfile,
    interviews,
    saveInterview,
    deleteInterview,
    addToast,
    openCreateProfileModal,
  } = useApp();

  // Setup configuration state
  const [selectedRole, setSelectedRole] = useState(activeProfile?.targetRole || COMMON_ROLES[0]);
  const [selectedCategory, setSelectedCategory] = useState<InterviewCategory>('technical');
  const [selectedDifficulty, setSelectedDifficulty] = useState<InterviewDifficulty>('Intermediate');
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Active Session state
  const [activeSession, setActiveSession] = useState<MockInterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [showKeyPointsHint, setShowKeyPointsHint] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Async UI status
  const [starting, setStarting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  // Timer state
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  // Keep selectedRole synced if profile switches and no active session
  useEffect(() => {
    if (activeProfile && !activeSession) {
      setSelectedRole(activeProfile.targetRole);
    }
  }, [activeProfile?.id, activeProfile?.targetRole, activeSession]);

  // Auto-restore in-progress interview session for active profile upon mount / profile switch
  useEffect(() => {
    if (!activeProfile) {
      setActiveSession(null);
      return;
    }
    const inProgress = interviews.find(
      (s) => s.profileId === activeProfile.id && s.status === 'in_progress'
    );
    if (inProgress && !activeSession) {
      setActiveSession(inProgress);
      const firstUnanswered = inProgress.questions.findIndex((q) => !q.evaluation);
      const targetIdx = firstUnanswered >= 0 ? firstUnanswered : 0;
      setCurrentQuestionIndex(targetIdx);
      setAnswerInput(inProgress.questions[targetIdx]?.userAnswer || '');
      setIsCodeMode(inProgress.questions[targetIdx]?.type === 'coding' || !!inProgress.questions[targetIdx]?.starterCode);
    }
  }, [activeProfile?.id, interviews]);

  // Question & Session Timers
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'in_progress') return;
    const interval = setInterval(() => {
      setQuestionSeconds((prev) => prev + 1);
      setTotalSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  if (!activeProfile) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-200 dark:border-indigo-800">
          <MessageSquareCode className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Active Profile</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Please create or select a candidate profile first to configure personalized mock interviews.
        </p>
        <button
          onClick={openCreateProfileModal}
          className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          Create Profile
        </button>
      </div>
    );
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const wordCount = answerInput.trim() ? answerInput.trim().split(/\s+/).length : 0;
  const currentQuestion: InterviewQuestion | undefined = activeSession?.questions[currentQuestionIndex];

  // Handler: Start a new Mock Interview Session
  const handleStartInterview = async () => {
    setStarting(true);
    setError(null);
    setValidationError(null);
    try {
      const questions = await fetchInterviewQuestions(activeProfile, {
        role: selectedRole,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        questionCount,
        forceRefresh: true,
      });

      if (!questions || questions.length === 0) {
        throw new Error('Received empty questions list from Gemini. Please retry.');
      }

      const newSession: MockInterviewSession = {
        id: 'interview-' + Math.random().toString(36).substring(2, 9),
        profileId: activeProfile.id,
        targetRole: selectedRole,
        interviewType: selectedCategory,
        difficulty: selectedDifficulty,
        questionCount: questions.length,
        startedAt: new Date().toISOString(),
        status: 'in_progress',
        questions,
      };

      setActiveSession(newSession);
      setCurrentQuestionIndex(0);
      setAnswerInput('');
      setQuestionSeconds(0);
      setTotalSeconds(0);
      setIsCodeMode(questions[0]?.type === 'coding' || !!questions[0]?.starterCode);
      setShowKeyPointsHint(false);

      saveInterview(newSession);
      addToast(
        'success',
        'Mock Interview Ready',
        `Generated ${questions.length} ${selectedCategory} questions for ${selectedRole}.`
      );
    } catch (err: any) {
      console.error(err);
      const isQuotaErr = err?.isQuotaExhausted || err?.status === 429;
      const errMsg = isQuotaErr
        ? 'Gemini API free-tier request quota is exhausted. Please wait 60 seconds before retrying.'
        : err.message || 'Failed to start interview. Check connection or API settings.';
      setError(errMsg);
      addToast('error', 'Interview Launch Failed', errMsg);
    } finally {
      setStarting(false);
    }
  };

  // Handler: Insert Starter Code
  const handleInsertStarterCode = () => {
    if (currentQuestion?.starterCode) {
      setAnswerInput(currentQuestion.starterCode);
      setIsCodeMode(true);
      setValidationError(null);
    }
  };

  // Handler: Submit Answer to Gemini for 4-Part Rubric Evaluation
  const handleSubmitAnswer = async () => {
    if (!activeSession || !currentQuestion) return;

    const trimmed = answerInput.trim();
    if (!trimmed) {
      setValidationError('Please articulate an answer or code solution before submitting for grading.');
      return;
    }
    setValidationError(null);

    // Save candidate draft answer immediately into storage before calling API
    const draftQuestions = [...activeSession.questions];
    draftQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      userAnswer: trimmed,
    };
    const draftSession: MockInterviewSession = {
      ...activeSession,
      questions: draftQuestions,
    };
    setActiveSession(draftSession);
    saveInterview(draftSession);

    setEvaluating(true);
    setError(null);

    try {
      const evaluation: QuestionEvaluation = await evaluateAnswer(
        currentQuestion,
        trimmed,
        activeProfile
      );

      const evaluatedQuestions = [...draftSession.questions];
      evaluatedQuestions[currentQuestionIndex] = {
        ...currentQuestion,
        userAnswer: trimmed,
        answeredAt: new Date().toISOString(),
        evaluation,
      };

      const updatedSession: MockInterviewSession = {
        ...draftSession,
        questions: evaluatedQuestions,
      };

      setActiveSession(updatedSession);
      saveInterview(updatedSession);
      addToast(
        'success',
        'Answer Evaluated',
        `Rubric Score: ${evaluation.score}/100 (${evaluation.verdict})`
      );
    } catch (err: any) {
      console.error(err);
      const isQuotaErr = err?.isQuotaExhausted || err?.status === 429;
      const errMsg = isQuotaErr
        ? 'Gemini request quota reached. Your typed answer is safely preserved! Please wait 60s and click retry.'
        : err.message || 'Failed to evaluate answer. Your response is saved. Please retry.';
      setError(errMsg);
      addToast('error', 'Evaluation Notice', errMsg);
    } finally {
      setEvaluating(false);
    }
  };

  // Handler: Jump to question
  const handleSelectQuestion = (index: number) => {
    if (!activeSession) return;
    if (index < 0 || index >= activeSession.questions.length) return;

    // Save current unsaved text to current question if partially typed
    if (currentQuestion && answerInput.trim() && !currentQuestion.evaluation) {
      const draftQuestions = [...activeSession.questions];
      draftQuestions[currentQuestionIndex] = {
        ...currentQuestion,
        userAnswer: answerInput.trim(),
      };
      const draftSession = { ...activeSession, questions: draftQuestions };
      setActiveSession(draftSession);
      saveInterview(draftSession);
    }

    setCurrentQuestionIndex(index);
    const targetQ = activeSession.questions[index];
    setAnswerInput(targetQ.userAnswer || '');
    setIsCodeMode(targetQ.type === 'coding' || !!targetQ.starterCode);
    setQuestionSeconds(0);
    setValidationError(null);
    setError(null);
    setShowKeyPointsHint(false);
  };

  // Handler: Advance to next question or complete
  const handleNextQuestion = () => {
    if (!activeSession) return;
    if (currentQuestionIndex < activeSession.questions.length - 1) {
      handleSelectQuestion(currentQuestionIndex + 1);
    } else {
      handleFinishInterview();
    }
  };

  // Handler: Complete & Synthesize Final Report
  const handleFinishInterview = async () => {
    if (!activeSession) return;
    setGeneratingSummary(true);
    setShowEndConfirm(false);
    setError(null);

    // Calculate deterministic arithmetic average score
    const answered = activeSession.questions.filter((q) => q.evaluation);
    const avgScore =
      answered.length > 0
        ? Math.round(
            answered.reduce((sum, q) => sum + (q.evaluation?.score || 0), 0) / answered.length
          )
        : 0;

    try {
      const summary: InterviewSummary = await fetchInterviewSummary(
        activeSession.questions,
        activeProfile
      );

      // Force deterministic average score onto summary object
      const enforcedSummary: InterviewSummary = {
        ...summary,
        overallScore: avgScore,
        totalAnswered: answered.length,
        disclaimer:
          'This mock interview evaluation and score are AI-generated heuristic estimates for placement practice, not official employer evaluations or certified industry assessments.',
      };

      const completedSession: MockInterviewSession = {
        ...activeSession,
        status: 'completed',
        completedAt: new Date().toISOString(),
        summary: enforcedSummary,
      };

      setActiveSession(completedSession);
      saveInterview(completedSession);
      addToast('success', 'Interview Concluded', `Final Score: ${avgScore}% (${answered.length}/${activeSession.questions.length} answered)`);
    } catch (err: any) {
      console.error('Summary synthesis failed, utilizing fallback:', err);
      const fallbackSummary: InterviewSummary = {
        overallScore: avgScore,
        totalAnswered: answered.length,
        strengths: [
          'Addressed core requirements across technical & scenario challenges.',
          'Maintained consistent structured problem articulation.',
        ],
        weakAreas: [
          'Review questions where rubric depth scored below benchmark.',
          'Focus on optimal time and space complexity explanations.',
        ],
        topicsToRevise: [
          `${activeSession.targetRole} Core Concepts`,
          'System Scalability & Edge-Case Handling',
        ],
        personalizedNextSteps: [
          'Review the model answers for the questions evaluated in this session.',
          'Practice 2-3 focused coding exercises on identified weak topics.',
          'Simulate another timed round under exam placement constraints.',
        ],
        suggestedFollowUpPractice: [
          'Implement code solutions for any missed or partially scored questions.',
          'Refine behavioral STAR stories with quantifiable results.',
        ],
        disclaimer:
          'This mock interview evaluation and score are AI-generated heuristic estimates for placement practice, not official employer evaluations or certified industry assessments.',
      };

      const completedSession: MockInterviewSession = {
        ...activeSession,
        status: 'completed',
        completedAt: new Date().toISOString(),
        summary: fallbackSummary,
      };

      setActiveSession(completedSession);
      saveInterview(completedSession);
      addToast('info', 'Interview Saved', `Session recorded with deterministic score: ${avgScore}%.`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const answeredCount = activeSession?.questions.filter((q) => q.evaluation).length || 0;
  const totalQuestions = activeSession?.questions.length || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: HEADER & TIMER BANNER */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
                <MessageSquareCode className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                AI Placement Mock Interview
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Conduct high-fidelity placement rounds with Gemini 3.8 Flash. Practice Technical DSA/Architecture or Behavioral STAR questions with transparent 4-part rubric grading.
            </p>
          </div>

          {/* Session Timer & Status Indicator */}
          {activeSession && activeSession.status === 'in_progress' ? (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>Q: {formatTimer(questionSeconds)}</span>
                <span className="text-slate-400">•</span>
                <span>Total: {formatTimer(totalSeconds)}</span>
              </div>
              <button
                onClick={() => setShowEndConfirm(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
              >
                End Session
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini 3.8 Flash Ready
              </span>
            </div>
          )}
        </div>

        {/* Global Heuristic Disclaimer */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-700 dark:text-slate-300">Notice:</strong> Evaluations and scores are AI heuristic estimates designed to guide placement preparation. They do not represent official employer assessments or certified benchmarks.
          </p>
        </div>
      </div>

      {/* End Session Confirmation Notice */}
      {showEndConfirm && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Conclude and Grade this Interview Session?
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              You have answered {answeredCount} of {totalQuestions} questions. Answered questions will be averaged into your final performance report.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEndConfirm(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Resume Interview
            </button>
            <button
              onClick={handleFinishInterview}
              disabled={generatingSummary}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer disabled:opacity-50"
            >
              {generatingSummary ? 'Synthesizing...' : 'Conclude & View Report'}
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Interview Processing Notice</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 2: SETUP CONFIGURATION (WHEN NO ACTIVE SESSION OR INTERVIEW COMPLETED) */}
      {(!activeSession || activeSession.status === 'completed') && (
        <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-7 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Configure Interview Parameters
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Candidate: <strong className="text-slate-800 dark:text-slate-200">{activeProfile.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Target Role Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                Target Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {COMMON_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {!COMMON_ROLES.includes(activeProfile.targetRole) && (
                  <option value={activeProfile.targetRole}>{activeProfile.targetRole}</option>
                )}
              </select>
              <p className="text-[11px] text-slate-400">Questions are customized to this role.</p>
            </div>

            {/* 2. Interview Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                Category
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['technical', 'behavioral', 'mixed'] as InterviewCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl capitalize transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                {selectedCategory === 'technical'
                  ? 'DSA, System Design & Core CS'
                  : selectedCategory === 'behavioral'
                  ? 'STAR method leadership & HR rounds'
                  : 'Balanced technical & behavioral'}
              </p>
            </div>

            {/* 3. Difficulty Level */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                Difficulty Level
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as InterviewDifficulty)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Fundamental">Fundamental (Screening / Core)</option>
                <option value="Intermediate">Intermediate (Standard Campus Drive)</option>
                <option value="Advanced">Advanced (High-Bar / Edge-Cases)</option>
                <option value="Adaptive">Adaptive (Gradually Ramping)</option>
              </select>
              <p className="text-[11px] text-slate-400">Controls question complexity & depth.</p>
            </div>

            {/* 4. Question Count */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                Session Length
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      questionCount === num
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {num} Qs
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                {questionCount === 3
                  ? 'Quick Sprint (~10 mins)'
                  : questionCount === 5
                  ? 'Standard Round (~20 mins)'
                  : 'Full Simulation (~45 mins)'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Personalized against: <strong>{activeProfile.currentSkills?.slice(0, 3).join(', ') || 'Known Skills'}</strong> • {activeProfile.experienceLevel}
              </span>
            </div>

            <button
              onClick={handleStartInterview}
              disabled={starting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {starting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing {questionCount} Questions with Gemini...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Launch Mock Interview</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Starting Skeleton / Loading */}
      {starting && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-pulse">
          <MessageSquareCode className="w-12 h-12 text-indigo-500 mx-auto animate-bounce" />
          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Formulating {questionCount} {selectedCategory} Questions...
            </h3>
            <p className="text-xs text-slate-400">
              Tailoring prompts to {selectedRole} benchmarks with calibrated {selectedDifficulty.toLowerCase()} difficulty.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: ACTIVE INTERVIEW QUESTION PLAYER */}
      {activeSession && activeSession.status === 'in_progress' && currentQuestion && (
        <div className="space-y-6">
          {/* Question Navigation & Stepper Header */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Question {currentQuestionIndex + 1} of {activeSession.questions.length}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {currentQuestion.category}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {currentQuestion.difficulty}
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {currentQuestion.type}
              </span>
            </div>

            {/* Jump Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {activeSession.questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isEvaluated = !!q.evaluation;
                const hasDraft = !!q.userAnswer && !q.evaluation;
                return (
                  <button
                    key={q.id}
                    onClick={() => handleSelectQuestion(idx)}
                    title={`Question ${idx + 1}: ${isEvaluated ? 'Evaluated' : hasDraft ? 'Draft' : 'Unanswered'}`}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/40'
                        : isEvaluated
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : hasDraft
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Interview Prompt • {activeSession.targetRole}
              </span>
              {currentQuestion.starterCode && (
                <button
                  type="button"
                  onClick={handleInsertStarterCode}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Insert Starter Template
                </button>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
              {currentQuestion.question}
            </h2>

            {/* Expected Key Points Toggle Hint */}
            {currentQuestion.expectedKeyPoints && currentQuestion.expectedKeyPoints.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyPointsHint(!showKeyPointsHint)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                  {showKeyPointsHint ? 'Hide Key Evaluation Criteria' : 'What Interviewers Look For'}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showKeyPointsHint ? 'rotate-180' : ''}`} />
                </button>
                {showKeyPointsHint && (
                  <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 space-y-1 animate-in fade-in">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block">
                      Target Placement Criteria:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {currentQuestion.expectedKeyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Candidate Answer Editor Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Candidate Response
              </label>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">
                  {wordCount} words • {answerInput.length} chars
                </span>
                <button
                  type="button"
                  onClick={() => setIsCodeMode(!isCodeMode)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  {isCodeMode ? 'Standard Text' : 'Code Editor Font'}
                </button>
              </div>
            </div>

            <textarea
              value={answerInput}
              onChange={(e) => {
                setAnswerInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={evaluating || !!currentQuestion.evaluation}
              rows={9}
              placeholder={
                isCodeMode
                  ? '// Write code solution, helper functions, time/space complexity...\nfunction solve(input) {\n  \n}'
                  : currentQuestion.type === 'behavioral'
                  ? 'Situation: Context & background...\nTask: Your specific responsibility...\nAction: Concrete engineering decisions taken...\nResult: Quantifiable outcome and reflection...'
                  : 'Articulate your approach, edge cases, system trade-offs, and reasoning...'
              }
              className={`w-full p-4 rounded-2xl border text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                isCodeMode ? 'font-mono' : 'font-sans'
              } ${
                currentQuestion.evaluation
                  ? 'border-slate-200 dark:border-slate-800 opacity-90'
                  : validationError
                  ? 'border-rose-400 dark:border-rose-800 ring-1 ring-rose-400'
                  : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'
              }`}
            />

            {/* Validation Notice */}
            {validationError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {validationError}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400">
                {currentQuestion.evaluation
                  ? 'Answer submitted and graded with transparent placement rubric.'
                  : 'Provide detailed reasoning and cover constraints or complexities.'}
              </span>

              <div className="flex items-center gap-2">
                {!currentQuestion.evaluation ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={evaluating || !answerInput.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {evaluating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating with Rubric...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Answer</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                  >
                    <span>
                      {currentQuestionIndex < activeSession.questions.length - 1
                        ? 'Continue to Next Question'
                        : 'Finish & View Summary'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Real-time 4-Part Rubric Feedback Card */}
          {currentQuestion.evaluation && (
            <div className="p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-6 animate-in fade-in">
              {/* Header with Score & Verdict */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                    AI Rubric Evaluation
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl font-black text-white">
                      {currentQuestion.evaluation.score}/100
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        currentQuestion.evaluation.verdict === 'Strong'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : currentQuestion.evaluation.verdict === 'Partial'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                      }`}
                    >
                      {currentQuestion.evaluation.verdict}
                    </span>
                  </div>
                </div>

                {/* 4 Rubric Metric Breakdown Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Accuracy / Context</span>
                    <span className="font-bold text-white text-sm">
                      {currentQuestion.evaluation.rubricScores.accuracy}/25
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Completeness</span>
                    <span className="font-bold text-white text-sm">
                      {currentQuestion.evaluation.rubricScores.completeness}/25
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Clarity & Structure</span>
                    <span className="font-bold text-white text-sm">
                      {currentQuestion.evaluation.rubricScores.clarity}/25
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Technical Depth</span>
                    <span className="font-bold text-white text-sm">
                      {currentQuestion.evaluation.rubricScores.depth}/25
                    </span>
                  </div>
                </div>
              </div>

              {/* Code Execution Disclaimer Banner (Requirement 7) */}
              {currentQuestion.evaluation.executionNotice && (
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-900/60 flex items-start gap-2.5 text-xs text-indigo-300">
                  <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Heuristic Evaluation Notice:</strong> {currentQuestion.evaluation.executionNotice}
                  </p>
                </div>
              )}

              {/* Strengths & Mistakes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Correct */}
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-900/50 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>What You Articulated Correctly:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {currentQuestion.evaluation.whatWasCorrect.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Missing / Mistakes */}
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Omissions, Bugs, or Weak Points:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {currentQuestion.evaluation.missingOrMistakes.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Model Answer / Solution Explanation */}
              <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-2 text-xs">
                <span className="font-bold text-indigo-300 block">
                  Exemplary Placement Solution / Model Response:
                </span>
                <div className="text-slate-200 leading-relaxed whitespace-pre-wrap font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
                  {currentQuestion.evaluation.modelAnswer}
                </div>
              </div>

              {/* Improvement Tips */}
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/50 space-y-2 text-xs">
                <span className="font-bold text-indigo-300 block">
                  Concrete Improvement Tips for Placement Rounds:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {currentQuestion.evaluation.improvementTips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>

              {/* Next Question CTA */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <span>
                    {currentQuestionIndex < activeSession.questions.length - 1
                      ? 'Proceed to Next Question'
                      : 'Complete Interview & View Summary'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: COMPLETED INTERVIEW FINAL REPORT & QUESTION BREAKDOWN */}
      {activeSession && activeSession.status === 'completed' && activeSession.summary && (
        <div className="p-8 sm:p-9 rounded-3xl bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-800/50 shadow-2xl space-y-8 text-white animate-in zoom-in-95">
          {/* Summary Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-indigo-900/50 pb-6">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Placement Simulation Finished
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Interview Performance Synthesis
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Candidate: <strong>{activeProfile.name}</strong> • Role: <strong>{activeSession.targetRole}</strong> • Category: <strong className="capitalize">{activeSession.interviewType || 'Technical'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-5">
              <div className="text-right">
                <span className="text-4xl font-black text-indigo-400 block">
                  {activeSession.summary.overallScore}%
                </span>
                <span className="text-[11px] text-slate-400">
                  Average Rubric Score ({activeSession.summary.totalAnswered} answered)
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveSession(null);
                  setCurrentQuestionIndex(0);
                  setAnswerInput('');
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer shrink-0"
              >
                Configure New Session
              </button>
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-900/60 text-xs text-indigo-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {activeSession.summary.disclaimer ||
                'This mock interview evaluation and score are AI-generated heuristic estimates for placement practice, not official employer evaluations or certified industry assessments.'}
            </p>
          </div>

          {/* Strengths & Weak Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-900/50 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Demonstrated Strengths:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {activeSession.summary.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-900/50 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Areas Needing Strengthening:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {activeSession.summary.weakAreas.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Topics to Revise & Follow-Up Practice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-900/50 space-y-2">
              <span className="font-bold text-amber-400 block">Topics to Revise:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {activeSession.summary.topicsToRevise.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-900/50 space-y-2">
              <span className="font-bold text-indigo-400 block">Suggested Follow-Up Practice:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {(activeSession.summary.suggestedFollowUpPractice || activeSession.summary.personalizedNextSteps).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* QUESTION-BY-QUESTION BREAKDOWN ACCORDION */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Question-Wise Feedback & Evaluation Details
              </h3>
              <span className="text-xs text-slate-400">
                Click any question to inspect rubric grading
              </span>
            </div>

            <div className="space-y-3">
              {activeSession.questions.map((q, idx) => {
                const isExpanded = expandedQuestionId === q.id || (expandedQuestionId === null && idx === 0);
                const score = q.evaluation?.score;
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedQuestionId(isExpanded ? -1 : q.id)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-xs font-bold flex items-center justify-center text-slate-300">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">
                              {q.category}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {q.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-md sm:max-w-xl mt-0.5">
                            {q.question}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {score !== undefined ? (
                          <span
                            className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                              score >= 80
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : score >= 60
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {score}/100
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Unanswered</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-5 border-t border-slate-800/80 bg-slate-900/50 space-y-4 text-xs animate-in fade-in">
                        <div className="space-y-1">
                          <span className="font-bold text-indigo-400 text-[10px] uppercase">
                            Full Question Prompt:
                          </span>
                          <p className="text-slate-200 font-semibold">{q.question}</p>
                        </div>

                        {q.userAnswer ? (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-400 text-[10px] uppercase">
                              Your Submitted Response:
                            </span>
                            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-200 whitespace-pre-wrap">
                              {q.userAnswer}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 italic">No answer was submitted for this question.</p>
                        )}

                        {q.evaluation && (
                          <div className="space-y-3 pt-2">
                            {/* Rubric metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl bg-slate-800/80">
                                <span className="text-[10px] text-slate-400 block">Accuracy</span>
                                <span className="font-bold text-white">
                                  {q.evaluation.rubricScores.accuracy}/25
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-800/80">
                                <span className="text-[10px] text-slate-400 block">Completeness</span>
                                <span className="font-bold text-white">
                                  {q.evaluation.rubricScores.completeness}/25
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-800/80">
                                <span className="text-[10px] text-slate-400 block">Clarity</span>
                                <span className="font-bold text-white">
                                  {q.evaluation.rubricScores.clarity}/25
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-800/80">
                                <span className="text-[10px] text-slate-400 block">Depth</span>
                                <span className="font-bold text-white">
                                  {q.evaluation.rubricScores.depth}/25
                                </span>
                              </div>
                            </div>

                            {/* Execution notice */}
                            {q.evaluation.executionNotice && (
                              <p className="text-[11px] text-indigo-300 italic">
                                * {q.evaluation.executionNotice}
                              </p>
                            )}

                            {/* Model answer */}
                            <div className="space-y-1">
                              <span className="font-bold text-indigo-300 text-[10px] uppercase">
                                Model Answer:
                              </span>
                              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap">
                                {q.evaluation.modelAnswer}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: PAST INTERVIEW HISTORY */}
      <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Interview History ({interviews.length})
            </h3>
          </div>
          {interviews.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Preserved in local storage
            </span>
          )}
        </div>

        {interviews.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            No mock interviews recorded yet for {activeProfile.name}. Configure parameters above to start your first session.
          </p>
        ) : (
          <div className="space-y-3">
            {interviews.map((item) => {
              const completedCount = item.questions.filter((q) => q.evaluation).length;
              const isCurrentActive = activeSession?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border text-xs transition-all ${
                    isCurrentActive
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {item.targetRole}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                        {item.interviewType || 'Technical'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.difficulty || 'Intermediate'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {completedCount} of {item.questions.length} questions completed • Status: {item.status}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-black text-sm text-indigo-600 dark:text-indigo-400 block">
                        {item.summary?.overallScore !== undefined ? `${item.summary.overallScore}%` : 'In Progress'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveSession(item);
                        const firstUnanswered = item.questions.findIndex((q) => !q.evaluation);
                        const targetIdx = firstUnanswered >= 0 ? firstUnanswered : 0;
                        setCurrentQuestionIndex(targetIdx);
                        setAnswerInput(item.questions[targetIdx]?.userAnswer || '');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                    >
                      {item.status === 'in_progress' ? 'Resume' : 'Review'}
                    </button>

                    <button
                      onClick={() => deleteInterview(item.id)}
                      title="Delete Session"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
