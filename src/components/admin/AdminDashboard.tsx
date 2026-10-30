/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminAuditLogsTab } from './AdminAuditLogsTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import {
  Shield,
  LayoutDashboard,
  Users,
  ScrollText,
  Sliders,
  LogOut,
  Sun,
  Moon,
  ArrowRight,
  ExternalLink,
  Compass,
} from 'lucide-react';

export type AdminTab = 'overview' | 'users' | 'activity' | 'settings';

interface AdminDashboardProps {
  onSwitchToStudentView: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSwitchToStudentView }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useApp();
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Platform Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
    { id: 'activity', label: 'Audit & Security Logs', icon: <ScrollText className="w-4 h-4" /> },
    { id: 'settings', label: 'System Policies', icon: <Sliders className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Portal Badge */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    PrepPilot<span className="text-indigo-600 dark:text-indigo-400 font-black">AI</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Admin Portal
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">
                  Platform Operations & Institutional Governance
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white dark:bg-purple-600 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Header Actions */}
            <div className="flex items-center gap-2">
              {/* Switch to Student Platform */}
              <button
                onClick={onSwitchToStudentView}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Switch back to student preparation dashboard"
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Student Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => toggleTheme()}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                title={`Toggle theme: Currently ${theme}`}
                aria-label={`Toggle theme: Currently ${theme}`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600" />
                )}
              </button>

              {/* Sign Out */}
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer text-xs font-semibold"
                title={`Sign out of administrator session (${user?.email})`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-around bg-slate-50 dark:bg-slate-900/80">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-semibold cursor-pointer ${
                currentTab === item.id
                  ? 'text-purple-600 dark:text-purple-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.icon}
              <span>{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'overview' && <AdminOverviewTab onNavigateTab={setCurrentTab} />}
        {currentTab === 'users' && <AdminUsersTab />}
        {currentTab === 'activity' && <AdminAuditLogsTab />}
        {currentTab === 'settings' && <AdminSettingsTab />}
      </main>

      {/* Clean Admin Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 py-5 text-xs text-slate-500 dark:text-slate-400 transition-colors mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-bold text-slate-700 dark:text-slate-300">PrepPilot AI</span>
            <span>• Administrator Control Operations</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Signed in as: <strong className="text-slate-700 dark:text-slate-300 font-mono">{user?.email}</strong></span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Server-Enforced RBAC Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
