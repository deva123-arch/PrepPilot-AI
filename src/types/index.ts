/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExperienceLevel = 'beginner' | 'entry' | 'mid' | 'senior';
export type LearningDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'intensive';

export interface UserProfile {
  id: string;
  name: string;
  targetRole: string;
  currentSkills: string[];
  targetSkills: string[];
  experienceLevel: ExperienceLevel;
  dailyStudyHours: number; // e.g. 1, 2, 3, 4
  targetDurationWeeks: number; // e.g. 1, 2, 4, 8, 12
  preferredDifficulty: LearningDifficulty;
  completedProjects?: string[]; // student's completed projects / portfolio items
  createdAt: string;
  updatedAt: string;
}

export interface PrioritySkill {
  skill: string;
  category?: string; // e.g. Core CS & DSA, System Design, Frameworks, Testing
  priority: 'high' | 'medium' | 'low';
  reason: string;
  practicalExercise?: string; // coding challenge or targeted drill to close the gap
  projectIdea?: string; // resume-worthy mini-project or feature
}

export interface RecommendedTechCategory {
  category: string;
  items: string[];
}

export interface SuggestedProject {
  title: string;
  description: string;
  techStack: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  portfolioImpact: string;
}

export interface SkillGapAnalysis {
  profileId: string;
  targetRole: string;
  knownSkills: string[];
  missingSkills: string[];
  prioritySkills: PrioritySkill[];
  recommendedTechnologies: RecommendedTechCategory[];
  suggestedProjects: SuggestedProject[];
  interviewReadiness: {
    score: number; // 0 to 100
    rating: 'Early Stage' | 'Developing' | 'Competitive' | 'Interview Ready';
    explanation: string;
    disclaimer: string;
  };
  personalizedNextSteps: string[];
  analyzedAt: string;
}

export type TaskStatus = 'incomplete' | 'completed' | 'skipped';
export type TaskPriority = 'high' | 'medium' | 'low';
export type RoadmapTaskCategory =
  | 'Programming'
  | 'Data Structures & Algorithms'
  | 'Computer Science Fundamentals'
  | 'Projects & Architecture'
  | 'Aptitude & Logical Reasoning'
  | 'Interview Practice';

export interface Roadmap7DayItem {
  day: number;
  targetDate?: string;
  topic: string;
  category?: RoadmapTaskCategory | string;
  priority?: TaskPriority;
  status?: TaskStatus;
  learningObjectives: string[];
  conceptsToStudy: string[];
  practicalCodingExercise: {
    title: string;
    instructions: string;
    starterHint?: string;
  };
  estimatedMinutes: number;
  expectedOutcome: string;
  completed: boolean;
  completedAt?: string;
}

export interface Roadmap7Day {
  profileId: string;
  targetRole: string;
  generatedAt: string;
  startDate?: string;
  days: Roadmap7DayItem[];
}

export interface Roadmap30DayPhase {
  phaseNumber: number;
  phaseTitle: string;
  dayRange: string;
  summary: string;
}

export interface Roadmap30DayItem {
  day: number;
  targetDate?: string;
  phaseNumber: number;
  phaseTitle: string;
  topic: string;
  category?: RoadmapTaskCategory | string;
  priority?: TaskPriority;
  status?: TaskStatus;
  learningObjectives: string[];
  conceptsToStudy: string[];
  practicalExercise: {
    title: string;
    instructions: string;
    starterHint?: string;
  };
  estimatedMinutes: number;
  expectedOutcome: string;
  completed: boolean;
  completedAt?: string;
}

export interface Roadmap30Day {
  profileId: string;
  targetRole: string;
  generatedAt: string;
  startDate?: string;
  phases: Roadmap30DayPhase[];
  days: Roadmap30DayItem[];
}

export type InterviewCategory = 'technical' | 'behavioral' | 'mixed';
export type InterviewDifficulty = 'Fundamental' | 'Intermediate' | 'Advanced' | 'Adaptive';

export interface InterviewQuestion {
  id: number;
  category: string; // DSA, Web, Backend, Database, System Design, Core CS, Behavioral, STAR Method
  difficulty: 'Fundamental' | 'Intermediate' | 'Advanced';
  type: 'conceptual' | 'coding' | 'scenario' | 'behavioral';
  question: string;
  starterCode?: string;
  expectedKeyPoints?: string[];
  userAnswer?: string;
  answeredAt?: string;
  evaluation?: QuestionEvaluation;
}

export interface QuestionEvaluation {
  score: number; // 0 - 100
  verdict: 'Strong' | 'Partial' | 'Needs Improvement' | 'Incorrect';
  rubricScores: {
    accuracy: number; // 0-25 (or Situation/Action for behavioral)
    completeness: number; // 0-25
    clarity: number; // 0-25
    depth: number; // 0-25
  };
  whatWasCorrect: string[];
  missingOrMistakes: string[];
  modelAnswer: string;
  improvementTips: string[];
  executionNotice?: string; // Disclaimer that code is evaluated heuristically without a sandbox container
}

export interface InterviewSummary {
  overallScore: number;
  totalAnswered: number;
  strengths: string[];
  weakAreas: string[];
  topicsToRevise: string[];
  personalizedNextSteps: string[];
  suggestedFollowUpPractice?: string[];
  disclaimer?: string;
}

export interface MockInterviewSession {
  id: string;
  profileId: string;
  targetRole: string;
  interviewType?: InterviewCategory;
  difficulty?: InterviewDifficulty;
  questionCount?: number;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  questions: InterviewQuestion[];
  summary?: InterviewSummary;
}

export interface ActivityLog {
  id: string;
  profileId: string;
  date: string; // YYYY-MM-DD
  type: 'roadmap_7_task' | 'roadmap_30_task' | 'mock_interview' | 'study_log';
  durationMinutes: number;
  title: string;
  score?: number;
  timestamp: string;
}

export interface PersonalizedRecommendations {
  profileId: string;
  nextValuableTopic: string;
  overdueOrIncompleteAdvice: string;
  skillsToPractice: string[];
  relevantCodingExercises: Array<{
    title: string;
    focus: string;
    description: string;
  }>;
  interviewTopicsToRevise: string[];
  planAdjustments: string;
  adaptiveFocusNotes?: string;
  skippedTaskRemediations?: string[];
  generatedAt: string;
}

export interface ProfileDataStore {
  version: number;
  profiles: UserProfile[];
  activeProfileId: string | null;
  analyses: Record<string, SkillGapAnalysis>; // key is profileId
  roadmaps7: Record<string, Roadmap7Day>; // key is profileId
  roadmaps30: Record<string, Roadmap30Day>; // key is profileId
  interviews: Record<string, MockInterviewSession[]>; // key is profileId
  activities: Record<string, ActivityLog[]>; // key is profileId
  recommendations: Record<string, PersonalizedRecommendations>; // key is profileId
  analysisHistory?: Record<string, SkillGapAnalysis[]>; // key is profileId, tracks diagnostic progression over time
}

export type DateFilterOption = 'all' | '7d' | '30d' | '90d' | 'custom';
export type AreaFilterOption = RoadmapTaskCategory | 'all';

export interface AreaProgressItem {
  category: RoadmapTaskCategory;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number; // 0 - 100
  studyMinutes: number;
}

export interface MockInterviewTrajectoryPoint {
  id: string;
  date: string;
  timestamp: string;
  score: number;
  role: string;
  category: string;
  difficulty?: string;
}

export interface DailyActivityMetric {
  date: string;
  dayLabel: string;
  tasksCompleted: number;
  studyMinutes: number;
  mockInterviewsCompleted: number;
  titles: string[];
}

export interface SkillGapDelta {
  hasComparison: boolean;
  previousAnalyzedAt?: string;
  currentAnalyzedAt: string;
  scoreDelta: number; // e.g. +10 or -5
  previousScore?: number;
  currentScore: number;
  previousRating?: string;
  currentRating: string;
  resolvedMissingSkills: string[]; // skills that were missing in previous but known in current
  newMissingSkills: string[]; // new gaps flagged
  totalKnownDelta: number;
}

export interface AnalyticsDataset {
  // Filters applied
  dateFilter: DateFilterOption;
  customStartDate?: string;
  customEndDate?: string;
  areaFilter: AreaFilterOption;

  // Task metrics
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  skippedTasks: number;
  completionRate: number; // 0 - 100

  // Consistency & Study Time
  totalStudyMinutes: number;
  formattedStudyTime: string;
  currentStreak: number;
  activeStudyDaysCount: number;

  // Interview metrics
  totalInterviews: number;
  averageInterviewScore: number | null;
  highestInterviewScore: number | null;
  latestInterviewScore: number | null;
  rubricAverages: {
    accuracy: number;
    completeness: number;
    clarity: number;
    depth: number;
  } | null;

  // Chart sufficiency checks
  hasSufficientInterviewData: boolean;
  hasSufficientActivityData: boolean;
  interviewDataReason?: string;
  activityDataReason?: string;

  // Historical data series
  interviewScoreTrajectory: MockInterviewTrajectoryPoint[];
  dailyActivitySeries: DailyActivityMetric[];

  // Area breakdown
  areaBreakdown: AreaProgressItem[];

  // Skill gap comparison
  skillGapDelta: SkillGapDelta | null;

  // Weekly summary
  weeklySummary: {
    tasksCompletedThisWeek: number;
    studyMinutesThisWeek: number;
    interviewsCompletedThisWeek: number;
    avgScoreThisWeek: number | null;
    velocityDeltaPercent: number;
    unfinishedPriorityTasks: Array<{
      id: string;
      source: '7-day' | '30-day';
      day: number;
      topic: string;
      category?: string;
      priority?: string;
      estimatedMinutes: number;
    }>;
    recommendedActions: string[];
  };
}
