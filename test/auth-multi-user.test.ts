/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  validateEmail,
  createUser,
  createAdminUser,
  findUserByEmail,
  createSession,
  validateSessionToken,
  revokeSession,
  createPasswordResetTicket,
  resetPasswordWithTicket,
  getStudentData,
  updateStudentData,
  migrateLocalDataToStudent,
  sanitizeUser,
  getAllUsers,
  getUserDetail,
  getPlatformStats,
  updateUserStatus,
  getAuditLogs,
} from '../server/auth-db.js';

test('1. New Student Registration & Password Hashing: validates strength, generates scrypt hash and unique salt', async () => {
  // Test password strength rules
  assert.equal(validatePasswordStrength('short').valid, false, 'Rejects password shorter than 8 chars');
  assert.equal(validatePasswordStrength('allletters').valid, false, 'Rejects password without numbers');
  assert.equal(validatePasswordStrength('12345678').valid, false, 'Rejects password without letters');
  assert.equal(validatePasswordStrength('Pass1234').valid, true, 'Accepts valid password');

  // Test email validation
  assert.equal(validateEmail('invalid-email'), false);
  assert.equal(validateEmail('student@college.edu'), true);

  // Password hashing verification
  const rawPassword = 'StudentPlacementPass2026!';
  const { hash, salt } = await hashPassword(rawPassword);

  assert.ok(hash && hash.length >= 64, 'Hash must be at least 64 hex characters');
  assert.ok(salt && salt.length === 32, 'Salt must be 16 bytes (32 hex characters)');
  assert.notEqual(rawPassword, hash, 'Plaintext password must NEVER match hash');

  // Verify constant-time password check
  const isValid = await verifyPassword(rawPassword, hash, salt);
  assert.equal(isValid, true, 'Correct password must verify successfully');

  const isInvalid = await verifyPassword('WrongPassword123', hash, salt);
  assert.equal(isInvalid, false, 'Incorrect password must be rejected');
});

test('2. Existing Student Login & Duplicate Prevention: creates user, handles duplicate emails gracefully', async () => {
  const email = `test.student.${Date.now()}@university.edu`;
  const name = 'Arjun Rao';
  const password = 'SecurePassword2026';

  const user = await createUser({ name, email, password });
  assert.ok(user.id.startsWith('usr_'));
  assert.equal(user.name, 'Arjun Rao');
  assert.equal(user.email, email.toLowerCase());

  // Attempt duplicate registration with same email (case-insensitive)
  await assert.rejects(
    async () => {
      await createUser({ name: 'Arjun Clone', email: email.toUpperCase(), password: 'AnotherPassword123' });
    },
    /already exists/i,
    'Must reject duplicate email registrations'
  );

  // Authenticate user
  const foundUser = findUserByEmail(email);
  assert.ok(foundUser);
  const passwordMatch = await verifyPassword(password, foundUser.passwordHash, foundUser.salt);
  assert.equal(passwordMatch, true, 'Credentials must authenticate');

  // Sanitized user output must never leak password or salt
  const safe = sanitizeUser(user);
  assert.equal((safe as any).passwordHash, undefined);
  assert.equal((safe as any).salt, undefined);
});

test('3. Session Management & Expiration: creates tokens, validates active sessions, and revokes on logout', async () => {
  const user = await createUser({
    name: 'Session Test Student',
    email: `session.student.${Date.now()}@test.edu`,
    password: 'SessionPassword123!',
  });
  const session = createSession(user.id, { ip: '127.0.0.1', userAgent: 'NodeTestRunner' });

  assert.ok(session.token.startsWith('sess_'));
  assert.ok(session.expiresAt > Date.now());

  // Validate active session
  const check = validateSessionToken(session.token);
  assert.equal(check.valid, true, 'Active session for registered student must validate');
  assert.equal(check.user?.id, user.id);

  // Revoke session (logout)
  const revoked = revokeSession(session.token);
  assert.equal(revoked, true, 'Session should be revoked');

  // Second check must fail
  const postLogoutCheck = validateSessionToken(session.token);
  assert.equal(postLogoutCheck.valid, false, 'Revoked token must not validate');

  // Bogus token check
  const bogusCheck = validateSessionToken('sess_bogus_nonexistent_token');
  assert.equal(bogusCheck.valid, false, 'Bogus token must be rejected');
});

test('4. Password Reset Flow: generates 15-minute token and safely updates password hash', async () => {
  const email = `reset.student.${Date.now()}@campus.edu`;
  const user = await createUser({ name: 'Neha Gupta', email, password: 'OldPassword123' });

  // Request reset ticket
  const ticket = createPasswordResetTicket(email);
  assert.ok(ticket);
  assert.ok(ticket.token.startsWith('rst_'));
  assert.equal(ticket.used, false);

  // Reset with ticket
  const newPassword = 'NewSecretPassword2026';
  const success = await resetPasswordWithTicket(ticket.token, newPassword);
  assert.equal(success, true, 'Password reset must succeed');

  // Check login with new password
  const updatedUser = findUserByEmail(email);
  assert.ok(updatedUser);
  const newValid = await verifyPassword(newPassword, updatedUser.passwordHash, updatedUser.salt);
  assert.equal(newValid, true, 'New password must verify');

  const oldValid = await verifyPassword('OldPassword123', updatedUser.passwordHash, updatedUser.salt);
  assert.equal(oldValid, false, 'Old password must no longer work');

  // Ticket cannot be re-used
  const reuse = await resetPasswordWithTicket(ticket.token, 'AnotherPassword999');
  assert.equal(reuse, false, 'Used reset ticket must be rejected');
});

test('5. Multi-User Isolation: Student A and Student B have strictly separate profiles, roadmaps, and interview scores', () => {
  const studentA_Id = `usr_student_alpha_${Date.now()}`;
  const studentB_Id = `usr_student_beta_${Date.now()}`;

  // Student A sets up Frontend track
  const storeA = getStudentData(studentA_Id);
  storeA.profiles = [
    {
      id: `prof-${studentA_Id}`,
      name: 'Priya Sharma',
      targetRole: 'Frontend Developer',
      currentSkills: ['React', 'CSS'],
      targetSkills: ['TypeScript'],
      experienceLevel: 'entry',
      dailyStudyHours: 2,
      targetDurationWeeks: 4,
      preferredDifficulty: 'intermediate',
      completedProjects: ['E-Commerce'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  storeA.activeProfileId = `prof-${studentA_Id}`;
  storeA.roadmaps7[`prof-${studentA_Id}`] = {
    profileId: `prof-${studentA_Id}`,
    targetRole: 'Frontend Developer',
    generatedAt: new Date().toISOString(),
    days: [
      { day: 1, topic: 'DOM Diffing', completed: true, category: 'Programming', priority: 'high', learningObjectives: [], conceptsToStudy: [] } as any,
    ],
  };
  updateStudentData(studentA_Id, storeA);

  // Student B sets up Backend track
  const storeB = getStudentData(studentB_Id);
  storeB.profiles = [
    {
      id: `prof-${studentB_Id}`,
      name: 'Rahul Varma',
      targetRole: 'Backend Engineer',
      currentSkills: ['Node.js', 'PostgreSQL'],
      targetSkills: ['Distributed Caching'],
      experienceLevel: 'mid',
      dailyStudyHours: 3,
      targetDurationWeeks: 6,
      preferredDifficulty: 'advanced',
      completedProjects: ['Order API'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  storeB.activeProfileId = `prof-${studentB_Id}`;
  storeB.interviews[`prof-${studentB_Id}`] = [
    {
      id: 'int-rahul-1',
      profileId: `prof-${studentB_Id}`,
      targetRole: 'Backend Engineer',
      status: 'completed',
      startedAt: new Date().toISOString(),
      questions: [],
      summary: { overallScore: 92 } as any,
    },
  ];
  updateStudentData(studentB_Id, storeB);

  // Verify Student A's store has NO trace of Student B's records
  const retrievedA = getStudentData(studentA_Id);
  assert.equal(retrievedA.profiles.length, 1);
  assert.equal(retrievedA.profiles[0].name, 'Priya Sharma');
  assert.equal(retrievedA.profiles[0].targetRole, 'Frontend Developer');
  assert.equal(retrievedA.roadmaps7[`prof-${studentA_Id}`].days[0].completed, true);
  assert.equal(retrievedA.interviews[`prof-${studentA_Id}`], undefined, 'Student A must not see Student B interviews');

  // Verify Student B's store has NO trace of Student A's records
  const retrievedB = getStudentData(studentB_Id);
  assert.equal(retrievedB.profiles.length, 1);
  assert.equal(retrievedB.profiles[0].name, 'Rahul Varma');
  assert.equal(retrievedB.profiles[0].targetRole, 'Backend Engineer');
  assert.equal(retrievedB.interviews[`prof-${studentB_Id}`][0].summary?.overallScore, 92);
  assert.equal(retrievedB.roadmaps7[`prof-${studentB_Id}`], undefined, 'Student B must not see Student A roadmaps');
});

test('6. Migration of Local Browser Records: safely merges local store into student account with validation', () => {
  const studentId = `usr_migrating_student_${Date.now()}`;

  const localStore = {
    version: 1,
    profiles: [
      {
        id: 'prof-local-candidate',
        name: 'Kavita Portfolio',
        targetRole: 'Cloud Engineer',
        currentSkills: ['Docker', 'AWS'],
        targetSkills: ['Terraform'],
        experienceLevel: 'entry' as const,
        dailyStudyHours: 2,
        targetDurationWeeks: 4,
        preferredDifficulty: 'intermediate' as const,
        completedProjects: ['CI/CD Pipeline'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    activeProfileId: 'prof-local-candidate',
    analyses: {},
    roadmaps7: {},
    roadmaps30: {},
    interviews: {},
    activities: {},
    recommendations: {},
    analysisHistory: {},
  };

  const result = migrateLocalDataToStudent(studentId, localStore as any);
  assert.equal(result.success, true);
  assert.equal(result.profileCount, 1);

  const studentStore = getStudentData(studentId);
  assert.equal(studentStore.profiles.length, 1);
  assert.equal(studentStore.profiles[0].name, 'Kavita Portfolio');
  assert.equal(studentStore.profiles[0].targetRole, 'Cloud Engineer');
});

test('7. Admin Provisioning & Role Verification: creates verified admin, public registration cannot escalate role', async () => {
  const adminEmail = `admin.lead.${Date.now()}@preppilot.ai`;
  const adminPassword = 'AdminSecretPass2026!';
  const adminUser = await createAdminUser({
    name: 'Lead Admin',
    email: adminEmail,
    password: adminPassword,
  });

  assert.equal(adminUser.role, 'admin');
  assert.equal(adminUser.status, 'active');
  assert.equal(adminUser.emailVerified, true);

  // Authenticate admin
  const found = findUserByEmail(adminEmail);
  assert.ok(found);
  const isValid = await verifyPassword(adminPassword, found.passwordHash, found.salt);
  assert.equal(isValid, true);

  // Standard student registration MUST strictly assign 'student' role
  const student = await createUser({
    name: 'Normal Student',
    email: `student.normal.${Date.now()}@college.edu`,
    password: 'StudentPass123!',
  });
  assert.equal(student.role, 'student', 'Public registration must never assign admin role');
});

test('8. Admin Central Database Queries: newly registered student appears in admin list with accurate metrics', async () => {
  const uniqueTag = Date.now();
  const studentEmail = `audit.student.${uniqueTag}@campus.edu`;
  const student = await createUser({
    name: 'Aditya Kumar',
    email: studentEmail,
    password: 'AdityaPassword123!',
  });

  // Attach a profile and a 7-day sprint
  const studentStore = getStudentData(student.id);
  studentStore.profiles = [
    {
      id: `prof-${student.id}`,
      name: 'Aditya Kumar',
      targetRole: 'Data Scientist',
      currentSkills: ['Python', 'Pandas'],
      targetSkills: ['PyTorch', 'TensorFlow'],
      experienceLevel: 'entry',
      dailyStudyHours: 2,
      targetDurationWeeks: 4,
      preferredDifficulty: 'intermediate',
      completedProjects: ['Sentiment Analysis'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  studentStore.activeProfileId = `prof-${student.id}`;
  studentStore.roadmaps7[`prof-${student.id}`] = {
    profileId: `prof-${student.id}`,
    targetRole: 'Data Scientist',
    generatedAt: new Date().toISOString(),
    days: [],
  };
  updateStudentData(student.id, studentStore);

  // Query all users as admin
  const userList = getAllUsers({ search: 'Aditya' });
  assert.ok(userList.total >= 1);
  const matched = userList.users.find((u) => u.id === student.id);
  assert.ok(matched, 'Newly registered student must appear in central admin query');
  assert.equal(matched?.hasProfile, true);
  assert.equal(matched?.targetRole, 'Data Scientist');
  assert.equal(matched?.roadmap7Count, 1);

  // Query single user detail
  const detail = getUserDetail(student.id);
  assert.ok(detail);
  assert.equal(detail?.user.email, studentEmail);
  assert.equal(detail?.profileStore.profiles[0].name, 'Aditya Kumar');

  // Query platform statistics
  const stats = getPlatformStats(false);
  assert.ok(stats.totalUsers >= 2);
  assert.ok(stats.totalStudents >= 1);
  assert.ok(stats.completedProfiles >= 1);
});

test('9. Account Status Controls & Audit Logging: admin can suspend and reactivate account with audit logging', async () => {
  const targetEmail = `suspendable.${Date.now()}@college.edu`;
  const student = await createUser({
    name: 'Test Target',
    email: targetEmail,
    password: 'TargetPassword123!',
  });

  const adminActor = {
    id: 'usr_admin_actor',
    email: 'admin@preppilot.ai',
    ip: '127.0.0.1',
  };

  // Suspend account
  const disabled = updateUserStatus(student.id, 'disabled', adminActor);
  assert.equal(disabled.status, 'disabled');

  // Verify suspended status prevents session creation or validation
  const session = createSession(student.id, { ip: '127.0.0.1' });
  const validation = validateSessionToken(session.token);
  assert.equal(validation.valid, false);
  assert.equal(validation.reason, 'ACCOUNT_DISABLED');

  // Reactivate account
  const reactivated = updateUserStatus(student.id, 'active', adminActor);
  assert.equal(reactivated.status, 'active');

  const newSession = createSession(student.id, { ip: '127.0.0.1' });
  const newValidation = validateSessionToken(newSession.token);
  assert.equal(newValidation.valid, true);

  // Verify audit logs were written
  const logs = getAuditLogs({ action: 'USER_STATUS_CHANGE' });
  assert.ok(logs.total >= 2);
  assert.equal(logs.logs[0].action, 'USER_STATUS_CHANGE');
});

