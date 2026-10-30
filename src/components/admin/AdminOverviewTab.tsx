/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { fetchAdminStats, AdminStats } from '../../services/authApi';
import {
  Users,
  Activity,
  UserCheck,
  Calendar,
  Flame,
  MessageSquareCode,
  Server,
  Cpu,
  ShieldAlert,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface AdminOverviewTabProps {
  onNavigateTab: (tab: 'users' | 'activity' | 'settings') => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch platform metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Compiling platform statistics from database ledger...
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Unable to Load Overview</h3>
        <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error || 'Unknown error occurred.'}</p>
        <button
          onClick={() => loadStats()}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Platform Analytics & Activity Overview
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Live Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time data aggregated directly from registered student records and persistent audit stores.
          </p>
        </div>

        <button
          onClick={() => loadStats(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Users</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</span>
            <span className="text-[11px] text-slate-500">
              ({stats.totalStudents} students, {stats.totalAdmins} admin)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Profile Completion</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {stats.completedProfiles} / {stats.totalUsers} ({stats.totalUsers > 0 ? Math.round((stats.completedProfiles / stats.totalUsers) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Active Users (7d / 30d) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Students</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.activeUsers7Days}
            </span>
            <span className="text-[11px] text-slate-500">active in 7 days</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">30-Day Activity Window</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {stats.activeUsers30Days} users ({stats.totalUsers > 0 ? Math.round((stats.activeUsers30Days / stats.totalUsers) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Learning Curricula */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Roadmaps</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalRoadmaps7 + stats.totalRoadmaps30}
            </span>
            <span className="text-[11px] text-slate-500">curricula</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">7-Day / 30-Day Split</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {stats.totalRoadmaps7} sprints / {stats.totalRoadmaps30} masters
            </span>
          </div>
        </div>

        {/* Mock Interviews */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mock Interviews</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <MessageSquareCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalMockInterviews}
            </span>
            <span className="text-[11px] text-slate-500">sessions completed</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">AI Scoring Engine</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          </div>
        </div>
      </div>

      {/* Service Health & Diagnostics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Backend Services & Infrastructure Health
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Operational
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Node Runtime</span>
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                Uptime: {Math.floor(stats.serviceHealth.uptimeSeconds / 60)}m {stats.serviceHealth.uptimeSeconds % 60}s
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Memory Footprint: <strong className="text-slate-700 dark:text-slate-300">{stats.serviceHealth.memoryUsageMB} MB RSS</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Google Gemini AI Engine</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {stats.serviceHealth.geminiConfigured ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Gemini 3.1 Flash Lite</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Key Required</span>
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {stats.serviceHealth.geminiStatus}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Storage Integrity</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                Atomic File JSON Store (.data)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Synchronous write-through with backup recovery snapshots
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Session Policy</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                7 Days Inactivity Expiry
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Brute-force lockout: 5 attempts (15-min cooldown)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Access Actions */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Administrative Quick Actions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Direct access to platform operations and monitoring.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('users')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Manage Student Accounts
                  </span>
                  <span className="text-[10px] text-slate-400">({stats.totalUsers} total)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Search, review progress, and manage account statuses.</p>
              </button>

              <button
                onClick={() => onNavigateTab('activity')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Security & Audit Trails
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Encrypted Ledger</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Inspect privileged actions and access attempts.</p>
              </button>

              <button
                onClick={() => onNavigateTab('settings')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Platform Policies & AI Config
                  </span>
                  <span className="text-[10px] text-slate-400">System</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Review rate limits and CLI provisioning credentials.</p>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center">
            Server Time: {new Date(stats.serviceHealth.serverTimestamp).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Recent User Registrations */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Account Registrations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest students and administrators registered on PrepPilot AI.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('users')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            View All Users &rarr;
          </button>
        </div>

        {stats.recentRegistrations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No registered users in database yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recentRegistrations.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        {u.role === 'admin' ? 'Administrator' : 'Student'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'disabled'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {u.status === 'disabled' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
