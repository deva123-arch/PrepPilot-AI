/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import type { InterviewQuestion, QuestionEvaluation, InterviewSummary } from './src/types';
import { initAuthDatabase } from './server/auth-db.js';
import { authRouter, studentRouter, requireAuth } from './server/auth-routes.js';
import { adminRouter } from './server/admin-routes.js';

dotenv.config();

// Initialize server-side student accounts and auth database
initAuthDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cloud Run sets PORT=8080 which is occupied by Nginx reverse proxy.
// AI Studio dev server MUST bind to port 3000 on 0.0.0.0.
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));

// Production security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// In-memory sliding window rate limiter for Gemini endpoints: max 30 requests per minute per client IP
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function geminiRateLimiter(req: Request, res: Response, next: () => void) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, record);
    // Prune stale records periodically
    if (rateLimitMap.size > 1000) {
      for (const [key, val] of rateLimitMap.entries()) {
        if (now > val.resetAt) rateLimitMap.delete(key);
      }
    }
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: `Too many AI synthesis requests. Rate limit is ${RATE_LIMIT_MAX_REQUESTS} requests per minute. Please retry in ${retryAfter} seconds.`,
      isQuotaExhausted: true,
      retryAfter,
    });
  }

  record.count += 1;
  next();
}

// Authentication and Student Data API routes
app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/admin', adminRouter);

// Authentication-protected and rate-limited AI routes
app.use('/api/gemini', requireAuth, geminiRateLimiter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'PrepPilot AI Backend',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Server-side Gemini initialization
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

function checkAiAvailable(res: Response): boolean {
  if (!ai || !apiKey) {
    res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please attach an API key in the AI Studio Settings > Secrets panel.',
    });
    return false;
  }
  return true;
}

// In-memory cache for generation results to eliminate redundant calls
interface CacheEntry<T extends object> {
  data: T;
  cachedAt: number;
  telemetry: {
    durationMs: number;
    modelUsed: string;
    cached: boolean;
    tokenCount?: number;
  };
}

const serverCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL

function generateCacheKey(prefix: string, payload: any): string {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .substring(0, 16);
  return `${prefix}:${hash}`;
}

function getFromCache<T extends object>(key: string, forceRefresh = false): CacheEntry<T> | null {
  if (forceRefresh) return null;
  const entry = serverCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    serverCache.delete(key);
    return null;
  }
  return entry;
}

function setToCache<T extends object>(
  key: string,
  data: T,
  telemetry: { durationMs: number; modelUsed: string; tokenCount?: number }
) {
  if (serverCache.size > 200) {
    const oldestKey = serverCache.keys().next().value;
    if (oldestKey) serverCache.delete(oldestKey);
  }
  serverCache.set(key, {
    data,
    cachedAt: Date.now(),
    telemetry: { ...telemetry, cached: true },
  });
}

export interface GeminiCallResult {
  text: string;
  modelUsed: string;
  durationMs: number;
  tokens?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

// Model circuit breaker and last-known-good stickiness
const modelCooldownMap = new Map<string, number>();
let lastSuccessfulModel: string | null = null;

function isModelInCooldown(model: string): boolean {
  const expiresAt = modelCooldownMap.get(model);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    modelCooldownMap.delete(model);
    return false;
  }
  return true;
}

function getPrioritizedModels(preferredModels?: string[]): string[] {
  const defaults = preferredModels || [
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ];

  const healthy: string[] = [];
  const coolingDown: string[] = [];

  for (const m of defaults) {
    if (isModelInCooldown(m)) {
      coolingDown.push(m);
    } else {
      healthy.push(m);
    }
  }

  // If lastSuccessfulModel is healthy, place it at the very top of healthy list
  if (lastSuccessfulModel && healthy.includes(lastSuccessfulModel)) {
    const idx = healthy.indexOf(lastSuccessfulModel);
    if (idx > 0) {
      healthy.splice(idx, 1);
      healthy.unshift(lastSuccessfulModel);
    }
  }

  return [...healthy, ...coolingDown];
}

// Resilient caller with automatic multi-model fallback and safe telemetry logging
async function callGeminiWithRetry(params: {
  contents: string;
  config?: any;
  models?: string[];
  endpointTag?: string;
  timeoutMs?: number;
}): Promise<GeminiCallResult> {
  if (!ai) throw new Error('Gemini AI client not initialized');

  const candidateModels = getPrioritizedModels(params.models);
  let lastError: any = null;
  const timeoutMs = params.timeoutMs || 45000;

  for (const model of candidateModels) {
    const isDegraded = isModelInCooldown(model);
    // Max attempts for a healthy model is 2 (only for network blips); degraded models get 1 attempt
    const maxAttempts = isDegraded ? 1 : 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const t0 = Date.now();
      try {
        // Only models with thinking capability support thinkingConfig
        // Models like gemini-flash-lite-latest reject thinkingConfig with 400 INVALID_ARGUMENT
        const supportsThinking = !model.includes('flash-lite-latest');
        const callConfig: any = {
          ...params.config,
        };
        if (supportsThinking && !params.config?.thinkingConfig) {
          callConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on model ${model}`)), timeoutMs);
        });

        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: params.contents,
            config: callConfig,
          }),
          timeoutPromise,
        ]);

        const durationMs = Date.now() - t0;
        const tokens = response.usageMetadata
          ? {
              promptTokenCount: response.usageMetadata.promptTokenCount,
              candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
              totalTokenCount: response.usageMetadata.totalTokenCount,
            }
          : undefined;

        // Remember healthy model and clear any cooldown
        lastSuccessfulModel = model;
        modelCooldownMap.delete(model);

        // Safe diagnostic logging (no sensitive user data, no API keys)
        const tag = params.endpointTag || 'gemini-call';
        const tokenLog = tokens
          ? `tokens: ${tokens.totalTokenCount} (prompt: ${tokens.promptTokenCount}, out: ${tokens.candidatesTokenCount})`
          : 'tokens: N/A';
        console.log(
          `[PrepPilot AI Diagnostics] ${tag} -> model: ${model}, latency: ${durationMs}ms, ${tokenLog}`
        );

        return {
          text: response.text || '',
          modelUsed: model,
          durationMs,
          tokens,
        };
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || '';
        const isTimeout = msg.includes('Timeout after');
        const isQuotaError =
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('quota') ||
          msg.includes('Quota exceeded');
        const isCapacityError =
          isQuotaError ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          isTimeout;
        const isInvalidArgument =
          msg.includes('400') ||
          msg.includes('invalid argument') ||
          msg.includes('INVALID_ARGUMENT');

        if (isInvalidArgument) {
          // If 400 occurred and thinkingConfig was passed, retry once immediately without thinkingConfig
          console.warn(
            `[PrepPilot AI Routing] Model ${model} rejected request parameters (invalid argument). Bypassing to next model.`
          );
          break;
        }

        if (isCapacityError) {
          // If it's a quota error, cooldown model for 10 minutes; timeouts get 20s cooldown so healthy models recover quickly
          const cooldownDuration = isQuotaError ? 10 * 60 * 1000 : isTimeout ? 20_000 : 120_000;
          modelCooldownMap.set(model, Date.now() + cooldownDuration);
          if (lastSuccessfulModel === model) {
            lastSuccessfulModel = null;
          }
          console.warn(
            `[PrepPilot AI Routing] Model ${model} is experiencing capacity/quota constraints (${isQuotaError ? '429 Quota' : isTimeout ? 'Timeout' : '503'}). Instantly switching to next fallback model.`
          );
          // Never waste time retrying an overloaded/rate-limited model; immediately try the next model
          break;
        } else {
          // Transient network error (e.g. socket timeout): retry once after brief pause
          if (attempt === 0) {
            console.warn(
              `[PrepPilot AI Warning] Call with model ${model} (attempt 1) transient network glitch: ${msg.slice(0, 80)}. Retrying...`
            );
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          break;
        }
      }
    }
  }

  if (lastError) {
    const msg = lastError?.message || '';
    if (
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('quota') ||
      msg.includes('Quota exceeded')
    ) {
      lastError.status = 429;
      lastError.isQuotaExhausted = true;
      lastError.retryAfter = 60;
    }
  }

  throw lastError;
}

// Helper to strip markdown code fences safely
function parseJsonFromText(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

// Helper: add days to an ISO YYYY-MM-DD date string
function addDaysToDateServer(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const VALID_ROADMAP_CATEGORIES = [
  'Programming',
  'Data Structures & Algorithms',
  'Computer Science Fundamentals',
  'Projects & Architecture',
  'Aptitude & Logical Reasoning',
  'Interview Practice',
] as const;

function sanitizeRoadmapCategory(cat: string | undefined, topic: string, role = ''): string {
  if (cat && VALID_ROADMAP_CATEGORIES.includes(cat as any)) {
    return cat;
  }
  const lower = (topic + ' ' + (cat || '') + ' ' + role).toLowerCase();
  if (
    lower.includes('dsa') ||
    lower.includes('tree') ||
    lower.includes('graph') ||
    lower.includes('array') ||
    lower.includes('algorithm') ||
    lower.includes('sorting') ||
    lower.includes('recursion') ||
    lower.includes('dynamic programming') ||
    lower.includes('stack') ||
    lower.includes('queue') ||
    lower.includes('heap') ||
    lower.includes('linked list')
  ) {
    return 'Data Structures & Algorithms';
  }
  if (
    lower.includes('os') ||
    lower.includes('operating system') ||
    lower.includes('network') ||
    lower.includes('dbms') ||
    lower.includes('database') ||
    lower.includes('sql') ||
    lower.includes('concurrency') ||
    lower.includes('oops') ||
    lower.includes('memory')
  ) {
    return 'Computer Science Fundamentals';
  }
  if (
    lower.includes('project') ||
    lower.includes('architecture') ||
    lower.includes('microservice') ||
    lower.includes('system design') ||
    lower.includes('api') ||
    lower.includes('crud') ||
    lower.includes('full-stack') ||
    lower.includes('docker') ||
    lower.includes('redis')
  ) {
    return 'Projects & Architecture';
  }
  if (
    lower.includes('aptitude') ||
    lower.includes('reasoning') ||
    lower.includes('probability') ||
    lower.includes('puzzle') ||
    lower.includes('math')
  ) {
    return 'Aptitude & Logical Reasoning';
  }
  if (
    lower.includes('interview') ||
    lower.includes('mock') ||
    lower.includes('behavioral') ||
    lower.includes('hr') ||
    lower.includes('screening') ||
    lower.includes('revision')
  ) {
    return 'Interview Practice';
  }
  return 'Programming';
}

// Input constraint and validation helpers
export function sanitizeString(val: any, maxLength = 250, defaultVal = ''): string {
  if (typeof val !== 'string') return defaultVal;
  return val.trim().slice(0, maxLength);
}

export function sanitizeStringArray(arr: any, maxItems = 40, maxItemLen = 100): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxItemLen));
}

export function sanitizeNumber(val: any, min: number, max: number, defaultVal: number): number {
  const num = Number(val);
  if (isNaN(num)) return defaultVal;
  return Math.max(min, Math.min(max, Math.round(num)));
}

export function validateCandidateProfile(profile: any): { valid: boolean; error?: string; sanitized?: any } {
  if (!profile || typeof profile !== 'object') {
    return { valid: false, error: 'A valid candidate profile object is required.' };
  }
  const targetRole = sanitizeString(profile.targetRole, 100);
  if (!targetRole || targetRole.length < 2) {
    return { valid: false, error: 'Target role must be a non-empty string between 2 and 100 characters.' };
  }
  const name = sanitizeString(profile.name, 100, 'Candidate');
  const currentSkills = sanitizeStringArray(profile.currentSkills, 40, 80);
  const targetSkills = sanitizeStringArray(profile.targetSkills, 40, 80);
  const completedProjects = sanitizeStringArray(profile.completedProjects, 20, 120);
  const experienceLevel = ['entry', 'intermediate', 'experienced'].includes(profile.experienceLevel)
    ? profile.experienceLevel
    : 'entry';
  const dailyStudyHours = sanitizeNumber(profile.dailyStudyHours, 1, 12, 2);
  const targetDurationWeeks = sanitizeNumber(profile.targetDurationWeeks, 1, 52, 4);

  return {
    valid: true,
    sanitized: {
      id: sanitizeString(profile.id, 64, 'prof-default'),
      name,
      targetRole,
      currentSkills,
      targetSkills,
      completedProjects,
      experienceLevel,
      dailyStudyHours,
      targetDurationWeeks,
      preferredDifficulty: ['fundamental', 'intermediate', 'advanced'].includes(profile.preferredDifficulty)
        ? profile.preferredDifficulty
        : 'intermediate',
    },
  };
}

// Unified endpoint error handler with quota, timeout, safe logging, and friendly status codes
function handleEndpointError(err: any, actionName: string, res: Response) {
  const msg = err?.message || '';
  const isTimeout = msg.includes('Timeout after');
  const isQuota =
    err?.status === 429 ||
    err?.isQuotaExhausted ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('Quota exceeded');
  const statusCode = isQuota ? 429 : isTimeout ? 504 : 500;

  // Safe diagnostic log: Log only error category and truncated message; zero user content or tokens logged
  console.error(
    `[PrepPilot AI Diagnostics] ${actionName} error: ${err?.name || 'Error'} (Status ${statusCode}) - ${msg.slice(0, 150)}`
  );

  const userMessage = isQuota
    ? 'Gemini API free-tier request quota is currently exhausted. Please wait 60 seconds before retrying. Your existing data and progress remain safely intact.'
    : isTimeout
    ? `Synthesis for ${actionName} took longer than expected due to AI traffic latency. Please click retry; your existing data remains safely intact.`
    : `Failed to ${actionName}: ${msg.slice(0, 200) || 'Unknown error'}`;

  return res.status(statusCode).json({
    error: userMessage,
    isQuotaExhausted: isQuota,
    isTimeout,
    retryAfter: isQuota ? 60 : isTimeout ? 5 : undefined,
  });
}

// 1. Skill Gap Analysis Endpoint
app.post('/api/gemini/skill-analysis', async (req: Request, res: Response) => {
  if (!checkAiAvailable(res)) return;

  try {
    const profileValidation = validateCandidateProfile(req.body.profile);
    if (!profileValidation.valid) {
      return res.status(400).json({ error: profileValidation.error });
    }
    const profile = profileValidation.sanitized;
    const forceRefresh = !!req.body.forceRefresh;

    const cacheKey = generateCacheKey('skill-analysis', {
      profileId: profile.id,
      role: profile.targetRole,
      skills: profile.currentSkills,
      target: profile.targetSkills,
      level: profile.experienceLevel,
      hours: profile.dailyStudyHours,
      weeks: profile.targetDurationWeeks,
      projects: profile.completedProjects,
    });

    const cached = getFromCache(cacheKey, !!forceRefresh);
    if (cached) {
      res.setHeader('Server-Timing', `gemini;dur=0, total;dur=1;desc="Cache Hit"`);
      return res.json({
        ...cached.data,
        _telemetry: cached.telemetry,
      });
    }

    const completedProjectsList = Array.isArray(profile.completedProjects) && profile.completedProjects.length > 0
      ? profile.completedProjects.join(', ')
      : 'None listed yet';

    const prompt = `You are a Principal Technical Recruiter and University Placement Director.
Analyze this college student/candidate profile specifically for software development and internship/campus placement drives:
- Target Role: ${profile.targetRole}
- Current Known Skills: ${Array.isArray(profile.currentSkills) ? profile.currentSkills.join(', ') : 'None specified'}
- Skills to Learn: ${Array.isArray(profile.targetSkills) ? profile.targetSkills.join(', ') : 'None specified'}
- Experience Level: ${profile.experienceLevel}
- Completed Projects & Portfolio: ${completedProjectsList}
- Daily Available Preparation Time: ${profile.dailyStudyHours || 2} hours/day
- Target Preparation Timeline: ${profile.targetDurationWeeks || 4} weeks
- Learning Difficulty Preference: ${profile.preferredDifficulty || 'intermediate'}

Evaluate the gap between candidate's current capabilities and real industry hiring expectations for ${profile.targetRole} (e.g. SDE, Frontend, Backend, or Data Analyst).
For every identified skill gap, provide:
1. Priority (high, medium, low)
2. Category (e.g., Core CS & DSA, Architecture & System Design, Frameworks & Libraries, Databases, Testing & Reliability, DevOps)
3. Concise explanation of why technical interviewers test this
4. A concrete practical coding exercise or challenge to close the gap
5. A resume-worthy mini-project or feature concept

Return a structured JSON object with this exact schema:
{
  "knownSkills": ["string array of validated skills the candidate knows"],
  "missingSkills": ["string array of essential missing skills for ${profile.targetRole}"],
  "prioritySkills": [
    {
      "skill": "name of skill",
      "category": "e.g. Core CS & DSA, System Design, Backend, Frontend, Database, Testing",
      "priority": "high" | "medium" | "low",
      "reason": "concrete 1-sentence reason why technical interviewers test this for ${profile.targetRole}",
      "practicalExercise": "concrete 1-2 sentence coding exercise or practice challenge to close this gap",
      "projectIdea": "concrete resume-worthy project feature or architecture idea demonstrating this skill"
    }
  ],
  "recommendedTechnologies": [
    {
      "category": "e.g. Core Frameworks, Databases, Cloud & DevOps, Dev Tools",
      "items": ["tech1", "tech2"]
    }
  ],
  "suggestedProjects": [
    {
      "title": "project title",
      "description": "1-2 sentences explaining what to build and architectural patterns to demonstrate",
      "techStack": ["technology 1", "technology 2"],
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "portfolioImpact": "1 sentence explaining why placement interviewers value this on a resume"
    }
  ],
  "interviewReadiness": {
    "score": 68,
    "rating": "Developing",
    "explanation": "concise 1-2 sentence readiness baseline",
    "disclaimer": "This readiness score is an AI-estimated heuristic based on self-reported skills and target role benchmarks. It does not constitute an accredited or objective industry assessment."
  },
  "personalizedNextSteps": [
    "step 1 actionable directive",
    "step 2 actionable directive",
    "step 3 actionable directive"
  ]
}`;

    const geminiResult = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
      endpointTag: 'skill-analysis',
    });

    let parsed: any = {};
    try {
      parsed = parseJsonFromText(geminiResult.text);
    } catch (parseErr) {
      console.warn('[PrepPilot AI] JSON parse failed on skill-analysis output, applying graceful recovery');
      parsed = {};
    }

    // Safe schema sanitization and fallback normalization
    const rawKnown = Array.isArray(parsed.knownSkills) && parsed.knownSkills.length > 0
      ? parsed.knownSkills
      : (profile.currentSkills || []);
    const rawPriority = Array.isArray(parsed.prioritySkills) ? parsed.prioritySkills : [];

    const prioritySkills = rawPriority.length > 0
      ? rawPriority.map((item: any, idx: number) => {
          const p = String(item.priority || '').toLowerCase();
          const validP: 'high' | 'medium' | 'low' = p === 'high' || p === 'low' ? p : 'medium';
          return {
            skill: item.skill || `Core Competency ${idx + 1}`,
            category: item.category || 'Technical Proficiency',
            priority: validP,
            reason: item.reason || `Crucial competency evaluated during ${profile.targetRole} placement interviews.`,
            practicalExercise: item.practicalExercise || `Implement an exercise demonstrating ${item.skill || 'this skill'} with unit tests.`,
            projectIdea: item.projectIdea || `Build a feature showcasing ${item.skill || 'this skill'} in your portfolio repository.`,
          };
        })
      : [
          {
            skill: 'Data Structures & Algorithms',
            category: 'Core CS & DSA',
            priority: 'high' as const,
            reason: `Mandatory screening hurdle for ${profile.targetRole} placement rounds.`,
            practicalExercise: 'Solve 10 medium-level Tree and Graph problems analyzing time and space complexities.',
            projectIdea: 'Build an interactive visualizer for graph traversal and dynamic programming algorithms.',
          },
          {
            skill: 'System Design & Modularity',
            category: 'Architecture',
            priority: 'medium' as const,
            reason: 'Demonstrates ability to structure scalable, maintainable production software.',
            practicalExercise: 'Design a rate-limiting middleware or URL shortener with schema diagrams.',
            projectIdea: 'Implement an end-to-end service with clean layered architecture and error boundaries.',
          },
        ];

    const rawMissing = Array.isArray(parsed.missingSkills) && parsed.missingSkills.length > 0
      ? parsed.missingSkills
      : prioritySkills.map((p: any) => p.skill);

    const rawReadiness = parsed.interviewReadiness || {};
    const readinessScore = typeof rawReadiness.score === 'number'
      ? Math.max(0, Math.min(100, Math.round(rawReadiness.score)))
      : Math.min(95, Math.max(30, rawKnown.length * 14));

    const validRatings = ['Early Stage', 'Developing', 'Competitive', 'Interview Ready'] as const;
    const computedRating = validRatings.includes(rawReadiness.rating)
      ? rawReadiness.rating
      : readinessScore >= 80
      ? 'Interview Ready'
      : readinessScore >= 65
      ? 'Competitive'
      : readinessScore >= 45
      ? 'Developing'
      : 'Early Stage';

    const interviewReadiness = {
      score: readinessScore,
      rating: computedRating,
      explanation: rawReadiness.explanation || `Candidate exhibits foundational knowledge for ${profile.targetRole} with key gaps to close.`,
      disclaimer: 'This readiness score is an AI-estimated heuristic based on self-reported skills and target role benchmarks. It does not constitute an accredited or objective industry assessment.',
    };

    const recommendedTechnologies = Array.isArray(parsed.recommendedTechnologies) && parsed.recommendedTechnologies.length > 0
      ? parsed.recommendedTechnologies
      : [
          { category: 'Core Stack', items: [profile.targetRole.includes('Frontend') ? 'TypeScript, Next.js' : 'Node.js, PostgreSQL'] },
          { category: 'Testing & Tools', items: ['Jest/Vitest, Docker, Git CI/CD'] },
        ];

    const suggestedProjects = Array.isArray(parsed.suggestedProjects) && parsed.suggestedProjects.length > 0
      ? parsed.suggestedProjects
      : [
          {
            title: `${profile.targetRole} Capstone System`,
            description: 'Architect a full-stack production application demonstrating clean API boundaries and persistence.',
            techStack: profile.currentSkills.slice(0, 3),
            difficulty: 'Intermediate' as const,
            portfolioImpact: 'Directly validates practical software delivery for campus placement evaluators.',
          },
        ];

    const personalizedNextSteps = Array.isArray(parsed.personalizedNextSteps) && parsed.personalizedNextSteps.length > 0
      ? parsed.personalizedNextSteps
      : [
          `Prioritize closing high-severity gap in ${prioritySkills[0]?.skill || profile.targetRole}.`,
          `Implement practical challenge exercises daily to reinforce implementation confidence.`,
          `Simulate a technical mock interview round to test communication and time pressure handling.`,
        ];

    const resultData = {
      profileId: profile.id,
      targetRole: profile.targetRole,
      knownSkills: rawKnown,
      missingSkills: rawMissing,
      prioritySkills,
      recommendedTechnologies,
      suggestedProjects,
      interviewReadiness,
      personalizedNextSteps,
      analyzedAt: new Date().toISOString(),
    };

    setToCache(cacheKey, resultData, {
      durationMs: geminiResult.durationMs,
      modelUsed: geminiResult.modelUsed,
      tokenCount: geminiResult.tokens?.totalTokenCount,
    });

    res.setHeader('Server-Timing', `gemini;dur=${geminiResult.durationMs}`);
    return res.json({
      ...resultData,
      _telemetry: {
        durationMs: geminiResult.durationMs,
        modelUsed: geminiResult.modelUsed,
        cached: false,
        tokens: geminiResult.tokens,
      },
    });
  } catch (err: any) {
    return handleEndpointError(err, 'generate skill gap analysis', res);
  }
});

// 2. 7-Day Personalized Roadmap Endpoint (Fast & Scoped)
app.post('/api/gemini/generate-roadmap-7', async (req: Request, res: Response) => {
  if (!checkAiAvailable(res)) return;

  try {
    const profileValidation = validateCandidateProfile(req.body.profile);
    if (!profileValidation.valid) {
      return res.status(400).json({ error: profileValidation.error });
    }
    const profile = profileValidation.sanitized;
    const { skillGap, activities, forceRefresh } = req.body;

    const cacheKey = generateCacheKey('roadmap-7', {
      profileId: profile.id,
      role: profile.targetRole,
      skills: profile.currentSkills,
      target: profile.targetSkills,
      level: profile.experienceLevel,
      hours: profile.dailyStudyHours,
      activityCount: Array.isArray(activities) ? activities.length : 0,
    });

    const cached = getFromCache(cacheKey, !!forceRefresh);
    if (cached) {
      res.setHeader('Server-Timing', `gemini;dur=0, total;dur=1;desc="Cache Hit"`);
      return res.json({
        ...cached.data,
        _telemetry: cached.telemetry,
      });
    }

    const prioritySkillsList = (skillGap?.prioritySkills || [])
      .slice(0, 4)
      .map((s: any) => (typeof s === 'string' ? s : s.skill))
      .join(', ');

    const completedActivitiesList = Array.isArray(activities) && activities.length > 0
      ? activities.slice(-5).map((a: any) => a.title).join('; ')
      : 'None recorded yet';

    const prompt = `You are an elite Placement Coach creating a personalized 7-Day Intensive Placement Sprint for:
- Target Role: ${profile.targetRole}
- Current Skills: ${Array.isArray(profile.currentSkills) ? profile.currentSkills.join(', ') : 'None'}
- Target Skills: ${Array.isArray(profile.targetSkills) ? profile.targetSkills.join(', ') : 'None'}
- Experience Level: ${profile.experienceLevel}
- Daily Study Time: ${profile.dailyStudyHours || 2} hours (${(profile.dailyStudyHours || 2) * 60} mins)
${prioritySkillsList ? `- Priority Focus Areas: ${prioritySkillsList}` : ''}
- Prior Completed Activities: ${completedActivitiesList}

Generate a complete 7-day sprint (Days 1 to 7).
Balance tasks across realistic placement preparation categories:
- "Programming"
- "Data Structures & Algorithms"
- "Computer Science Fundamentals"
- "Projects & Architecture"
- "Aptitude & Logical Reasoning"
- "Interview Practice"

Keep each day actionable and concise:
- day: integer 1 to 7
- topic: Clear, focused title
- category: One of the 6 categories above
- priority: "high" | "medium" | "low"
- learningObjectives: Array with 1-2 crisp goals (under 12 words each)
- conceptsToStudy: Array with 2-3 essential concepts/terms
- practicalCodingExercise: Object with:
    - title: Exercise name
    - instructions: 1-2 sentence concrete coding challenge
    - starterHint: 1 helpful architectural or algorithmic hint
- estimatedMinutes: ${(profile.dailyStudyHours || 2) * 60}
- expectedOutcome: 1 concrete sentence describing what the candidate will have built or mastered

Return JSON matching this exact structure:
{
  "days": [
    {
      "day": 1,
      "topic": "Topic Title",
      "category": "Data Structures & Algorithms",
      "priority": "high",
      "learningObjectives": ["Objective 1", "Objective 2"],
      "conceptsToStudy": ["Concept 1", "Concept 2"],
      "practicalCodingExercise": {
        "title": "Exercise Title",
        "instructions": "Task description",
        "starterHint": "Helpful hint"
      },
      "estimatedMinutes": ${(profile.dailyStudyHours || 2) * 60},
      "expectedOutcome": "Tangible milestone"
    }
  ]
}
Ensure exactly 7 entries for days 1 to 7. Keep descriptions concise to maximize speed and clarity.`;

    const geminiResult = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
      endpointTag: 'roadmap-7',
    });

    const parsed = parseJsonFromText(geminiResult.text);
    const rawDays = Array.isArray(parsed.days) ? parsed.days : [];
    const startDate = new Date().toISOString().split('T')[0];

    // Robust validation: Ensure all 7 days are properly structured
    const days = Array.from({ length: 7 }, (_, idx) => {
      const dayNum = idx + 1;
      const existing = rawDays.find((d: any) => d.day === dayNum) || rawDays[idx] || {};
      const topic = existing.topic || `Day ${dayNum} Focus for ${profile.targetRole}`;
      const category = sanitizeRoadmapCategory(existing.category, topic, profile.targetRole);
      const rawPriority = String(existing.priority || '').toLowerCase();
      const priority = rawPriority === 'high' || rawPriority === 'low' ? rawPriority : idx < 2 ? 'high' : idx < 5 ? 'medium' : 'low';
      const targetDate = addDaysToDateServer(startDate, idx);

      return {
        day: dayNum,
        targetDate,
        topic,
        category,
        priority,
        status: 'incomplete' as const,
        learningObjectives: Array.isArray(existing.learningObjectives) && existing.learningObjectives.length > 0
          ? existing.learningObjectives
          : [`Master core ${profile.targetRole} concepts`],
        conceptsToStudy: Array.isArray(existing.conceptsToStudy) && existing.conceptsToStudy.length > 0
          ? existing.conceptsToStudy
          : ['Core Theory', 'Implementation Best Practices'],
        practicalCodingExercise: {
          title: existing.practicalCodingExercise?.title || `Day ${dayNum} Coding Challenge`,
          instructions: existing.practicalCodingExercise?.instructions || 'Implement a working module solving the day topic requirements.',
          starterHint: existing.practicalCodingExercise?.starterHint || 'Start with clean data structures and edge case validation.',
        },
        estimatedMinutes: existing.estimatedMinutes || (profile.dailyStudyHours || 2) * 60,
        expectedOutcome: existing.expectedOutcome || `Solid working proficiency in Day ${dayNum} concepts.`,
        completed: false,
      };
    });

    const resultData = {
      profileId: profile.id,
      targetRole: profile.targetRole,
      startDate,
      generatedAt: new Date().toISOString(),
      days,
    };

    setToCache(cacheKey, resultData, {
      durationMs: geminiResult.durationMs,
      modelUsed: geminiResult.modelUsed,
      tokenCount: geminiResult.tokens?.totalTokenCount,
    });

    res.setHeader('Server-Timing', `gemini;dur=${geminiResult.durationMs}`);
    return res.json({
      ...resultData,
      _telemetry: {
        durationMs: geminiResult.durationMs,
        modelUsed: geminiResult.modelUsed,
        cached: false,
        tokens: geminiResult.tokens,
      },
    });
  } catch (err: any) {
    return handleEndpointError(err, 'generate 7-day roadmap', res);
  }
});

// 3. 30-Day Personalized Roadmap Endpoint (Concise & Structured 4-Phases)
app.post('/api/gemini/generate-roadmap-30', async (req: Request, res: Response) => {
  if (!checkAiAvailable(res)) return;

  try {
    const profileValidation = validateCandidateProfile(req.body.profile);
    if (!profileValidation.valid) {
      return res.status(400).json({ error: profileValidation.error });
    }
    const profile = profileValidation.sanitized;
    const { skillGap, activities, forceRefresh } = req.body;

    const cacheKey = generateCacheKey('roadmap-30', {
      profileId: profile.id,
      role: profile.targetRole,
      skills: profile.currentSkills,
      target: profile.targetSkills,
      level: profile.experienceLevel,
      hours: profile.dailyStudyHours,
      activityCount: Array.isArray(activities) ? activities.length : 0,
    });

    const cached = getFromCache(cacheKey, !!forceRefresh);
    if (cached) {
      res.setHeader('Server-Timing', `gemini;dur=0, total;dur=1;desc="Cache Hit"`);
      return res.json({
        ...cached.data,
        _telemetry: cached.telemetry,
      });
    }

    const missingSkillsList = (skillGap?.missingSkills || []).slice(0, 5).join(', ');
    const completedActivitiesList = Array.isArray(activities) && activities.length > 0
      ? activities.slice(-5).map((a: any) => a.title).join('; ')
      : 'None recorded yet';

    const prompt = `You are a Senior Tech Placement Director creating a 30-Day Placement Curriculum for:
- Target Role: ${profile.targetRole}
- Current Skills: ${Array.isArray(profile.currentSkills) ? profile.currentSkills.join(', ') : 'None'}
- Target Skills: ${Array.isArray(profile.targetSkills) ? profile.targetSkills.join(', ') : 'None'}
- Experience Level: ${profile.experienceLevel}
- Daily Study Time: ${profile.dailyStudyHours || 2} hours (${(profile.dailyStudyHours || 2) * 60} mins)
${missingSkillsList ? `- Missing Skills to Prioritize: ${missingSkillsList}` : ''}
- Prior Completed Activities: ${completedActivitiesList}

Strictly map all 30 days across the 4 established learning phases:
- Phase 1 (Days 1–7): "Fundamentals & Essential Concepts"
- Phase 2 (Days 8–14): "Core Technical Skills & Problem-Solving"
- Phase 3 (Days 15–21): "Practical Implementation & Project Building"
- Phase 4 (Days 22–30): "Revision, Interview Practice & Placement Readiness"

Categorize every day into one of the 6 realistic placement preparation areas:
- "Programming"
- "Data Structures & Algorithms"
- "Computer Science Fundamentals"
- "Projects & Architecture"
- "Aptitude & Logical Reasoning"
- "Interview Practice"

Guidelines for fast, high-quality generation:
- Keep every day's entry crisp, focused, and actionable. Avoid unnecessarily long prose.
- For each day, include:
  - day: integer 1 to 30
  - phaseNumber: integer (1, 2, 3, or 4)
  - topic: 3 to 6 word title
  - category: One of the 6 categories above
  - priority: "high" | "medium" | "low"
  - learningObjectives: array of 1-2 concise goals
  - conceptsToStudy: array of 2-3 key terms
  - practicalExercise: { "title": "exercise name", "instructions": "1-2 sentence challenge", "starterHint": "1 sentence hint" }
  - estimatedMinutes: ${(profile.dailyStudyHours || 2) * 60}
  - expectedOutcome: 1 concise outcome sentence

Return valid JSON with schema:
{
  "phases": [
    { "phaseNumber": 1, "phaseTitle": "Fundamentals & Essential Concepts", "dayRange": "Days 1–7", "summary": "Core language concepts, memory model, and baseline DSA foundations." },
    { "phaseNumber": 2, "phaseTitle": "Core Technical Skills & Problem-Solving", "dayRange": "Days 8–14", "summary": "Advanced algorithms, asynchronous operations, and data patterns." },
    { "phaseNumber": 3, "phaseTitle": "Practical Implementation & Project Building", "dayRange": "Days 15–21", "summary": "Full-stack architectural design, database integration, APIs, and performance tuning." },
    { "phaseNumber": 4, "phaseTitle": "Revision, Interview Practice & Placement Readiness", "dayRange": "Days 22–30", "summary": "Mock interview drills, behavioral scenarios, system design, and placement prep." }
  ],
  "days": [
    {
      "day": 1,
      "phaseNumber": 1,
      "phaseTitle": "Fundamentals & Essential Concepts",
      "topic": "Topic Title",
      "category": "Computer Science Fundamentals",
      "priority": "high",
      "learningObjectives": ["Objective 1"],
      "conceptsToStudy": ["Concept 1", "Concept 2"],
      "practicalExercise": {
        "title": "Exercise Name",
        "instructions": "Brief 1-2 sentence task",
        "starterHint": "Brief hint"
      },
      "estimatedMinutes": ${(profile.dailyStudyHours || 2) * 60},
      "expectedOutcome": "Outcome"
    }
  ]
}
Ensure exactly 30 entries in "days" from day 1 to day 30.`;

    const geminiResult = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
      endpointTag: 'roadmap-30',
      timeoutMs: 65000,
    });

    const parsed = parseJsonFromText(geminiResult.text);
    const rawDays = Array.isArray(parsed.days) ? parsed.days : [];
    const startDate = new Date().toISOString().split('T')[0];

    const defaultPhases = [
      { phaseNumber: 1, phaseTitle: 'Fundamentals & Essential Concepts', dayRange: 'Days 1–7', summary: 'Core language concepts, memory model, and baseline DSA foundations.' },
      { phaseNumber: 2, phaseTitle: 'Core Technical Skills & Problem-Solving', dayRange: 'Days 8–14', summary: 'Advanced algorithms, asynchronous operations, and data patterns.' },
      { phaseNumber: 3, phaseTitle: 'Practical Implementation & Project Building', dayRange: 'Days 15–21', summary: 'Full-stack architectural design, database integration, APIs, and performance tuning.' },
      { phaseNumber: 4, phaseTitle: 'Revision, Interview Practice & Placement Readiness', dayRange: 'Days 22–30', summary: 'Mock interview drills, behavioral scenarios, system design, and placement prep.' },
    ];

    // Robust validation: Ensure all 30 days are generated and mapped to correct phases
    const days = Array.from({ length: 30 }, (_, idx) => {
      const dayNum = idx + 1;
      let phaseNumber = 1;
      let phaseTitle = 'Fundamentals & Essential Concepts';
      if (dayNum >= 8 && dayNum <= 14) {
        phaseNumber = 2;
        phaseTitle = 'Core Technical Skills & Problem-Solving';
      } else if (dayNum >= 15 && dayNum <= 21) {
        phaseNumber = 3;
        phaseTitle = 'Practical Implementation & Project Building';
      } else if (dayNum >= 22) {
        phaseNumber = 4;
        phaseTitle = 'Revision, Interview Practice & Placement Readiness';
      }

      const existing = rawDays.find((d: any) => d.day === dayNum) || rawDays[idx] || {};
      const topic = existing.topic || `Day ${dayNum}: ${phaseTitle} Mastery`;
      const category = sanitizeRoadmapCategory(existing.category, topic, profile.targetRole);
      const rawPriority = String(existing.priority || '').toLowerCase();
      const priority = rawPriority === 'high' || rawPriority === 'low' || rawPriority === 'medium' ? rawPriority : phaseNumber <= 2 ? 'high' : 'medium';
      const targetDate = addDaysToDateServer(startDate, idx);

      return {
        day: dayNum,
        targetDate,
        phaseNumber,
        phaseTitle,
        topic,
        category,
        priority,
        status: 'incomplete' as const,
        learningObjectives: Array.isArray(existing.learningObjectives) && existing.learningObjectives.length > 0
          ? existing.learningObjectives
          : [`Master technical requirements for Day ${dayNum}`],
        conceptsToStudy: Array.isArray(existing.conceptsToStudy) && existing.conceptsToStudy.length > 0
          ? existing.conceptsToStudy
          : ['Core Principles', 'Industry Best Practices'],
        practicalExercise: {
          title: existing.practicalExercise?.title || `Day ${dayNum} Implementation Challenge`,
          instructions: existing.practicalExercise?.instructions || 'Implement and verify a production-ready solution solving the topic challenge.',
          starterHint: existing.practicalExercise?.starterHint || 'Focus on modular separation and optimal time-complexity.',
        },
        estimatedMinutes: existing.estimatedMinutes || (profile.dailyStudyHours || 2) * 60,
        expectedOutcome: existing.expectedOutcome || `Demonstrated competency in Day ${dayNum} topic.`,
        completed: false,
      };
    });

    const resultData = {
      profileId: profile.id,
      targetRole: profile.targetRole,
      startDate,
      generatedAt: new Date().toISOString(),
      phases: Array.isArray(parsed.phases) && parsed.phases.length === 4 ? parsed.phases : defaultPhases,
      days,
    };

    setToCache(cacheKey, resultData, {
      durationMs: geminiResult.durationMs,
      modelUsed: geminiResult.modelUsed,
      tokenCount: geminiResult.tokens?.totalTokenCount,
    });

    res.setHeader('Server-Timing', `gemini;dur=${geminiResult.durationMs}`);
    return res.json({
      ...resultData,
      _telemetry: {
        durationMs: geminiResult.durationMs,
        modelUsed: geminiResult.modelUsed,
        cached: false,
        tokens: geminiResult.tokens,
      },
    });
  } catch (err: any) {
    return handleEndpointError(err, 'generate 30-day roadmap', res);
  }
});

// 4. Mock Interview Questions Generation Endpoint (Configurable Role, Category, Difficulty, & Count)
app.post('/api/gemini/interview-questions', async (req: Request, res: Response) => {
  if (!checkAiAvailable(res)) return;

  try {
    const profileValidation = validateCandidateProfile(req.body.profile);
    if (!profileValidation.valid) {
      return res.status(400).json({ error: profileValidation.error });
    }
    const profile = profileValidation.sanitized;
    const { role, category, difficulty, count, forceRefresh } = req.body;

    const sanitizedRole = sanitizeString(role, 100);
    const targetRole = sanitizedRole || profile.targetRole || 'Software Development Engineer';
    const interviewCategory = (category === 'behavioral' || category === 'mixed') ? category : 'technical';
    const difficultyLevel = ['Fundamental', 'Intermediate', 'Advanced', 'Adaptive'].includes(difficulty) ? difficulty : 'Intermediate';
    const questionCount = [3, 5, 10].includes(Number(count)) ? Number(count) : 5;

    const cacheKey = generateCacheKey('interview-questions', {
      profileId: profile.id,
      role: targetRole,
      category: interviewCategory,
      difficulty: difficultyLevel,
      count: questionCount,
      skills: profile.currentSkills,
    });

    const cached = getFromCache(cacheKey, !!forceRefresh);
    if (cached) {
      res.setHeader('Server-Timing', `gemini;dur=0, total;dur=1;desc="Cache Hit"`);
      return res.json({
        ...cached.data,
        _telemetry: cached.telemetry,
      });
    }

    const categoryDirective =
      interviewCategory === 'behavioral'
        ? `Focus strictly on BEHAVIORAL & HR scenario questions using the STAR framework (Situation, Task, Action, Result).
Topics include: conflict resolution, handling technical disagreements, meeting tight deadlines, navigating failure, teamwork, leadership, and taking ownership in a software engineering team.`
        : interviewCategory === 'mixed'
        ? `Provide a balanced mix of:
1. Technical challenges (coding/algorithmic, architecture, and core CS fundamentals)
2. Behavioral STAR method questions (teamwork, overcoming roadblocks, prioritization, and technical conflict).`
        : `Focus strictly on TECHNICAL placement interview questions appropriate for ${targetRole}.
Topics include: Data Structures & Algorithms, System Design & Architecture, Database / API design, and Core CS Fundamentals. Include starter code where helpful for coding problems.`;

    const difficultyDirective =
      difficultyLevel === 'Fundamental'
        ? `Difficulty: Fundamental / Screening round. Focus on core conceptual clarity, straightforward implementation, and common placement hurdles.`
        : difficultyLevel === 'Advanced'
        ? `Difficulty: Advanced / Elite campus placement. Emphasize high-scale trade-offs, concurrency, distributed patterns, edge cases, and architectural resilience.`
        : difficultyLevel === 'Adaptive'
        ? `Difficulty: Adaptive. Start with 1-2 fundamental foundational questions, progress into intermediate problem-solving, and finish with challenging edge-case or architectural questions.`
        : `Difficulty: Intermediate. Calibrated to standard Tier-1/Tier-2 campus placement software engineering drives.`;

    const prompt = `You are a Principal Engineering Recruiter and Campus Placement Interviewer.
Generate a realistic, high-impact mock interview round with exactly ${questionCount} questions for:
- Candidate Target Role: ${targetRole}
- Interview Category: ${interviewCategory.toUpperCase()}
- Experience Level: ${profile.experienceLevel || 'fresher / entry-level'}
- Known Candidate Skills: ${Array.isArray(profile.currentSkills) ? profile.currentSkills.join(', ') : 'General'}
- Available Daily Preparation: ${profile.dailyStudyHours || 2} hours/day

${categoryDirective}
${difficultyDirective}

REQUIREMENTS:
1. Output exactly ${questionCount} questions numbered 1 to ${questionCount}.
2. For coding questions, provide a clean, minimal "starterCode" template if appropriate.
3. Include "expectedKeyPoints" (2-3 brief bullets the interviewer is listening for).
4. Do NOT generate candidate answers or evaluations at this stage.

Return valid JSON with this exact schema:
{
  "questions": [
    {
      "id": 1,
      "category": "${interviewCategory === 'behavioral' ? 'Behavioral' : 'DSA, System Design, Backend, Frontend, Database, or Core CS'}",
      "difficulty": "Fundamental or Intermediate or Advanced",
      "type": "${interviewCategory === 'behavioral' ? 'behavioral' : 'conceptual or coding or scenario'}",
      "question": "Clear, precise interview question",
      "starterCode": "// optional starter template if coding, else omit",
      "expectedKeyPoints": ["key point 1", "key point 2"]
    }
  ]
}`;

    const geminiResult = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
      endpointTag: 'interview-questions',
    });

    let parsed: any = {};
    try {
      parsed = parseJsonFromText(geminiResult.text);
    } catch (parseErr) {
      console.warn('[PrepPilot AI] JSON parse failed on interview-questions, using graceful normalization');
      parsed = {};
    }

    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];

    // Fallback question generation if AI output is truncated or malformed
    const fallbackCategory = interviewCategory === 'behavioral' ? 'Behavioral' : 'Core CS';
    const fallbackType = interviewCategory === 'behavioral' ? 'behavioral' : 'conceptual';

    const questions: InterviewQuestion[] = Array.from({ length: questionCount }, (_, idx) => {
      const qNum = idx + 1;
      const raw = rawQuestions[idx] || {};

      let calculatedDiff: 'Fundamental' | 'Intermediate' | 'Advanced' = 'Intermediate';
      if (difficultyLevel === 'Fundamental') calculatedDiff = 'Fundamental';
      else if (difficultyLevel === 'Advanced') calculatedDiff = 'Advanced';
      else if (difficultyLevel === 'Adaptive') {
        calculatedDiff = idx === 0 ? 'Fundamental' : idx === questionCount - 1 ? 'Advanced' : 'Intermediate';
      }

      const qType = raw.type || (interviewCategory === 'behavioral' ? 'behavioral' : idx % 2 === 1 ? 'coding' : 'conceptual');
      const qCat = raw.category || fallbackCategory;

      let fallbackQuestionText = '';
      let fallbackStarterCode: string | undefined = undefined;

      if (interviewCategory === 'behavioral') {
        const behavioralPrompts = [
          'Describe a time you encountered a severe bug or roadblock right before a deadline. How did you diagnose it, communicate with teammates, and resolve the issue?',
          'Tell me about a technical disagreement you had with a teammate or project partner. How did you navigate differences in opinion and reach consensus?',
          'Walk me through a project where requirements changed midway through development. How did you adapt your architecture and manage time constraints?',
          'Give an example of a technical mistake or outage you were responsible for. What went wrong, how did you fix it, and what safeguards did you put in place?',
          'Describe how you prioritize multiple competing tasks or study assignments when under significant time pressure.',
        ];
        fallbackQuestionText = behavioralPrompts[idx % behavioralPrompts.length];
      } else {
        const technicalPrompts = [
          `Explain how indexing works in relational databases and how you would diagnose a slow query in ${targetRole} systems.`,
          `Implement an algorithm to detect a cycle in a directed graph or linked list. Discuss time and space complexities.`,
          `How do you design a robust rate limiter or caching strategy for a high-traffic API endpoint?`,
          `Describe the memory model, event loop, and asynchronous concurrency execution flow in your primary programming language.`,
          `Given an array of integers, find the contiguous subarray with the largest sum (Kadane's Algorithm).`,
        ];
        fallbackQuestionText = technicalPrompts[idx % technicalPrompts.length];
        if (qType === 'coding') {
          fallbackStarterCode = `// Target: ${targetRole}\nfunction solve(input) {\n  // Implement optimal solution\n}\n`;
        }
      }

      return {
        id: qNum,
        category: qCat,
        difficulty: (raw.difficulty && ['Fundamental', 'Intermediate', 'Advanced'].includes(raw.difficulty)) ? raw.difficulty : calculatedDiff,
        type: qType,
        question: raw.question || fallbackQuestionText,
        starterCode: raw.starterCode || fallbackStarterCode,
        expectedKeyPoints: Array.isArray(raw.expectedKeyPoints) && raw.expectedKeyPoints.length > 0
          ? raw.expectedKeyPoints
          : ['Demonstrate clear problem decomposition', 'Account for edge cases and trade-offs'],
      };
    });

    const resultData = { questions };

    setToCache(cacheKey, resultData, {
      durationMs: geminiResult.durationMs,
      modelUsed: geminiResult.modelUsed,
      tokenCount: geminiResult.tokens?.totalTokenCount,
    });

    res.setHeader('Server-Timing', `gemini;dur=${geminiResult.durationMs}`);
    return res.json({
      ...resultData,
      _telemetry: {
        durationMs: geminiResult.durationMs,
        modelUsed: geminiResult.modelUsed,
        cached: false,
        tokens: geminiResult.tokens,
      },
    });
  } catch (err: any) {
    return handleEndpointError(err, 'generate interview questions', res);
  }
});

// 5. Evaluate Single Interview Answer Endpoint (Transparent Rubric & Heuristic Execution Notice)
app.post('/api/gemini/evaluate-answer', async (req: Request, res: Response) => {
  if (!checkAiAvailable(res)) return;

  try {
    const { question, userAnswer, profile } = req.body;
    if (!question || typeof question !== 'object' || !question.question) {
      return res.status(400).json({ error: 'A valid question object with question text is required.' });
    }
    const sanitizedQuestionText = sanitizeString(question.question, 2000);
    if (!sanitizedQuestionText) {
      return res.status(400).json({ error: 'Question text cannot be empty.' });
    }

    const trimmedAnswer = typeof userAnswer === 'string' ? userAnswer.trim() : '';
    if (!trimmedAnswer) {
      return res.status(400).json({ error: 'Answer cannot be empty. Please provide an answer or code solution.' });
    }
    if (trimmedAnswer.length > 25000) {
      return res.status(400).json({ error: 'Submitted answer exceeds the maximum allowed length (25,000 characters).' });
    }

    const isBehavioral = question.type === 'behavioral' || question.category?.toLowerCase().includes('behavioral');
    const isCoding = question.type === 'coding' || !!question.starterCode;

    const rubricDescription = isBehavioral
      ? `Evaluate using the 4-part STAR behavioral placement rubric (0 to 25 points each, total 100):
1. accuracy (Situation & Task): Clear context, background problem, and candidate's specific responsibility.
2. completeness (Action & Ownership): Concrete engineering actions, technical leadership, and proactive steps taken.
3. clarity (Result & Impact): Measurable outcome, lessons learned, and business/technical impact.
4. depth (Reflection & Articulation): Self-awareness, professional communication, and emotional intelligence.`
      : `Evaluate using the standard 4-part technical placement rubric (0 to 25 points each, total 100):
1. accuracy (0-25): Correctness of algorithms, facts, logic, and code syntax.
2. completeness (0-25): Edge cases handled, constraints acknowledged, and time/space complexity analyzed.
3. clarity (0-25): Articulation, clean code structure, and professional communication.
4. depth (0-25): Insight into internals, engineering trade-offs, and scalability considerations.`;

    const prompt = `You are a Senior Technical Interviewer evaluating a candidate's answer for campus recruitment.
Candidate Role: ${profile?.targetRole || 'Software Development Engineer'}
Question Category: ${question.category} (${question.difficulty} - ${question.type})

QUESTION:
${question.question}

${question.expectedKeyPoints ? `EXPECTED KEY POINTS TO LOOK FOR:\n${question.expectedKeyPoints.join('\n')}\n` : ''}

CANDIDATE'S SUBMITTED ANSWER:
"""
${trimmedAnswer}
"""

${rubricDescription}

IMPORTANT GUIDELINES:
- Score realistically: A strong answer scores 80-100, partial 60-79, needs improvement 35-59, incorrect/superficial 0-34.
- Provide 2-3 specific strengths in "whatWasCorrect".
- Provide 1-3 concrete omissions or errors in "missingOrMistakes".
- Provide a clear, comprehensive high-scoring "modelAnswer" (include clean code snippet if question asked for code).
- Provide 1-2 actionable tips to elevate performance in "improvementTips".
${isCoding ? '- NOTE: You must include the code execution notice clarifying that code is evaluated heuristically without container execution.' : ''}

Return JSON with this exact schema:
{
  "score": integer 0 to 100,
  "verdict": "Strong" | "Partial" | "Needs Improvement" | "Incorrect",
  "rubricScores": {
    "accuracy": integer 0-25,
    "completeness": integer 0-25,
    "clarity": integer 0-25,
    "depth": integer 0-25
  },
  "whatWasCorrect": ["bullet 1", "bullet 2"],
  "missingOrMistakes": ["bullet 1", "bullet 2"],
  "modelAnswer": "Comprehensive exemplary model answer",
  "improvementTips": ["tip 1", "tip 2"],
  "executionNotice": "Code explanation and syntax are evaluated heuristically by AI without isolated container execution."
}`;

    const geminiResult = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
      endpointTag: 'evaluate-answer',
    });

    let parsed: any = {};
    try {
      parsed = parseJsonFromText(geminiResult.text);
    } catch (parseErr) {
      console.warn('[PrepPilot AI] JSON parse failed on evaluate-answer, applying fallback normalization');
      parsed = {};
    }

    // Clamp rubric scores strictly between 0 and 25
    const rawRubric = parsed.rubricScores || {};
    const accuracy = Math.max(0, Math.min(25, Number(rawRubric.accuracy ?? 15)));
    const completeness = Math.max(0, Math.min(25, Number(rawRubric.completeness ?? 15)));
    const clarity = Math.max(0, Math.min(25, Number(rawRubric.clarity ?? 15)));
    const depth = Math.max(0, Math.min(25, Number(rawRubric.depth ?? 15)));

    // Deterministic overall score from rubric components
    const calculatedScore = Math.max(0, Math.min(100, accuracy + completeness + clarity + depth));

    const verdict: 'Strong' | 'Partial' | 'Needs Improvement' | 'Incorrect' =
      calculatedScore >= 80 ? 'Strong' :
      calculatedScore >= 60 ? 'Partial' :
      calculatedScore >= 35 ? 'Needs Improvement' : 'Incorrect';

    const executionNotice = (isCoding || question.type === 'coding')
      ? 'Code explanation and syntax are evaluated heuristically by AI without isolated container execution.'
      : undefined;

    const evaluation: QuestionEvaluation = {
      score: calculatedScore,
      verdict: (parsed.verdict && ['Strong', 'Partial', 'Needs Improvement', 'Incorrect'].includes(parsed.verdict))
        ? parsed.verdict
        : verdict,
      rubricScores: {
        accuracy,
        completeness,
        clarity,
        depth,
      },
      whatWasCorrect: Array.isArray(parsed.whatWasCorrect) && parsed.whatWasCorrect.length > 0
        ? parsed.whatWasCorrect
        : ['Demonstrated understanding of the underlying problem principles.'],
      missingOrMistakes: Array.isArray(parsed.missingOrMistakes) && parsed.missingOrMistakes.length > 0
        ? parsed.missingOrMistakes
        : ['Could expand on edge case handling and time/space complexity analysis.'],
      modelAnswer: parsed.modelAnswer || 'A comprehensive placement answer should articulate problem breakdown, optimal approach, and explicit complexity trade-offs.',
      improvementTips: Array.isArray(parsed.improvementTips) && parsed.improvementTips.length > 0
        ? parsed.improvementTips
        : ['Structure your response using a top-down approach: summary first, then step-by-step reasoning.'],
      executionNotice,
    };

    res.setHeader('Server-Timing', `gemini;dur=${geminiResult.durationMs}`);
    return res.json({
      evaluation,
      _telemetry: {
        durationMs: geminiResult.durationMs,
        modelUsed: geminiResult.modelUsed,
        tokens: geminiResult.tokens,
      },
    });
  } catch (err: any) {
    return handleEndpointError(err, 'evaluate answer', res);
  }
});

// 6. Interview Final Summary Endpoint (Deterministic Score & Placement Guidance)
app.post('/api/gemini/interview-summary', async (req: Request, res: Response) => {
  if (!checkAiAvailable(res)) return;

  try {
    const { questions, profile } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array with at least 1 item is required.' });
    }
    if (questions.length > 20) {
      return res.status(400).json({ error: 'Questions array exceeds maximum session size of 20 items.' });
    }

    const answered = questions.filter((q: any) => q.evaluation && typeof q.evaluation.score === 'number');
    const scores = answered.map((q: any) => q.evaluation.score);
    // CRITICAL: Overall score is strictly deterministic arithmetic average
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;

    const answeredSummary = answered.map((q: any) => ({
      category: q.category,
      question: (q.question || '').slice(0, 100),
      score: q.evaluation?.score,
      verdict: q.evaluation?.verdict,
      missing: q.evaluation?.missingOrMistakes,
    }));

    const prompt = `Synthesize a comprehensive Mock Interview Performance Report for a placement candidate:
Candidate: ${profile?.name || 'Candidate'}
Target Role: ${profile?.targetRole || 'Software Development Engineer'}
Total Questions in Session: ${questions.length}
Answered Questions: ${answered.length}
Deterministic Average Rubric Score: ${avgScore}%
Detailed Question Summaries: ${JSON.stringify(answeredSummary)}

Provide:
1. "strengths": 2-3 specific technical and communication strengths observed across answered questions.
2. "weakAreas": 2-3 specific technical concepts, omissions, or gaps to address.
3. "topicsToRevise": 3-4 concrete placement topics/algorithms to review immediately.
4. "personalizedNextSteps": 3 actionable study/practice steps for the next 7 days.
5. "suggestedFollowUpPractice": 2-3 practical coding or behavioral exercises to build confidence.

Return JSON schema:
{
  "overallScore": ${avgScore},
  "totalAnswered": ${answered.length},
  "strengths": ["bullet 1", "bullet 2"],
  "weakAreas": ["bullet 1", "bullet 2"],
  "topicsToRevise": ["topic 1", "topic 2"],
  "personalizedNextSteps": ["step 1", "step 2"],
  "suggestedFollowUpPractice": ["practice exercise 1", "practice exercise 2"],
  "disclaimer": "This mock interview evaluation and score are AI-generated heuristic estimates for placement practice, not official employer evaluations or certified industry assessments."
}`;

    const geminiResult = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
      endpointTag: 'interview-summary',
    });

    let parsed: any = {};
    try {
      parsed = parseJsonFromText(geminiResult.text);
    } catch (parseErr) {
      console.warn('[PrepPilot AI] JSON parse failed on interview-summary, applying fallback');
      parsed = {};
    }

    const disclaimer = 'This mock interview evaluation and score are AI-generated heuristic estimates for placement practice, not official employer evaluations or certified industry assessments.';

    const summary: InterviewSummary = {
      overallScore: avgScore, // Enforce deterministic score
      totalAnswered: answered.length,
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
        ? parsed.strengths
        : ['Demonstrated foundational understanding of target role requirements.', 'Articulated technical reasoning with logical structure.'],
      weakAreas: Array.isArray(parsed.weakAreas) && parsed.weakAreas.length > 0
        ? parsed.weakAreas
        : ['Deepen analysis of performance bottlenecks and edge cases.', 'Reinforce STAR-method clarity for behavioral responses.'],
      topicsToRevise: Array.isArray(parsed.topicsToRevise) && parsed.topicsToRevise.length > 0
        ? parsed.topicsToRevise
        : [`${profile?.targetRole || 'Core'} Architecture & Algorithms`, 'Time and Space Complexity Trade-offs'],
      personalizedNextSteps: Array.isArray(parsed.personalizedNextSteps) && parsed.personalizedNextSteps.length > 0
        ? parsed.personalizedNextSteps
        : [
            'Practice 3 timed coding exercises under placement mock conditions.',
            'Review model answers for questions where rubric depth scored below 20.',
            'Schedule a follow-up mock interview sprint focusing on weak areas.',
          ],
      suggestedFollowUpPractice: Array.isArray(parsed.suggestedFollowUpPractice) && parsed.suggestedFollowUpPractice.length > 0
        ? parsed.suggestedFollowUpPractice
        : [
            'Implement optimal solutions for the questions missed during this round.',
            'Rehearse STAR responses for behavioral questions using structured bullet points.',
          ],
      disclaimer,
    };

    res.setHeader('Server-Timing', `gemini;dur=${geminiResult.durationMs}`);
    return res.json({
      summary,
      _telemetry: {
        durationMs: geminiResult.durationMs,
        modelUsed: geminiResult.modelUsed,
        tokens: geminiResult.tokens,
      },
    });
  } catch (err: any) {
    return handleEndpointError(err, 'generate interview summary', res);
  }
});

// 7. Personalized Next Steps & Recommendations Endpoint
app.post('/api/gemini/recommendations', async (req: Request, res: Response) => {
  if (!checkAiAvailable(res)) return;

  try {
    const profileValidation = validateCandidateProfile(req.body.profile);
    if (!profileValidation.valid) {
      return res.status(400).json({ error: profileValidation.error });
    }
    const profile = profileValidation.sanitized;
    const { activityStats, forceRefresh } = req.body;

    const skippedTasksList = Array.isArray(activityStats?.skippedTasks) && activityStats.skippedTasks.length > 0
      ? activityStats.skippedTasks.slice(0, 5).join(', ')
      : 'None skipped';
    const completedTasksList = Array.isArray(activityStats?.completedTasks) && activityStats.completedTasks.length > 0
      ? activityStats.completedTasks.slice(-5).join(', ')
      : 'None completed yet';

    const prompt = `You are an elite Placement Coach analyzing a candidate's real roadmap progress:
- Candidate: ${profile.name}
- Target Role: ${profile.targetRole}
- Current Skills: ${Array.isArray(profile.currentSkills) ? profile.currentSkills.join(', ') : 'None'}
- Target Skills: ${Array.isArray(profile.targetSkills) ? profile.targetSkills.join(', ') : 'None'}
- Daily Study Availability: ${profile.dailyStudyHours || 2} hours/day
- 7-Day Roadmap Tasks: ${activityStats?.completed7DayTasks || 0} completed, ${activityStats?.skipped7DayTasks || 0} skipped, ${activityStats?.overdue7DayTasks || 0} overdue
- 30-Day Roadmap Tasks: ${activityStats?.completed30DayTasks || 0} completed, ${activityStats?.skipped30DayTasks || 0} skipped, ${activityStats?.overdue30DayTasks || 0} overdue
- Recent Completed Milestones: ${completedTasksList}
- Skipped Tasks (Need Adaptation/Alternative Bridges): ${skippedTasksList}
- Mock Interviews Completed: ${activityStats?.mockInterviewsCount || 0}
- Average Interview Score: ${activityStats?.avgInterviewScore || 'N/A'}%
- Current Streak: ${activityStats?.currentStreak || 0} days

ADAPTIVE RECOMMENDATIONS DIRECTIVE:
1. Adapt future advice based on what the student completed and skipped WITHOUT resetting or deleting their original roadmap.
2. If tasks were skipped, recommend pragmatic, low-friction bridge exercises or alternative approaches so the student still gains the core concept without feeling overwhelmed.
3. Recommend the single most valuable next topic to focus on today.

Return JSON with this schema:
{
  "nextValuableTopic": "Title and brief description of the most urgent topic to conquer next",
  "overdueOrIncompleteAdvice": "Pragmatic advice regarding pending or overdue roadmap tasks and velocity management",
  "skillsToPractice": ["skill 1", "skill 2", "skill 3"],
  "relevantCodingExercises": [
    {
      "title": "exercise name",
      "focus": "e.g. Dynamic Programming / SQL Window Functions",
      "description": "brief 1-2 sentence problem description"
    }
  ],
  "interviewTopicsToRevise": ["topic 1", "topic 2"],
  "planAdjustments": "constructive tip on pacing and daily study hours adjustment",
  "adaptiveFocusNotes": "strategic adjustment guidance calibrated to completed vs skipped milestones",
  "skippedTaskRemediations": ["1-2 sentence lightweight alternative or concept summary for skipped topics"]
}`;

    const cacheKey = generateCacheKey('recommendations', {
      profileId: profile.id,
      role: profile.targetRole,
      completed7: activityStats?.completed7DayTasks || 0,
      skipped7: activityStats?.skipped7DayTasks || 0,
      completed30: activityStats?.completed30DayTasks || 0,
      skipped30: activityStats?.skipped30DayTasks || 0,
      interviews: activityStats?.mockInterviewsCount || 0,
      hours: profile.dailyStudyHours || 2,
    });

    const cached = getFromCache(cacheKey, !!req.body.forceRefresh);
    if (cached) {
      res.setHeader('Server-Timing', `gemini;dur=0, total;dur=1;desc="Cache Hit"`);
      return res.json({
        ...cached.data,
        _telemetry: cached.telemetry,
      });
    }

    const geminiResult = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
      endpointTag: 'recommendations',
    });

    const parsed = parseJsonFromText(geminiResult.text);
    const resultData = {
      recommendations: {
        ...parsed,
        profileId: profile.id,
        generatedAt: new Date().toISOString(),
      },
    };

    setToCache(cacheKey, resultData, {
      durationMs: geminiResult.durationMs,
      modelUsed: geminiResult.modelUsed,
      tokenCount: geminiResult.tokens?.totalTokenCount,
    });

    return res.json({
      ...resultData,
      _telemetry: {
        durationMs: geminiResult.durationMs,
        modelUsed: geminiResult.modelUsed,
        cached: false,
        tokens: geminiResult.tokens,
      },
    });
  } catch (err: any) {
    return handleEndpointError(err, 'generate recommendations', res);
  }
});

// Mount Vite or static server
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PrepPilot AI server running on port ${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
