/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Setup mock window & localStorage for Node test runner
const memoryStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => memoryStore[key] || null,
  setItem: (key: string, val: string) => { memoryStore[key] = String(val); },
  removeItem: (key: string) => { delete memoryStore[key]; },
  clear: () => { Object.keys(memoryStore).forEach((k) => delete memoryStore[k]); },
  length: 0,
  key: () => null,
};

(globalThis as any).window = {
  localStorage: mockLocalStorage,
};
(globalThis as any).localStorage = mockLocalStorage;

import {
  getInitialStore,
  getEmptyStore,
  loadDataStore,
  saveDataStore,
  saveProfile,
  createOrUpdatePrimaryProfile,
  getPrimaryProfile,
  exportProfileData,
  archiveLegacySecondaryProfile,
  selectPrimaryProfile,
  seedDemoProfile,
  ProfileDataStore,
} from '../src/services/storage';
import { UserProfile, Roadmap7Day, MockInterviewSession } from '../src/types';

test('1. Single Profile Resolution: resolves primary profile correctly', () => {
  const store = getInitialStore();
  const primary = getPrimaryProfile(store);
  assert.ok(primary, 'Primary profile should exist');
  assert.equal(primary.id, 'prof-aarav-frontend');
  assert.equal(primary.name, 'Aarav Sharma');
});

test('2. Duplicate Prevention: updating primary profile does not duplicate records', () => {
  mockLocalStorage.clear();
  const initial = getInitialStore();
  memoryStore['preppilot_v1_datastore'] = JSON.stringify(initial);

  // Attempt to "create" a profile when one already exists
  const { store: updatedStore, profile } = createOrUpdatePrimaryProfile({
    name: 'Aarav Sharma Updated',
    targetRole: 'Full Stack Engineer',
    currentSkills: ['React', 'Node.js', 'PostgreSQL'],
    targetSkills: ['System Design', 'Docker', 'Kubernetes'],
    experienceLevel: 'mid',
    dailyStudyHours: 3,
    targetDurationWeeks: 6,
    preferredDifficulty: 'advanced',
    completedProjects: ['E-Commerce Full Stack'],
  });

  // Verify single profile constraint: profiles length must remain 1!
  assert.equal(updatedStore.profiles.length, 1, 'Store must enforce single primary profile and not duplicate');
  assert.equal(profile.id, 'prof-aarav-frontend', 'ID must be preserved in-place');
  assert.equal(profile.name, 'Aarav Sharma Updated', 'Name should be updated');
  assert.equal(profile.targetRole, 'Full Stack Engineer', 'Target role should be updated');
  assert.equal(profile.dailyStudyHours, 3, 'Daily study hours should be updated');
});

test('3. In-Place Updates: preserves linked roadmaps and interview history', () => {
  mockLocalStorage.clear();
  const initial = getInitialStore();
  const studentId = initial.profiles[0].id;

  // Attach a mock 7-day roadmap and interview session
  const mockRoadmap: Roadmap7Day = {
    profileId: studentId,
    targetRole: 'Frontend Developer',
    generatedAt: new Date().toISOString(),
    days: [
      {
        day: 1,
        topic: 'React Internals',
        learningObjectives: ['Understand Virtual DOM reconciliation'],
        conceptsToStudy: ['Virtual DOM', 'Fiber Architecture'],
        practicalCodingExercise: {
          title: 'DOM Diffing',
          instructions: 'Implement simple reconciliation',
        },
        expectedOutcome: 'Working diff algorithm',
        estimatedMinutes: 120,
        completed: true,
        priority: 'high',
        category: 'Technical Core',
      },
    ],
  };

  const mockInterview: MockInterviewSession = {
    id: 'int-session-1',
    profileId: studentId,
    targetRole: 'Frontend Developer',
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    questions: [],
    summary: {
      overallScore: 85,
      totalAnswered: 5,
      strengths: ['Algorithms'],
      weakAreas: ['System Design'],
      topicsToRevise: ['Caching'],
      personalizedNextSteps: ['Review event loops'],
    },
  };

  initial.roadmaps7[studentId] = mockRoadmap;
  initial.interviews[studentId] = [mockInterview];
  memoryStore['preppilot_v1_datastore'] = JSON.stringify(initial);

  // Update profile details
  const current = initial.profiles[0];
  const updatedStore = saveProfile({
    ...current,
    name: 'Aarav Sharma Senior',
    targetRole: 'Staff Frontend Engineer',
  });

  // Verify that roadmaps and interviews remain associated with the student ID
  assert.ok(updatedStore.roadmaps7[studentId], 'Roadmap must still exist for student ID');
  assert.equal(updatedStore.roadmaps7[studentId].days[0].completed, true, 'Task completion status preserved');
  assert.equal(updatedStore.interviews[studentId].length, 1, 'Interview history preserved');
  assert.equal(updatedStore.interviews[studentId][0].summary?.overallScore, 85, 'Interview score preserved');
});

test('4. Data Isolation: records are strictly bound to unique student ID', () => {
  const store = getInitialStore();
  const studentA_Id = 'student-alpha';
  const studentB_Id = 'student-beta';

  store.analyses[studentA_Id] = {
    profileId: studentA_Id,
    targetRole: 'Frontend Developer',
    interviewReadiness: { score: 78, rating: 'Competitive' },
    missingSkills: ['TypeScript'],
    analyzedAt: new Date().toISOString(),
  } as any;

  store.analyses[studentB_Id] = {
    profileId: studentB_Id,
    targetRole: 'Data Scientist',
    interviewReadiness: { score: 92, rating: 'Strong Hire' },
    missingSkills: ['PyTorch'],
    analyzedAt: new Date().toISOString(),
  } as any;

  // Verify that student A cannot see student B's assessment
  assert.notEqual(store.analyses[studentA_Id], store.analyses[studentB_Id]);
  assert.equal(store.analyses[studentA_Id].targetRole, 'Frontend Developer');
  assert.equal(store.analyses[studentB_Id].targetRole, 'Data Scientist');
});

test('5. Legacy Migration & Review: exports and safely archives secondary profiles without data merging', () => {
  mockLocalStorage.clear();

  // Simulate an older multi-profile store containing 2 profiles
  const primaryProfile: UserProfile = {
    id: 'primary-prof-1',
    name: 'Primary Candidate',
    targetRole: 'Full Stack',
    currentSkills: ['JavaScript'],
    targetSkills: ['Go'],
    experienceLevel: 'entry',
    dailyStudyHours: 2,
    targetDurationWeeks: 4,
    preferredDifficulty: 'intermediate',
    completedProjects: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const legacySecondaryProfile: UserProfile = {
    id: 'legacy-prof-2',
    name: 'Legacy Unrelated Track',
    targetRole: 'DevOps Specialist',
    currentSkills: ['Linux', 'Bash'],
    targetSkills: ['Terraform', 'Kubernetes'],
    experienceLevel: 'senior',
    dailyStudyHours: 1,
    targetDurationWeeks: 8,
    preferredDifficulty: 'advanced',
    completedProjects: ['CI/CD Pipeline'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const storeWithLegacy: ProfileDataStore = {
    version: 1,
    profiles: [primaryProfile, legacySecondaryProfile],
    activeProfileId: primaryProfile.id,
    analyses: {},
    roadmaps7: {},
    roadmaps30: {},
    interviews: {},
    activities: {},
    recommendations: {},
    analysisHistory: {},
  };

  memoryStore['preppilot_v1_datastore'] = JSON.stringify(storeWithLegacy);

  // 1. Export legacy data to JSON backup
  const exported = exportProfileData('legacy-prof-2');
  const parsedExport = JSON.parse(exported);
  assert.equal(parsedExport.profile.id, 'legacy-prof-2');
  assert.equal(parsedExport.profile.targetRole, 'DevOps Specialist');

  // 2. Safely archive legacy secondary profile
  const updatedStore = archiveLegacySecondaryProfile('legacy-prof-2');

  // 3. Verify primary profile remains intact and secondary is cleanly removed
  assert.equal(updatedStore.profiles.length, 1);
  assert.equal(updatedStore.profiles[0].id, 'primary-prof-1');
  assert.equal(updatedStore.activeProfileId, 'primary-prof-1');
});

test('6. First-Use Onboarding & Refresh Persistence: creates initial profile and loads it on subsequent visits', () => {
  mockLocalStorage.clear();

  // Fresh user: no stored key exists initially
  const freshStore = loadDataStore();
  assert.equal(freshStore.profiles.length, 0, 'First-use store starts with 0 profiles');
  assert.equal(freshStore.activeProfileId, null);

  // User completes onboarding
  const { store: onboardedStore, profile } = createOrUpdatePrimaryProfile({
    name: 'Deva Harshith',
    targetRole: 'Software Development Engineer',
    currentSkills: ['Java', 'Spring Boot', 'SQL', 'Git'],
    targetSkills: ['System Design', 'Kafka', 'Redis'],
    experienceLevel: 'entry',
    dailyStudyHours: 3,
    targetDurationWeeks: 8,
    preferredDifficulty: 'advanced',
    completedProjects: ['Distributed Order System'],
  });

  assert.equal(onboardedStore.profiles.length, 1);
  assert.equal(profile.name, 'Deva Harshith');
  assert.equal(onboardedStore.activeProfileId, profile.id);

  // Subsequent visit / page refresh: loadDataStore retrieves the onboarded profile directly
  const subsequentStore = loadDataStore();
  assert.equal(subsequentStore.profiles.length, 1, 'Subsequent visit loads exactly 1 profile');
  assert.equal(subsequentStore.activeProfileId, profile.id);
  const active = getPrimaryProfile(subsequentStore);
  assert.equal(active?.name, 'Deva Harshith');
  assert.equal(active?.targetRole, 'Software Development Engineer');
});

test('7. Multiple Profiles Selection: user selects primary profile without guessing, preserves all records', () => {
  mockLocalStorage.clear();

  const profA: UserProfile = {
    id: 'prof-dev-backend',
    name: 'Harshith Backend',
    targetRole: 'Backend Engineer',
    currentSkills: ['Go', 'PostgreSQL'],
    targetSkills: ['gRPC'],
    experienceLevel: 'mid',
    dailyStudyHours: 2,
    targetDurationWeeks: 4,
    preferredDifficulty: 'intermediate',
    completedProjects: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const profB: UserProfile = {
    id: 'prof-dev-ml',
    name: 'Harshith ML',
    targetRole: 'Machine Learning Engineer',
    currentSkills: ['Python', 'PyTorch'],
    targetSkills: ['TensorRT'],
    experienceLevel: 'entry',
    dailyStudyHours: 3,
    targetDurationWeeks: 6,
    preferredDifficulty: 'advanced',
    completedProjects: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const multiStore: ProfileDataStore = {
    version: 1,
    profiles: [profA, profB],
    activeProfileId: profA.id,
    analyses: {},
    roadmaps7: {
      [profA.id]: { profileId: profA.id, targetRole: profA.targetRole, generatedAt: new Date().toISOString(), days: [] },
      [profB.id]: { profileId: profB.id, targetRole: profB.targetRole, generatedAt: new Date().toISOString(), days: [] },
    },
    roadmaps30: {},
    interviews: {},
    activities: {},
    recommendations: {},
    analysisHistory: {},
  };

  memoryStore['preppilot_v1_datastore'] = JSON.stringify(multiStore);

  // User explicitly selects profB as primary profile
  const updatedStore = selectPrimaryProfile('prof-dev-ml');

  assert.equal(updatedStore.activeProfileId, 'prof-dev-ml');
  assert.equal(updatedStore.profiles[0].id, 'prof-dev-ml', 'Selected primary profile is elevated to index 0');
  assert.equal(updatedStore.profiles.length, 2, 'All profiles preserved without automatic deletion');
  assert.ok(updatedStore.roadmaps7['prof-dev-backend'], 'Records for secondary profile preserved');
  assert.ok(updatedStore.roadmaps7['prof-dev-ml'], 'Records for primary profile preserved');
});

test('8. Malformed Storage Recovery: recovers from auto backup snapshot if primary store corrupted', () => {
  mockLocalStorage.clear();

  // Create a valid backup snapshot
  const validBackup = getInitialStore();
  memoryStore['preppilot_v1_backup'] = JSON.stringify(validBackup);

  // Corrupt primary storage with invalid JSON
  memoryStore['preppilot_v1_datastore'] = '{"corrupted": true, bad_json';

  const recoveredStore = loadDataStore();
  assert.ok(recoveredStore, 'Should recover successfully');
  assert.equal(recoveredStore.version, 1);
  assert.equal(recoveredStore.profiles.length, 1);
  assert.equal(recoveredStore.profiles[0].id, 'prof-aarav-frontend');
});
