/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  findUserByEmail,
  verifyPassword,
  createSession,
  validateSessionToken,
  revokeSession,
  sanitizeUser,
  logAuditEvent,
  getAuditLogs,
  updateUserStatus,
  getAllUsers,
  getUserDetail,
  getPlatformStats,
  StoredUser,
  StoredSession,
} from './auth-db.js';
import { extractToken, AuthenticatedRequest } from './auth-routes.js';

export const adminRouter = Router();

/**
 * Strict server-side authorization middleware for all administrative routes.
 * Verifies that the request carries a valid session token corresponding to an active 'admin' account.
 * Logs any unauthorized or privilege escalation attempts to the audit log.
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in with an administrator account.',
      code: 'UNAUTHORIZED',
    });
  }

  const { valid, user, session, reason } = validateSessionToken(token);
  if (!valid || !user || !session) {
    if (reason === 'ACCOUNT_DISABLED') {
      return res.status(403).json({
        error: 'Your administrator account has been disabled. Please contact system support.',
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
      error: 'Your administrator account has been disabled.',
      code: 'ACCOUNT_DISABLED',
    });
  }

  // Enforce server-verified role
  if (user.role !== 'admin') {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: 'FAILED_PRIVILEGED_ACCESS',
      targetId: req.originalUrl,
      details: `Non-admin user (role '${user.role}') attempted privileged action: ${req.method} ${req.originalUrl}`,
      ip,
    });

    return res.status(403).json({
      error: 'Access denied. You do not have administrator permissions to access this resource.',
      code: 'FORBIDDEN_NOT_ADMIN',
    });
  }

  req.user = user;
  req.session = session;
  next();
}

/**
 * POST /api/admin/login
 * Dedicated administrative login endpoint with role enforcement and audit logging.
 */
adminRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Please provide both administrator email and password.' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      logAuditEvent({
        actorId: 'anonymous',
        actorEmail: email.toLowerCase(),
        action: 'FAILED_ADMIN_LOGIN',
        details: 'Admin login attempt with unknown email',
        ip,
      });
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValidPassword) {
      logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        action: 'FAILED_ADMIN_LOGIN',
        details: 'Admin login attempt with incorrect password',
        ip,
      });
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'This administrator account has been suspended.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    if (user.role !== 'admin') {
      logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        action: 'FAILED_PRIVILEGED_ACCESS',
        details: 'Non-admin student user attempted to authenticate via Admin Portal',
        ip,
      });
      return res.status(403).json({
        error: 'Access restricted: This account does not possess administrator privileges.',
        code: 'FORBIDDEN_NOT_ADMIN',
      });
    }

    const userAgent = req.headers['user-agent'] as string | undefined;
    const session = createSession(user.id, { ip, userAgent });

    logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: 'ADMIN_LOGIN',
      details: 'Administrator authenticated successfully',
      ip,
    });

    return res.json({
      message: 'Administrator authentication successful.',
      user: sanitizeUser(user),
      token: session.token,
    });
  } catch (err: any) {
    console.error('[PrepPilot Admin] Login error:', err);
    return res.status(500).json({ error: 'Authentication failed due to an internal server error.' });
  }
});

/**
 * POST /api/admin/logout
 */
adminRouter.post('/logout', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const token = extractToken(req);
  if (token) {
    revokeSession(token);
  }
  if (req.user) {
    logAuditEvent({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'ADMIN_LOGOUT',
      details: 'Administrator signed out',
      ip: req.ip || req.socket.remoteAddress,
    });
  }
  return res.json({ message: 'Administrator session terminated.' });
});

/**
 * GET /api/admin/stats
 * Aggregates accurate platform metrics from the real database without data fabrication.
 */
adminRouter.get('/stats', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const isGeminiConfigured = !!process.env.GEMINI_API_KEY;
  const stats = getPlatformStats(isGeminiConfigured);
  return res.json({ stats });
});

/**
 * GET /api/admin/users
 * Search and paginated list of registered users.
 */
adminRouter.get('/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 15;
  const search = (req.query.search as string) || '';
  const status = (req.query.status as string) || '';
  const role = (req.query.role as string) || '';

  const result = getAllUsers({ page, limit, search, status, role });
  return res.json(result);
});

/**
 * GET /api/admin/users/:id
 * Read-only detail view of a student's profile, roadmap progress, and interview records.
 */
adminRouter.get('/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  const detail = getUserDetail(userId);
  if (!detail) {
    return res.status(404).json({ error: 'Student record not found.' });
  }

  return res.json({
    user: detail.user,
    profileStore: detail.profileStore,
  });
});

/**
 * PATCH /api/admin/users/:id/status
 * Enable or disable a student account with audit logging.
 */
adminRouter.patch('/users/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (status !== 'active' && status !== 'disabled') {
      return res.status(400).json({ error: "Status must be either 'active' or 'disabled'." });
    }

    const actor = {
      id: req.user!.id,
      email: req.user!.email,
      ip: req.ip || req.socket.remoteAddress,
    };

    const updatedUser = updateUserStatus(userId, status, actor);
    return res.json({
      message: `Account status successfully updated to '${status}'.`,
      user: sanitizeUser(updatedUser),
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update user status.' });
  }
});

/**
 * GET /api/admin/audit-logs
 * Paginated query of system audit logs.
 */
adminRouter.get('/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const action = (req.query.action as string) || '';

  const result = getAuditLogs({ page, limit, action });
  return res.json(result);
});

/**
 * GET /api/admin/settings
 * Overview of system configuration and security policies.
 */
adminRouter.get('/settings', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  return res.json({
    settings: {
      platformName: 'PrepPilot AI',
      environment: process.env.NODE_ENV || 'development',
      sessionPolicy: {
        sessionDurationDays: 7,
        lockoutAttemptsThreshold: 5,
        lockoutDurationMinutes: 15,
        passwordResetExpiryMinutes: 15,
      },
      passwordPolicy: {
        minLength: 8,
        maxLength: 100,
        requireLetterAndNumber: true,
      },
      aiModelRouting: {
        primaryModel: 'gemini-3.1-flash-lite',
        fallbackModels: ['gemini-flash-lite-latest', 'gemini-flash-latest'],
        circuitBreakerCooldownMinutes: 10,
        rateLimitPerClientMinute: 30,
      },
      security: {
        passwordHashing: 'scrypt (memory-hard, random 16-byte salt, constant-time verification)',
        rbacEnforcement: 'Strict server-side verified role tokens',
        auditLogging: 'Comprehensive audit trails persisted to .data/audit_logs.json',
      },
    },
  });
});
