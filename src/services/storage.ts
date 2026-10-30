/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserProfile,
  SkillGapAnalysis,
  Roadmap7Day,
  Roadmap30Day,
  MockInterviewSession,
  ActivityLog,
  PersonalizedRecommendations,
  ProfileDataStore,
  TaskStatus,
  TaskPriority,
  RoadmapTaskCategory,
} from '../types';

export type { ProfileDataStore } from '../types';

export const STORAGE_KEY = 'preppilot_v1_datastore';
export const BACKUP_KEY = 'preppilot_v1_backup';
export const PRE_RESTORE_BACKUP_KEY = 'preppilot_v1_pre_restore_backup';
export const THEME_KEY = 'preppilot_theme';
export const NOTICE_DISMISSED_KEY = 'preppilot_storage_notice_dismissed';
export const RECOVERY_DISMISSED_KEY = 'preppilot_recovery_dismissed';

export function getEmptyStore(): ProfileDataStore {
  return {
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
}

export function getInitialStore(): ProfileDataStore {
  const defaultProfile: UserProfile = {
    id: 'prof-aarav-frontend',
    name: 'Aarav Sharma',
    targetRole: 'Frontend Developer',
    currentSkills: ['HTML5', 'CSS3', 'JavaScript', 'React', 'Tailwind CSS', 'Git'],
    targetSkills: ['TypeScript', 'Next.js', 'System Design', 'Performance Optimization', 'Web Vitals'],
    experienceLevel: 'entry',
    dailyStudyHours: 2,
    targetDurationWeeks: 4,
    preferredDifficulty: 'intermediate',
    completedProjects: ['E-Commerce Product Catalog (React)', 'Personal Developer Portfolio (Vite + Tailwind)'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    version: 1,
    profiles: [defaultProfile],
    activeProfileId: defaultProfile.id,
    analyses: {},
    roadmaps7: {},
    roadmaps30: {},
    interviews: {},
    activities: {
      [defaultProfile.id]: [
        {
          id: 'act-init-1',
          profileId: defaultProfile.id,
          date: new Date().toISOString().split('T')[0],
          type: 'study_log',
          durationMinutes: 45,
          title: 'Initial Profile Created & Skill Baseline Mapped',
          timestamp: new Date().toISOString(),
        },
      ],
    },
    recommendations: {},
    analysisHistory: {},
  };
}

export function isStorageNoticeDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(NOTICE_DISMISSED_KEY) === 'true';
}

export function dismissStorageNotice(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTICE_DISMISSED_KEY, 'true');
}

export function resetStorageNotice(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(NOTICE_DISMISSED_KEY);
}

export function getAutoBackupSnapshot(): ProfileDataStore | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
      return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function checkPendingRecovery(): { needed: boolean; reason?: string; backup?: ProfileDataStore } {
  if (typeof window === 'undefined') return { needed: false };
  try {
    // If the user already dismissed or cancelled the recovery prompt in this session, do not re-prompt
    if (sessionStorage.getItem(RECOVERY_DISMISSED_KEY) === 'true') {
      return { needed: false };
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    const backup = getAutoBackupSnapshot();

    // If active primary storage exists and is valid, no recovery prompt is needed
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        return { needed: false };
      }
      // If primary storage has 0 profiles but a valid backup snapshot with profiles is available
      if (parsed && parsed.version === 1 && Array.isArray(parsed.profiles) && parsed.profiles.length === 0 && backup && backup.profiles.length > 0) {
        return {
          needed: true,
          reason: 'Active session currently contains 0 candidate profiles, but an earlier auto-backup snapshot with saved profiles was found.',
          backup,
        };
      }
      // Corrupted or invalid schema in primary key, but backup exists
      if (backup) {
        return {
          needed: true,
          reason: 'Primary storage format was corrupted or unreadable. A valid auto-backup snapshot is available to restore.',
          backup,
        };
      }
    } else if (backup && backup.profiles.length > 0) {
      // Primary storage key was not set yet, but auto-backup snapshot exists
      return {
        needed: true,
        reason: 'Active local storage was uninitialized, but a saved session auto-backup is available for restore.',
        backup,
      };
    }
    return { needed: false };
  } catch (err) {
    if (sessionStorage.getItem(RECOVERY_DISMISSED_KEY) === 'true') {
      return { needed: false };
    }
    const backup = getAutoBackupSnapshot();
    if (backup) {
      return {
        needed: true,
        reason: 'Error parsing local storage data. A safe recovery backup snapshot is available.',
        backup,
      };
    }
    return { needed: false };
  }
}

export function loadDataStore(): ProfileDataStore {
  if (typeof window === 'undefined') return getInitialStore();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check if backup exists before defaulting to empty
      const backup = getAutoBackupSnapshot();
      if (backup && backup.profiles.length > 0) {
        saveDataStore(backup);
        return backup;
      }
      const empty = getEmptyStore();
      saveDataStore(empty);
      return empty;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.profiles)) {
      console.warn('Storage format outdated or invalid.');
      const backup = getAutoBackupSnapshot();
      if (backup) {
        return backup;
      }
      const empty = getEmptyStore();
      saveDataStore(empty);
      return empty;
    }

    // Defensive normalization to prevent crashes if nested dictionaries are missing
    const normalized: ProfileDataStore = {
      version: 1,
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      activeProfileId: parsed.activeProfileId || (parsed.profiles[0]?.id ?? null),
      analyses: typeof parsed.analyses === 'object' && parsed.analyses !== null ? parsed.analyses : {},
      roadmaps7: typeof parsed.roadmaps7 === 'object' && parsed.roadmaps7 !== null ? parsed.roadmaps7 : {},
      roadmaps30: typeof parsed.roadmaps30 === 'object' && parsed.roadmaps30 !== null ? parsed.roadmaps30 : {},
      interviews: typeof parsed.interviews === 'object' && parsed.interviews !== null ? parsed.interviews : {},
      activities: typeof parsed.activities === 'object' && parsed.activities !== null ? parsed.activities : {},
      recommendations: typeof parsed.recommendations === 'object' && parsed.recommendations !== null ? parsed.recommendations : {},
      analysisHistory: typeof parsed.analysisHistory === 'object' && parsed.analysisHistory !== null ? parsed.analysisHistory : {},
    };

    return normalized;
  } catch (err) {
    console.error('Failed to parse localStorage data:', err);
    const backup = getAutoBackupSnapshot();
    if (backup) return backup;
    return getEmptyStore();
  }
}

/**
 * Seeds pre-populated starter demo profile (Aarav Sharma - Frontend Developer) for instant exploration.
 */
export function seedDemoProfile(): ProfileDataStore {
  const demoStore = getInitialStore();
  saveDataStore(demoStore);
  return demoStore;
}

/**
 * Safely chooses the primary profile when multiple legacy profiles exist,
 * ensuring no records are deleted and an automatic backup is generated.
 */
export function selectPrimaryProfile(profileId: string): ProfileDataStore {
  const store = loadDataStore();
  const target = store.profiles.find((p) => p.id === profileId);
  if (!target) return store;

  store.activeProfileId = profileId;
  const others = store.profiles.filter((p) => p.id !== profileId);
  store.profiles = [target, ...others];

  saveDataStore(store);
  return store;
}

export function saveDataStore(store: ProfileDataStore): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(store);
    localStorage.setItem(STORAGE_KEY, serialized);
    // Keep a recovery snapshot whenever active data has valid profiles
    if (store && Array.isArray(store.profiles) && store.profiles.length > 0) {
      localStorage.setItem(BACKUP_KEY, serialized);
    }
  } catch (err) {
    console.error('Failed to write to localStorage:', err);
  }
}

export function getActiveProfile(store: ProfileDataStore): UserProfile | null {
  if (!store.activeProfileId || store.profiles.length === 0) {
    return store.profiles[0] || null;
  }
  return store.profiles.find((p) => p.id === store.activeProfileId) || store.profiles[0] || null;
}

export function getPrimaryProfile(store: ProfileDataStore): UserProfile | null {
  return getActiveProfile(store);
}

export function setActiveProfileId(profileId: string): ProfileDataStore {
  const store = loadDataStore();
  store.activeProfileId = profileId;
  saveDataStore(store);
  return store;
}

/**
 * Updates a profile in place. Strictly preserves user ID, creation date, and associations.
 */
export function saveProfile(profile: UserProfile): ProfileDataStore {
  const store = loadDataStore();
  const index = store.profiles.findIndex((p) => p.id === profile.id);
  if (index >= 0) {
    // In-place update preserving identity
    store.profiles[index] = {
      ...profile,
      id: store.profiles[index].id,
      createdAt: store.profiles[index].createdAt || profile.createdAt,
      updatedAt: new Date().toISOString(),
    };
  } else if (store.profiles.length === 0) {
    // First time setup: register primary profile
    store.profiles.push(profile);
    store.activeProfileId = profile.id;
  } else {
    // Single profile architecture: if a profile already exists, do not duplicate!
    // Instead update the existing primary profile with the new data.
    const primaryId = store.activeProfileId || store.profiles[0].id;
    const pIndex = store.profiles.findIndex((p) => p.id === primaryId);
    if (pIndex >= 0) {
      store.profiles[pIndex] = {
        ...profile,
        id: primaryId,
        createdAt: store.profiles[pIndex].createdAt,
        updatedAt: new Date().toISOString(),
      };
    } else {
      store.profiles.push(profile);
      store.activeProfileId = profile.id;
    }
  }
  saveDataStore(store);
  return store;
}

/**
 * Creates the initial primary student profile or safely updates the existing one.
 */
export function createOrUpdatePrimaryProfile(data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): {
  store: ProfileDataStore;
  profile: UserProfile;
} {
  const store = loadDataStore();
  const existing = getActiveProfile(store);

  if (existing) {
    // Update existing profile in place
    const updated: UserProfile = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const updatedStore = saveProfile(updated);
    return { store: updatedStore, profile: updated };
  }

  // Create initial profile
  const newProfile: UserProfile = {
    ...data,
    id: 'student-' + Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updatedStore = saveProfile(newProfile);
  return { store: updatedStore, profile: newProfile };
}

/**
 * Safely exports all data bound to a specific student profile.
 */
export function exportProfileData(profileId: string): string {
  const store = loadDataStore();
  const profile = store.profiles.find((p) => p.id === profileId);
  const bundle = {
    exportedAt: new Date().toISOString(),
    profile,
    analysis: store.analyses[profileId] || null,
    roadmap7: store.roadmaps7[profileId] || null,
    roadmap30: store.roadmaps30[profileId] || null,
    interviews: store.interviews[profileId] || [],
    activities: store.activities[profileId] || [],
    recommendations: store.recommendations[profileId] || null,
    analysisHistory: store.analysisHistory?.[profileId] || [],
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Safely removes a legacy secondary profile after backup, keeping the primary intact.
 */
export function archiveLegacySecondaryProfile(profileId: string): ProfileDataStore {
  return deleteProfile(profileId);
}

export function deleteProfile(profileId: string): ProfileDataStore {
  const store = loadDataStore();
  store.profiles = store.profiles.filter((p) => p.id !== profileId);
  delete store.analyses[profileId];
  delete store.roadmaps7[profileId];
  delete store.roadmaps30[profileId];
  delete store.interviews[profileId];
  delete store.activities[profileId];
  delete store.recommendations[profileId];
  if (store.analysisHistory) {
    delete store.analysisHistory[profileId];
  }

  if (store.activeProfileId === profileId) {
    store.activeProfileId = store.profiles.length > 0 ? store.profiles[0].id : null;
  }
  saveDataStore(store);
  return store;
}

export function saveAnalysis(analysis: SkillGapAnalysis): ProfileDataStore {
  const store = loadDataStore();
  store.analyses[analysis.profileId] = analysis;
  if (analysis.targetRole) {
    store.analyses[`${analysis.profileId}:${analysis.targetRole}`] = analysis;
  }

  if (!store.analysisHistory) {
    store.analysisHistory = {};
  }
  if (!Array.isArray(store.analysisHistory[analysis.profileId])) {
    store.analysisHistory[analysis.profileId] = [];
  }

  const history = store.analysisHistory[analysis.profileId];
  const existingIdx = history.findIndex((h) => h.analyzedAt === analysis.analyzedAt);
  if (existingIdx >= 0) {
    history[existingIdx] = analysis;
  } else {
    history.push(analysis);
  }

  saveDataStore(store);
  return store;
}

export function getAnalysis(profileId: string, targetRole?: string): SkillGapAnalysis | null {
  const store = loadDataStore();
  if (targetRole && store.analyses[`${profileId}:${targetRole}`]) {
    return store.analyses[`${profileId}:${targetRole}`];
  }
  return store.analyses[profileId] || null;
}

export function getAnalysisHistory(profileId: string): SkillGapAnalysis[] {
  const store = loadDataStore();
  const list = store.analysisHistory?.[profileId];
  if (Array.isArray(list) && list.length > 0) {
    return list;
  }
  const single = store.analyses[profileId];
  return single ? [single] : [];
}

// Helper: add days to an ISO YYYY-MM-DD date string
export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Helper: infer category from topic and target role
export function inferRoadmapCategory(topic: string, role = ''): RoadmapTaskCategory {
  const lower = topic.toLowerCase() + ' ' + role.toLowerCase();
  if (
    lower.includes('dsa') ||
    lower.includes('tree') ||
    lower.includes('graph') ||
    lower.includes('array') ||
    lower.includes('algorithm') ||
    lower.includes('sorting') ||
    lower.includes('recursion') ||
    lower.includes('dynamic programming') ||
    lower.includes('linked list') ||
    lower.includes('heap') ||
    lower.includes('hash') ||
    lower.includes('stack') ||
    lower.includes('queue')
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
    lower.includes('multithread') ||
    lower.includes('memory') ||
    lower.includes('oops') ||
    lower.includes('object-oriented')
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
    lower.includes('frontend') ||
    lower.includes('backend') ||
    lower.includes('capstone') ||
    lower.includes('docker') ||
    lower.includes('redis')
  ) {
    return 'Projects & Architecture';
  }
  if (
    lower.includes('aptitude') ||
    lower.includes('reasoning') ||
    lower.includes('probability') ||
    lower.includes('puzzles') ||
    lower.includes('puzzle') ||
    lower.includes('speed math') ||
    lower.includes('quantitative')
  ) {
    return 'Aptitude & Logical Reasoning';
  }
  if (
    lower.includes('interview') ||
    lower.includes('mock') ||
    lower.includes('behavioral') ||
    lower.includes('hr round') ||
    lower.includes('revision') ||
    lower.includes('screening') ||
    lower.includes('star method')
  ) {
    return 'Interview Practice';
  }
  return 'Programming';
}

export function saveRoadmap7(roadmap: Roadmap7Day): ProfileDataStore {
  const store = loadDataStore();
  const startDate = roadmap.startDate || new Date().toISOString().split('T')[0];
  roadmap.startDate = startDate;

  // Ensure deterministic dates, categories, priorities, and status
  roadmap.days = roadmap.days.map((item, idx) => {
    const targetDate = item.targetDate || addDaysToDate(startDate, idx);
    const category = item.category || inferRoadmapCategory(item.topic, roadmap.targetRole);
    const priority = item.priority || (idx < 2 ? 'high' : idx < 5 ? 'medium' : 'low');
    const status: TaskStatus = item.status || (item.completed ? 'completed' : 'incomplete');
    return {
      ...item,
      targetDate,
      category,
      priority,
      status,
      completed: status === 'completed',
    };
  });

  store.roadmaps7[roadmap.profileId] = roadmap;
  saveDataStore(store);
  return store;
}

export function getRoadmap7(profileId: string): Roadmap7Day | null {
  const store = loadDataStore();
  return store.roadmaps7[profileId] || null;
}

export function setRoadmap7TaskStatus(
  profileId: string,
  dayNumber: number,
  status: TaskStatus
): { store: ProfileDataStore; status: TaskStatus } {
  const store = loadDataStore();
  const roadmap = store.roadmaps7[profileId];

  if (roadmap) {
    const item = roadmap.days.find((d) => d.day === dayNumber);
    if (item) {
      item.status = status;
      item.completed = status === 'completed';
      item.completedAt = status === 'completed' ? new Date().toISOString() : undefined;

      if (status === 'completed') {
        logActivity(profileId, {
          date: new Date().toISOString().split('T')[0],
          type: 'roadmap_7_task',
          durationMinutes: item.estimatedMinutes || 60,
          title: `7-Day Sprint: Day ${item.day} - ${item.topic}`,
        });
      }
    }
  }
  saveDataStore(store);
  return { store, status };
}

export function toggleRoadmap7Task(
  profileId: string,
  dayNumber: number
): { store: ProfileDataStore; completed: boolean } {
  const store = loadDataStore();
  const roadmap = store.roadmaps7[profileId];
  if (!roadmap) return { store, completed: false };

  const item = roadmap.days.find((d) => d.day === dayNumber);
  const currentStatus: TaskStatus = item?.status || (item?.completed ? 'completed' : 'incomplete');
  const nextStatus: TaskStatus = currentStatus === 'completed' ? 'incomplete' : 'completed';

  const result = setRoadmap7TaskStatus(profileId, dayNumber, nextStatus);
  return { store: result.store, completed: nextStatus === 'completed' };
}

export function saveRoadmap30(roadmap: Roadmap30Day): ProfileDataStore {
  const store = loadDataStore();
  const startDate = roadmap.startDate || new Date().toISOString().split('T')[0];
  roadmap.startDate = startDate;

  // Ensure deterministic dates, categories, priorities, and status
  roadmap.days = roadmap.days.map((item, idx) => {
    const targetDate = item.targetDate || addDaysToDate(startDate, idx);
    const category = item.category || inferRoadmapCategory(item.topic, roadmap.targetRole);
    const priority = item.priority || (item.phaseNumber === 1 ? 'high' : item.phaseNumber === 2 ? 'high' : 'medium');
    const status: TaskStatus = item.status || (item.completed ? 'completed' : 'incomplete');
    return {
      ...item,
      targetDate,
      category,
      priority,
      status,
      completed: status === 'completed',
    };
  });

  store.roadmaps30[roadmap.profileId] = roadmap;
  saveDataStore(store);
  return store;
}

export function getRoadmap30(profileId: string): Roadmap30Day | null {
  const store = loadDataStore();
  return store.roadmaps30[profileId] || null;
}

export function setRoadmap30TaskStatus(
  profileId: string,
  dayNumber: number,
  status: TaskStatus
): { store: ProfileDataStore; status: TaskStatus } {
  const store = loadDataStore();
  const roadmap = store.roadmaps30[profileId];

  if (roadmap) {
    const item = roadmap.days.find((d) => d.day === dayNumber);
    if (item) {
      item.status = status;
      item.completed = status === 'completed';
      item.completedAt = status === 'completed' ? new Date().toISOString() : undefined;

      if (status === 'completed') {
        logActivity(profileId, {
          date: new Date().toISOString().split('T')[0],
          type: 'roadmap_30_task',
          durationMinutes: item.estimatedMinutes || 60,
          title: `30-Day Master: Day ${item.day} - ${item.topic}`,
        });
      }
    }
  }
  saveDataStore(store);
  return { store, status };
}

export function toggleRoadmap30Task(
  profileId: string,
  dayNumber: number
): { store: ProfileDataStore; completed: boolean } {
  const store = loadDataStore();
  const roadmap = store.roadmaps30[profileId];
  if (!roadmap) return { store, completed: false };

  const item = roadmap.days.find((d) => d.day === dayNumber);
  const currentStatus: TaskStatus = item?.status || (item?.completed ? 'completed' : 'incomplete');
  const nextStatus: TaskStatus = currentStatus === 'completed' ? 'incomplete' : 'completed';

  const result = setRoadmap30TaskStatus(profileId, dayNumber, nextStatus);
  return { store: result.store, completed: nextStatus === 'completed' };
}

export function updateDailyStudyHours(profileId: string, hours: number): ProfileDataStore {
  const store = loadDataStore();
  const profile = store.profiles.find((p) => p.id === profileId);
  if (profile) {
    const clampedHours = Math.max(1, Math.min(12, Math.round(hours)));
    profile.dailyStudyHours = clampedHours;
    profile.updatedAt = new Date().toISOString();

    // Optionally update estimatedMinutes for incomplete upcoming tasks in existing roadmaps
    const r7 = store.roadmaps7[profileId];
    if (r7 && Array.isArray(r7.days)) {
      r7.days.forEach((d) => {
        if (!d.completed) {
          d.estimatedMinutes = clampedHours * 60;
        }
      });
    }

    const r30 = store.roadmaps30[profileId];
    if (r30 && Array.isArray(r30.days)) {
      r30.days.forEach((d) => {
        if (!d.completed) {
          d.estimatedMinutes = clampedHours * 60;
        }
      });
    }

    saveDataStore(store);
  }
  return store;
}

export function logActivity(
  profileId: string,
  entry: Omit<ActivityLog, 'id' | 'profileId' | 'timestamp'>
): void {
  const store = loadDataStore();
  if (!store.activities[profileId]) {
    store.activities[profileId] = [];
  }
  const activity: ActivityLog = {
    ...entry,
    id: 'act-' + Math.random().toString(36).substring(2, 9),
    profileId,
    timestamp: new Date().toISOString(),
  };
  store.activities[profileId].push(activity);
  saveDataStore(store);
}

export function getActivities(profileId: string): ActivityLog[] {
  const store = loadDataStore();
  return store.activities[profileId] || [];
}

export function saveInterviewSession(session: MockInterviewSession): ProfileDataStore {
  const store = loadDataStore();
  if (!store.interviews[session.profileId]) {
    store.interviews[session.profileId] = [];
  }
  const existingIndex = store.interviews[session.profileId].findIndex((s) => s.id === session.id);
  if (existingIndex >= 0) {
    store.interviews[session.profileId][existingIndex] = session;
  } else {
    store.interviews[session.profileId].unshift(session);
  }

  // If completed, log activity
  if (session.status === 'completed' && session.summary) {
    const answeredCount = session.questions.filter((q) => q.userAnswer).length;
    logActivity(session.profileId, {
      date: new Date().toISOString().split('T')[0],
      type: 'mock_interview',
      durationMinutes: answeredCount * 5 || 25,
      title: `Mock Interview: ${session.targetRole} (${session.summary.overallScore}%)`,
      score: session.summary.overallScore,
    });
  }

  saveDataStore(store);
  return store;
}

export function getInterviews(profileId: string): MockInterviewSession[] {
  const store = loadDataStore();
  return store.interviews[profileId] || [];
}

export function getActiveInterviewSession(profileId: string): MockInterviewSession | null {
  const store = loadDataStore();
  const list = store.interviews[profileId] || [];
  return list.find((s) => s.status === 'in_progress') || null;
}

export function deleteInterviewSession(profileId: string, sessionId: string): ProfileDataStore {
  const store = loadDataStore();
  if (store.interviews[profileId]) {
    store.interviews[profileId] = store.interviews[profileId].filter((s) => s.id !== sessionId);
    saveDataStore(store);
  }
  return store;
}

export function saveRecommendations(rec: PersonalizedRecommendations): ProfileDataStore {
  const store = loadDataStore();
  store.recommendations[rec.profileId] = rec;
  saveDataStore(store);
  return store;
}

export function getRecommendations(profileId: string): PersonalizedRecommendations | null {
  const store = loadDataStore();
  return store.recommendations[profileId] || null;
}

// Theme handling
export function getSavedTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  // If no explicit preference has been saved, respect system preference
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      if (document.body) {
        document.body.classList.add('dark');
        document.body.setAttribute('data-theme', 'dark');
      }
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      if (document.body) {
        document.body.classList.remove('dark');
        document.body.setAttribute('data-theme', 'light');
      }
    }
  } catch (e) {
    console.error('Error applying theme:', e);
  }
}

export function dismissRecoveryNotice(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(RECOVERY_DISMISSED_KEY, 'true');
}

export function createPreRestoreBackup(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      localStorage.setItem(PRE_RESTORE_BACKUP_KEY, raw);
    }
  } catch (err) {
    console.error('Failed to create pre-restore backup:', err);
  }
}

export function getPreRestoreBackup(): ProfileDataStore | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PRE_RESTORE_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.profiles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function revertToPreRestoreBackup(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const backup = getPreRestoreBackup();
    if (!backup) return false;
    const currentTheme = getSavedTheme();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
    applyTheme(currentTheme);
    return true;
  } catch (err) {
    console.error('Failed to revert to pre-restore backup:', err);
    return false;
  }
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  preview?: {
    profileName: string;
    targetRole: string;
    experienceLevel: string;
    roadmapsCount: number;
    interviewsCount: number;
    activitiesCount: number;
    exportedAt?: string;
  };
  storeToRestore?: ProfileDataStore;
}

export function validateAndParseBackup(jsonStr: string): BackupValidationResult {
  if (!jsonStr || typeof jsonStr !== 'string') {
    return { valid: false, error: 'Empty or invalid file content provided.' };
  }

  // 1. Enforce size limit: max 5MB (5,242,880 bytes)
  if (jsonStr.length > 5 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 5MB safety limit.' };
  }

  // 2. Strict JSON parsing
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { valid: false, error: 'Invalid JSON syntax. Please upload a well-formed JSON backup file.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'File must contain a valid JSON object.' };
  }

  // Case A: Single Student Profile Bundle (e.g. from "Export My Data")
  if (parsed.profile && typeof parsed.profile === 'object') {
    const p = parsed.profile;
    if (typeof p.name !== 'string' || !p.name.trim()) {
      return { valid: false, error: 'Candidate profile in backup is missing a valid name.' };
    }
    if (typeof p.targetRole !== 'string' || !p.targetRole.trim()) {
      return { valid: false, error: 'Candidate profile in backup is missing a target role.' };
    }

    const profileId = typeof p.id === 'string' && p.id.trim() ? p.id.trim() : `student-${Date.now()}`;
    const sanitizedProfile: UserProfile = {
      id: profileId,
      name: String(p.name).trim().slice(0, 100),
      targetRole: String(p.targetRole).trim().slice(0, 100),
      currentSkills: Array.isArray(p.currentSkills) ? p.currentSkills.filter((s: any) => typeof s === 'string').map((s: string) => s.slice(0, 60)) : [],
      targetSkills: Array.isArray(p.targetSkills) ? p.targetSkills.filter((s: any) => typeof s === 'string').map((s: string) => s.slice(0, 60)) : [],
      completedProjects: Array.isArray(p.completedProjects) ? p.completedProjects.filter((s: any) => typeof s === 'string').map((s: string) => s.slice(0, 120)) : [],
      experienceLevel: ['beginner', 'entry', 'mid', 'senior'].includes(p.experienceLevel) ? p.experienceLevel : 'entry',
      dailyStudyHours: typeof p.dailyStudyHours === 'number' && p.dailyStudyHours >= 1 && p.dailyStudyHours <= 12 ? Math.round(p.dailyStudyHours) : 2,
      targetDurationWeeks: typeof p.targetDurationWeeks === 'number' && p.targetDurationWeeks >= 1 && p.targetDurationWeeks <= 52 ? Math.round(p.targetDurationWeeks) : 8,
      preferredDifficulty: ['beginner', 'intermediate', 'advanced', 'intensive'].includes(p.preferredDifficulty) ? p.preferredDifficulty : 'intermediate',
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
    };

    const interviews = Array.isArray(parsed.interviews) ? parsed.interviews : [];
    const activities = Array.isArray(parsed.activities) ? parsed.activities : [];
    const has7 = parsed.roadmap7 && Array.isArray(parsed.roadmap7.days) && parsed.roadmap7.days.length > 0;
    const has30 = parsed.roadmap30 && Array.isArray(parsed.roadmap30.days) && parsed.roadmap30.days.length > 0;
    const roadmapsCount = (has7 ? 1 : 0) + (has30 ? 1 : 0);

    const storeToRestore: ProfileDataStore = {
      version: 1,
      profiles: [sanitizedProfile],
      activeProfileId: sanitizedProfile.id,
      analyses: parsed.analysis ? { [sanitizedProfile.id]: parsed.analysis } : {},
      roadmaps7: has7 ? { [sanitizedProfile.id]: parsed.roadmap7 } : {},
      roadmaps30: has30 ? { [sanitizedProfile.id]: parsed.roadmap30 } : {},
      interviews: { [sanitizedProfile.id]: interviews },
      activities: { [sanitizedProfile.id]: activities },
      recommendations: parsed.recommendations ? { [sanitizedProfile.id]: parsed.recommendations } : {},
      analysisHistory: Array.isArray(parsed.analysisHistory) ? { [sanitizedProfile.id]: parsed.analysisHistory } : {},
    };

    return {
      valid: true,
      preview: {
        profileName: sanitizedProfile.name,
        targetRole: sanitizedProfile.targetRole,
        experienceLevel: sanitizedProfile.experienceLevel,
        roadmapsCount,
        interviewsCount: interviews.length,
        activitiesCount: activities.length,
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
      },
      storeToRestore,
    };
  }

  // Case B: Full Store Ledger (profiles array)
  if (Array.isArray(parsed.profiles)) {
    if (parsed.profiles.length === 0) {
      return { valid: false, error: 'Backup ledger contains 0 candidate profiles.' };
    }
    const firstProf = parsed.profiles[0];
    if (!firstProf || typeof firstProf.name !== 'string' || typeof firstProf.targetRole !== 'string') {
      return { valid: false, error: 'Invalid candidate profile schema in backup ledger.' };
    }

    const activeId = parsed.activeProfileId && parsed.profiles.some((p: any) => p.id === parsed.activeProfileId)
      ? parsed.activeProfileId
      : firstProf.id;

    const sanitizedProfiles: UserProfile[] = parsed.profiles.map((p: any) => ({
      id: String(p.id || `prof-${Date.now()}`),
      name: String(p.name || 'Candidate').slice(0, 100),
      targetRole: String(p.targetRole || 'Software Development Engineer').slice(0, 100),
      currentSkills: Array.isArray(p.currentSkills) ? p.currentSkills.filter((s: any) => typeof s === 'string').map((s: string) => s.slice(0, 60)) : [],
      targetSkills: Array.isArray(p.targetSkills) ? p.targetSkills.filter((s: any) => typeof s === 'string').map((s: string) => s.slice(0, 60)) : [],
      completedProjects: Array.isArray(p.completedProjects) ? p.completedProjects.filter((s: any) => typeof s === 'string').map((s: string) => s.slice(0, 120)) : [],
      experienceLevel: ['beginner', 'entry', 'mid', 'senior'].includes(p.experienceLevel) ? p.experienceLevel : 'entry',
      dailyStudyHours: typeof p.dailyStudyHours === 'number' && p.dailyStudyHours >= 1 && p.dailyStudyHours <= 12 ? Math.round(p.dailyStudyHours) : 2,
      targetDurationWeeks: typeof p.targetDurationWeeks === 'number' && p.targetDurationWeeks >= 1 && p.targetDurationWeeks <= 52 ? Math.round(p.targetDurationWeeks) : 8,
      preferredDifficulty: ['beginner', 'intermediate', 'advanced', 'intensive'].includes(p.preferredDifficulty) ? p.preferredDifficulty : 'intermediate',
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
    }));

    const storeToRestore: ProfileDataStore = {
      version: 1,
      profiles: sanitizedProfiles,
      activeProfileId: activeId,
      analyses: typeof parsed.analyses === 'object' && parsed.analyses !== null ? parsed.analyses : {},
      roadmaps7: typeof parsed.roadmaps7 === 'object' && parsed.roadmaps7 !== null ? parsed.roadmaps7 : {},
      roadmaps30: typeof parsed.roadmaps30 === 'object' && parsed.roadmaps30 !== null ? parsed.roadmaps30 : {},
      interviews: typeof parsed.interviews === 'object' && parsed.interviews !== null ? parsed.interviews : {},
      activities: typeof parsed.activities === 'object' && parsed.activities !== null ? parsed.activities : {},
      recommendations: typeof parsed.recommendations === 'object' && parsed.recommendations !== null ? parsed.recommendations : {},
      analysisHistory: typeof parsed.analysisHistory === 'object' && parsed.analysisHistory !== null ? parsed.analysisHistory : {},
    };

    const targetProf = sanitizedProfiles.find((p) => p.id === activeId) || sanitizedProfiles[0];
    const roadmapsCount = (storeToRestore.roadmaps7[activeId] ? 1 : 0) + (storeToRestore.roadmaps30[activeId] ? 1 : 0);
    const interviewsCount = storeToRestore.interviews[activeId]?.length || 0;
    const activitiesCount = storeToRestore.activities[activeId]?.length || 0;

    return {
      valid: true,
      preview: {
        profileName: targetProf.name,
        targetRole: targetProf.targetRole,
        experienceLevel: targetProf.experienceLevel,
        roadmapsCount,
        interviewsCount,
        activitiesCount,
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
      },
      storeToRestore,
    };
  }

  return {
    valid: false,
    error: 'Incompatible file format. File must contain PrepPilot student data or backup records.',
  };
}

export function restoreDataStore(targetStore: ProfileDataStore, preserveTheme = true): boolean {
  try {
    if (!targetStore || !Array.isArray(targetStore.profiles) || targetStore.profiles.length === 0) {
      throw new Error('Invalid store structure: profiles array required');
    }
    // Create pre-restore backup first so student can revert if needed
    createPreRestoreBackup();

    const currentTheme = getSavedTheme();
    saveDataStore(targetStore);
    if (preserveTheme) {
      applyTheme(currentTheme);
    }
    return true;
  } catch (err) {
    console.error('Restore failed:', err);
    return false;
  }
}

// Storage Export & Import
export function exportDataAsJson(): string {
  const store = loadDataStore();
  return JSON.stringify(store, null, 2);
}

export function exportStudentData(profileId?: string): { json: string; filename: string; profileName: string } {
  const store = loadDataStore();
  const targetId = profileId || store.activeProfileId || (store.profiles[0]?.id ?? '');
  const profile = store.profiles.find((p) => p.id === targetId);
  if (!profile) {
    throw new Error('No candidate profile found to export.');
  }
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `preppilot-my-data-${dateStr}.json`;
  const json = exportProfileData(targetId);
  return { json, filename, profileName: profile.name };
}

export function importDataFromJson(jsonStr: string): boolean {
  const result = validateAndParseBackup(jsonStr);
  if (!result.valid || !result.storeToRestore) {
    return false;
  }
  return restoreDataStore(result.storeToRestore, true);
}
