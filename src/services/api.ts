/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserProfile,
  SkillGapAnalysis,
  Roadmap7Day,
  Roadmap30Day,
  InterviewQuestion,
  InterviewCategory,
  InterviewDifficulty,
  QuestionEvaluation,
  InterviewSummary,
  PersonalizedRecommendations,
} from '../types';
import { getAuthHeaders } from './authApi';

async function handleResponse<T>(res: globalThis.Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    let isQuota = res.status === 429;
    let retryAfter: number | undefined;

    try {
      const data = await res.json();
      if (data && data.error) {
        errMsg = data.error;
      }
      if (data && data.isQuotaExhausted) {
        isQuota = true;
      }
      if (data && data.retryAfter) {
        retryAfter = data.retryAfter;
      }
    } catch (_) {
      // ignore json parse error on non-json error responses
    }

    const err: any = new Error(errMsg);
    err.status = res.status;
    err.isQuotaExhausted = isQuota;
    err.retryAfter = retryAfter;
    throw err;
  }
  return res.json() as Promise<T>;
}

// In-flight request deduplication map to prevent double-invocations on rapid clicks/re-renders
const inFlightRequests = new Map<string, Promise<any>>();

function withDeduplication<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

export async function fetchSkillAnalysis(
  profile: UserProfile,
  options?: { forceRefresh?: boolean; targetRoleOverride?: string }
): Promise<SkillGapAnalysis> {
  const effectiveRole = options?.targetRoleOverride || profile.targetRole;
  const effectiveProfile =
    options?.targetRoleOverride && options.targetRoleOverride !== profile.targetRole
      ? { ...profile, targetRole: options.targetRoleOverride }
      : profile;
  const key = `skill-analysis:${profile.id}:${effectiveRole}:${options?.forceRefresh ? 'force' : 'default'}`;
  return withDeduplication(key, async () => {
    const res = await fetch('/api/gemini/skill-analysis', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ profile: effectiveProfile, forceRefresh: options?.forceRefresh }),
    });
    return handleResponse<SkillGapAnalysis>(res);
  });
}

export async function fetchRoadmap7(
  profile: UserProfile,
  skillGap?: SkillGapAnalysis | null,
  options?: { forceRefresh?: boolean; activities?: any[] }
): Promise<Roadmap7Day> {
  const key = `roadmap-7:${profile.id}:${profile.targetRole}:${options?.forceRefresh ? 'force' : 'default'}`;
  return withDeduplication(key, async () => {
    const res = await fetch('/api/gemini/generate-roadmap-7', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        profile,
        skillGap,
        activities: options?.activities,
        forceRefresh: options?.forceRefresh,
      }),
    });
    return handleResponse<Roadmap7Day>(res);
  });
}

export async function fetchRoadmap30(
  profile: UserProfile,
  skillGap?: SkillGapAnalysis | null,
  options?: { forceRefresh?: boolean; activities?: any[] }
): Promise<Roadmap30Day> {
  const key = `roadmap-30:${profile.id}:${profile.targetRole}:${options?.forceRefresh ? 'force' : 'default'}`;
  return withDeduplication(key, async () => {
    const res = await fetch('/api/gemini/generate-roadmap-30', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        profile,
        skillGap,
        activities: options?.activities,
        forceRefresh: options?.forceRefresh,
      }),
    });
    return handleResponse<Roadmap30Day>(res);
  });
}

export interface FetchInterviewQuestionsParams {
  role?: string;
  category?: InterviewCategory;
  difficulty?: InterviewDifficulty;
  questionCount?: number;
  forceRefresh?: boolean;
}

export async function fetchInterviewQuestions(
  profile: UserProfile,
  options?: FetchInterviewQuestionsParams
): Promise<InterviewQuestion[]> {
  const role = options?.role || profile.targetRole;
  const category = options?.category || 'technical';
  const difficulty = options?.difficulty || 'Intermediate';
  const count = options?.questionCount || 5;

  const key = `interview-questions:${profile.id}:${role}:${category}:${difficulty}:${count}:${options?.forceRefresh ? 'force' : 'default'}`;
  return withDeduplication(key, async () => {
    const res = await fetch('/api/gemini/interview-questions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        profile,
        role,
        category,
        difficulty,
        count,
        forceRefresh: options?.forceRefresh,
      }),
    });
    const data = await handleResponse<{ questions: InterviewQuestion[] }>(res);
    return data.questions;
  });
}

export async function evaluateAnswer(
  question: InterviewQuestion,
  userAnswer: string,
  profile: UserProfile
): Promise<QuestionEvaluation> {
  const res = await fetch('/api/gemini/evaluate-answer', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ question, userAnswer, profile }),
  });
  const data = await handleResponse<{ evaluation: QuestionEvaluation }>(res);
  return data.evaluation;
}

export async function fetchInterviewSummary(
  questions: InterviewQuestion[],
  profile: UserProfile
): Promise<InterviewSummary> {
  const res = await fetch('/api/gemini/interview-summary', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ questions, profile }),
  });
  const data = await handleResponse<{ summary: InterviewSummary }>(res);
  return data.summary;
}

export async function fetchRecommendations(
  profile: UserProfile,
  activityStats: any,
  options?: { forceRefresh?: boolean }
): Promise<PersonalizedRecommendations> {
  const key = `recommendations:${profile.id}:${profile.targetRole}:${options?.forceRefresh ? 'force' : 'default'}`;
  return withDeduplication(key, async () => {
    const res = await fetch('/api/gemini/recommendations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ profile, activityStats, forceRefresh: options?.forceRefresh }),
    });
    const data = await handleResponse<{ recommendations: PersonalizedRecommendations }>(res);
    return data.recommendations;
  });
}
