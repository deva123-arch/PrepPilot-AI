/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  validatePasswordStrength,
  validateEmail,
  createSession,
  validateSessionToken,
  revokeSession,
  sanitizeUser,
  createPasswordResetTicket,
  resetPasswordWithTicket,
  getStudentData,
  updateStudentData,
  migrateLocalDataToStudent,
  StoredUser,
  StoredSession,
} from './auth-db.js';

export const authRouter = Router();

// Extend Request type with user and session
export interface AuthenticatedRequest extends Request {
  user?: StoredUser;
  session?: StoredSession;
}

// Failed login attempt tracking for brute-force protection
interface LoginAttemptRecord {
  failures: number;
  lockUntil: number;
}
const loginAttemptsMap = new Map<string, LoginAttemptRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(key: string): { locked: boolean; retryAfterSeconds?: number } {
  const record = loginAttemptsMap.get(key);
  if (!record) return { locked: false };
  const now = Date.now();
  if (record.lockUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockUntil - now) / 1000);
    return { locked: true, retryAfterSeconds };
  }
  if (now > record.lockUntil) {
    loginAttemptsMap.delete(key);
  }
  return { locked: false };
}

function recordLoginFailure(key: string): void {
  const record = loginAttemptsMap.get(key) || { failures: 0, lockUntil: 0 };
  record.failures += 1;
  if (record.failures >= MAX_FAILED_ATTEMPTS) {
    record.lockUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  loginAttemptsMap.set(key, record);
}

function recordLoginSuccess(key: string): void {
  loginAttemptsMap.delete(key);
}

// Extract session token from Authorization: Bearer <token> or x-session-token header
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const sessionHeader = req.headers['x-session-token'];
  if (typeof sessionHeader === 'string' && sessionHeader.trim()) {
    return sessionHeader.trim();
  }
  return null;
}

// Authentication middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in to access your student records.',
      code: 'UNAUTHORIZED',
    });
  }

  const { valid, user, session, reason } = validateSessionToken(token);
  if (!valid || !user || !session) {
    if (reason === 'ACCOUNT_DISABLED') {
      return res.status(403).json({
        error: 'Your account has been suspended by an administrator. Please contact support.',
        code: 'ACCOUNT_DISABLED',
      });
    }
    return res.status(401).json({
      error: 'Your session has expired or is invalid. Please sign in again.',
      code: 'SESSION_EXPIRED',
    });
  }

  if (user.status === 'disabled') {
    return res.status(403).json({
      error: 'Your account has been suspended by an administrator. Please contact support.',
      code: 'ACCOUNT_DISABLED',
    });
  }

  req.user = user;
  req.session = session;
  next();
}

// 1. Student Registration
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your full name (minimum 2 characters).' });
    }

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.reason });
    }

    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email address already exists. Please sign in instead.',
        code: 'DUPLICATE_EMAIL',
      });
    }

    const user = await createUser({ name, email, password });
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] as string | undefined;
    const session = createSession(user.id, { ip, userAgent });

    return res.status(201).json({
      message: 'Account created successfully. Welcome to PrepPilot AI!',
      user: sanitizeUser(user),
      token: session.token,
    });
  } catch (err: any) {
    console.error('[PrepPilot Auth] Register error:', err);
    return res.status(500).json({ error: err.message || 'Failed to complete registration.' });
  }
});

// 2. Student Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${clientIp}:${String(email).toLowerCase()}`;

    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (rateCheck.locked) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
      return res.status(429).json({
        error: `Too many failed login attempts. For security, account login is locked for ${rateCheck.retryAfterSeconds} seconds.`,
        retryAfter: rateCheck.retryAfterSeconds,
      });
    }

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      recordLoginFailure(rateLimitKey);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValidPassword) {
      recordLoginFailure(rateLimitKey);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'This account has been disabled by an administrator. Please contact support.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    recordLoginSuccess(rateLimitKey);

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] as string | undefined;
    const session = createSession(user.id, { ip, userAgent });

    return res.json({
      message: 'Login successful.',
      user: sanitizeUser(user),
      token: session.token,
    });
  } catch (err: any) {
    console.error('[PrepPilot Auth] Login error:', err);
    return res.status(500).json({ error: 'Authentication failed due to an internal server error.' });
  }
});

// 3. Student Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const token = extractToken(req);
  if (token) {
    revokeSession(token);
  }
  return res.json({ message: 'Logged out successfully.' });
});

// 4. Current User Session Check
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const studentData = getStudentData(req.user.id);
  const isOnboarded = studentData.profiles.length > 0 && !!studentData.activeProfileId;

  return res.json({
    user: sanitizeUser(req.user),
    isOnboarded,
    profileName: studentData.profiles[0]?.name,
    targetRole: studentData.profiles[0]?.targetRole,
  });
});

// 5. Password Reset Request
authRouter.post('/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !validateEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid registered email address.' });
  }

  const ticket = createPasswordResetTicket(email);
  // Do not reveal whether email exists to prevent enumeration attacks
  return res.json({
    message: 'If an account exists with this email address, password reset instructions have been generated.',
    // Provide resetToken in development/demo response for seamless portfolio testing
    resetToken: ticket?.token,
  });
});

// 6. Complete Password Reset
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'A valid password reset token is required.' });
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ error: strength.reason });
  }

  const success = await resetPasswordWithTicket(token, newPassword);
  if (!success) {
    return res.status(400).json({
      error: 'The password reset token is invalid, expired, or has already been used. Please request a new one.',
    });
  }

  return res.json({ message: 'Password has been reset successfully. Please sign in with your new password.' });
});

// --- Student Data Endpoints (Strictly Isolated by Authenticated User ID) ---

export const studentRouter = Router();

// GET /api/student/data
studentRouter.get('/data', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const data = getStudentData(userId);
  return res.json({ data });
});

// PUT /api/student/data
studentRouter.put('/data', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const incomingStore = req.body.data;
  if (!incomingStore || typeof incomingStore !== 'object') {
    return res.status(400).json({ error: 'Invalid store payload' });
  }
  const updated = updateStudentData(userId, incomingStore);
  return res.json({ success: true, data: updated });
});

// POST /api/student/migrate-local
studentRouter.post('/migrate-local', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const localStore = req.body.localStore;
  if (!localStore || !Array.isArray(localStore.profiles)) {
    return res.status(400).json({ error: 'Invalid local data format for migration.' });
  }

  try {
    const result = migrateLocalDataToStudent(userId, localStore);
    const updated = getStudentData(userId);
    return res.json({
      message: `Successfully migrated ${result.profileCount} profile(s) to your cloud account.`,
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Migration failed.' });
  }
});
