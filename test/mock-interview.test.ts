import test from 'node:test';
import assert from 'node:assert/strict';

// Helper models and normalization logic matching server.ts & storage.ts

interface RubricScores {
  accuracy: number;
  completeness: number;
  clarity: number;
  depth: number;
}

interface QuestionEvaluation {
  score: number;
  verdict: 'Strong' | 'Partial' | 'Needs Improvement' | 'Incorrect';
  rubricScores: RubricScores;
  whatWasCorrect: string[];
  missingOrMistakes: string[];
  modelAnswer: string;
  improvementTips: string[];
  executionNotice?: string;
}

interface InterviewQuestion {
  id: number;
  category: string;
  difficulty: 'Fundamental' | 'Intermediate' | 'Advanced';
  type: 'conceptual' | 'coding' | 'scenario' | 'behavioral';
  question: string;
  starterCode?: string;
  expectedKeyPoints?: string[];
  userAnswer?: string;
  evaluation?: QuestionEvaluation;
}

interface InterviewSummary {
  overallScore: number;
  totalAnswered: number;
  strengths: string[];
  weakAreas: string[];
  topicsToRevise: string[];
  personalizedNextSteps: string[];
  suggestedFollowUpPractice?: string[];
  disclaimer?: string;
}

function parseJsonFromText(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

function sanitizeEvaluation(
  parsed: any,
  question: { type: string; category?: string; starterCode?: string }
): QuestionEvaluation {
  const rawRubric = parsed.rubricScores || {};
  const accuracy = Math.max(0, Math.min(25, Number(rawRubric.accuracy ?? 15)));
  const completeness = Math.max(0, Math.min(25, Number(rawRubric.completeness ?? 15)));
  const clarity = Math.max(0, Math.min(25, Number(rawRubric.clarity ?? 15)));
  const depth = Math.max(0, Math.min(25, Number(rawRubric.depth ?? 15)));

  const calculatedScore = Math.max(0, Math.min(100, accuracy + completeness + clarity + depth));

  const calculatedVerdict: 'Strong' | 'Partial' | 'Needs Improvement' | 'Incorrect' =
    calculatedScore >= 80
      ? 'Strong'
      : calculatedScore >= 60
      ? 'Partial'
      : calculatedScore >= 35
      ? 'Needs Improvement'
      : 'Incorrect';

  const isCoding = question.type === 'coding' || !!question.starterCode;
  const executionNotice = isCoding
    ? 'Code explanation and syntax are evaluated heuristically by AI without isolated container execution.'
    : undefined;

  return {
    score: calculatedScore,
    verdict:
      parsed.verdict &&
      ['Strong', 'Partial', 'Needs Improvement', 'Incorrect'].includes(parsed.verdict)
        ? parsed.verdict
        : calculatedVerdict,
    rubricScores: {
      accuracy,
      completeness,
      clarity,
      depth,
    },
    whatWasCorrect:
      Array.isArray(parsed.whatWasCorrect) && parsed.whatWasCorrect.length > 0
        ? parsed.whatWasCorrect
        : ['Demonstrated understanding of problem principles.'],
    missingOrMistakes:
      Array.isArray(parsed.missingOrMistakes) && parsed.missingOrMistakes.length > 0
        ? parsed.missingOrMistakes
        : ['Could expand on edge cases or complexity analysis.'],
    modelAnswer:
      parsed.modelAnswer ||
      'A comprehensive placement answer should articulate problem breakdown, optimal approach, and explicit complexity trade-offs.',
    improvementTips:
      Array.isArray(parsed.improvementTips) && parsed.improvementTips.length > 0
        ? parsed.improvementTips
        : ['Structure your response using a top-down approach.'],
    executionNotice,
  };
}

function calculateDeterministicSummary(
  questions: InterviewQuestion[],
  aiParsed: any = {}
): InterviewSummary {
  const answered = questions.filter(
    (q) => q.evaluation && typeof q.evaluation.score === 'number'
  );
  const scores = answered.map((q) => q.evaluation!.score);

  // Deterministic arithmetic average
  const overallScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const disclaimer =
    'This mock interview evaluation and score are AI-generated heuristic estimates for placement practice, not official employer evaluations or certified industry assessments.';

  return {
    overallScore,
    totalAnswered: answered.length,
    strengths:
      Array.isArray(aiParsed.strengths) && aiParsed.strengths.length > 0
        ? aiParsed.strengths
        : ['Strong problem articulation and technical fundamentals.'],
    weakAreas:
      Array.isArray(aiParsed.weakAreas) && aiParsed.weakAreas.length > 0
        ? aiParsed.weakAreas
        : ['Deepen analysis of performance bottlenecks and edge cases.'],
    topicsToRevise:
      Array.isArray(aiParsed.topicsToRevise) && aiParsed.topicsToRevise.length > 0
        ? aiParsed.topicsToRevise
        : ['Data Structures & Complexity Trade-offs'],
    personalizedNextSteps:
      Array.isArray(aiParsed.personalizedNextSteps) && aiParsed.personalizedNextSteps.length > 0
        ? aiParsed.personalizedNextSteps
        : ['Practice 3 timed coding exercises under placement conditions.'],
    suggestedFollowUpPractice:
      Array.isArray(aiParsed.suggestedFollowUpPractice) &&
      aiParsed.suggestedFollowUpPractice.length > 0
        ? aiParsed.suggestedFollowUpPractice
        : ['Implement solutions for missed questions.'],
    disclaimer,
  };
}

function validateAnswerSubmission(answer: string | undefined | null): {
  valid: boolean;
  error?: string;
} {
  const trimmed = typeof answer === 'string' ? answer.trim() : '';
  if (!trimmed) {
    return {
      valid: false,
      error: 'Answer cannot be empty. Please provide an answer or code solution.',
    };
  }
  return { valid: true };
}

// -----------------------------------------------------------------------------
// Test Suite
// -----------------------------------------------------------------------------

test('1. Answer Validation: rejects empty or whitespace-only answers', () => {
  const emptyRes = validateAnswerSubmission('');
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.error?.includes('cannot be empty'));

  const whitespaceRes = validateAnswerSubmission('   \n\t  ');
  assert.equal(whitespaceRes.valid, false);
  assert.ok(whitespaceRes.error?.includes('cannot be empty'));

  const undefinedRes = validateAnswerSubmission(undefined);
  assert.equal(undefinedRes.valid, false);

  const validRes = validateAnswerSubmission('A binary search tree has O(log n) average lookup.');
  assert.equal(validRes.valid, true);
});

test('2. Rubric Clamping & Total Score: clamps dimensional scores 0-25 and sums to 0-100', () => {
  const question = { type: 'conceptual', category: 'Core CS' };

  // Case A: Scores exceed 25
  const overboundedAi = {
    rubricScores: {
      accuracy: 35, // Should clamp to 25
      completeness: 30, // Should clamp to 25
      clarity: 25,
      depth: 28, // Should clamp to 25
    },
  };
  const evalA = sanitizeEvaluation(overboundedAi, question);
  assert.equal(evalA.rubricScores.accuracy, 25);
  assert.equal(evalA.rubricScores.completeness, 25);
  assert.equal(evalA.rubricScores.depth, 25);
  assert.equal(evalA.score, 100);
  assert.equal(evalA.verdict, 'Strong');

  // Case B: Negative scores
  const underboundedAi = {
    rubricScores: {
      accuracy: -10, // Should clamp to 0
      completeness: 5,
      clarity: 10,
      depth: 0,
    },
  };
  const evalB = sanitizeEvaluation(underboundedAi, question);
  assert.equal(evalB.rubricScores.accuracy, 0);
  assert.equal(evalB.score, 15);
  assert.equal(evalB.verdict, 'Incorrect');

  // Case C: Partial score (65)
  const partialAi = {
    rubricScores: {
      accuracy: 18,
      completeness: 15,
      clarity: 16,
      depth: 16,
    },
  };
  const evalC = sanitizeEvaluation(partialAi, question);
  assert.equal(evalC.score, 65);
  assert.equal(evalC.verdict, 'Partial');
});

test('3. Code Execution Notice: strictly requires disclaimer for coding questions', () => {
  const codingQuestion = {
    type: 'coding',
    category: 'DSA',
    starterCode: 'function solve() {}',
  };
  const evalCoding = sanitizeEvaluation(
    {
      rubricScores: { accuracy: 20, completeness: 20, clarity: 20, depth: 20 },
      whatWasCorrect: ['Correct algorithm structure'],
      missingOrMistakes: ['Edge case with empty array'],
      modelAnswer: 'function solve(arr) { if(!arr.length) return 0; ... }',
    },
    codingQuestion
  );

  assert.ok(evalCoding.executionNotice, 'Coding question evaluation must include executionNotice');
  assert.ok(
    evalCoding.executionNotice.includes('heuristically by AI without isolated container execution'),
    'Notice must specify heuristic AI evaluation without container execution'
  );

  // Conceptual questions should not falsely require execution notice
  const conceptualQuestion = { type: 'conceptual', category: 'Operating Systems' };
  const evalConceptual = sanitizeEvaluation(
    { rubricScores: { accuracy: 22, completeness: 20, clarity: 20, depth: 22 } },
    conceptualQuestion
  );
  assert.equal(evalConceptual.executionNotice, undefined);
});

test('4. Deterministic Overall Score Calculation: exact arithmetic average of answered questions', () => {
  const mockQuestions: InterviewQuestion[] = [
    {
      id: 1,
      category: 'DSA',
      difficulty: 'Fundamental',
      type: 'coding',
      question: 'Reverse a linked list',
      evaluation: {
        score: 80,
        verdict: 'Strong',
        rubricScores: { accuracy: 20, completeness: 20, clarity: 20, depth: 20 },
        whatWasCorrect: ['Iterative pointer reversal'],
        missingOrMistakes: [],
        modelAnswer: '...',
        improvementTips: [],
      },
    },
    {
      id: 2,
      category: 'System Design',
      difficulty: 'Intermediate',
      type: 'conceptual',
      question: 'Design a cache',
      evaluation: {
        score: 60,
        verdict: 'Partial',
        rubricScores: { accuracy: 15, completeness: 15, clarity: 15, depth: 15 },
        whatWasCorrect: ['Understood LRU eviction'],
        missingOrMistakes: ['No concurrency safety'],
        modelAnswer: '...',
        improvementTips: [],
      },
    },
    {
      id: 3,
      category: 'Behavioral',
      difficulty: 'Intermediate',
      type: 'behavioral',
      question: 'Describe a conflict',
      evaluation: {
        score: 91,
        verdict: 'Strong',
        rubricScores: { accuracy: 23, completeness: 23, clarity: 23, depth: 22 },
        whatWasCorrect: ['Clear STAR format'],
        missingOrMistakes: [],
        modelAnswer: '...',
        improvementTips: [],
      },
    },
    {
      id: 4,
      category: 'Core CS',
      difficulty: 'Advanced',
      type: 'conceptual',
      question: 'Explain deadlocks',
      // Unanswered question
    },
  ];

  // Mathematical average of answered: (80 + 60 + 91) / 3 = 231 / 3 = 77
  const summary = calculateDeterministicSummary(mockQuestions, {
    strengths: ['Algorithms', 'Communication'],
    weakAreas: ['Concurrency'],
  });

  assert.equal(summary.totalAnswered, 3);
  assert.equal(summary.overallScore, 77);
  assert.ok(summary.disclaimer?.includes('AI-generated heuristic estimates'));
});

test('5. Non-Objective Assessment Disclaimer: enforces explicit placement preparation notice', () => {
  const summary = calculateDeterministicSummary([]);
  assert.ok(
    summary.disclaimer?.includes('AI-generated heuristic estimates'),
    'Summary must declare AI-generated heuristic estimates'
  );
  assert.ok(
    summary.disclaimer?.includes('not official employer evaluations or certified industry assessments'),
    'Summary must disclaim official employer evaluations'
  );
});

test('6. Session History & Multi-Session In-Progress Recovery: stores and filters sessions', () => {
  interface MockStore {
    interviews: Record<string, Array<{ id: string; profileId: string; status: string }>>;
  }

  const store: MockStore = { interviews: {} };

  function mockSaveInterview(session: { id: string; profileId: string; status: string }) {
    if (!store.interviews[session.profileId]) {
      store.interviews[session.profileId] = [];
    }
    const idx = store.interviews[session.profileId].findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      store.interviews[session.profileId][idx] = session;
    } else {
      store.interviews[session.profileId].unshift(session);
    }
  }

  function mockGetActiveSession(profileId: string) {
    const list = store.interviews[profileId] || [];
    return list.find((s) => s.status === 'in_progress') || null;
  }

  function mockDeleteInterview(profileId: string, sessionId: string) {
    if (store.interviews[profileId]) {
      store.interviews[profileId] = store.interviews[profileId].filter((s) => s.id !== sessionId);
    }
  }

  // 1. Save an in-progress session for student-A
  mockSaveInterview({ id: 'sess-1', profileId: 'student-A', status: 'in_progress' });
  const active = mockGetActiveSession('student-A');
  assert.equal(active?.id, 'sess-1');

  // 2. Complete session 1
  mockSaveInterview({ id: 'sess-1', profileId: 'student-A', status: 'completed' });
  assert.equal(mockGetActiveSession('student-A'), null);

  // 3. Start a new in-progress session
  mockSaveInterview({ id: 'sess-2', profileId: 'student-A', status: 'in_progress' });
  assert.equal(mockGetActiveSession('student-A')?.id, 'sess-2');

  // 4. Delete session 1 from history
  mockDeleteInterview('student-A', 'sess-1');
  assert.equal(store.interviews['student-A'].length, 1);
  assert.equal(store.interviews['student-A'][0].id, 'sess-2');
});
