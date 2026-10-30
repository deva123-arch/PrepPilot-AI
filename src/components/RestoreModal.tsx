/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  RotateCcw,
  X,
  ShieldCheck,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileJson,
  Layers,
  ArrowRight,
  Undo2,
  User,
  Calendar,
  MessageSquareCode,
} from 'lucide-react';
import {
  getAutoBackupSnapshot,
  ProfileDataStore,
  BackupValidationResult,
} from '../services/storage';

export const RestoreModal: React.FC = () => {
  const {
    isRestoreModalOpen,
    restoreModalReason,
    closeRestoreModal,
    restoreStore,
    validateBackup,
    revertLastRestore,
    hasPreRestoreBackup,
    exportMyData,
    profiles,
    activeProfile,
    currentRoadmap7,
    currentRoadmap30,
    interviews,
    addToast,
  } = useApp();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [restoreSource, setRestoreSource] = useState<'snapshot' | 'file'>('file');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const snapshot = getAutoBackupSnapshot();

  if (!isRestoreModalOpen) return null;

  const handleClose = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setFileError(null);
    setIsConfirming(false);
    closeRestoreModal();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setFileError('Invalid file type. Please select a .json file.');
      setSelectedFile(null);
      setValidationResult(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds the 5MB safety limit.');
      setSelectedFile(null);
      setValidationResult(null);
      return;
    }

    setSelectedFile(file);
    setFileError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = validateBackup(text);
      if (!res.valid) {
        setFileError(res.error || 'Failed to validate backup structure.');
        setValidationResult(null);
      } else {
        setValidationResult(res);
        setFileError(null);
      }
    };
    reader.onerror = () => {
      setFileError('Failed to read the selected file.');
      setValidationResult(null);
    };
    reader.readAsText(file);
  };

  const handleInitiateRestore = () => {
    if (restoreSource === 'file') {
      if (!validationResult || !validationResult.valid || !validationResult.storeToRestore) {
        setFileError('Please select and verify a valid PrepPilot JSON backup file first.');
        return;
      }
    } else {
      if (!snapshot) {
        addToast('error', 'No Snapshot Found', 'No auto-backup snapshot is currently recorded.');
        return;
      }
    }
    // Proceed to explicit confirmation screen
    setIsConfirming(true);
  };

  const handleExecuteRestore = () => {
    let targetStore: ProfileDataStore | null = null;

    if (restoreSource === 'file') {
      if (!validationResult || !validationResult.storeToRestore) {
        setFileError('Validation expired. Please re-select your file.');
        setIsConfirming(false);
        return;
      }
      targetStore = validationResult.storeToRestore;
    } else {
      if (!snapshot) {
        addToast('error', 'No Snapshot Found', 'No auto-backup snapshot is currently recorded.');
        setIsConfirming(false);
        return;
      }
      targetStore = snapshot;
    }

    const success = restoreStore(targetStore);
    if (success) {
      const restoredProf = targetStore.profiles[0]?.name || 'Student';
      addToast(
        'success',
        'Restore Complete',
        `Successfully restored profile for "${restoredProf}". A recovery point was preserved in case you need to revert.`
      );
      handleClose();
    } else {
      addToast('error', 'Restore Failed', 'Could not restore backup data. Please check the file contents.');
      setIsConfirming(false);
    }
  };

  const handleExportCurrent = () => {
    try {
      const { json, filename, profileName } = exportMyData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Backup Exported', `Downloaded current session for ${profileName} (${filename}).`);
    } catch (err: any) {
      addToast('error', 'Export Failed', err.message || 'Could not export current session.');
    }
  };

  const handleRevert = () => {
    const success = revertLastRestore();
    if (success) {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full my-auto transition-colors overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isConfirming ? 'Confirm Data Restoration' : 'Restore Session & Candidate Data'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isConfirming
                  ? 'Review the incoming records before applying changes to your browser storage.'
                  : 'Safely recover profiles, roadmaps, and mock interview transcripts.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancel and close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Revert Last Restore Banner if pre-restore backup exists */}
          {!isConfirming && hasPreRestoreBackup && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                <Undo2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  <strong>Undo Previous Restore:</strong> A recovery snapshot from before your last restore is available.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRevert}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
              >
                Revert Now
              </button>
            </div>
          )}

          {/* Diagnostic context if triggered by automatic recovery check */}
          {restoreModalReason && !isConfirming && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200 block">
                  Recovery Diagnostic Notice:
                </span>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  {restoreModalReason}
                </p>
              </div>
            </div>
          )}

          {isConfirming ? (
            /* STEP 2: Explicit Confirmation Screen */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-950 dark:text-amber-100">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Important Restoration Notice</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200">
                  Restoring will replace your current active candidate data with the records from the selected backup.
                </p>
                <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pt-1">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Zero Risk Guarantee: An automatic pre-restore backup of your current session will be saved first so you can revert anytime.
                  </span>
                </div>
              </div>

              {/* Preview of data being restored */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Verified Data to be Restored:
                </span>

                {restoreSource === 'file' && validationResult?.preview ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Student Profile</span>
                      <strong className="text-slate-900 dark:text-white block truncate">
                        {validationResult.preview.profileName}
                      </strong>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block truncate">
                        {validationResult.preview.targetRole}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Curriculum Roadmaps</span>
                      <strong className="text-slate-900 dark:text-white block">
                        {validationResult.preview.roadmapsCount} Active Plans
                      </strong>
                      <span className="text-[10px] text-slate-500 block">
                        7-Day Sprint & 30-Day Master
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Mock Interviews</span>
                      <strong className="text-slate-900 dark:text-white block">
                        {validationResult.preview.interviewsCount} Rounds Logged
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Study Activities</span>
                      <strong className="text-slate-900 dark:text-white block">
                        {validationResult.preview.activitiesCount} Recorded Sessions
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Restoring from auto-backup snapshot with <strong>{snapshot?.profiles.length || 0} candidate profile(s)</strong>.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STEP 1: Select Source & Verify File */
            <>
              {/* Currently loaded session summary */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Currently Loaded Session State:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Active Student</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs truncate block">
                      {activeProfile?.name || 'None'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Roadmaps</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {(currentRoadmap7 ? 1 : 0) + (currentRoadmap30 ? 1 : 0)} Active
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Mock Rounds</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {interviews.length} Recorded
                    </span>
                  </div>
                </div>
              </div>

              {/* Source Selector Tabs */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Select Restore Source:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreSource('file');
                      setFileError(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      restoreSource === 'file'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-semibold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <FileJson className="w-4 h-4 text-indigo-500" />
                      <span>PrepPilot JSON File</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Upload an exported "preppilot-my-data-*.json" file.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRestoreSource('snapshot');
                      setFileError(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      restoreSource === 'snapshot'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-semibold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <Database className="w-4 h-4 text-indigo-500" />
                      <span>Auto-Backup Snapshot</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {snapshot
                        ? `${snapshot.profiles.length} profile(s) in browser snapshot.`
                        : 'No local snapshot recorded.'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Source Details: File Input with Live Schema Validation */}
              {restoreSource === 'file' ? (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Choose Backup JSON File:
                  </label>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                  {fileError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{fileError}</span>
                    </div>
                  )}
                  {validationResult && validationResult.valid && validationResult.preview && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Valid Backup Verified</span>
                      </div>
                      <p className="text-[11px]">
                        Student: <strong>{validationResult.preview.profileName}</strong> ({validationResult.preview.targetRole})
                      </p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-emerald-800 dark:text-emerald-300 pt-1">
                        <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                          {validationResult.preview.roadmapsCount} Plans
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                          {validationResult.preview.interviewsCount} Interviews
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                          {validationResult.preview.activitiesCount} Activities
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <p>
                    <strong>Auto-Backup Snapshot:</strong> PrepPilot automatically mirrors your data store whenever profile or task modifications occur.
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Restoring this snapshot will recover candidate profiles, roadmaps, and mock interview logs while preserving your chosen theme preference.
                  </p>
                </div>
              )}

              {/* Theme Preference Preservation Notice */}
              <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Theme Preservation: Your active light/dark mode preference will remain unchanged.</span>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          {!isConfirming ? (
            <button
              type="button"
              onClick={handleExportCurrent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Download a backup file of your current session before restoring"
            >
              <Download className="w-3.5 h-3.5" /> Export Current Data
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {!isConfirming ? (
              <button
                type="button"
                onClick={handleInitiateRestore}
                disabled={restoreSource === 'file' && (!validationResult || !validationResult.valid)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-[#818CF8] dark:hover:bg-indigo-300 dark:text-[#080D1B] shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue to Restore</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Apply Restore</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
