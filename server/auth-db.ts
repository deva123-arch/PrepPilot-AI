/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { ProfileDataStore, UserProfile } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory for persistent server-side records
const DATA_DIR = path.resolve(__dirname, '../.data');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[PrepPilot Server] Failed to create data directory, fallback to memory', err);
  }
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const RESET_TOKENS_FILE = path.join(DATA_DIR, 'reset_tokens.json');
const STUDENT_RECORDS_FILE = path.join(DATA_DIR, 'student_records.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'audit_logs.json');

export type UserRole = 'student' | 'admin';
export type UserStatus = 'active' | 'disabled';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLoginAt: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
}

export interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: number; // epoch ms
  ip?: string;
  userAgent?: string;
}

export interface PasswordResetTicket {
  token: string;
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: number; // epoch ms
  used: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetId?: string;
  details: string;
  ip?: string;
}

export interface SanitizedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string;
  emailVerified: boolean;
}

export interface SanitizedUserWithStats extends SanitizedUser {
  hasProfile: boolean;
  targetRole?: string;
  profileCount: number;
  roadmap7Count: number;
  roadmap30Count: number;
  interviewCount: number;
  highestInterviewScore?: number | null;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers7Days: number;
  activeUsers30Days: number;
  totalStudents: number;
  totalAdmins: number;
  completedProfiles: number;
  totalRoadmaps7: number;
  totalRoadmaps30: number;
  totalMockInterviews: number;
  recentRegistrations: SanitizedUser[];
  serviceHealth: {
    nodeEnv: string;
    uptimeSeconds: number;
    memoryUsageMB: number;
    geminiConfigured: boolean;
    geminiStatus: string;
    serverTimestamp: string;
  };
}

// In-memory caches backed by JSON files
let usersCache: Map<string, StoredUser> = new Map();
let sessionsCache: Map<string, StoredSession> = new Map();
let resetTokensCache: Map<string, PasswordResetTicket> = new Map();
let studentRecordsCache: Map<string, ProfileDataStore> = new Map();
let auditLogsCache: AuditLog[] = [];

// Helper: atomic file write to prevent corruption
function writeJsonAtomic(filePath: string, data: any): void {
  try {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[PrepPilot Server] Error writing file ${filePath}:`, err);
  }
}

function readJsonSafe<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`[PrepPilot Server] Error reading file ${filePath}, using default`, err);
  }
  return defaultVal;
}

// Initialize stores from disk
export function initAuthDatabase(): void {
  // Load users
  const rawUsers = readJsonSafe<Record<string, StoredUser>>(USERS_FILE, {});
  usersCache.clear();
  Object.values(rawUsers).forEach((u) => {
    // Migration helper: default existing records to student and active
    u.role = u.role || 'student';
    u.status = u.status || 'active';
    usersCache.set(u.id, u);
  });

  // Load sessions
  const rawSessions = readJsonSafe<Record<string, StoredSession>>(SESSIONS_FILE, {});
  sessionsCache.clear();
  const now = Date.now();
  Object.values(rawSessions).forEach((s) => {
    if (s.expiresAt > now) {
      sessionsCache.set(s.token, s);
    }
  });

  // Load reset tokens
  const rawResetTokens = readJsonSafe<Record<string, PasswordResetTicket>>(RESET_TOKENS_FILE, {});
  resetTokensCache.clear();
  Object.values(rawResetTokens).forEach((t) => {
    if (t.expiresAt > now && !t.used) {
      resetTokensCache.set(t.token, t);
    }
  });

  // Load student records
  const rawRecords = readJsonSafe<Record<string, ProfileDataStore>>(STUDENT_RECORDS_FILE, {});
  studentRecordsCache.clear();
  Object.entries(rawRecords).forEach(([userId, data]) => {
    studentRecordsCache.set(userId, data);
  });

  // Load audit logs
  auditLogsCache = readJsonSafe<AuditLog[]>(AUDIT_LOGS_FILE, []);

  // Bootstrap initial administrator if none exists
  bootstrapInitialAdmin();

  console.log(
    `[PrepPilot Server] Auth & Student Database initialized: ${usersCache.size} registered users (${countAdmins()} admin), ${sessionsCache.size} active sessions, ${studentRecordsCache.size} private records, ${auditLogsCache.length} audit events.`
  );
}

function countAdmins(): number {
  let count = 0;
  for (const u of usersCache.values()) {
    if (u.role === 'admin') count++;
  }
  return count;
}

/**
 * Bootstrap an initial administrator if none exists in database.
 * This guarantees a secure, trusted administrative account is available on first launch.
 */
async function bootstrapInitialAdmin(): Promise<void> {
  const hasAdmin = Array.from(usersCache.values()).some((u) => u.role === 'admin');
  if (hasAdmin) return;

  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@preppilot.ai').trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'PrepPilotAdmin2026!';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Platform Administrator';

  const existing = findUserByEmail(adminEmail);
  if (existing) {
    existing.role = 'admin';
    existing.status = 'active';
    saveUsers();
    logAuditEvent({
      actorId: 'system',
      actorEmail: 'system@preppilot.internal',
      action: 'ADMIN_PROMOTED_BOOTSTRAP',
      targetId: existing.id,
      details: `Existing user ${adminEmail} promoted to administrator on bootstrap`,
      ip: '127.0.0.1',
    });
    return;
  }

  const { hash, salt } = await hashPassword(adminPassword);
  const now = new Date().toISOString();
  const id = `usr_adm_${crypto.randomBytes(6).toString('hex')}`;

  const adminUser: StoredUser = {
    id,
    email: adminEmail,
    name: adminName,
    passwordHash: hash,
    salt,
    createdAt: now,
    lastLoginAt: now,
    emailVerified: true,
    role: 'admin',
    status: 'active',
  };

  usersCache.set(id, adminUser);
  saveUsers();

  logAuditEvent({
    actorId: 'system',
    actorEmail: 'system@preppilot.internal',
    action: 'INITIAL_ADMIN_PROVISIONED',
    targetId: id,
    details: `Bootstrap initial administrator provisioned with email: ${adminEmail}`,
    ip: '127.0.0.1',
  });

  console.log(`[PrepPilot Server] Initial administrator created: ${adminEmail}`);
}

// Persist users to disk
function saveUsers(): void {
  const obj: Record<string, StoredUser> = {};
  usersCache.forEach((u, id) => { obj[id] = u; });
  writeJsonAtomic(USERS_FILE, obj);
}

// Persist sessions to disk
function saveSessions(): void {
  const obj: Record<string, StoredSession> = {};
  const now = Date.now();
  sessionsCache.forEach((s, token) => {
    if (s.expiresAt > now) {
      obj[token] = s;
    }
  });
  writeJsonAtomic(SESSIONS_FILE, obj);
}

// Persist reset tokens to disk
function saveResetTokens(): void {
  const obj: Record<string, PasswordResetTicket> = {};
  const now = Date.now();
  resetTokensCache.forEach((t, token) => {
    if (t.expiresAt > now && !t.used) {
      obj[token] = t;
    }
  });
  writeJsonAtomic(RESET_TOKENS_FILE, obj);
}

// Persist student records to disk
function saveStudentRecords(): void {
  const obj: Record<string, ProfileDataStore> = {};
  studentRecordsCache.forEach((rec, userId) => {
    obj[userId] = rec;
  });
  writeJsonAtomic(STUDENT_RECORDS_FILE, obj);
}

// Persist audit logs to disk
function saveAuditLogs(): void {
  // Keep last 5,000 logs to prevent unbounded file growth
  if (auditLogsCache.length > 5000) {
    auditLogsCache = auditLogsCache.slice(-5000);
  }
  writeJsonAtomic(AUDIT_LOGS_FILE, auditLogsCache);
}

// --- Cryptographic Security Functions ---

/**
 * Scrypt-based password hashing with individual salt.
 * Scrypt is memory-hard and computationally resistant to GPU/ASIC brute force attacks.
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ hash: derivedKey.toString('hex'), salt });
    });
  });
}

/**
 * Constant-time comparison for password verification to prevent timing attacks.
 */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const storedBuffer = Buffer.from(hash, 'hex');
        const computedBuffer = derivedKey;
        if (storedBuffer.length !== computedBuffer.length) {
          return resolve(false);
        }
        resolve(crypto.timingSafeEqual(storedBuffer, computedBuffer));
      } catch {
        resolve(false);
      }
    });
  });
}

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (typeof password !== 'string' || password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 100) {
    return { valid: false, reason: 'Password cannot exceed 100 characters.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { valid: false, reason: 'Password must contain at least one letter and one number.' };
  }
  return { valid: true };
}

export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  // Standard RFC 5322 regex subset
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

// --- User Management Operations ---

export function findUserByEmail(email: string): StoredUser | null {
  const normalized = email.trim().toLowerCase();
  for (const user of usersCache.values()) {
    if (user.email.toLowerCase() === normalized) {
      return user;
    }
  }
  return null;
}

export function findUserById(id: string): StoredUser | null {
  return usersCache.get(id) || null;
}

/**
 * Public student registration: ALWAYS creates a standard student account with active status.
 * Never allows client-controlled elevation to admin.
 */
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<StoredUser> {
  const normalizedEmail = data.email.trim().toLowerCase();
  if (findUserByEmail(normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const { hash, salt } = await hashPassword(data.password);
  const now = new Date().toISOString();
  const id = `usr_${crypto.randomBytes(8).toString('hex')}`;

  const newUser: StoredUser = {
    id,
    email: normalizedEmail,
    name: data.name.trim().slice(0, 80),
    passwordHash: hash,
    salt,
    createdAt: now,
    lastLoginAt: now,
    emailVerified: false,
    role: 'student', // Strict role assignment: public registration cannot create admins
    status: 'active',
  };

  usersCache.set(id, newUser);
  saveUsers();

  // Create an initial empty student data store for this user
  const initialStore: ProfileDataStore = {
    version: 1,
    profiles: [],
    activeProfileId: null,
    analyses: {},
    roadmaps7: {},
    roadmaps30: {},
    interviews: {},
    activities: {},
    recommendations: {},
    analysisHistory: {},
  };
  studentRecordsCache.set(id, initialStore);
  saveStudentRecords();

  return newUser;
}

/**
 * Administrative creation of an administrator account.
 * Only callable via trusted server CLI or internal bootstrap.
 */
export async function createAdminUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<StoredUser> {
  const normalizedEmail = data.email.trim().toLowerCase();
  if (findUserByEmail(normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const { hash, salt } = await hashPassword(data.password);
  const now = new Date().toISOString();
  const id = `usr_adm_${crypto.randomBytes(8).toString('hex')}`;

  const adminUser: StoredUser = {
    id,
    email: normalizedEmail,
    name: data.name.trim().slice(0, 80),
    passwordHash: hash,
    salt,
    createdAt: now,
    lastLoginAt: now,
    emailVerified: true,
    role: 'admin',
    status: 'active',
  };

  usersCache.set(id, adminUser);
  saveUsers();

  logAuditEvent({
    actorId: 'admin_cli',
    actorEmail: 'admin_cli@preppilot.internal',
    action: 'ADMIN_ACCOUNT_CREATED',
    targetId: id,
    details: `New administrator account created for: ${normalizedEmail}`,
    ip: '127.0.0.1',
  });

  return adminUser;
}

export function sanitizeUser(user: StoredUser): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'student',
    status: user.status || 'active',
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    emailVerified: user.emailVerified,
  };
}

// --- Session Management ---

const SESSION_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSession(userId: string, metadata?: { ip?: string; userAgent?: string }): StoredSession {
  const token = `sess_${crypto.randomBytes(32).toString('hex')}`;
  const now = Date.now();
  const session: StoredSession = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: now + SESSION_EXPIRATION_MS,
    ip: metadata?.ip,
    userAgent: metadata?.userAgent,
  };

  sessionsCache.set(token, session);
  saveSessions();

  // Update user's last login timestamp
  const user = usersCache.get(userId);
  if (user) {
    user.lastLoginAt = new Date().toISOString();
    saveUsers();
  }

  return session;
}

export function validateSessionToken(token: string): {
  valid: boolean;
  user?: StoredUser;
  session?: StoredSession;
  reason?: 'EXPIRED' | 'NOT_FOUND' | 'ACCOUNT_DISABLED';
} {
  if (!token || typeof token !== 'string') return { valid: false, reason: 'NOT_FOUND' };

  const session = sessionsCache.get(token);
  if (!session) return { valid: false, reason: 'NOT_FOUND' };

  if (Date.now() > session.expiresAt) {
    sessionsCache.delete(token);
    saveSessions();
    return { valid: false, reason: 'EXPIRED' };
  }

  const user = usersCache.get(session.userId);
  if (!user) {
    sessionsCache.delete(token);
    saveSessions();
    return { valid: false, reason: 'NOT_FOUND' };
  }

  if (user.status === 'disabled') {
    return { valid: false, reason: 'ACCOUNT_DISABLED', user, session };
  }

  return { valid: true, user, session };
}

export function revokeSession(token: string): boolean {
  const deleted = sessionsCache.delete(token);
  if (deleted) {
    saveSessions();
  }
  return deleted;
}

export function revokeAllUserSessions(userId: string): void {
  for (const [token, sess] of sessionsCache.entries()) {
    if (sess.userId === userId) {
      sessionsCache.delete(token);
    }
  }
  saveSessions();
}

// --- Password Reset Support ---

export function createPasswordResetTicket(email: string): PasswordResetTicket | null {
  const user = findUserByEmail(email);
  if (!user) return null;

  const token = `rst_${crypto.randomBytes(24).toString('hex')}`;
  const ticket: PasswordResetTicket = {
    token,
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
    used: false,
  };

  resetTokensCache.set(token, ticket);
  saveResetTokens();
  return ticket;
}

export async function resetPasswordWithTicket(token: string, newPassword: string): Promise<boolean> {
  const ticket = resetTokensCache.get(token);
  if (!ticket || ticket.used || Date.now() > ticket.expiresAt) {
    return false;
  }

  const user = usersCache.get(ticket.userId);
  if (!user) return false;

  const { hash, salt } = await hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  saveUsers();

  ticket.used = true;
  saveResetTokens();

  // Invalidate all existing sessions on password reset for security
  revokeAllUserSessions(user.id);
  return true;
}

// --- Audit Logging ---

export function logAuditEvent(event: {
  actorId: string;
  actorEmail: string;
  action: string;
  targetId?: string;
  details: string;
  ip?: string;
}): AuditLog {
  const id = `aud_${crypto.randomBytes(8).toString('hex')}`;
  const entry: AuditLog = {
    id,
    timestamp: new Date().toISOString(),
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    action: event.action,
    targetId: event.targetId,
    details: event.details,
    ip: event.ip,
  };

  auditLogsCache.push(entry);
  saveAuditLogs();
  return entry;
}

export function getAuditLogs(options?: {
  page?: number;
  limit?: number;
  action?: string;
}): { logs: AuditLog[]; total: number; page: number; totalPages: number } {
  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options?.limit) || 20));
  const actionFilter = options?.action?.trim();

  let filtered = [...auditLogsCache];
  if (actionFilter && actionFilter !== 'ALL') {
    filtered = filtered.filter((log) => log.action === actionFilter);
  }

  // Sort descending by timestamp
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;
  const logs = filtered.slice(startIndex, startIndex + limit);

  return { logs, total, page, totalPages };
}

// --- Admin User Management Operations ---

export function updateUserStatus(userId: string, newStatus: UserStatus, actor: { id: string; email: string; ip?: string }): StoredUser {
  const user = usersCache.get(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Safety constraint: Administrator cannot disable their own account to prevent lockout
  if (user.id === actor.id && newStatus === 'disabled') {
    throw new Error('You cannot disable your own administrator account.');
  }

  const oldStatus = user.status;
  user.status = newStatus;
  saveUsers();

  // If user was disabled, invalidate all active sessions immediately
  if (newStatus === 'disabled') {
    revokeAllUserSessions(userId);
  }

  logAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'USER_STATUS_CHANGE',
    targetId: userId,
    details: `User status changed from '${oldStatus}' to '${newStatus}' for account ${user.email}`,
    ip: actor.ip,
  });

  return user;
}

export function getAllUsers(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}): { users: SanitizedUserWithStats[]; total: number; page: number; totalPages: number } {
  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options?.limit) || 15));
  const search = options?.search?.trim().toLowerCase();
  const statusFilter = options?.status?.trim().toLowerCase();
  const roleFilter = options?.role?.trim().toLowerCase();

  let list = Array.from(usersCache.values());

  if (search) {
    list = list.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        u.name.toLowerCase().includes(search) ||
        u.id.toLowerCase().includes(search)
    );
  }

  if (statusFilter && (statusFilter === 'active' || statusFilter === 'disabled')) {
    list = list.filter((u) => u.status === statusFilter);
  }

  if (roleFilter && (roleFilter === 'student' || roleFilter === 'admin')) {
    list = list.filter((u) => u.role === roleFilter);
  }

  // Sort descending by registration date
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;
  const paged = list.slice(startIndex, startIndex + limit);

  const usersWithStats: SanitizedUserWithStats[] = paged.map((u) => {
    const studentStore = studentRecordsCache.get(u.id);
    const activeProfile = studentStore?.profiles?.find(
      (p) => p.id === studentStore.activeProfileId
    ) || studentStore?.profiles?.[0];

    const interviews = studentStore?.interviews ? Object.values(studentStore.interviews).flat() : [];
    let highestScore: number | null = null;
    if (interviews.length > 0) {
      const scores = interviews
        .map((i) => i?.summary?.overallScore)
        .filter((s): s is number => typeof s === 'number');
      if (scores.length > 0) {
        highestScore = Math.max(...scores);
      }
    }

    const roadmaps7Count = studentStore?.roadmaps7 ? Object.keys(studentStore.roadmaps7).length : 0;
    const roadmaps30Count = studentStore?.roadmaps30 ? Object.keys(studentStore.roadmaps30).length : 0;

    return {
      ...sanitizeUser(u),
      hasProfile: !!activeProfile,
      targetRole: activeProfile?.targetRole,
      profileCount: studentStore?.profiles?.length || 0,
      roadmap7Count: roadmaps7Count,
      roadmap30Count: roadmaps30Count,
      interviewCount: interviews.length,
      highestInterviewScore: highestScore,
    };
  });

  return {
    users: usersWithStats,
    total,
    page,
    totalPages,
  };
}

export function getUserDetail(userId: string): {
  user: SanitizedUserWithStats;
  profileStore: ProfileDataStore;
} | null {
  const user = usersCache.get(userId);
  if (!user) return null;

  const studentStore = getStudentData(userId);
  const activeProfile = studentStore.profiles?.find(
    (p) => p.id === studentStore.activeProfileId
  ) || studentStore.profiles?.[0];

  const interviews = studentStore.interviews ? Object.values(studentStore.interviews).flat() : [];
  let highestScore: number | null = null;
  if (interviews.length > 0) {
    const scores = interviews
      .map((i) => i?.summary?.overallScore)
      .filter((s): s is number => typeof s === 'number');
    if (scores.length > 0) {
      highestScore = Math.max(...scores);
    }
  }

  const userStats: SanitizedUserWithStats = {
    ...sanitizeUser(user),
    hasProfile: !!activeProfile,
    targetRole: activeProfile?.targetRole,
    profileCount: studentStore.profiles?.length || 0,
    roadmap7Count: Object.keys(studentStore.roadmaps7 || {}).length,
    roadmap30Count: Object.keys(studentStore.roadmaps30 || {}).length,
    interviewCount: interviews.length,
    highestInterviewScore: highestScore,
  };

  return {
    user: userStats,
    profileStore: studentStore,
  };
}

export function getPlatformStats(isGeminiConfigured: boolean): PlatformStats {
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  let totalStudents = 0;
  let totalAdmins = 0;
  let activeUsers7Days = 0;
  let activeUsers30Days = 0;

  for (const user of usersCache.values()) {
    if (user.role === 'admin') totalAdmins++;
    else totalStudents++;

    const lastLogin = new Date(user.lastLoginAt || user.createdAt).getTime();
    if (now - lastLogin <= SEVEN_DAYS_MS) activeUsers7Days++;
    if (now - lastLogin <= THIRTY_DAYS_MS) activeUsers30Days++;
  }

  let completedProfiles = 0;
  let totalRoadmaps7 = 0;
  let totalRoadmaps30 = 0;
  let totalMockInterviews = 0;

  for (const store of studentRecordsCache.values()) {
    if (store.profiles && store.profiles.length > 0) {
      completedProfiles++;
    }
    if (store.roadmaps7) {
      totalRoadmaps7 += Object.keys(store.roadmaps7).length;
    }
    if (store.roadmaps30) {
      totalRoadmaps30 += Object.keys(store.roadmaps30).length;
    }
    if (store.interviews) {
      for (const list of Object.values(store.interviews)) {
        if (Array.isArray(list)) {
          totalMockInterviews += list.length;
        }
      }
    }
  }

  // Recent 5 registered users
  const recentUsers = Array.from(usersCache.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(sanitizeUser);

  const memUsage = process.memoryUsage();

  return {
    totalUsers: usersCache.size,
    activeUsers7Days,
    activeUsers30Days,
    totalStudents,
    totalAdmins,
    completedProfiles,
    totalRoadmaps7,
    totalRoadmaps30,
    totalMockInterviews,
    recentRegistrations: recentUsers,
    serviceHealth: {
      nodeEnv: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsageMB: Math.round(memUsage.rss / 1024 / 1024),
      geminiConfigured: isGeminiConfigured,
      geminiStatus: isGeminiConfigured ? 'Healthy (API Key Active)' : 'Warning (No API Key Configured)',
      serverTimestamp: new Date().toISOString(),
    },
  };
}

// --- Student Private Records Management (Isolated by Authenticated userId) ---

export function getStudentData(userId: string): ProfileDataStore {
  let record = studentRecordsCache.get(userId);
  if (!record) {
    record = {
      version: 1,
      profiles: [],
      activeProfileId: null,
      analyses: {},
      roadmaps7: {},
      roadmaps30: {},
      interviews: {},
      activities: {},
      recommendations: {},
      analysisHistory: {},
    };
    studentRecordsCache.set(userId, record);
    saveStudentRecords();
  }
  return record;
}

export function updateStudentData(userId: string, data: ProfileDataStore): ProfileDataStore {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid student data payload');
  }

  // Ensure data belongs strictly to this student
  const sanitizedProfiles = Array.isArray(data.profiles)
    ? data.profiles.map((p) => ({
        ...p,
        id: p.id || `prof-${userId.slice(4, 10)}`,
      }))
    : [];

  const sanitized: ProfileDataStore = {
    version: 1,
    profiles: sanitizedProfiles,
    activeProfileId: data.activeProfileId || (sanitizedProfiles[0]?.id ?? null),
    analyses: typeof data.analyses === 'object' && data.analyses !== null ? data.analyses : {},
    roadmaps7: typeof data.roadmaps7 === 'object' && data.roadmaps7 !== null ? data.roadmaps7 : {},
    roadmaps30: typeof data.roadmaps30 === 'object' && data.roadmaps30 !== null ? data.roadmaps30 : {},
    interviews: typeof data.interviews === 'object' && data.interviews !== null ? data.interviews : {},
    activities: typeof data.activities === 'object' && data.activities !== null ? data.activities : {},
    recommendations: typeof data.recommendations === 'object' && data.recommendations !== null ? data.recommendations : {},
    analysisHistory: typeof data.analysisHistory === 'object' && data.analysisHistory !== null ? data.analysisHistory : {},
  };

  studentRecordsCache.set(userId, sanitized);
  saveStudentRecords();
  return sanitized;
}

// Explicit local migration into student's cloud account
export function migrateLocalDataToStudent(userId: string, incomingStore: ProfileDataStore): { success: boolean; profileCount: number } {
  if (!incomingStore || !Array.isArray(incomingStore.profiles)) {
    throw new Error('Invalid incoming local store structure.');
  }

  const existing = getStudentData(userId);

  // If student already has an active profile, keep student's name/id prioritized
  const mergedProfiles: UserProfile[] = [...incomingStore.profiles];
  if (existing.profiles.length > 0) {
    const primaryId = existing.activeProfileId || existing.profiles[0].id;
    const existingPrimary = existing.profiles.find((p) => p.id === primaryId);
    if (existingPrimary) {
      mergedProfiles.unshift(existingPrimary);
    }
  }

  // Re-key dictionaries safely
  const updatedStore: ProfileDataStore = {
    version: 1,
    profiles: mergedProfiles,
    activeProfileId: mergedProfiles[0]?.id || null,
    analyses: { ...existing.analyses, ...(incomingStore.analyses || {}) },
    roadmaps7: { ...existing.roadmaps7, ...(incomingStore.roadmaps7 || {}) },
    roadmaps30: { ...existing.roadmaps30, ...(incomingStore.roadmaps30 || {}) },
    interviews: { ...existing.interviews, ...(incomingStore.interviews || {}) },
    activities: { ...existing.activities, ...(incomingStore.activities || {}) },
    recommendations: { ...existing.recommendations, ...(incomingStore.recommendations || {}) },
    analysisHistory: { ...existing.analysisHistory, ...(incomingStore.analysisHistory || {}) },
  };

  studentRecordsCache.set(userId, updatedStore);
  saveStudentRecords();

  return { success: true, profileCount: mergedProfiles.length };
}
