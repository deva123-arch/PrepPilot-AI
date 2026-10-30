/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  UserProfile,
  ExperienceLevel,
  LearningDifficulty,
} from '../types';
import {
  X,
  User,
  Briefcase,
  Layers,
  Sparkles,
  Clock,
  Calendar,
  Gauge,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';

const COMMON_ROLES = [
  'Software Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'AI/ML Engineer',
  'Data Analyst',
];

const SUGGESTED_SKILLS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Python',
  'Java',
  'C++',
  'PostgreSQL',
  'MongoDB',
  'Docker',
  'Kubernetes',
  'AWS',
  'System Design',
  'Data Structures & Algorithms',
  'PyTorch',
  'TensorFlow',
  'GraphQL',
  'REST APIs',
  'Git',
  'SQL',
];

export const ProfileModal: React.FC = () => {
  const {
    isProfileModalOpen,
    profileModalMode,
    profileToEdit,
    closeProfileModal,
    createProfile,
    editProfile,
    deleteProfile,
    profiles,
    switchProfile,
  } = useApp();

  const isEdit = profileModalMode === 'edit';

  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState(COMMON_ROLES[0]);
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [currentSkills, setCurrentSkills] = useState<string[]>([]);
  const [targetSkills, setTargetSkills] = useState<string[]>([]);
  const [completedProjects, setCompletedProjects] = useState<string[]>([]);
  const [skillInputCurrent, setSkillInputCurrent] = useState('');
  const [skillInputTarget, setSkillInputTarget] = useState('');
  const [projectInput, setProjectInput] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('entry');
  const [dailyStudyHours, setDailyStudyHours] = useState(2);
  const [targetDurationWeeks, setTargetDurationWeeks] = useState(4);
  const [preferredDifficulty, setPreferredDifficulty] = useState<LearningDifficulty>('intermediate');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isEdit && profileToEdit) {
      setName(profileToEdit.name);
      if (COMMON_ROLES.includes(profileToEdit.targetRole)) {
        setTargetRole(profileToEdit.targetRole);
        setIsCustomRole(false);
        setCustomRole('');
      } else {
        setTargetRole('Custom');
        setIsCustomRole(true);
        setCustomRole(profileToEdit.targetRole);
      }
      setCurrentSkills(profileToEdit.currentSkills || []);
      setTargetSkills(profileToEdit.targetSkills || []);
      setCompletedProjects(profileToEdit.completedProjects || []);
      setExperienceLevel(profileToEdit.experienceLevel);
      setDailyStudyHours(profileToEdit.dailyStudyHours || 2);
      setTargetDurationWeeks(profileToEdit.targetDurationWeeks || 4);
      setPreferredDifficulty(profileToEdit.preferredDifficulty || 'intermediate');
    } else {
      // Default reset
      setName('');
      setTargetRole(COMMON_ROLES[0]);
      setIsCustomRole(false);
      setCustomRole('');
      setCurrentSkills(['JavaScript', 'HTML/CSS', 'Git']);
      setTargetSkills(['TypeScript', 'React', 'DSA']);
      setCompletedProjects(['Personal Portfolio Website']);
      setExperienceLevel('entry');
      setDailyStudyHours(2);
      setTargetDurationWeeks(4);
      setPreferredDifficulty('intermediate');
    }
    setErrors({});
    setShowDeleteConfirm(false);
  }, [isEdit, profileToEdit, isProfileModalOpen]);

  if (!isProfileModalOpen) return null;

  const handleAddCurrentSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !currentSkills.includes(s)) {
      setCurrentSkills([...currentSkills, s]);
      setSkillInputCurrent('');
    }
  };

  const handleRemoveCurrentSkill = (skill: string) => {
    setCurrentSkills(currentSkills.filter((item) => item !== skill));
  };

  const handleAddTargetSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !targetSkills.includes(s)) {
      setTargetSkills([...targetSkills, s]);
      setSkillInputTarget('');
    }
  };

  const handleRemoveTargetSkill = (skill: string) => {
    setTargetSkills(targetSkills.filter((item) => item !== skill));
  };

  const handleAddProject = (project: string) => {
    const p = project.trim();
    if (p && !completedProjects.includes(p)) {
      setCompletedProjects([...completedProjects, p]);
      setProjectInput('');
    }
  };

  const handleRemoveProject = (project: string) => {
    setCompletedProjects(completedProjects.filter((item) => item !== project));
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!name.trim()) {
      err.name = 'Please provide a candidate name or profile nickname.';
    }
    const finalRole = isCustomRole ? customRole.trim() : targetRole;
    if (!finalRole) {
      err.role = 'Please specify a target role.';
    }
    if (currentSkills.length === 0) {
      err.currentSkills = 'Add at least one skill you currently know.';
    }
    if (targetSkills.length === 0) {
      err.targetSkills = 'Add at least one target skill you want to master.';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalRole = isCustomRole ? customRole.trim() : targetRole;

    if (isEdit && profileToEdit) {
      editProfile({
        ...profileToEdit,
        name: name.trim(),
        targetRole: finalRole,
        currentSkills,
        targetSkills,
        completedProjects,
        experienceLevel,
        dailyStudyHours,
        targetDurationWeeks,
        preferredDifficulty,
        updatedAt: new Date().toISOString(),
      });
      closeProfileModal();
    } else {
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
      closeProfileModal();
    }
  };

  const handleDelete = () => {
    if (!profileToEdit) return;
    deleteProfile(profileToEdit.id);
    closeProfileModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col my-auto transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isEdit ? 'Edit Student Profile' : 'Set Up Your Student Profile'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit
                  ? 'Update your target role, skill baseline, and study pace in place.'
                  : 'Configure your primary profile to tailor roadmaps, skill analyses, and mock interviews.'}
              </p>
            </div>
          </div>
          <button
            onClick={closeProfileModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation Warning Sub-view */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                  Delete Profile "{profileToEdit?.name}"?
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                  This action is permanent and will remove all associated 7-day and 30-day roadmaps, completed task milestones, skill-gap assessments, and mock interview transcripts for this profile.
                </p>
                {profiles.length <= 1 && (
                  <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 mt-2">
                    Note: This is your only profile. Deleting it will leave the platform without an active candidate until you create another one.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Confirm Delete
              </button>
            </div>
          </div>
        ) : (
          /* Main Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Candidate Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name or Profile Nickname *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  placeholder="Enter your name"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950/60 focus:outline-none focus:ring-2 transition-all ${
                    errors.name
                      ? 'border-rose-500 focus:ring-rose-500/30'
                      : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100'
                  }`}
                />
              </div>
              {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
            </div>

            {/* Target Role */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Target Role *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                {COMMON_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setTargetRole(role);
                      setIsCustomRole(false);
                      if (errors.role) setErrors({ ...errors, role: '' });
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      !isCustomRole && targetRole === role
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{role}</span>
                    {!isCustomRole && targetRole === role && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                  </button>
                ))}
              </div>

              {/* Custom Role Option */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomRole(!isCustomRole)}
                  className={`text-xs font-medium cursor-pointer flex items-center gap-1 ${
                    isCustomRole ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {isCustomRole ? '✓ Custom Target Role Selected' : '+ Enter custom role (e.g. Cloud Security Architect)'}
                </button>
                {isCustomRole && (
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => {
                      setCustomRole(e.target.value);
                      if (errors.role) setErrors({ ...errors, role: '' });
                    }}
                    placeholder="Enter custom role title..."
                    className="mt-1.5 w-full px-3.5 py-2 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950/60 border-indigo-500 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                  />
                )}
              </div>
              {errors.role && <p className="text-xs text-rose-500 mt-1">{errors.role}</p>}
            </div>

            {/* Current Technical Skills */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Current Technical Skills *
                </label>
                <span className="text-[11px] text-slate-400">What you already know</span>
              </div>
              <div className="flex gap-2 mb-2">
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
                  placeholder="Type a skill and press Enter (e.g. JavaScript)"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddCurrentSkill(skillInputCurrent)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                {currentSkills.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No current skills added yet.</span>
                ) : (
                  currentSkills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveCurrentSkill(s)}
                        className="hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              {errors.currentSkills && (
                <p className="text-xs text-rose-500 mt-1">{errors.currentSkills}</p>
              )}
            </div>

            {/* Skills User Wants to Learn */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Skills You Want to Learn / Target *
                </label>
                <span className="text-[11px] text-slate-400">Goals for your placement</span>
              </div>
              <div className="flex gap-2 mb-2">
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
                  placeholder="Type target skill and press Enter (e.g. Docker, System Design)"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddTargetSkill(skillInputTarget)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                {targetSkills.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No target skills added yet.</span>
                ) : (
                  targetSkills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/60"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveTargetSkill(s)}
                        className="hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              {errors.targetSkills && (
                <p className="text-xs text-rose-500 mt-1">{errors.targetSkills}</p>
              )}

              {/* Quick Suggestions Helper */}
              <div className="mt-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  Quick add suggestions:
                </span>
                <div className="flex flex-wrap gap-1">
                  {SUGGESTED_SKILLS.slice(0, 10).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleAddTargetSkill(skill)}
                      disabled={targetSkills.includes(skill)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                        targetSkills.includes(skill)
                          ? 'opacity-40 border-slate-300 dark:border-slate-800 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-800 hover:border-sky-500 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Completed Projects & Portfolio Items */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Completed Projects & Portfolio Items
                </label>
                <span className="text-[11px] text-slate-400">Optional for deeper AI gap analysis</span>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={projectInput}
                  onChange={(e) => setProjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddProject(projectInput);
                    }
                  }}
                  placeholder="e.g. Chat App with WebSockets, REST E-Commerce API (Press Enter)"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddProject(projectInput)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                {completedProjects.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No past projects added yet. (e.g. Full-Stack Blog, Compiler, Calculator)</span>
                ) : (
                  completedProjects.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/60"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(p)}
                        className="hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Preparation Preferences Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              {/* Experience Level */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="beginner">Beginner / College Student</option>
                  <option value="entry">Entry-Level (0 - 1 years)</option>
                  <option value="mid">Mid-Level (1 - 3 years)</option>
                  <option value="senior">Senior / Experienced (3+ years)</option>
                </select>
              </div>

              {/* Daily Available Study Time */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> Daily Study Time
                </label>
                <select
                  value={dailyStudyHours}
                  onChange={(e) => setDailyStudyHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1 hour / day (Light)</option>
                  <option value={2}>2 hours / day (Recommended)</option>
                  <option value={3}>3 hours / day (Focused)</option>
                  <option value={4}>4+ hours / day (Bootcamp Pace)</option>
                </select>
              </div>

              {/* Target Preparation Duration */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Target Duration
                </label>
                <select
                  value={targetDurationWeeks}
                  onChange={(e) => setTargetDurationWeeks(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1 Week (Emergency Sprint)</option>
                  <option value={2}>2 Weeks (Accelerated)</option>
                  <option value={4}>4 Weeks / 1 Month (Standard)</option>
                  <option value={8}>8 Weeks / 2 Months (In-Depth)</option>
                  <option value={12}>12 Weeks / 3 Months (Comprehensive)</option>
                </select>
              </div>

              {/* Preferred Difficulty */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-indigo-500" /> Preferred Difficulty
                </label>
                <select
                  value={preferredDifficulty}
                  onChange={(e) => setPreferredDifficulty(e.target.value as LearningDifficulty)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="beginner">Beginner Friendly</option>
                  <option value="intermediate">Intermediate (Placement Standard)</option>
                  <option value="advanced">Advanced (Tier-1 Product Companies)</option>
                  <option value="intensive">Intensive (Rigorous FAANG / MAANG style)</option>
                </select>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              {isEdit && profileToEdit ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete Profile
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeProfileModal}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isEdit ? 'Save Changes' : 'Complete Setup'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
