/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  CheckCircle,
  Download,
  AlertCircle,
  Briefcase,
  Clock,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export const PrimaryProfileSelectorModal: React.FC = () => {
  const {
    profiles,
    activeProfile,
    selectPrimaryProfile,
    exportProfileBackup,
    addToast,
  } = useApp();

  const [dismissed, setDismissed] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(activeProfile?.id || profiles[0]?.id || '');

  // Only show if there are 2 or more profiles and user hasn't explicitly dismissed the modal
  if (dismissed || profiles.length <= 1) {
    return null;
  }

  const handleDownloadBackup = () => {
    try {
      const jsonStr = exportProfileBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preppilot_multi_profile_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Backup Exported', 'Saved complete multi-profile snapshot to JSON.');
    } catch (e) {
      addToast('error', 'Export Failed', 'Could not generate backup file.');
    }
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    selectPrimaryProfile(selectedId);
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Select Your Primary Student Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              We detected {profiles.length} profiles stored in your browser. PrepPilot AI now uses a single-profile architecture for focused placement preparation. Please choose which profile to retain as your active primary account.
            </p>
          </div>
        </div>

        {/* Safety Notice */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Zero Data Loss Guarantee:</strong> No profiles or roadmap history will be deleted. Secondary profiles will remain securely preserved in your backup ledger and can be reviewed or exported anytime from "My Profile".
          </p>
        </div>

        {/* Profile Options List */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {profiles.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 ring-1 ring-indigo-600'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {p.name}
                    </span>
                    {p.id === activeProfile?.id && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        Current Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                      <Briefcase className="w-3 h-3" /> {p.targetRole}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {p.dailyStudyHours} hrs/day
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Backup (JSON)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Review Later
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Confirm Primary Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
