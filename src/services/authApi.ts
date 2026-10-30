/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProfileDataStore } from '../types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role?: 'student' | 'admin';
  status?: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
}

export interface AuthSessionResponse {
  message?: string;
  user: AuthenticatedUser;
  token: string;
}

export const AUTH_TOKEN_KEY = 'preppilot_auth_token';
export const AUTH_USER_KEY = 'preppilot_auth_user';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): AuthenticatedUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: AuthenticatedUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleAuthResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    const err: any = new Error(errorMsg);
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function registerStudent(data: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthSessionResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleAuthResponse<AuthSessionResponse>(res);
  saveAuthSession(result.token, result.user);
  return result;
}

export async function loginStudent(data: {
  email: string;
  password: string;
}): Promise<AuthSessionResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleAuthResponse<AuthSessionResponse>(res);
  saveAuthSession(result.token, result.user);
  return result;
}

export async function logoutStudent(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (e) {
    console.warn('Logout fetch error:', e);
  } finally {
    clearAuthSession();
  }
}

export async function fetchCurrentSession(): Promise<{
  user: AuthenticatedUser;
  isOnboarded: boolean;
  profileName?: string;
  targetRole?: string;
} | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      clearAuthSession();
      return null;
    }
    return handleAuthResponse(res);
  } catch {
    return null;
  }
}

export async function requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleAuthResponse(res);
}

export async function completePasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  return handleAuthResponse(res);
}

// Student Data Sync
export async function fetchServerStudentData(): Promise<ProfileDataStore> {
  const res = await fetch('/api/student/data', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await handleAuthResponse<{ data: ProfileDataStore }>(res);
  return data.data;
}

export async function saveServerStudentData(store: ProfileDataStore): Promise<ProfileDataStore> {
  const res = await fetch('/api/student/data', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ data: store }),
  });
  const data = await handleAuthResponse<{ data: ProfileDataStore }>(res);
  return data.data;
}

export async function migrateLocalDataToServer(localStore: ProfileDataStore): Promise<{ message: string; data: ProfileDataStore }> {
  const res = await fetch('/api/student/migrate-local', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ localStore }),
  });
  return handleAuthResponse(res);
}

// --- Admin Portal API Functions ---

export interface AdminStats {
  totalUsers: number;
  activeUsers7Days: number;
  activeUsers30Days: number;
  totalStudents: number;
  totalAdmins: number;
  completedProfiles: number;
  totalRoadmaps7: number;
  totalRoadmaps30: number;
  totalMockInterviews: number;
  recentRegistrations: AuthenticatedUser[];
  serviceHealth: {
    nodeEnv: string;
    uptimeSeconds: number;
    memoryUsageMB: number;
    geminiConfigured: boolean;
    geminiStatus: string;
    serverTimestamp: string;
  };
}

export interface AdminUserListItem extends AuthenticatedUser {
  hasProfile: boolean;
  targetRole?: string;
  profileCount: number;
  roadmap7Count: number;
  roadmap30Count: number;
  interviewCount: number;
  highestInterviewScore?: number | null;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetId?: string;
  details: string;
  ip?: string;
}

export async function loginAdmin(data: { email: string; password: string }): Promise<AuthSessionResponse> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await handleAuthResponse<AuthSessionResponse>(res);
  saveAuthSession(result.token, result.user);
  return result;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch('/api/admin/stats', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await handleAuthResponse<{ stats: AdminStats }>(res);
  return data.stats;
}

export async function fetchAdminUsers(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}): Promise<{ users: AdminUserListItem[]; total: number; page: number; totalPages: number }> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.search) params.set('search', options.search);
  if (options?.status) params.set('status', options.status);
  if (options?.role) params.set('role', options.role);

  const res = await fetch(`/api/admin/users?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleAuthResponse(res);
}

export async function fetchAdminUserDetail(userId: string): Promise<{
  user: AdminUserListItem;
  profileStore: ProfileDataStore;
}> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleAuthResponse(res);
}

export async function updateAdminUserStatus(
  userId: string,
  status: 'active' | 'disabled'
): Promise<{ message: string; user: AuthenticatedUser }> {
  const res = await fetch(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleAuthResponse(res);
}

export async function fetchAdminAuditLogs(options?: {
  page?: number;
  limit?: number;
  action?: string;
}): Promise<{ logs: AuditLogItem[]; total: number; page: number; totalPages: number }> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.action) params.set('action', options.action);

  const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleAuthResponse(res);
}

export async function fetchAdminSettings(): Promise<any> {
  const res = await fetch('/api/admin/settings', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleAuthResponse(res);
}

