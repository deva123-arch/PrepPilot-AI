/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserProfile,
  Roadmap7Day,
  Roadmap30Day,
  MockInterviewSession,
  ActivityLog,
  SkillGapAnalysis,
  RoadmapTaskCategory,
  DateFilterOption,
  AreaFilterOption,
  AnalyticsDataset,
  AreaProgressItem,
  MockInterviewTrajectoryPoint,
  DailyActivityMetric,
  SkillGapDelta,
} from '../types';
import { inferRoadmapCategory } from '../services/storage';

export const STANDARD_AREAS: RoadmapTaskCategory[] = [
  'Programming',
  'Data Structures & Algorithms',
  'Computer Science Fundamentals',
  'Projects & Architecture',
  'Aptitude & Logical Reasoning',
  'Interview Practice',
];

/**
 * Checks if a given ISO date (YYYY-MM-DD or full ISO) falls within the selected date filter.
 */
export function isDateInRange(
  dateInput?: string,
  filter: DateFilterOption = 'all',
  customRange?: { start?: string; end?: string },
  referenceDate: Date = new Date()
): boolean {
  if (!dateInput) return filter === 'all';
  if (filter === 'all') return true;

  const targetDate = new Date(dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00`);
  if (isNaN(targetDate.getTime())) return false;

  const ref = new Date(referenceDate);
  ref.setHours(23, 59, 59, 999);

  if (filter === 'custom') {
    if (!customRange?.start && !customRange?.end) return true;
    if (customRange.start) {
      const start = new Date(`${customRange.start}T00:00:00`);
      if (!isNaN(start.getTime()) && targetDate < start) return false;
    }
    if (customRange.end) {
      const end = new Date(`${customRange.end}T23:59:59.999`);
      if (!isNaN(end.getTime()) && targetDate > end) return false;
    }
    return true;
  }

  const daysMap: Record<'7d' | '30d' | '90d', number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };

  const days = daysMap[filter as '7d' | '30d' | '90d'] || 30;
  const cutoff = new Date(ref);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);

  return targetDate >= cutoff && targetDate <= ref;
}

/**
 * Normalizes task categories to ensure accurate area filtering.
 */
export function normalizeCategory(rawCategory?: string, topic?: string, role = ''): RoadmapTaskCategory {
  if (rawCategory && STANDARD_AREAS.includes(rawCategory as RoadmapTaskCategory)) {
    return rawCategory as RoadmapTaskCategory;
  }
  return inferRoadmapCategory(topic || rawCategory || '', role);
}

/**
 * Maps an interview session to a relevant preparation area category.
 */
export function mapInterviewToCategory(session: MockInterviewSession): RoadmapTaskCategory {
  if (session.interviewType === 'behavioral') {
    return 'Interview Practice';
  }
  const hasCoding = session.questions.some((q) => q.type === 'coding');
  if (hasCoding) {
    return 'Data Structures & Algorithms';
  }
  const hasCS = session.questions.some((q) => q.category?.toLowerCase().includes('cs') || q.category?.toLowerCase().includes('os'));
  if (hasCS) {
    return 'Computer Science Fundamentals';
  }
  return 'Interview Practice';
}

/**
 * Pure calculation function that produces the comprehensive AnalyticsDataset.
 */
export function computeAnalyticsDataset(params: {
  profile: UserProfile | null;
  roadmap7: Roadmap7Day | null;
  roadmap30: Roadmap30Day | null;
  interviews: MockInterviewSession[];
  activities: ActivityLog[];
  currentAnalysis: SkillGapAnalysis | null;
  analysisHistory: SkillGapAnalysis[];
  dateFilter: DateFilterOption;
  customRange?: { start?: string; end?: string };
  areaFilter: AreaFilterOption;
  referenceDate?: Date;
}): AnalyticsDataset {
  const {
    profile,
    roadmap7,
    roadmap30,
    interviews = [],
    activities = [],
    currentAnalysis,
    analysisHistory = [],
    dateFilter = 'all',
    customRange,
    areaFilter = 'all',
    referenceDate = new Date(),
  } = params;

  // 1. Filter Tasks
  const allTasks: Array<{
    id: string;
    source: '7-day' | '30-day';
    day: number;
    topic: string;
    category: RoadmapTaskCategory;
    priority: string;
    status: 'incomplete' | 'completed' | 'skipped';
    completed: boolean;
    date: string;
    completedAt?: string;
    estimatedMinutes: number;
  }> = [];

  if (roadmap7 && Array.isArray(roadmap7.days)) {
    roadmap7.days.forEach((d) => {
      const taskDate = d.targetDate || roadmap7.startDate || d.completedAt?.split('T')[0] || '';
      const cat = normalizeCategory(d.category, d.topic, roadmap7.targetRole);
      const isCompleted = d.status === 'completed' || d.completed;
      const status = d.status || (isCompleted ? 'completed' : 'incomplete');

      allTasks.push({
        id: `7-${d.day}`,
        source: '7-day',
        day: d.day,
        topic: d.topic,
        category: cat,
        priority: d.priority || 'medium',
        status,
        completed: status === 'completed',
        date: taskDate,
        completedAt: d.completedAt,
        estimatedMinutes: d.estimatedMinutes || 60,
      });
    });
  }

  if (roadmap30 && Array.isArray(roadmap30.days)) {
    roadmap30.days.forEach((d) => {
      const taskDate = d.targetDate || roadmap30.startDate || d.completedAt?.split('T')[0] || '';
      const cat = normalizeCategory(d.category, d.topic, roadmap30.targetRole);
      const isCompleted = d.status === 'completed' || d.completed;
      const status = d.status || (isCompleted ? 'completed' : 'incomplete');

      allTasks.push({
        id: `30-${d.day}`,
        source: '30-day',
        day: d.day,
        topic: d.topic,
        category: cat,
        priority: d.priority || 'medium',
        status,
        completed: status === 'completed',
        date: taskDate,
        completedAt: d.completedAt,
        estimatedMinutes: d.estimatedMinutes || 60,
      });
    });
  }

  // Filter tasks by date & area
  const filteredTasks = allTasks.filter((t) => {
    // When completed, check completedAt date; otherwise check target date
    const dateToCheck = t.completedAt ? t.completedAt.split('T')[0] : t.date;
    const inDate = isDateInRange(dateToCheck, dateFilter, customRange, referenceDate);
    if (!inDate) return false;

    if (areaFilter !== 'all' && t.category !== areaFilter) {
      return false;
    }
    return true;
  });

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.completed).length;
  const skippedTasks = filteredTasks.filter((t) => t.status === 'skipped').length;
  const pendingTasks = filteredTasks.filter((t) => t.status === 'incomplete').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 2. Filter Activities & Calculate Study Minutes
  const filteredActivities = activities.filter((act) => {
    const inDate = isDateInRange(act.date, dateFilter, customRange, referenceDate);
    if (!inDate) return false;
    return true;
  });

  // Deterministic study minutes: sum of filtered activities
  const totalStudyMinutes = filteredActivities.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
  const hours = Math.floor(totalStudyMinutes / 60);
  const mins = totalStudyMinutes % 60;
  const formattedStudyTime = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

  // Active study days
  const activeDaysSet = new Set(filteredActivities.map((a) => a.date));
  const activeStudyDaysCount = activeDaysSet.size;

  // Consistency Streak (Calculated up from today/yesterday)
  let streak = 0;
  const allActivityDates = new Set(activities.map((a) => a.date));
  const today = new Date(referenceDate);

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (allActivityDates.has(dateStr)) {
      streak++;
    } else if (i === 0) {
      // If no activity today yet, check if there was activity yesterday before breaking
      continue;
    } else {
      break;
    }
  }

  // 3. Filter Mock Interviews & Calculate Metrics
  const filteredInterviews = interviews.filter((s) => {
    const sessionDate = s.completedAt ? s.completedAt.split('T')[0] : s.startedAt ? s.startedAt.split('T')[0] : '';
    const inDate = isDateInRange(sessionDate, dateFilter, customRange, referenceDate);
    if (!inDate) return false;

    if (areaFilter !== 'all') {
      const sessionCat = mapInterviewToCategory(s);
      if (sessionCat !== areaFilter) return false;
    }
    return true;
  });

  const completedInterviews = filteredInterviews.filter((s) => s.status === 'completed' && s.summary);
  const validScores = completedInterviews
    .map((s) => s.summary!.overallScore)
    .filter((score): score is number => typeof score === 'number' && !isNaN(score));

  const averageInterviewScore =
    validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;

  const highestInterviewScore = validScores.length > 0 ? Math.max(...validScores) : null;
  const latestInterview = completedInterviews[0] || null;
  const latestInterviewScore = latestInterview?.summary?.overallScore ?? null;

  // Rubric dimensional averages across answered questions
  let rubricAverages: {
    accuracy: number;
    completeness: number;
    clarity: number;
    depth: number;
  } | null = null;

  let totalRubricItems = 0;
  let sumAccuracy = 0;
  let sumCompleteness = 0;
  let sumClarity = 0;
  let sumDepth = 0;

  completedInterviews.forEach((session) => {
    session.questions.forEach((q) => {
      if (q.evaluation?.rubricScores) {
        sumAccuracy += q.evaluation.rubricScores.accuracy || 0;
        sumCompleteness += q.evaluation.rubricScores.completeness || 0;
        sumClarity += q.evaluation.rubricScores.clarity || 0;
        sumDepth += q.evaluation.rubricScores.depth || 0;
        totalRubricItems++;
      }
    });
  });

  if (totalRubricItems > 0) {
    rubricAverages = {
      accuracy: Math.round((sumAccuracy / totalRubricItems) * 4), // Normalize 0-25 to 0-100%
      completeness: Math.round((sumCompleteness / totalRubricItems) * 4),
      clarity: Math.round((sumClarity / totalRubricItems) * 4),
      depth: Math.round((sumDepth / totalRubricItems) * 4),
    };
  }

  // Trajectory series: sorted chronologically
  const interviewScoreTrajectory: MockInterviewTrajectoryPoint[] = completedInterviews
    .map((s) => {
      const dateStr = s.completedAt ? s.completedAt.split('T')[0] : s.startedAt ? s.startedAt.split('T')[0] : '';
      return {
        id: s.id,
        date: dateStr,
        timestamp: s.completedAt || s.startedAt,
        score: s.summary!.overallScore,
        role: s.targetRole,
        category: s.interviewType || 'technical',
        difficulty: s.difficulty,
      };
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Chart sufficiency checks
  const hasSufficientInterviewData = interviewScoreTrajectory.length >= 2;
  const interviewDataReason =
    interviewScoreTrajectory.length === 0
      ? 'No completed mock interviews found in the selected range. Complete mock interview sessions to generate a progress trend.'
      : interviewScoreTrajectory.length === 1
      ? 'Only 1 completed mock interview recorded. Complete at least one more session to render a historical progression line.'
      : undefined;

  // 4. Daily Activity Series (for activity chart)
  const daysInSeries = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 14 : 7;
  const dailyActivitySeries: DailyActivityMetric[] = [];

  for (let i = daysInSeries - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

    const dayActivities = filteredActivities.filter((a) => a.date === dateStr);
    const tasksCount = dayActivities.filter((a) => a.type.includes('task')).length;
    const mins = dayActivities.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const interviewCount = dayActivities.filter((a) => a.type === 'mock_interview').length;
    const titles = dayActivities.map((a) => a.title);

    dailyActivitySeries.push({
      date: dateStr,
      dayLabel,
      tasksCompleted: tasksCount,
      studyMinutes: mins,
      mockInterviewsCompleted: interviewCount,
      titles,
    });
  }

  const hasSufficientActivityData = dailyActivitySeries.some((d) => d.tasksCompleted > 0 || d.studyMinutes > 0);
  const activityDataReason = !hasSufficientActivityData
    ? 'No activity or completed milestones recorded in this timeframe. Mark roadmap milestones complete or log study time to view daily momentum.'
    : undefined;

  // 5. Preparation Area Breakdown
  const areaBreakdown: AreaProgressItem[] = STANDARD_AREAS.map((cat) => {
    const catTasks = allTasks.filter((t) => {
      const inDate = isDateInRange(t.completedAt ? t.completedAt.split('T')[0] : t.date, dateFilter, customRange, referenceDate);
      return inDate && t.category === cat;
    });

    const catTotal = catTasks.length;
    const catDone = catTasks.filter((t) => t.completed).length;
    const catPending = catTasks.filter((t) => t.status === 'incomplete').length;
    const catRate = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;

    // Study minutes associated with this category
    const catActivities = filteredActivities.filter((a) => {
      const titleLower = a.title.toLowerCase();
      if (cat === 'Data Structures & Algorithms' && (titleLower.includes('dsa') || titleLower.includes('algorithm') || titleLower.includes('tree'))) return true;
      if (cat === 'Computer Science Fundamentals' && (titleLower.includes('cs') || titleLower.includes('os') || titleLower.includes('database') || titleLower.includes('dbms'))) return true;
      if (cat === 'Interview Practice' && (titleLower.includes('interview') || titleLower.includes('mock'))) return true;
      if (cat === 'Projects & Architecture' && (titleLower.includes('project') || titleLower.includes('portfolio') || titleLower.includes('system design'))) return true;
      if (cat === 'Aptitude & Logical Reasoning' && (titleLower.includes('aptitude') || titleLower.includes('puzzle'))) return true;
      if (cat === 'Programming' && (titleLower.includes('react') || titleLower.includes('javascript') || titleLower.includes('python') || titleLower.includes('java') || titleLower.includes('c++'))) return true;
      return false;
    });

    const catMins = catActivities.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);

    return {
      category: cat,
      totalTasks: catTotal,
      completedTasks: catDone,
      pendingTasks: catPending,
      completionRate: catRate,
      studyMinutes: catMins,
    };
  });

  // 6. Skill-Gap Assessment Comparison
  let skillGapDelta: SkillGapDelta | null = null;
  const historyList = (analysisHistory.length > 0 ? analysisHistory : currentAnalysis ? [currentAnalysis] : []).slice();

  // Sort history chronologically
  historyList.sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime());

  if (historyList.length >= 2) {
    const previous = historyList[historyList.length - 2];
    const current = historyList[historyList.length - 1];

    const prevMissingSet = new Set(previous.missingSkills || []);
    const currentKnownSet = new Set(current.knownSkills || []);
    const currentMissingSet = new Set(current.missingSkills || []);

    // Missing skills from previous that are now in current known skills (or no longer missing)
    const resolved = (previous.missingSkills || []).filter(
      (skill) => currentKnownSet.has(skill) || !currentMissingSet.has(skill)
    );

    // New missing skills
    const newGaps = (current.missingSkills || []).filter((skill) => !prevMissingSet.has(skill));

    skillGapDelta = {
      hasComparison: true,
      previousAnalyzedAt: previous.analyzedAt,
      currentAnalyzedAt: current.analyzedAt,
      previousScore: previous.interviewReadiness.score,
      currentScore: current.interviewReadiness.score,
      scoreDelta: current.interviewReadiness.score - previous.interviewReadiness.score,
      previousRating: previous.interviewReadiness.rating,
      currentRating: current.interviewReadiness.rating,
      resolvedMissingSkills: resolved,
      newMissingSkills: newGaps,
      totalKnownDelta: (current.knownSkills?.length || 0) - (previous.knownSkills?.length || 0),
    };
  } else if (historyList.length === 1) {
    const single = historyList[0];
    skillGapDelta = {
      hasComparison: false,
      currentAnalyzedAt: single.analyzedAt,
      currentScore: single.interviewReadiness.score,
      currentRating: single.interviewReadiness.rating,
      scoreDelta: 0,
      resolvedMissingSkills: [],
      newMissingSkills: [],
      totalKnownDelta: 0,
    };
  }

  // 7. Weekly Summary Calculations (Trailing 7 days vs Prior 7 days)
  const now = new Date(referenceDate);
  let tasksThisWeek = 0;
  let minutesThisWeek = 0;
  let interviewsThisWeek = 0;
  let scoreSumThisWeek = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayActs = activities.filter((a) => a.date === dateStr);

    tasksThisWeek += dayActs.filter((a) => a.type.includes('task')).length;
    minutesThisWeek += dayActs.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const intActs = dayActs.filter((a) => a.type === 'mock_interview');
    interviewsThisWeek += intActs.length;
    intActs.forEach((a) => {
      if (typeof a.score === 'number') scoreSumThisWeek += a.score;
    });
  }

  let tasksPriorWeek = 0;
  for (let i = 7; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayActs = activities.filter((a) => a.date === dateStr);
    tasksPriorWeek += dayActs.filter((a) => a.type.includes('task')).length;
  }

  const velocityDeltaPercent =
    tasksPriorWeek === 0 && tasksThisWeek > 0
      ? 100
      : tasksPriorWeek === 0
      ? 0
      : Math.round(((tasksThisWeek - tasksPriorWeek) / tasksPriorWeek) * 100);

  const avgScoreThisWeek = interviewsThisWeek > 0 ? Math.round(scoreSumThisWeek / interviewsThisWeek) : null;

  // Unfinished priority tasks
  const unfinishedPriorityTasks = allTasks
    .filter((t) => t.status === 'incomplete' && (t.priority === 'high' || t.source === '7-day'))
    .slice(0, 4)
    .map((t) => ({
      id: t.id,
      source: t.source,
      day: t.day,
      topic: t.topic,
      category: t.category,
      priority: t.priority,
      estimatedMinutes: t.estimatedMinutes,
    }));

  // Recommended next actions based on deterministic metrics
  const recommendedActions: string[] = [];

  if (unfinishedPriorityTasks.length > 0) {
    const next = unfinishedPriorityTasks[0];
    recommendedActions.push(
      `Complete ${next.source === '7-day' ? '7-Day Sprint' : '30-Day Master'} Day ${next.day}: "${next.topic}" (${next.estimatedMinutes} mins).`
    );
  }

  if (completedInterviews.length === 0) {
    recommendedActions.push('Launch your first 5 or 10-question AI Mock Interview to benchmark your role readiness.');
  } else if (averageInterviewScore !== null && averageInterviewScore < 70) {
    recommendedActions.push(
      `Revise weak rubric criteria (current average: ${averageInterviewScore}%) with focused conceptual and STAR method drills.`
    );
  }

  if (streak === 0) {
    recommendedActions.push('Complete today’s roadmap milestone to restart your study consistency streak.');
  }

  if (recommendedActions.length === 0) {
    recommendedActions.push('Great progress! Run a new mock interview or re-evaluate your skill gaps to establish a higher readiness target.');
  }

  return {
    dateFilter,
    customStartDate: customRange?.start,
    customEndDate: customRange?.end,
    areaFilter,
    totalTasks,
    completedTasks,
    pendingTasks,
    skippedTasks,
    completionRate,
    totalStudyMinutes,
    formattedStudyTime,
    currentStreak: streak,
    activeStudyDaysCount,
    totalInterviews: filteredInterviews.length,
    averageInterviewScore,
    highestInterviewScore,
    latestInterviewScore,
    rubricAverages,
    hasSufficientInterviewData,
    hasSufficientActivityData,
    interviewDataReason,
    activityDataReason,
    interviewScoreTrajectory,
    dailyActivitySeries,
    areaBreakdown,
    skillGapDelta,
    weeklySummary: {
      tasksCompletedThisWeek: tasksThisWeek,
      studyMinutesThisWeek: minutesThisWeek,
      interviewsCompletedThisWeek: interviewsThisWeek,
      avgScoreThisWeek,
      velocityDeltaPercent,
      unfinishedPriorityTasks,
      recommendedActions,
    },
  };
}
