/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAdminUsers,
  fetchAdminUserDetail,
  updateAdminUserStatus,
  AdminUserListItem,
} from '../../services/authApi';
import { ProfileDataStore } from '../../types';
import {
  Search,
  Filter,
  UserCheck,
  UserX,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  Shield,
  Calendar,
  MessageSquareCode,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const AdminUsersTab: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<{
    user: AdminUserListItem;
    profileStore: ProfileDataStore;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    user: AdminUserListItem;
    newStatus: 'active' | 'disabled';
  } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminUsers({
        page,
        limit: 12,
        search,
        status: statusFilter,
        role: roleFilter,
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter, roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleOpenDetail = async (userItem: AdminUserListItem) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await fetchAdminUserDetail(userItem.id);
      setSelectedStudentDetail(detail);
    } catch (err: any) {
      setError(`Error loading student details: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmStatusModal) return;
    setStatusUpdating(true);
    setError(null);
    try {
      await updateAdminUserStatus(confirmStatusModal.user.id, confirmStatusModal.newStatus);
      setConfirmStatusModal(null);
      await loadUsers();
    } catch (err: any) {
      setError(`Error updating account status: ${err.message}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Student Accounts & Role Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspect student onboarding profiles, learning progress, and enforce account access controls.
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total registered accounts: <strong className="text-slate-900 dark:text-white">{total}</strong>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, email, or user ID..."
              className="w-full pl-9 pr-20 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="disabled">Suspended Only</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="student">Students</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            Loading user records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-500">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No users found matching your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Student / User</th>
                  <th className="py-3 px-4">Target Role</th>
                  <th className="py-3 px-4">Role & Status</th>
                  <th className="py-3 px-4">Curricula & Interviews</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const isCurrentAdmin = u.id === currentAdmin?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrentAdmin && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 font-extrabold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {u.hasProfile ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {u.targetRole || 'Software Engineer'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not completed</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : 'Student'}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.status === 'disabled'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {u.status === 'disabled' ? 'Suspended' : 'Active'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          <span>{u.roadmap7Count + u.roadmap30Count} roadmaps</span>
                          <span className="mx-1">•</span>
                          <span>{u.interviewCount} interviews</span>
                          {u.highestInterviewScore !== null && u.highestInterviewScore !== undefined && (
                            <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              (Best: {u.highestInterviewScore}%)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail Modal */}
                          <button
                            onClick={() => handleOpenDetail(u)}
                            disabled={detailLoading}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title="View student profile & activity details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Account Status */}
                          {!isCurrentAdmin && (
                            <button
                              onClick={() =>
                                setConfirmStatusModal({
                                  user: u,
                                  newStatus: u.status === 'active' ? 'disabled' : 'active',
                                })
                              }
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                u.status === 'active'
                                  ? 'border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                              title={u.status === 'active' ? 'Suspend Student Account' : 'Reactivate Student Account'}
                            >
                              {u.status === 'active' ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page {page} of {totalPages} ({total} accounts)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Account Suspend / Activate */}
      {confirmStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmStatusModal.newStatus === 'disabled'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                }`}
              >
                {confirmStatusModal.newStatus === 'disabled' ? (
                  <UserX className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {confirmStatusModal.newStatus === 'disabled' ? 'Suspend Student Account?' : 'Reactivate Account?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Target Account:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {confirmStatusModal.user.name} ({confirmStatusModal.user.email})
                  </strong>
                </p>
                {confirmStatusModal.newStatus === 'disabled' ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
                    Suspending this account will immediately revoke all active student sessions. The student will be unable to log in until reactivated by an administrator.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                    Reactivating will restore login access to the student dashboard and existing learning records.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setConfirmStatusModal(null)}
                disabled={statusUpdating}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusChange}
                disabled={statusUpdating}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                  confirmStatusModal.newStatus === 'disabled'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {statusUpdating && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                <span>
                  Confirm {confirmStatusModal.newStatus === 'disabled' ? 'Suspension' : 'Reactivation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Student Details Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  {selectedStudentDetail.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedStudentDetail.user.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedStudentDetail.user.email} • ID: {selectedStudentDetail.user.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Profile Card */}
              {selectedStudentDetail.profileStore.profiles && selectedStudentDetail.profileStore.profiles.length > 0 ? (
                (() => {
                  const p = selectedStudentDetail.profileStore.profiles[0];
                  return (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Primary Onboarding Profile
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                          {p.targetRole}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Experience</span>
                          <strong className="text-slate-800 dark:text-slate-200 capitalize">{p.experienceLevel}</strong>
                        </div>
                        <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Daily Study</span>
                          <strong className="text-slate-800 dark:text-slate-200">{p.dailyStudyHours || 2} hrs/day</strong>
                        </div>
                        <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Target Timeline</span>
                          <strong className="text-slate-800 dark:text-slate-200">{p.targetDurationWeeks || 4} weeks</strong>
                        </div>
                        <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Difficulty</span>
                          <strong className="text-slate-800 dark:text-slate-200 capitalize">{p.preferredDifficulty}</strong>
                        </div>
                      </div>

                      {/* Current Skills */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block mb-1">Known Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {p.currentSkills && p.currentSkills.length > 0 ? (
                            p.currentSkills.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200 dark:border-emerald-800/60">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs italic">None listed</span>
                          )}
                        </div>
                      </div>

                      {/* Target Skills */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block mb-1">Target Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {p.targetSkills && p.targetSkills.length > 0 ? (
                            p.targetSkills.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium border border-indigo-200 dark:border-indigo-800/60">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs italic">None listed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 text-center text-xs text-slate-500">
                  Student has registered but not yet submitted an onboarding profile.
                </div>
              )}

              {/* Learning Progress Summary */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Roadmaps & Interview Activity Records
                </span>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-base font-black text-slate-900 dark:text-white block">
                      {Object.keys(selectedStudentDetail.profileStore.roadmaps7 || {}).length}
                    </span>
                    <span className="text-[10px] text-slate-500">7-Day Sprints</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-base font-black text-slate-900 dark:text-white block">
                      {Object.keys(selectedStudentDetail.profileStore.roadmaps30 || {}).length}
                    </span>
                    <span className="text-[10px] text-slate-500">30-Day Master Curricula</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-base font-black text-slate-900 dark:text-white block">
                      {Object.values(selectedStudentDetail.profileStore.interviews || {}).flat().length}
                    </span>
                    <span className="text-[10px] text-slate-500">Mock Interviews</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
