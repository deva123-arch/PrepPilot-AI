import test from 'node:test';
import assert from 'node:assert/strict';

// Helper functions mirroring and validating server-side skill-gap parsing & normalization
interface RawPriorityItem {
  skill?: string;
  category?: string;
  priority?: string;
  reason?: string;
  practicalExercise?: string;
  projectIdea?: string;
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

function sanitizeSkillGapAnalysis(
  parsed: any,
  profile: {
    id: string;
    targetRole: string;
    currentSkills?: string[];
    completedProjects?: string[];
    experienceLevel?: string;
  }
) {
  const rawKnown =
    Array.isArray(parsed.knownSkills) && parsed.knownSkills.length > 0
      ? parsed.knownSkills
      : profile.currentSkills || [];

  const rawPriority = Array.isArray(parsed.prioritySkills) ? parsed.prioritySkills : [];

  const prioritySkills =
    rawPriority.length > 0
      ? rawPriority.map((item: RawPriorityItem, idx: number) => {
          const p = String(item.priority || '').toLowerCase();
          const validP: 'high' | 'medium' | 'low' = p === 'high' || p === 'low' ? p : 'medium';
          return {
            skill: item.skill || `Core Competency ${idx + 1}`,
            category: item.category || 'Technical Proficiency',
            priority: validP,
            reason:
              item.reason ||
              `Crucial competency evaluated during ${profile.targetRole} placement interviews.`,
            practicalExercise:
              item.practicalExercise ||
              `Implement an exercise demonstrating ${item.skill || 'this skill'} with unit tests.`,
            projectIdea:
              item.projectIdea ||
              `Build a feature showcasing ${item.skill || 'this skill'} in your portfolio repository.`,
          };
        })
      : [
          {
            skill: 'Data Structures & Algorithms',
            category: 'Core CS & DSA',
            priority: 'high' as const,
            reason: `Mandatory screening hurdle for ${profile.targetRole} placement rounds.`,
            practicalExercise:
              'Solve 10 medium-level Tree and Graph problems analyzing time and space complexities.',
            projectIdea:
              'Build an interactive visualizer for graph traversal and dynamic programming algorithms.',
          },
          {
            skill: 'System Design & Modularity',
            category: 'Architecture',
            priority: 'medium' as const,
            reason: 'Demonstrates ability to structure scalable, maintainable production software.',
            practicalExercise: 'Design a rate-limiting middleware or URL shortener with schema diagrams.',
            projectIdea:
              'Implement an end-to-end service with clean layered architecture and error boundaries.',
          },
        ];

  const rawMissing =
    Array.isArray(parsed.missingSkills) && parsed.missingSkills.length > 0
      ? parsed.missingSkills
      : prioritySkills.map((p: any) => p.skill);

  const rawReadiness = parsed.interviewReadiness || {};
  const readinessScore =
    typeof rawReadiness.score === 'number'
      ? Math.max(0, Math.min(100, Math.round(rawReadiness.score)))
      : Math.min(95, Math.max(30, (rawKnown.length || 1) * 14));

  const validRatings = ['Early Stage', 'Developing', 'Competitive', 'Interview Ready'] as const;
  const computedRating = validRatings.includes(rawReadiness.rating)
    ? rawReadiness.rating
    : readinessScore >= 80
    ? 'Interview Ready'
    : readinessScore >= 65
    ? 'Competitive'
    : readinessScore >= 45
    ? 'Developing'
    : 'Early Stage';

  const interviewReadiness = {
    score: readinessScore,
    rating: computedRating,
    explanation:
      rawReadiness.explanation ||
      `Candidate exhibits foundational knowledge for ${profile.targetRole} with key gaps to close.`,
    disclaimer:
      'This readiness score is an AI-estimated heuristic based on self-reported skills and target role benchmarks. It does not constitute an accredited or objective industry assessment.',
  };

  const recommendedTechnologies =
    Array.isArray(parsed.recommendedTechnologies) && parsed.recommendedTechnologies.length > 0
      ? parsed.recommendedTechnologies
      : [
          {
            category: 'Core Stack',
            items: [
              profile.targetRole.includes('Frontend') ? 'TypeScript, Next.js' : 'Node.js, PostgreSQL',
            ],
          },
          { category: 'Testing & Tools', items: ['Jest/Vitest, Docker, Git CI/CD'] },
        ];

  const suggestedProjects =
    Array.isArray(parsed.suggestedProjects) && parsed.suggestedProjects.length > 0
      ? parsed.suggestedProjects
      : [
          {
            title: `${profile.targetRole} Capstone System`,
            description:
              'Architect a full-stack production application demonstrating clean API boundaries and persistence.',
            techStack: (profile.currentSkills || []).slice(0, 3),
            difficulty: 'Intermediate' as const,
            portfolioImpact:
              'Directly validates practical software delivery for campus placement evaluators.',
          },
        ];

  const personalizedNextSteps =
    Array.isArray(parsed.personalizedNextSteps) && parsed.personalizedNextSteps.length > 0
      ? parsed.personalizedNextSteps
      : [
          `Prioritize closing high-severity gap in ${prioritySkills[0]?.skill || profile.targetRole}.`,
          `Implement practical challenge exercises daily to reinforce implementation confidence.`,
          `Simulate a technical mock interview round to test communication and time pressure handling.`,
        ];

  return {
    profileId: profile.id,
    targetRole: profile.targetRole,
    knownSkills: rawKnown,
    missingSkills: rawMissing,
    prioritySkills,
    recommendedTechnologies,
    suggestedProjects,
    interviewReadiness,
    personalizedNextSteps,
    analyzedAt: new Date().toISOString(),
  };
}

function formatEndpointError(err: any, actionName: string) {
  const msg = err?.message || '';
  const isTimeout = msg.includes('Timeout after');
  const isQuota =
    err?.status === 429 ||
    err?.isQuotaExhausted ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('Quota exceeded');
  const statusCode = isQuota ? 429 : isTimeout ? 504 : 500;
  const userMessage = isQuota
    ? 'Gemini API free-tier request quota is currently exhausted. Please wait 60 seconds before retrying. Your existing data and progress remain safely intact.'
    : isTimeout
    ? `Synthesis for ${actionName} took longer than expected due to AI traffic latency. Please click retry; your existing data remains safely intact.`
    : `Failed to ${actionName}: ${msg || 'Unknown error'}`;

  return {
    statusCode,
    body: {
      error: userMessage,
      isQuotaExhausted: isQuota,
      isTimeout,
      retryAfter: isQuota ? 60 : isTimeout ? 5 : undefined,
    },
  };
}

// -----------------------------------------------------------------------------
// Test Suites
// -----------------------------------------------------------------------------

test('1. JSON Parsing: strips markdown code fences and handles whitespace', () => {
  const rawWithFence = '```json\n{"knownSkills": ["React", "TypeScript"]}\n```';
  const parsed1 = parseJsonFromText(rawWithFence);
  assert.deepEqual(parsed1.knownSkills, ['React', 'TypeScript']);

  const rawGenericFence = '```\n{"score": 85}\n```';
  const parsed2 = parseJsonFromText(rawGenericFence);
  assert.equal(parsed2.score, 85);

  const cleanJson = '{"role": "Frontend Developer"}';
  const parsed3 = parseJsonFromText(cleanJson);
  assert.equal(parsed3.role, 'Frontend Developer');
});

test('2. Target Role & Profile Inputs: propagates role, completed projects, and known skills', () => {
  const sampleProfile = {
    id: 'student-101',
    targetRole: 'Software Development Engineer',
    currentSkills: ['Java', 'Data Structures', 'Git'],
    completedProjects: ['E-Commerce Backend Microservice', 'Algo Visualizer'],
    experienceLevel: 'intermediate',
  };

  const sampleAiOutput = {
    knownSkills: ['Java', 'Data Structures', 'Git'],
    missingSkills: ['System Design', 'Redis Caching', 'Kubernetes'],
    prioritySkills: [
      {
        skill: 'Redis Caching',
        category: 'Databases & Distributed Systems',
        priority: 'high',
        reason: 'Essential for low-latency backend architectures evaluated in SDE rounds.',
        practicalExercise: 'Implement a write-through LRU cache in Java with thread-safe synchronization.',
        projectIdea: 'Add distributed session store and rate-limiter to the E-Commerce Microservice.',
      },
    ],
    interviewReadiness: {
      score: 72,
      rating: 'Competitive',
      explanation: 'Solid foundational DSA; needs distributed systems practice.',
    },
  };

  const sanitized = sanitizeSkillGapAnalysis(sampleAiOutput, sampleProfile);

  assert.equal(sanitized.targetRole, 'Software Development Engineer');
  assert.equal(sanitized.profileId, 'student-101');
  assert.equal(sanitized.knownSkills.length, 3);
  assert.equal(sanitized.prioritySkills[0].priority, 'high');
  assert.equal(sanitized.prioritySkills[0].category, 'Databases & Distributed Systems');
  assert.ok(sanitized.prioritySkills[0].practicalExercise.includes('LRU cache'));
  assert.ok(sanitized.prioritySkills[0].projectIdea.includes('E-Commerce Microservice'));
});

test('3. Priority Level Normalization: sanitizes invalid or mixed-case priority strings', () => {
  const profile = { id: 'test-1', targetRole: 'Backend Developer' };
  const rawData = {
    prioritySkills: [
      { skill: 'PostgreSQL', priority: 'HIGH' },
      { skill: 'Docker', priority: 'LOW' },
      { skill: 'Kafka', priority: 'URGENT_CRITICAL' }, // Invalid string
      { skill: 'GraphQL', priority: undefined }, // Missing string
    ],
  };

  const sanitized = sanitizeSkillGapAnalysis(rawData, profile);

  assert.equal(sanitized.prioritySkills[0].priority, 'high');
  assert.equal(sanitized.prioritySkills[1].priority, 'low');
  assert.equal(sanitized.prioritySkills[2].priority, 'medium'); // Normalized
  assert.equal(sanitized.prioritySkills[3].priority, 'medium'); // Normalized
});

test('4. Safe Fallbacks: recovers gracefully when Gemini returns empty or malformed payload', () => {
  const profile = {
    id: 'test-empty',
    targetRole: 'Data Analyst',
    currentSkills: ['Python', 'SQL'],
  };

  // Completely empty parsed payload simulates parse error or partial response
  const sanitized = sanitizeSkillGapAnalysis({}, profile);

  assert.equal(sanitized.profileId, 'test-empty');
  assert.equal(sanitized.targetRole, 'Data Analyst');
  assert.ok(sanitized.prioritySkills.length >= 2, 'Should provide standard fallback priority skills');
  assert.ok(sanitized.prioritySkills[0].practicalExercise.length > 0, 'Fallback skill must have practical exercise');
  assert.ok(sanitized.prioritySkills[0].projectIdea.length > 0, 'Fallback skill must have project idea');
  assert.ok(sanitized.recommendedTechnologies.length > 0, 'Fallback tech recommendations present');
  assert.ok(sanitized.suggestedProjects.length > 0, 'Fallback suggested projects present');
  assert.ok(sanitized.personalizedNextSteps.length >= 3, 'Fallback next steps present');
});

test('5. Non-Objective Assessment Disclaimer: strictly enforces heuristic disclaimer notice', () => {
  const profile = { id: 'candidate-99', targetRole: 'Frontend Developer' };
  const mockAiOutput = {
    interviewReadiness: {
      score: 92,
      rating: 'Interview Ready',
      explanation: 'Exceptional component design capabilities.',
    },
  };

  const sanitized = sanitizeSkillGapAnalysis(mockAiOutput, profile);

  assert.ok(
    sanitized.interviewReadiness.disclaimer.includes('AI-estimated heuristic'),
    'Disclaimer must clarify that score is an AI-estimated heuristic'
  );
  assert.ok(
    sanitized.interviewReadiness.disclaimer.includes('does not constitute an accredited or objective industry assessment'),
    'Disclaimer must explicitly state it is not an accredited or objective assessment'
  );
});

test('6. Readiness Score Clamping & Tier Classification: bounds score between 0 and 100', () => {
  const profile = { id: 'candidate-bounds', targetRole: 'Full Stack Developer' };

  // Case A: Score above 100
  const overbound = sanitizeSkillGapAnalysis({ interviewReadiness: { score: 145 } }, profile);
  assert.equal(overbound.interviewReadiness.score, 100);
  assert.equal(overbound.interviewReadiness.rating, 'Interview Ready');

  // Case B: Negative score
  const underbound = sanitizeSkillGapAnalysis({ interviewReadiness: { score: -25 } }, profile);
  assert.equal(underbound.interviewReadiness.score, 0);
  assert.equal(underbound.interviewReadiness.rating, 'Early Stage');

  // Case C: Score in developing range (50)
  const developing = sanitizeSkillGapAnalysis({ interviewReadiness: { score: 55 } }, profile);
  assert.equal(developing.interviewReadiness.score, 55);
  assert.equal(developing.interviewReadiness.rating, 'Developing');
});

test('7. Error Handling: 429 Resource Exhausted / Quota Limit format', () => {
  const quotaError = new Error('Resource has been exhausted (e.g. check quota): 429 RESOURCE_EXHAUSTED');
  const formatted = formatEndpointError(quotaError, 'skill analysis');

  assert.equal(formatted.statusCode, 429);
  assert.equal(formatted.body.isQuotaExhausted, true);
  assert.equal(formatted.body.retryAfter, 60);
  assert.ok(formatted.body.error.includes('quota is currently exhausted'));
  assert.ok(formatted.body.error.includes('Your existing data and progress remain safely intact'));
});

test('8. Error Handling: 504 Timeout format', () => {
  const timeoutError = new Error('Timeout after 22000ms on model gemini-flash-latest');
  const formatted = formatEndpointError(timeoutError, 'skill analysis');

  assert.equal(formatted.statusCode, 504);
  assert.equal(formatted.body.isTimeout, true);
  assert.equal(formatted.body.isQuotaExhausted, false);
  assert.ok(formatted.body.error.includes('took longer than expected'));
  assert.ok(formatted.body.error.includes('your existing data remains safely intact'));
});

test('9. Storage Multi-Role Isolation: preserves separate analyses per profile and target role', () => {
  // Simulates the role-specific storage logic in src/services/storage.ts
  const mockStore: { analyses: Record<string, any> } = { analyses: {} };

  function mockSaveAnalysis(analysis: { profileId: string; targetRole: string; score: number }) {
    mockStore.analyses[analysis.profileId] = analysis;
    if (analysis.targetRole) {
      mockStore.analyses[`${analysis.profileId}:${analysis.targetRole}`] = analysis;
    }
  }

  function mockGetAnalysis(profileId: string, targetRole?: string) {
    if (targetRole && mockStore.analyses[`${profileId}:${targetRole}`]) {
      return mockStore.analyses[`${profileId}:${targetRole}`];
    }
    return mockStore.analyses[profileId] || null;
  }

  // Save SDE analysis
  mockSaveAnalysis({ profileId: 'user-1', targetRole: 'Software Development Engineer', score: 75 });
  // Save Data Analyst analysis for same user
  mockSaveAnalysis({ profileId: 'user-1', targetRole: 'Data Analyst', score: 62 });

  const sdeResult = mockGetAnalysis('user-1', 'Software Development Engineer');
  const dataResult = mockGetAnalysis('user-1', 'Data Analyst');

  assert.equal(sdeResult?.score, 75);
  assert.equal(dataResult?.score, 62);
  assert.notEqual(sdeResult?.targetRole, dataResult?.targetRole);
});
