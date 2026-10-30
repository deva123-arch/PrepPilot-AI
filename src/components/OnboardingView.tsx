/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ExperienceLevel, LearningDifficulty } from '../types';
import {
  Compass,
  User,
  Briefcase,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Check,
  Plus,
  X,
  ShieldCheck,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

const COMMON_ROLES = [
  'Software Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'AI/ML Engineer',
  'Data Analyst',
];

const SUGGESTED_CURRENT_SKILLS = [
  'JavaScript',
  'Python',
  'Java',
  'C++',
  'React',
  'Node.js',
  'HTML5/CSS3',
  'SQL',
  'Git',
];

const SUGGESTED_TARGET_SKILLS = [
  'Data Structures & Algorithms',
  'System Design',
  'TypeScript',
  'Next.js',
  'PostgreSQL',
  'Docker',
  'Kubernetes',
  'AWS',
  'GraphQL',
];

export const OnboardingView: React.FC = () => {
  const { createProfile, loadDemoProfile, openRestoreModal } = useApp();
  const { user, setIsOnboarded } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [targetRole, setTargetRole] = useState(COMMON_ROLES[0]);
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('entry');
  const [dailyStudyHours, setDailyStudyHours] = useState(2);
  const [targetDurationWeeks, setTargetDurationWeeks] = useState(4);
  const [preferredDifficulty, setPreferredDifficulty] = useState<LearningDifficulty>('intermediate');

  const [currentSkills, setCurrentSkills] = useState<string[]>(['JavaScript', 'React', 'Git']);
  const [targetSkills, setTargetSkills] = useState<string[]>(['Data Structures & Algorithms', 'TypeScript', 'System Design']);
  const [skillInputCurrent, setSkillInputCurrent] = useState('');
  const [skillInputTarget, setSkillInputTarget] = useState('');

  const [completedProjects, setCompletedProjects] = useState<string[]>(['Personal Portfolio Website']);
  const [projectInput, setProjectInput] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCurrentSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !currentSkills.includes(s)) {
      setCurrentSkills([...currentSkills, s]);
      setSkillInputCurrent('');
    }
  };

  const handleRemoveCurrentSkill = (skill: string) => {
    setCurrentSkills(currentSkills.filter((s) => s !== skill));
  };

  const handleAddTargetSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !targetSkills.includes(s)) {
      setTargetSkills([...targetSkills, s]);
      setSkillInputTarget('');
    }
  };

  const handleRemoveTargetSkill = (skill: string) => {
    setTargetSkills(targetSkills.filter((s) => s !== skill));
  };

  const handleAddProject = () => {
    const p = projectInput.trim();
    if (p && !completedProjects.includes(p)) {
      setCompletedProjects([...completedProjects, p]);
      setProjectInput('');
    }
  };

  const handleRemoveProject = (proj: string) => {
    setCompletedProjects(completedProjects.filter((p) => p !== proj));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Please provide your full name or student nickname.';
    }
    const finalRole = isCustomRole ? customRole.trim() : targetRole;
    if (!finalRole) {
      newErrors.role = 'Please choose or enter a target placement role.';
    }
    if (currentSkills.length === 0) {
      newErrors.currentSkills = 'Add at least one known skill to calibrate your baseline.';
    }
    if (targetSkills.length === 0) {
      newErrors.targetSkills = 'Add at least one target skill or competency gap.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const finalRole = isCustomRole ? customRole.trim() : targetRole;

    createProfile({
      name: name.trim(),
      targetRole: finalRole,
      currentSkills,
      targetSkills,
      completedProjects,
      experienceLevel,
      dailyStudyHours,
      targetDurationWeeks,
      preferredDifficulty,
    });
    setIsOnboarded(true);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-white via-indigo-50/30 to-sky-50/40 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-xl space-y-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 mx-auto sm:mx-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Welcome to PrepPilot AI
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Placement Readiness Intelligence & Adaptive Roadmap Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-center sm:justify-end">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Single Student Profile
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
          Set up your primary student profile once. PrepPilot AI will analyze your competencies, build personalized 7-Day and 30-Day sprint curriculums, and conduct interactive mock interviews tailored to your exact placement goals.
        </p>
      </div>

      {/* Main Onboarding Form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <span>Step 1: Student Identity & Target Placement Role</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Who are you, and what job profile are you aiming to crack in campus drives?
          </p>
        </div>

        {/* Student Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Student Full Name or Nickname *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            placeholder="e.g. Deva Harshith or Priya Sharma"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
              errors.name
                ? 'border-rose-500 focus:ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
            }`}
          />
          {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
        </div>

        {/* Target Role Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Target Placement Role *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-2.5">
            {COMMON_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setTargetRole(role);
                  setIsCustomRole(false);
                  if (errors.role) setErrors({ ...errors, role: '' });
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  !isCustomRole && targetRole === role
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{role}</span>
                {!isCustomRole && targetRole === role && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCustomRole(true);
                if (errors.role) setErrors({ ...errors, role: '' });
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                isCustomRole
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Custom Role
            </button>
            {isCustomRole && (
              <input
                type="text"
                value={customRole}
                onChange={(e) => {
                  setCustomRole(e.target.value);
                  if (errors.role) setErrors({ ...errors, role: '' });
                }}
                placeholder="e.g. Site Reliability Engineer (SRE)"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>
          {errors.role && <p className="text-xs text-rose-500 mt-1">{errors.role}</p>}
        </div>

        {/* Step 2: Learning Parameters */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Step 2: Study Availability & Difficulty Track</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize how many hours you can commit daily to ensure realistic roadmap pacing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Experience Level */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="beginner">Beginner / Exploring</option>
                <option value="entry">Entry Level / Final Year Student</option>
                <option value="mid">Mid Level (1-3 yrs / Internships)</option>
                <option value="senior">Senior / Experienced (3+ yrs)</option>
              </select>
            </div>

            {/* Daily Study Hours */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-500" /> Daily Hours: {dailyStudyHours} hrs/day
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={dailyStudyHours}
                onChange={(e) => setDailyStudyHours(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1 hr (Light)</span>
                <span>4 hrs</span>
                <span>10 hrs (Bootcamp)</span>
              </div>
            </div>

            {/* Difficulty Track */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" /> Difficulty Track
              </label>
              <select
                value={preferredDifficulty}
                onChange={(e) => setPreferredDifficulty(e.target.value as LearningDifficulty)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="beginner">Beginner Friendly</option>
                <option value="intermediate">Intermediate (Placement Standard)</option>
                <option value="advanced">Advanced (Product Tier-1)</option>
                <option value="intensive">Intensive (FAANG / MAANG Level)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Current Skills vs Target Competencies */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Step 3: Technical Skills Baseline & Learning Goals</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select or type the programming languages, frameworks, and topics you already know and want to learn.
            </p>
          </div>

          {/* Current Skills */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Current Known Skills ({currentSkills.length}) *
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 min-h-[50px] mb-2">
              {currentSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCurrentSkill(skill)}
                    className="hover:text-rose-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400">Quick Add:</span>
              {SUGGESTED_CURRENT_SKILLS.filter((s) => !currentSkills.includes(s)).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleAddCurrentSkill(skill)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 text-[11px] text-slate-600 dark:text-slate-400 transition-colors"
                >
                  + {skill}
                </button>
              ))}
            </div>

            {/* Custom Skill Input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={skillInputCurrent}
                onChange={(e) => setSkillInputCurrent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCurrentSkill(skillInputCurrent);
                  }
                }}
                placeholder="Type custom skill & press Add"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => handleAddCurrentSkill(skillInputCurrent)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                Add
              </button>
            </div>
            {errors.currentSkills && <p className="text-xs text-rose-500 mt-1">{errors.currentSkills}</p>}
          </div>

          {/* Target Skills */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Target Growth Skills & Goals ({targetSkills.length}) *
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 min-h-[50px] mb-2">
              {targetSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 text-xs font-medium"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTargetSkill(skill)}
                    className="hover:text-rose-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400">Quick Add:</span>
              {SUGGESTED_TARGET_SKILLS.filter((s) => !targetSkills.includes(s)).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleAddTargetSkill(skill)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-700 dark:hover:text-sky-300 text-[11px] text-slate-600 dark:text-slate-400 transition-colors"
                >
                  + {skill}
                </button>
              ))}
            </div>

            {/* Custom Skill Input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={skillInputTarget}
                onChange={(e) => setSkillInputTarget(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTargetSkill(skillInputTarget);
                  }
                }}
                placeholder="Type target skill & press Add"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => handleAddTargetSkill(skillInputTarget)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                Add
              </button>
            </div>
            {errors.targetSkills && <p className="text-xs text-rose-500 mt-1">{errors.targetSkills}</p>}
          </div>

          {/* Optional Completed Projects */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Completed Projects & Portfolio (Optional)
            </label>
            <div className="space-y-1.5 mb-2">
              {completedProjects.map((p) => (
                <div
                  key={p}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
                >
                  <span>{p}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(p)}
                    className="text-slate-400 hover:text-rose-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={projectInput}
                onChange={(e) => setProjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProject();
                  }
                }}
                placeholder="e.g. E-Commerce Store with Payment Integration"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleAddProject}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                Add Project
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Profile...' : 'Create Profile & Launch Prep'}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={loadDemoProfile}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                title="Explore using starter Frontend Developer profile"
              >
                Load Starter Demo Profile
              </button>

              <button
                type="button"
                onClick={() => openRestoreModal()}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore JSON</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            Demo Data Notice: All profile specifications and generated roadmaps are stored locally in your browser's local sandbox. This application does not sync across separate devices.
          </p>
        </div>
      </form>
    </div>
  );
};
