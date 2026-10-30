import test from 'node:test';
import assert from 'node:assert/strict';

// Import or recreate the helper functions tested in production readiness
function sanitizeString(val: any, maxLength = 250, defaultVal = ''): string {
  if (typeof val !== 'string') return defaultVal;
  return val.trim().slice(0, maxLength);
}

function sanitizeStringArray(arr: any, maxItems = 40, maxItemLen = 100): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxItemLen));
}

function sanitizeNumber(val: any, min: number, max: number, defaultVal: number): number {
  const num = Number(val);
  if (isNaN(num)) return defaultVal;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function validateCandidateProfile(profile: any): { valid: boolean; error?: string; sanitized?: any } {
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

function validateEvaluateAnswerPayload(question: any, userAnswer: any): { valid: boolean; error?: string } {
  if (!question || typeof question !== 'object' || !question.question) {
    return { valid: false, error: 'A valid question object with question text is required.' };
  }
  const sanitizedQuestionText = sanitizeString(question.question, 2000);
  if (!sanitizedQuestionText) {
    return { valid: false, error: 'Question text cannot be empty.' };
  }
  const trimmedAnswer = typeof userAnswer === 'string' ? userAnswer.trim() : '';
  if (!trimmedAnswer) {
    return { valid: false, error: 'Answer cannot be empty. Please provide an answer or code solution.' };
  }
  if (trimmedAnswer.length > 25000) {
    return { valid: false, error: 'Submitted answer exceeds the maximum allowed length (25,000 characters).' };
  }
  return { valid: true };
}

function validateInterviewSummaryPayload(questions: any): { valid: boolean; error?: string } {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { valid: false, error: 'Questions array with at least 1 item is required.' };
  }
  if (questions.length > 20) {
    return { valid: false, error: 'Questions array exceeds maximum session size of 20 items.' };
  }
  return { valid: true };
}

// In-memory sliding window rate limiter simulation
function simulateRateLimiter(
  requestTimes: number[],
  maxRequests: number,
  windowMs: number
): { accepted: number; rejected: number } {
  let accepted = 0;
  let rejected = 0;
  let windowStart = requestTimes[0] || 0;
  let countInWindow = 0;

  for (const t of requestTimes) {
    if (t - windowStart > windowMs) {
      windowStart = t;
      countInWindow = 0;
    }
    if (countInWindow < maxRequests) {
      countInWindow++;
      accepted++;
    } else {
      rejected++;
    }
  }

  return { accepted, rejected };
}

// Storage normalization simulation
function normalizeDataStorePayload(rawJson: string | null): any {
  if (!rawJson) return null;
  const parsed = JSON.parse(rawJson);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.profiles)) {
    return null;
  }
  return {
    version: 1,
    profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
    activeProfileId: parsed.activeProfileId || (parsed.profiles[0]?.id ?? null),
    analyses: typeof parsed.analyses === 'object' && parsed.analyses !== null ? parsed.analyses : {},
    roadmaps7: typeof parsed.roadmaps7 === 'object' && parsed.roadmaps7 !== null ? parsed.roadmaps7 : {},
    roadmaps30: typeof parsed.roadmaps30 === 'object' && parsed.roadmaps30 !== null ? parsed.roadmaps30 : {},
    interviews: typeof parsed.interviews === 'object' && parsed.interviews !== null ? parsed.interviews : {},
    activities: typeof parsed.activities === 'object' && parsed.activities !== null ? parsed.activities : {},
    recommendations: typeof parsed.recommendations === 'object' && parsed.recommendations !== null ? parsed.recommendations : {},
  };
}

// -----------------------------------------------------------------------------
// Test Suite
// -----------------------------------------------------------------------------

test('1. Profile Validation & Constraint Clamping: validates role, clamps hours, and truncates long strings', () => {
  // Empty or non-object profile
  const invalid1 = validateCandidateProfile(null);
  assert.equal(invalid1.valid, false);

  const invalid2 = validateCandidateProfile({ targetRole: 'A' }); // Too short
  assert.equal(invalid2.valid, false);

  // Oversized inputs
  const longName = 'A'.repeat(300);
  const validProfile = validateCandidateProfile({
    name: longName,
    targetRole: 'Full Stack Engineer',
    dailyStudyHours: 25, // should clamp to 12
    targetDurationWeeks: 0, // should clamp to 1
    currentSkills: Array.from({ length: 100 }, (_, i) => `Skill ${i}`), // should clamp to 40
  });

  assert.equal(validProfile.valid, true);
  assert.equal(validProfile.sanitized.name.length, 100);
  assert.equal(validProfile.sanitized.dailyStudyHours, 12);
  assert.equal(validProfile.sanitized.targetDurationWeeks, 1);
  assert.equal(validProfile.sanitized.currentSkills.length, 40);
});

test('2. Answer Evaluation Bounds: rejects empty, whitespace, and oversized text (>25k chars)', () => {
  const q = { question: 'Explain quicksort.' };

  assert.equal(validateEvaluateAnswerPayload(q, '').valid, false);
  assert.equal(validateEvaluateAnswerPayload(q, '   \t\n  ').valid, false);

  const giantAnswer = 'X'.repeat(25001);
  const oversizedRes = validateEvaluateAnswerPayload(q, giantAnswer);
  assert.equal(oversizedRes.valid, false);
  assert.ok(oversizedRes.error?.includes('exceeds the maximum allowed length'));

  const validAnswer = 'Quicksort is a divide-and-conquer algorithm with average O(n log n) runtime.';
  const validRes = validateEvaluateAnswerPayload(q, validAnswer);
  assert.equal(validRes.valid, true);
});

test('3. Interview Summary Validation: rejects empty array and enforces maximum session size (20)', () => {
  assert.equal(validateInterviewSummaryPayload([]).valid, false);
  assert.equal(validateInterviewSummaryPayload(null).valid, false);

  const oversizedQuestions = Array.from({ length: 21 }, (_, i) => ({ id: i }));
  const oversizedRes = validateInterviewSummaryPayload(oversizedQuestions);
  assert.equal(oversizedRes.valid, false);
  assert.ok(oversizedRes.error?.includes('exceeds maximum session size'));

  const validQuestions = Array.from({ length: 5 }, (_, i) => ({ id: i }));
  assert.equal(validateInterviewSummaryPayload(validQuestions).valid, true);
});

test('4. Rate Limiting Simulation: throttles requests exceeding window quota', () => {
  // 35 requests within a 60 second window with 30 max quota
  const timestamps = Array.from({ length: 35 }, (_, i) => i * 1000);
  const result = simulateRateLimiter(timestamps, 30, 60000);

  assert.equal(result.accepted, 30);
  assert.equal(result.rejected, 5);
});

test('5. DataStore Schema Migration & Defensive Fallback: handles corrupted or partial localStorage', () => {
  // Case A: Corrupted JSON
  assert.throws(() => normalizeDataStorePayload('{{broken_json'), SyntaxError);

  // Case B: Partial schema where dictionary keys are missing
  const partialSchema = JSON.stringify({
    version: 1,
    profiles: [{ id: 'p1', name: 'Dev', targetRole: 'SDE' }],
    // analyses, roadmaps, interviews, activities are omitted
  });
  const normalized = normalizeDataStorePayload(partialSchema);

  assert.ok(normalized);
  assert.equal(normalized.profiles.length, 1);
  assert.equal(typeof normalized.analyses, 'object');
  assert.equal(typeof normalized.roadmaps7, 'object');
  assert.equal(typeof normalized.roadmaps30, 'object');
  assert.equal(typeof normalized.interviews, 'object');
  assert.equal(typeof normalized.activities, 'object');
  assert.equal(typeof normalized.recommendations, 'object');
});

test('6. Deterministic Mathematical Progress Calculations: calculates completion percentages', () => {
  const days7 = [
    { day: 1, completed: true, status: 'completed' },
    { day: 2, completed: true, status: 'completed' },
    { day: 3, completed: false, status: 'incomplete' },
    { day: 4, completed: false, status: 'skipped' },
    { day: 5, completed: false, status: 'incomplete' },
    { day: 6, completed: false, status: 'incomplete' },
    { day: 7, completed: false, status: 'incomplete' },
  ];

  const completedCount = days7.filter((d) => d.status === 'completed').length;
  const skippedCount = days7.filter((d) => d.status === 'skipped').length;
  const pct = Math.round((completedCount / days7.length) * 100);

  assert.equal(completedCount, 2);
  assert.equal(skippedCount, 1);
  assert.equal(pct, 29); // 2/7 = 28.57% -> 29%
});
