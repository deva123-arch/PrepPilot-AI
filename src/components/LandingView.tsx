/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Sparkles,
  Target,
  Calendar,
  Terminal,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Cpu,
  Layers,
  Award,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

interface LandingViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ theme, onToggleTheme }) => {
  const { openAuthModal } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'sde' | 'frontend' | 'backend' | 'ai'>('sde');

  const rolePreviews = {
    sde: {
      title: 'Software Development Engineer (SDE-1)',
      skills: ['Data Structures & Algorithms', 'System Architecture', 'Operating Systems', 'DBMS & SQL'],
      timeline: '4–8 Weeks Sprint',
      mockFocus: 'Live coding diffs, time complexity trade-offs, and dynamic programming.',
    },
    frontend: {
      title: 'Frontend Engineer',
      skills: ['React Internals', 'TypeScript', 'Web Vitals & Performance', 'Browser Architecture'],
      timeline: '4–6 Weeks Sprint',
      mockFocus: 'State management, custom hooks, DOM diffing, and CSS layout architecture.',
    },
    backend: {
      title: 'Backend Engineer',
      skills: ['Node.js & Go', 'PostgreSQL & Redis', 'Microservices & REST/gRPC', 'Distributed Locking'],
      timeline: '6–8 Weeks Sprint',
      mockFocus: 'Database schema design, indexing, caching strategies, and concurrency.',
    },
    ai: {
      title: 'AI / Machine Learning Engineer',
      skills: ['Python & PyTorch', 'Model Optimization', 'Vector Databases & RAG', 'API Serving'],
      timeline: '6–10 Weeks Sprint',
      mockFocus: 'Transformer architectures, gradient descent mechanics, and scalable inference.',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
                PrepPilot AI
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                Placement OS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => onToggleTheme()}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <a
              href="#admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 transition-colors cursor-pointer"
              title="Access Platform Administrator Portal"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Admin</span>
            </a>

            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Sign In
            </button>

            <button
              onClick={() => openAuthModal('register')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Campus Drive & Placement Acceleration Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Land Your Dream Tech Job with{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
                Personalized AI Placement
              </span>{' '}
              Coaching
            </h1>

            <p className="mt-6 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
              PrepPilot AI identifies your exact skill gaps, builds adaptive 7-day and 30-day engineering roadmaps, and conducts realistic technical mock interviews with deterministic performance analytics.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => openAuthModal('register')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-sm font-semibold transition-all cursor-pointer"
              >
                <span>Sign In to Existing Track</span>
              </button>
            </div>

            {/* Trust highlights */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left pt-6 border-t border-slate-200/80 dark:border-slate-800/80 max-w-2xl mx-auto">
              <div>
                <div className="text-xl font-black text-slate-900 dark:text-white">100%</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Deterministic Metrics</div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 dark:text-white">4-Pillar</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Mock Rubric Scoring</div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 dark:text-white">Isolated</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Private Student Data</div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 dark:text-white">Gemini 3</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Curriculum Synthesis</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars */}
      <section className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              The Placement OS Architecture
            </h2>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Engineered for Realistic Software Engineering Placement Rounds
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Skill-Gap Diagnosis
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Evaluates candidate abilities against actual campus placement hiring bars. Pinpoints missing fundamentals, priority gaps, and provides concrete coding challenges.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span>Role Benchmarking</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                7-Day & 30-Day Roadmaps
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Adaptive study sprints covering DSA, Computer Science Fundamentals, System Design, and Aptitude. Adapts dynamically to skipped or completed milestones.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                <span>Sprint Scheduling</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                AI Technical Mock Rounds
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Role-specific technical and behavioral questions evaluated across 4 rubric dimensions (0–25 points each), computing deterministic arithmetic overall scores.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>Rubric Feedback</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Progress & Consistency
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Strict deterministic analytics: real logged study time, daily streaks, task completion rates, and historical mock interview progression without fabrication.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <span>Verified Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Role Explorer */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Curated Tracks for Top Placement Roles
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Select a track to see how PrepPilot AI structures targeted preparation milestones.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {(['sde', 'frontend', 'backend', 'ai'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedRole(key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedRole === key
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {rolePreviews[key].title.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800/80">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Target Role Curriculum
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {rolePreviews[selectedRole].title}
                </h3>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                {rolePreviews[selectedRole].timeline}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Core Skills Tested in Placements
                </h4>
                <ul className="space-y-2">
                  {rolePreviews[selectedRole].skills.map((skill, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Mock Interview Focus Areas
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                  {rolePreviews[selectedRole].mockFocus}
                </p>

                <button
                  onClick={() => openAuthModal('register')}
                  className="mt-4 w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Start This Track Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Multi-User Architecture */}
      <section className="py-16 bg-slate-100/60 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Enterprise Multi-User Security & Account Isolation
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Every student receives their own private account with scrypt password hashing, timing-safe credential verification, and server-side authenticated sessions. Your skill roadmaps, completed tasks, and mock interview scores are strictly isolated to your authenticated account.
              </p>
            </div>
            <button
              onClick={() => openAuthModal('register')}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 shrink-0 cursor-pointer"
            >
              Register Now
            </button>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Ready to Ace Your Upcoming Placement Season?
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Join PrepPilot AI today. Create your primary student profile in under 2 minutes and start practicing with personalized AI guidance.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openAuthModal('register')}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer"
            >
              Sign Up Free
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="px-8 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 bg-white dark:bg-slate-900 transition-colors text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-slate-800 dark:text-slate-200">PrepPilot AI</span>
            <span>• Placement Preparation & Readiness Intelligence</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Powered by Google Gemini</span>
            <span>•</span>
            <a
              href="#admin"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors flex items-center gap-1 text-slate-500 dark:text-slate-400"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
              <span>Admin Portal</span>
            </a>
            <span>•</span>
            <span>Portfolio Edition</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
