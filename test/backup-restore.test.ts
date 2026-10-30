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
  matchMedia: () => ({ matches: false }),
};
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).document = {
  documentElement: {
    classList: { add: () => {}, remove: () => {} },
    setAttribute: () => {},
    style: {},
  },
  body: {
    classList: { add: () => {}, remove: () => {} },
    setAttribute: () => {},
  },
};

import {
  getInitialStore,
  saveDataStore,
  exportStudentData,
  validateAndParseBackup,
  restoreDataStore,
  getPreRestoreBackup,
  revertToPreRestoreBackup,
  getSavedTheme,
  applyTheme,
  PRE_RESTORE_BACKUP_KEY,
  STORAGE_KEY,
  THEME_KEY,
  ProfileDataStore,
} from '../src/services/storage';

test('1. Export Student Data: generates expected preppilot-my-data-YYYY-MM-DD.json filename and clean JSON payload', () => {
  mockLocalStorage.clear();
  const initial = getInitialStore();
  saveDataStore(initial);

  const { json, filename, profileName } = exportStudentData(initial.profiles[0].id);

  assert.equal(profileName, 'Aarav Sharma');
  const today = new Date().toISOString().split('T')[0];
  assert.equal(filename, `preppilot-my-data-${today}.json`, 'Filename format must be preppilot-my-data-YYYY-MM-DD.json');

  const parsed = JSON.parse(json);
  assert.ok(parsed.profile, 'Export must include candidate profile');
  assert.equal(parsed.profile.id, 'prof-aarav-frontend');
  assert.equal(parsed.profile.name, 'Aarav Sharma');
  assert.equal(parsed.profile.targetRole, 'Frontend Developer');
  assert.ok(Array.isArray(parsed.profile.currentSkills));
  assert.ok(Array.isArray(parsed.profile.targetSkills));

  // Verify no server secrets or API keys are leaked in the client payload
  assert.equal(parsed.geminiApiKey, undefined, 'Must not contain geminiApiKey');
  assert.equal(parsed.apiKey, undefined, 'Must not contain apiKey');
  assert.equal(parsed.secret, undefined, 'Must not contain server secret');
});

test('2. Backup Validation: accepts valid single-profile bundle and generates accurate preview', () => {
  const singleProfilePayload = {
    version: 1,
    exportedAt: '2026-03-30T10:00:00.000Z',
    profile: {
      id: 'student-priya',
      name: 'Priya Patel',
      targetRole: 'Backend Engineer',
      currentSkills: ['Java', 'SQL'],
      targetSkills: ['Distributed Systems', 'Kafka'],
      experienceLevel: 'entry',
      dailyStudyHours: 3,
      targetDurationWeeks: 8,
      preferredDifficulty: 'advanced',
      completedProjects: ['Payment API'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    roadmap7: {
      profileId: 'student-priya',
      targetRole: 'Backend Engineer',
      generatedAt: '2026-01-02T00:00:00.000Z',
      days: [
        { day: 1, topic: 'Concurrency', completed: true, estimatedMinutes: 60, practicalCodingExercise: { title: 'Threads', instructions: 'Locking' } },
        { day: 2, topic: 'Connection Pooling', completed: false, estimatedMinutes: 60, practicalCodingExercise: { title: 'Pool', instructions: 'HikariCP' } },
      ],
    },
    interviews: [
      {
        id: 'mock-1',
        profileId: 'student-priya',
        targetRole: 'Backend Engineer',
        status: 'completed',
        summary: { overallScore: 88 },
        questions: [],
      },
    ],
    activities: [
      { id: 'act-1', date: '2026-01-02', durationMinutes: 60, type: 'study', title: 'Concurrency Practice' },
    ],
  };

  const jsonStr = JSON.stringify(singleProfilePayload);
  const result = validateAndParseBackup(jsonStr);

  assert.equal(result.valid, true, 'Validation must succeed for single profile bundle');
  assert.ok(result.preview);
  assert.equal(result.preview.profileName, 'Priya Patel');
  assert.equal(result.preview.targetRole, 'Backend Engineer');
  assert.equal(result.preview.experienceLevel, 'entry');
  assert.equal(result.preview.roadmapsCount, 1);
  assert.equal(result.preview.interviewsCount, 1);
  assert.equal(result.preview.activitiesCount, 1);

  assert.ok(result.storeToRestore);
  assert.equal(result.storeToRestore.profiles.length, 1);
  assert.equal(result.storeToRestore.activeProfileId, 'student-priya');
  assert.ok(result.storeToRestore.roadmaps7['student-priya']);
  assert.equal(result.storeToRestore.interviews['student-priya'].length, 1);
});

test('3. Backup Validation: accepts valid full-store ledger export', () => {
  const fullStorePayload: ProfileDataStore = {
    version: 1,
    profiles: [
      {
        id: 'prof-dev',
        name: 'Kavita Rao',
        targetRole: 'Cloud Architect',
        currentSkills: ['AWS', 'Docker'],
        targetSkills: ['Terraform', 'Kubernetes'],
        experienceLevel: 'senior',
        dailyStudyHours: 2,
        targetDurationWeeks: 6,
        preferredDifficulty: 'advanced',
        completedProjects: [],
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ],
    activeProfileId: 'prof-dev',
    analyses: {},
    roadmaps7: {},
    roadmaps30: {},
    interviews: {
      'prof-dev': [
        {
          id: 'int-1',
          profileId: 'prof-dev',
          targetRole: 'Cloud Architect',
          status: 'completed',
          questions: [],
          summary: { overallScore: 92 },
        } as any,
      ],
    },
    activities: {},
    recommendations: {},
    analysisHistory: {},
  };

  const result = validateAndParseBackup(JSON.stringify(fullStorePayload));
  assert.equal(result.valid, true);
  assert.ok(result.preview);
  assert.equal(result.preview.profileName, 'Kavita Rao');
  assert.equal(result.preview.targetRole, 'Cloud Architect');
  assert.equal(result.preview.interviewsCount, 1);
});

test('4. Backup Validation: enforces 5MB file size limit', () => {
  // Generate payload > 5MB
  const largePadding = 'x'.repeat(5.2 * 1024 * 1024);
  const oversizedPayload = JSON.stringify({
    profile: { name: 'Too Big', targetRole: 'Engineer' },
    padding: largePadding,
  });

  const result = validateAndParseBackup(oversizedPayload);
  assert.equal(result.valid, false);
  assert.equal(result.error, 'File size exceeds 5MB safety limit.');
});

test('5. Backup Validation: handles empty string, malformed syntax, and missing required profile fields', () => {
  // Empty string
  const emptyRes = validateAndParseBackup('');
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.error, 'Empty or invalid file content provided.');

  // Malformed JSON syntax
  const badSyntaxRes = validateAndParseBackup('{ "profile": { "name": "Broken" ');
  assert.equal(badSyntaxRes.valid, false);
  assert.match(badSyntaxRes.error || '', /Invalid JSON syntax/i);

  // Missing name
  const missingNameRes = validateAndParseBackup(JSON.stringify({ profile: { targetRole: 'Backend' } }));
  assert.equal(missingNameRes.valid, false);
  assert.match(missingNameRes.error || '', /missing a valid name/i);

  // Missing targetRole
  const missingRoleRes = validateAndParseBackup(JSON.stringify({ profile: { name: 'Aarav' } }));
  assert.equal(missingRoleRes.valid, false);
  assert.match(missingRoleRes.error || '', /missing a target role/i);

  // Empty profiles array in ledger
  const emptyLedgerRes = validateAndParseBackup(JSON.stringify({ profiles: [] }));
  assert.equal(emptyLedgerRes.valid, false);
  assert.match(emptyLedgerRes.error || '', /0 candidate profiles/i);
});

test('6. Pre-Restore Snapshot & Rollback: creates automatic recovery point and allows safe revert', () => {
  mockLocalStorage.clear();

  // 1. Establish initial primary profile
  const originalStore = getInitialStore();
  originalStore.profiles[0].name = 'Original Student';
  saveDataStore(originalStore);

  // 2. Prepare replacement store to restore
  const replacementStore: ProfileDataStore = {
    version: 1,
    profiles: [
      {
        id: 'new-restored-id',
        name: 'Restored New Student',
        targetRole: 'Data Engineer',
        currentSkills: ['Python', 'SQL'],
        targetSkills: ['Spark', 'Airflow'],
        experienceLevel: 'entry',
        dailyStudyHours: 2,
        targetDurationWeeks: 6,
        preferredDifficulty: 'intermediate',
        completedProjects: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    activeProfileId: 'new-restored-id',
    analyses: {},
    roadmaps7: {},
    roadmaps30: {},
    interviews: {},
    activities: {},
    recommendations: {},
    analysisHistory: {},
  };

  // 3. Restore data store - must automatically save pre-restore backup first!
  const restoreSuccess = restoreDataStore(replacementStore);
  assert.equal(restoreSuccess, true, 'Restore operation must succeed');

  // Verify active storage now contains restored profile
  const activeNow = JSON.parse(memoryStore[STORAGE_KEY]);
  assert.equal(activeNow.profiles[0].name, 'Restored New Student');

  // Verify pre-restore snapshot was created
  const preRestore = getPreRestoreBackup();
  assert.ok(preRestore, 'Pre-restore snapshot must exist in storage');
  assert.equal(preRestore.profiles[0].name, 'Original Student', 'Pre-restore backup must preserve prior state');

  // 4. Trigger revertToPreRestoreBackup
  const revertSuccess = revertToPreRestoreBackup();
  assert.equal(revertSuccess, true, 'Revert must succeed');

  // Verify storage was reverted back to original student state
  const revertedStore = JSON.parse(memoryStore[STORAGE_KEY]);
  assert.equal(revertedStore.profiles[0].name, 'Original Student', 'Active storage reverted successfully');
  assert.equal(revertedStore.profiles[0].id, 'prof-aarav-frontend');
});

test('7. Theme Retention: restoring backup preserves user dark/light preference', () => {
  mockLocalStorage.clear();

  // User set preference to dark
  applyTheme('dark');
  assert.equal(getSavedTheme(), 'dark');

  // Restore store with preserveTheme = true (default)
  const incomingStore = getInitialStore();
  restoreDataStore(incomingStore, true);

  // Verify theme preference remains untouched
  assert.equal(memoryStore[THEME_KEY], 'dark', 'User theme preference must be preserved across restore');
});
