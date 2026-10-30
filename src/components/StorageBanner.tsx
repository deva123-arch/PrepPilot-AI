/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Download, RotateCcw, ShieldCheck, X, CloudUpload, CheckCircle } from 'lucide-react';
import { exportDataAsJson, isStorageNoticeDismissed, dismissStorageNotice } from '../services/storage';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const StorageBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => isStorageNoticeDismissed());
  const { addToast, openRestoreModal, migrateLocalData, isCloudSynced } = useApp();
  const { user } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);

  if (dismissed) return null;

  const handleExport = () => {
    const json = exportDataAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preppilot_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Backup Exported', 'Downloaded complete profile and roadmap data as JSON.');
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    await migrateLocalData();
    setIsMigrating(false);
  };

  const handleDismiss = () => {
    dismissStorageNotice();
    setDismissed(true);
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 py-2 px-4 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            {user ? (
              <>
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">Authenticated Student Account:</strong> Logged in as <span className="text-indigo-600 dark:text-indigo-400 font-bold">{user.email}</span>. Your private roadmaps and interview records are isolated to your student account.
              </>
            ) : (
              <>
                <strong className="text-slate-800 dark:text-slate-200 font-medium">Browser Storage Sandbox:</strong> Profiles and preparation records are preserved locally in this browser session.
              </>
            )}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 font-medium">
            <ShieldCheck className="w-3 h-3" /> {user ? 'Isolated Student Session' : 'Local Sandbox'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Import local browser data into your cloud student account"
            >
              <CloudUpload className="w-3 h-3" />
              <span>{isMigrating ? 'Migrating...' : 'Migrate Local Data'}</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Download JSON backup of all profiles and progress"
          >
            <Download className="w-3 h-3" /> Export Backup
          </button>

          <button
            onClick={() => openRestoreModal()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-medium transition-colors cursor-pointer"
            title="Restore from snapshot or backup file"
          >
            <RotateCcw className="w-3 h-3" /> Restore
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
