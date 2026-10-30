/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';
import {
  User,
  Edit3,
  Briefcase,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Download,
  AlertTriangle,
  Archive,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  FolderGit2,
  Check,
} from 'lucide-react';

export const ProfilesListView: React.FC = () => {
  const {
    profiles,
    activeProfile,
    switchProfile,
    openEditProfileModal,
    openCreateProfileModal,
    archiveSecondaryProfile,
    exportMyData,
    openRestoreModal,
    addToast,
  } = useApp();

  const [legacyToArchive, setLegacyToArchive] = useState<UserProfile | null>(null);

  // Secondary legacy profiles if user previously created multiple
  const secondaryProfiles = profiles.filter((p) => p.id !== activeProfile?.id);

  const handleDownloadExport = (profileId?: string) => {
    try {
      const { json, filename, profileName } = exportMyData(profileId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Export Completed', `Successfully exported data for ${profileName} (${filename}).`);
    } catch (e: any) {
      addToast('error', 'Export Failed', e.message || 'Could not generate backup file.');
    }
  };

  if (!activeProfile) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-12 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          No Student Profile Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          Create your primary student profile to unlock personalized AI roadmaps, skill diagnostics, and mock interviews.
        </p>
        <button
          onClick={openCreateProfileModal}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Set Up Student Profile</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Student Profile & Preparation Track
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Single-student account architecture. All roadmaps, study streaks, skill diagnostics, and mock interviews are bound to this profile.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => handleDownloadExport(activeProfile.id)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            title="Download your profile data, roadmaps, and mock interview transcripts as a JSON backup file"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Export My Data</span>
          </button>

          <button
            onClick={() => openRestoreModal()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            title="Restore from saved snapshot or JSON backup file"
          >
            <span>Restore / Backup</span>
          </button>

          <button
            onClick={() => openEditProfileModal(activeProfile)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#818CF8] dark:hover:bg-indigo-300 dark:text-[#080D1B] text-xs font-bold shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Main Primary Profile Card */}
      <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-indigo-500/20 shrink-0">
              {activeProfile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {activeProfile.name}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                  <CheckCircle className="w-3 h-3" /> Primary Profile
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> Account ID: {activeProfile.id}
                </span>
              </div>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                Target Role: {activeProfile.targetRole}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Last modified: {new Date(activeProfile.updatedAt || activeProfile.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditProfileModal(activeProfile)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Profile & Goals</span>
            </button>
          </div>
        </div>

        {/* Learning Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold">Experience Level</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
              {activeProfile.experienceLevel} Level
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
              <Clock className="w-4 h-4 text-sky-500" />
              <span className="font-semibold">Daily Commitment</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {activeProfile.dailyStudyHours} Hours / Day
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="font-semibold">Target Timeline</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {activeProfile.targetDurationWeeks} Weeks
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
              <Layers className="w-4 h-4 text-purple-500" />
              <span className="font-semibold">Difficulty Mode</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
              {activeProfile.preferredDifficulty}
            </p>
          </div>
        </div>

        {/* Competencies & Skills Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Current Known Skills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Current Known Skills ({activeProfile.currentSkills.length})
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 min-h-[90px]">
              {activeProfile.currentSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Target Skills / Growth Goals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Target Growth Skills ({activeProfile.targetSkills.length})
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 min-h-[90px]">
              {activeProfile.targetSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Completed Projects */}
          <div className="md:col-span-2 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Completed Projects & Experience Portfolio</span>
            </h4>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              {activeProfile.completedProjects && activeProfile.completedProjects.length > 0 ? (
                <ul className="space-y-2 text-xs">
                  {activeProfile.completedProjects.map((proj, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{proj}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No previous projects logged yet. Add projects via Edit Profile.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legacy Multi-Profile Migration & Review Section (Only visible if secondary profiles exist) */}
      {secondaryProfiles.length > 0 && (
        <div className="p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Legacy Multiple Profiles Detected ({secondaryProfiles.length} track{secondaryProfiles.length > 1 ? 's' : ''})
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed max-w-3xl">
                In earlier releases, multiple candidate tracks were permitted. PrepPilot AI now uses a single-profile-per-student model.
                To prevent accidental data loss without guessing, you can review legacy records, export their data backups to JSON, make a different track your primary profile, or archive them cleanly.
              </p>
            </div>
          </div>

          {/* Secondary Profiles List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {secondaryProfiles.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 flex flex-col justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      ID: {p.id}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {p.targetRole}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {p.currentSkills.length} known skills • {p.dailyStudyHours} hrs/day
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleDownloadExport(p.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Export all data for this legacy profile"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Backup</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => switchProfile(p.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                      title="Set as your primary active student profile"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Make Primary</span>
                    </button>

                    <button
                      onClick={() => setLegacyToArchive(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                      title="Archive this legacy track"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {legacyToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Archive Legacy Profile "{legacyToArchive.name}"?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  This track will be removed from active browser storage. Your primary profile "{activeProfile.name}" will remain unaffected.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Tip: Download a backup first</span>
              <button
                type="button"
                onClick={() => handleDownloadExport(legacyToArchive.id)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download JSON
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLegacyToArchive(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  archiveSecondaryProfile(legacyToArchive.id);
                  setLegacyToArchive(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
