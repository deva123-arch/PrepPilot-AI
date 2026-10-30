/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  isDateInRange,
  normalizeCategory,
  mapInterviewToCategory,
  computeAnalyticsDataset,
} from '../src/utils/analyticsEngine.js';
import {
  UserProfile,
  Roadmap7Day,
  Roadmap30Day,
  MockInterviewSession,
  ActivityLog,
  SkillGapAnalysis,
} from '../src/types/index.js';

// Setup Mock Data
const mockProfile: UserProfile = {
  id: 'test-student-1',
  name: 'Priya Patel',
  targetRole: 'Full Stack Engineer',
  currentSkills: ['JavaScript', 'React', 'Node.js'],
  targetSkills: ['TypeScript', 'System Design', 'PostgreSQL'],
  experienceLevel: 'entry',
  dailyStudyHours: 2,
  targetDurationWeeks: 4,
  preferredDifficulty: 'intermediate',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const mockRoadmap7: Roadmap7Day = {
  profileId: 'test-student-1',
  targetRole: 'Full Stack Engineer',
  generatedAt: '2026-10-18T00:00:00Z',
  startDate: '2026-10-18',
  days: [
    {
      day: 1,
      targetDate: '2026-10-18',
      topic: 'React State Management & Hooks',
      category: 'Programming',
      priority: 'high',
      status: 'completed',
      completed: true,
      completedAt: '2026-10-18T10:00:00Z',
      estimatedMinutes: 60,
      learningObjectives: ['Hooks'],
      conceptsToStudy: ['useState', 'useEffect'],
      practicalCodingExercise: { title: 'Todo Store', instructions: 'Build reducer' },
      expectedOutcome: 'Store ready',
    },
    {
      day: 2,
      targetDate: '2026-10-19',
      topic: 'Binary Search Trees & DFS Traversal',
      category: 'Data Structures & Algorithms',
      priority: 'high',
      status: 'completed',
      completed: true,
      completedAt: '2026-10-19T11:00:00Z',
      estimatedMinutes: 90,
      learningObjectives: ['Trees'],
      conceptsToStudy: ['BST', 'DFS'],
      practicalCodingExercise: { title: 'BST Inorder', instructions: 'Implement traversal' },
      expectedOutcome: 'Traversal passing',
    },
    {
      day: 3,
      targetDate: '2026-10-20',
      topic: 'Database Indexing & B-Trees in SQL',
      category: 'Computer Science Fundamentals',
      priority: 'medium',
      status: 'incomplete',
      completed: false,
      estimatedMinutes: 60,
      learningObjectives: ['Indexes'],
      conceptsToStudy: ['B-Tree', 'Query Optimizer'],
      practicalCodingExercise: { title: 'Explain Plan', instructions: 'Profile query' },
      expectedOutcome: 'Optimized schema',
    },
    {
      day: 4,
      targetDate: '2026-10-21',
      topic: 'Full-Stack Architecture & Microservices',
      category: 'Projects & Architecture',
      priority: 'medium',
      status: 'skipped',
      completed: false,
      estimatedMinutes: 90,
      learningObjectives: ['Services'],
      conceptsToStudy: ['Gateways', 'Auth'],
      practicalCodingExercise: { title: 'JWT Gateway', instructions: 'Build token verifier' },
      expectedOutcome: 'Gateway operational',
    },
    {
      day: 5,
      targetDate: '2026-10-22',
      topic: 'Behavioral STAR Method & Culture Fit',
      category: 'Interview Practice',
      priority: 'low',
      status: 'incomplete',
      completed: false,
      estimatedMinutes: 45,
      learningObjectives: ['STAR'],
      conceptsToStudy: ['Conflict resolution', 'Leadership'],
      practicalCodingExercise: { title: 'STAR Story', instructions: 'Draft answers' },
      expectedOutcome: '3 STAR stories drafted',
    },
  ],
};

const mockActivities: ActivityLog[] = [
  {
    id: 'act-1',
    profileId: 'test-student-1',
    date: '2026-10-23',
    type: 'study_log',
    durationMinutes: 45,
    title: 'Solved 2 LeetCode Tree Problems',
    timestamp: '2026-10-23T14:00:00Z',
  },
  {
    id: 'act-2',
    profileId: 'test-student-1',
    date: '2026-10-24',
    type: 'roadmap_7_task',
    durationMinutes: 60,
    title: 'Completed Day 1 React State',
    timestamp: '2026-10-24T15:00:00Z',
  },
  {
    id: 'act-3',
    profileId: 'test-student-1',
    date: '2026-10-25',
    type: 'mock_interview',
    durationMinutes: 30,
    title: 'Mock Interview: Full Stack (80%)',
    score: 80,
    timestamp: '2026-10-25T16:00:00Z',
  },
];

const mockInterviews: MockInterviewSession[] = [
  {
    id: 'sess-1',
    profileId: 'test-student-1',
    targetRole: 'Full Stack Engineer',
    interviewType: 'technical',
    startedAt: '2026-10-20T10:00:00Z',
    completedAt: '2026-10-20T10:30:00Z',
    status: 'completed',
    questions: [
      {
        id: 1,
        category: 'DSA',
        difficulty: 'Intermediate',
        type: 'coding',
        question: 'Invert a binary tree',
        userAnswer: 'function invertTree() {}',
        evaluation: {
          score: 75,
          verdict: 'Strong',
          rubricScores: { accuracy: 20, completeness: 18, clarity: 18, depth: 19 },
          whatWasCorrect: ['Correct recursive inversion'],
          missingOrMistakes: ['Edge cases for null root'],
          modelAnswer: 'function invert(root) {}',
          improvementTips: ['Handle null explicitly'],
        },
      },
    ],
    summary: {
      overallScore: 75,
      totalAnswered: 1,
      strengths: ['Clear recursive logic'],
      weakAreas: ['Boundary checks'],
      topicsToRevise: ['Trees'],
      personalizedNextSteps: ['Practice base cases'],
    },
  },
  {
    id: 'sess-2',
    profileId: 'test-student-1',
    targetRole: 'Full Stack Engineer',
    interviewType: 'technical',
    startedAt: '2026-10-25T14:00:00Z',
    completedAt: '2026-10-25T14:35:00Z',
    status: 'completed',
    questions: [
      {
        id: 1,
        category: 'Web',
        difficulty: 'Intermediate',
        type: 'conceptual',
        question: 'Explain React Reconciliation & Virtual DOM',
        userAnswer: 'Diffing algorithm with heuristic keys',
        evaluation: {
          score: 85,
          verdict: 'Strong',
          rubricScores: { accuracy: 22, completeness: 21, clarity: 21, depth: 21 },
          whatWasCorrect: ['Fiber architecture accurately explained'],
          missingOrMistakes: ['Mention batching'],
          modelAnswer: 'Virtual DOM is a lightweight tree representation...',
          improvementTips: ['Mention React 18 automatic batching'],
        },
      },
    ],
    summary: {
      overallScore: 85,
      totalAnswered: 1,
      strengths: ['Deep framework knowledge'],
      weakAreas: ['Concurrency details'],
      topicsToRevise: ['React Fiber'],
      personalizedNextSteps: ['Read React 18 RFC'],
    },
  },
];

const mockAnalysis1: SkillGapAnalysis = {
  profileId: 'test-student-1',
  targetRole: 'Full Stack Engineer',
  knownSkills: ['JavaScript', 'React'],
  missingSkills: ['TypeScript', 'System Design', 'PostgreSQL'],
  prioritySkills: [],
  recommendedTechnologies: [],
  suggestedProjects: [],
  interviewReadiness: {
    score: 55,
    rating: 'Developing',
    explanation: 'Basic fundamentals present',
    disclaimer: 'AI estimate',
  },
  personalizedNextSteps: ['Learn TypeScript'],
  analyzedAt: '2026-10-05T00:00:00Z',
};

const mockAnalysis2: SkillGapAnalysis = {
  profileId: 'test-student-1',
  targetRole: 'Full Stack Engineer',
  knownSkills: ['JavaScript', 'React', 'TypeScript'],
  missingSkills: ['System Design', 'PostgreSQL'],
  prioritySkills: [],
  recommendedTechnologies: [],
  suggestedProjects: [],
  interviewReadiness: {
    score: 72,
    rating: 'Competitive',
    explanation: 'TypeScript competency verified',
    disclaimer: 'AI estimate',
  },
  personalizedNextSteps: ['Study System Design'],
  analyzedAt: '2026-10-24T00:00:00Z',
};

// ----------------------------------------------------
// TEST 1: Date Range Filtering Logic
// ----------------------------------------------------
test('1. Date Filtering: validates 7d, 30d, 90d, all, and custom ranges', () => {
  const refDate = new Date('2026-10-25T12:00:00Z');

  // Today (2026-10-25) is in 7d
  assert.strictEqual(isDateInRange('2026-10-25', '7d', undefined, refDate), true);

  // 6 days ago (2026-10-19) is in 7d
  assert.strictEqual(isDateInRange('2026-10-19', '7d', undefined, refDate), true);

  // 8 days ago (2026-10-17) is NOT in 7d
  assert.strictEqual(isDateInRange('2026-10-17', '7d', undefined, refDate), false);

  // 8 days ago IS in 30d
  assert.strictEqual(isDateInRange('2026-10-17', '30d', undefined, refDate), true);

  // 45 days ago is NOT in 30d, but IS in 90d
  assert.strictEqual(isDateInRange('2026-09-05', '30d', undefined, refDate), false);
  assert.strictEqual(isDateInRange('2026-09-05', '90d', undefined, refDate), true);

  // 'all' includes any valid date
  assert.strictEqual(isDateInRange('2024-01-01', 'all', undefined, refDate), true);

  // Custom Range
  const customRange = { start: '2026-10-10', end: '2026-10-20' };
  assert.strictEqual(isDateInRange('2026-10-15', 'custom', customRange, refDate), true);
  assert.strictEqual(isDateInRange('2026-10-22', 'custom', customRange, refDate), false);
  assert.strictEqual(isDateInRange('2026-10-05', 'custom', customRange, refDate), false);
});

// ----------------------------------------------------
// TEST 2: Deterministic Roadmap Task Metrics & Area Categorization
// ----------------------------------------------------
test('2. Deterministic Task Metrics: calculates completion rate, pending, and skipped counts accurately', () => {
  const refDate = new Date('2026-10-25T12:00:00Z');

  const dataset = computeAnalyticsDataset({
    profile: mockProfile,
    roadmap7: mockRoadmap7,
    roadmap30: null,
    interviews: [],
    activities: [],
    currentAnalysis: null,
    analysisHistory: [],
    dateFilter: 'all',
    areaFilter: 'all',
    referenceDate: refDate,
  });

  // Total tasks: 5
  assert.strictEqual(dataset.totalTasks, 5);
  // Completed tasks: Day 1 (React) & Day 2 (BST) => 2
  assert.strictEqual(dataset.completedTasks, 2);
  // Skipped: Day 4 => 1
  assert.strictEqual(dataset.skippedTasks, 1);
  // Incomplete / Pending: Day 3 & Day 5 => 2
  assert.strictEqual(dataset.pendingTasks, 2);
  // Completion rate: 2 / 5 = 40%
  assert.strictEqual(dataset.completionRate, 40);
});

// ----------------------------------------------------
// TEST 3: Preparation Area Filtering
// ----------------------------------------------------
test('3. Area Filtering: isolates metrics to specific track (e.g. Data Structures & Algorithms)', () => {
  const refDate = new Date('2026-10-25T12:00:00Z');

  const dataset = computeAnalyticsDataset({
    profile: mockProfile,
    roadmap7: mockRoadmap7,
    roadmap30: null,
    interviews: mockInterviews,
    activities: [],
    currentAnalysis: null,
    analysisHistory: [],
    dateFilter: 'all',
    areaFilter: 'Data Structures & Algorithms',
    referenceDate: refDate,
  });

  // Only Day 2 belongs to DSA
  assert.strictEqual(dataset.totalTasks, 1);
  assert.strictEqual(dataset.completedTasks, 1);
  assert.strictEqual(dataset.completionRate, 100);

  // Mock interview sess-1 has coding question (mapped to DSA)
  assert.strictEqual(dataset.totalInterviews, 1);
  assert.strictEqual(dataset.averageInterviewScore, 75);
});

// ----------------------------------------------------
// TEST 4: Study Time and Consistency Streak
// ----------------------------------------------------
test('4. Study Time & Consistency: computes real logged minutes and consecutive streak without fabrication', () => {
  const refDate = new Date('2026-10-25T12:00:00Z');

  const dataset = computeAnalyticsDataset({
    profile: mockProfile,
    roadmap7: null,
    roadmap30: null,
    interviews: [],
    activities: mockActivities,
    currentAnalysis: null,
    analysisHistory: [],
    dateFilter: 'all',
    areaFilter: 'all',
    referenceDate: refDate,
  });

  // Total minutes = 45 + 60 + 30 = 135 minutes = 2h 15m
  assert.strictEqual(dataset.totalStudyMinutes, 135);
  assert.strictEqual(dataset.formattedStudyTime, '2h 15m');

  // Active days: 2026-10-23, 2026-10-24, 2026-10-25 => 3 days
  assert.strictEqual(dataset.activeStudyDaysCount, 3);

  // Consecutive streak ending today (2026-10-25, 24, 23) => 3 days
  assert.strictEqual(dataset.currentStreak, 3);
});

// ----------------------------------------------------
// TEST 5: Mock Interview Performance & Rubric Dimensional Averages
// ----------------------------------------------------
test('5. Mock Interview Arithmetic: computes exact average score and rubric dimensional averages', () => {
  const refDate = new Date('2026-10-25T12:00:00Z');

  const dataset = computeAnalyticsDataset({
    profile: mockProfile,
    roadmap7: null,
    roadmap30: null,
    interviews: mockInterviews,
    activities: [],
    currentAnalysis: null,
    analysisHistory: [],
    dateFilter: 'all',
    areaFilter: 'all',
    referenceDate: refDate,
  });

  // Completed interviews: 2 sessions (75% and 85%)
  // Exact average: (75 + 85) / 2 = 80%
  assert.strictEqual(dataset.totalInterviews, 2);
  assert.strictEqual(dataset.averageInterviewScore, 80);
  assert.strictEqual(dataset.highestInterviewScore, 85);
  assert.strictEqual(dataset.latestInterviewScore, 75); // first completed session in array

  // Rubric averages:
  // Accuracy: (20 + 22)/2 = 21 out of 25 = 84%
  // Completeness: (18 + 21)/2 = 19.5 -> 78%
  // Clarity: (18 + 21)/2 = 19.5 -> 78%
  // Depth: (19 + 21)/2 = 20 -> 80%
  assert.ok(dataset.rubricAverages !== null);
  assert.strictEqual(dataset.rubricAverages.accuracy, 84);
  assert.strictEqual(dataset.rubricAverages.completeness, 78);
  assert.strictEqual(dataset.rubricAverages.clarity, 78);
  assert.strictEqual(dataset.rubricAverages.depth, 80);
});

// ----------------------------------------------------
// TEST 6: Data Sufficiency Checks for Progress Charts
// ----------------------------------------------------
test('6. Chart Data Sufficiency: enforces at least 2 sessions for trend chart and returns clear reason when insufficient', () => {
  const refDate = new Date('2026-10-25T12:00:00Z');

  // Case A: 2 sessions => sufficient
  const sufficient = computeAnalyticsDataset({
    profile: mockProfile,
    roadmap7: null,
    roadmap30: null,
    interviews: mockInterviews,
    activities: [],
    currentAnalysis: null,
    analysisHistory: [],
    dateFilter: 'all',
    areaFilter: 'all',
    referenceDate: refDate,
  });
  assert.strictEqual(sufficient.hasSufficientInterviewData, true);
  assert.strictEqual(sufficient.interviewDataReason, undefined);
  assert.strictEqual(sufficient.interviewScoreTrajectory.length, 2);

  // Case B: Only 1 session => insufficient with reason
  const singleSession = [mockInterviews[0]];
  const insufficientSingle = computeAnalyticsDataset({
    profile: mockProfile,
    roadmap7: null,
    roadmap30: null,
    interviews: singleSession,
    activities: [],
    currentAnalysis: null,
    analysisHistory: [],
    dateFilter: 'all',
    areaFilter: 'all',
    referenceDate: refDate,
  });
  assert.strictEqual(insufficientSingle.hasSufficientInterviewData, false);
  assert.match(insufficientSingle.interviewDataReason || '', /Only 1 completed mock interview recorded/);

  // Case C: 0 sessions => insufficient with reason
  const zeroSessions = computeAnalyticsDataset({
    profile: mockProfile,
    roadmap7: null,
    roadmap30: null,
    interviews: [],
    activities: [],
    currentAnalysis: null,
    analysisHistory: [],
    dateFilter: 'all',
    areaFilter: 'all',
    referenceDate: refDate,
  });
  assert.strictEqual(zeroSessions.hasSufficientInterviewData, false);
  assert.match(zeroSessions.interviewDataReason || '', /No completed mock interviews found/);
});

// ----------------------------------------------------
// TEST 7: Skill Gap Assessment History & Delta Computation
// ----------------------------------------------------
test('7. Skill-Gap Progression: compares multiple assessments, computes score delta, and identifies resolved competencies', () => {
  const refDate = new Date('2026-10-25T12:00:00Z');

  // Compare mockAnalysis1 (55%, Developing) vs mockAnalysis2 (72%, Competitive)
  const dataset = computeAnalyticsDataset({
    profile: mockProfile,
    roadmap7: null,
    roadmap30: null,
    interviews: [],
    activities: [],
    currentAnalysis: mockAnalysis2,
    analysisHistory: [mockAnalysis1, mockAnalysis2],
    dateFilter: 'all',
    areaFilter: 'all',
    referenceDate: refDate,
  });

  const delta = dataset.skillGapDelta;
  assert.ok(delta !== null);
  assert.strictEqual(delta.hasComparison, true);
  // Score delta: 72 - 55 = +17
  assert.strictEqual(delta.scoreDelta, 17);
  assert.strictEqual(delta.previousScore, 55);
  assert.strictEqual(delta.currentScore, 72);
  assert.strictEqual(delta.previousRating, 'Developing');
  assert.strictEqual(delta.currentRating, 'Competitive');

  // In analysis1: missing was ['TypeScript', 'System Design', 'PostgreSQL']
  // In analysis2: known is ['JavaScript', 'React', 'TypeScript']
  // 'TypeScript' resolved!
  assert.deepStrictEqual(delta.resolvedMissingSkills, ['TypeScript']);
  assert.deepStrictEqual(delta.newMissingSkills, []);
});

// ----------------------------------------------------
// TEST 8: Weekly Summary Synthesis & Unfinished Priorities
// ----------------------------------------------------
test('8. Weekly Summary: aggregates achievements and prioritizes unfinished milestones', () => {
  const refDate = new Date('2026-10-25T12:00:00Z');

  const dataset = computeAnalyticsDataset({
    profile: mockProfile,
    roadmap7: mockRoadmap7,
    roadmap30: null,
    interviews: mockInterviews,
    activities: mockActivities,
    currentAnalysis: null,
    analysisHistory: [],
    dateFilter: 'all',
    areaFilter: 'all',
    referenceDate: refDate,
  });

  const weekly = dataset.weeklySummary;
  // Activities within past 7 days (Oct 19 - Oct 25)
  // act-1 (Oct 23): 45m study
  // act-2 (Oct 24): 60m roadmap task
  // act-3 (Oct 25): 30m interview
  assert.strictEqual(weekly.tasksCompletedThisWeek, 1);
  assert.strictEqual(weekly.studyMinutesThisWeek, 135);
  assert.strictEqual(weekly.interviewsCompletedThisWeek, 1);

  // Unfinished priority tasks should include Day 3 (medium) and Day 5
  assert.ok(weekly.unfinishedPriorityTasks.length > 0);
  assert.strictEqual(weekly.unfinishedPriorityTasks[0].day, 3);
  assert.strictEqual(weekly.unfinishedPriorityTasks[0].topic, 'Database Indexing & B-Trees in SQL');

  // Recommended actions generated
  assert.ok(weekly.recommendedActions.length > 0);
  assert.match(weekly.recommendedActions[0], /Complete 7-Day Sprint Day 3/);
});

// ----------------------------------------------------
// TEST 9: Empty & Defensive State Handling
// ----------------------------------------------------
test('9. Safe Fallbacks: handles empty profile, null roadmaps, and missing activities gracefully without exceptions', () => {
  const emptyDataset = computeAnalyticsDataset({
    profile: null,
    roadmap7: null,
    roadmap30: null,
    interviews: [],
    activities: [],
    currentAnalysis: null,
    analysisHistory: [],
    dateFilter: 'all',
    areaFilter: 'all',
  });

  assert.strictEqual(emptyDataset.totalTasks, 0);
  assert.strictEqual(emptyDataset.completedTasks, 0);
  assert.strictEqual(emptyDataset.completionRate, 0);
  assert.strictEqual(emptyDataset.totalStudyMinutes, 0);
  assert.strictEqual(emptyDataset.formattedStudyTime, '0 mins');
  assert.strictEqual(emptyDataset.currentStreak, 0);
  assert.strictEqual(emptyDataset.totalInterviews, 0);
  assert.strictEqual(emptyDataset.averageInterviewScore, null);
  assert.strictEqual(emptyDataset.hasSufficientInterviewData, false);
  assert.strictEqual(emptyDataset.hasSufficientActivityData, false);
  assert.strictEqual(emptyDataset.skillGapDelta, null);
  assert.strictEqual(emptyDataset.weeklySummary.tasksCompletedThisWeek, 0);
  assert.strictEqual(emptyDataset.weeklySummary.studyMinutesThisWeek, 0);
});
