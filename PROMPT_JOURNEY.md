# PrepPilot AI — Chronological Prompt Journey

This document summarizes the prompt-driven development of PrepPilot AI in Google AI Studio, including feature development, troubleshooting, performance improvements, and pre-submission checks.

**Record accuracy:** Text presented as a verbatim prompt is reproduced from the available prompt history. Other entries are summaries of development goals, implementation changes, or observed outcomes and are not necessarily verbatim prompts. Verification statements are included only where supporting evidence is available.

---

## Stage 1: Initial Inception & Core Vision

### Prompt 1.1: Project Foundation
- **User Intent:** Create PrepPilot AI — an AI-powered placement preparation platform for college students preparing for technical interviews and on-campus placement drives.
- **Architectural Response:**
  - Designed full-stack monorepo with React 19, TypeScript, and Express.
  - Implemented client-side storage architecture (`localStorage`) with pre-seeded candidate profiles.
  - Initialized `@google/genai` server-side SDK in `server.ts`.
  - Configured dark/light mode theming and responsive navigation.
- **Verified Outcome:** Base application structure compiled cleanly with initial dashboard and navigation tabs.

---

## Stage 2: Feature Expansion & Domain Specialization

### Prompt 2.1: Skill-Gap Analysis & Adaptive Roadmaps
- **User Intent:** Build AI-driven placement workflows: skill gap evaluation, intensive 7-day bootcamps, and comprehensive 30-day master schedules.
- **Architectural Response:**
  - Implemented `/api/gemini/skill-analysis` endpoint returning structured missing skills, project recommendations, and interview readiness heuristics.
  - Implemented `/api/gemini/generate-roadmap-7` with daily learning goals, coding challenges, starter hints, and outcomes.
  - Implemented `/api/gemini/generate-roadmap-30` structured into 4 logical phases (Foundation, Intermediate, Advanced, Mastery).
  - Designed checkbox state preservation logic so regenerating schedules retains completed tasks.
- **Verified Outcome:** Both roadmaps returned structured JSON schemas matching candidate requirements.

### Prompt 2.2: Technical Mock Interviews & Learning Velocity
- **User Intent:** Add dynamic mock technical interview simulation with real-time feedback and a learning velocity tracker.
- **Architectural Response:**
  - Created `/api/gemini/interview-questions` generating 10 balanced questions (Fundamental, Intermediate, Advanced).
  - Created `/api/gemini/evaluate-answer` assessing submissions across a 4-part rubric (Accuracy, Completeness, Clarity, Depth).
  - Created `/api/gemini/interview-summary` synthesizing full-session strengths and weaknesses.
  - Implemented `VelocityView.tsx` aggregating study minutes and task completion trends.
- **Verified Outcome:** Complete end-to-end interview simulation operational.

---

## Stage 3: Diagnosing & Resolving Quota & Capacity Errors

### Prompt 3.1: 7-Day Roadmap Quota Error (HTTP 429)
- **User Prompt:**
  ```
  Fix the 7-day roadmap generation quota error in my existing PrepPilot AI project.
  Error received:
  - HTTP 429 RESOURCE_EXHAUSTED
  - Quota metric: generate_content_free_tier_requests
  - Model reported by the failed request: gemini-3.8-flash
  - Quota value: 20; suggested retry delay: ~801s.
  Previously, backend diagnostics showed successful responses from gemini-3.1-flash-lite.
  ```
- **Investigation & Findings:**
  1. `server.ts` fallback candidate list included `'gemini-3.8-flash'` at the end of the array.
  2. `gemini-3.8-flash` on the Google free tier has a strict daily limit of 20 requests per day (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit: 20).
  3. When an earlier transient delay or RPM spike occurred on `gemini-3.1-flash-lite`, the server looped through candidates down to `gemini-3.8-flash`, which failed with 429.
  4. Because `gemini-3.8-flash` was the terminal model, its 429 error masked earlier healthy models and returned HTTP 500 to the client.
- **Architectural Fix:**
  - Prioritized `gemini-3.1-flash-lite` (generous 15 RPM / 1,500 RPD tier) and `gemini-flash-lite-latest` as default models.
  - Excluded `gemini-3.8-flash` from the fallback defaults.
  - Added HTTP 429 structured error responses with `isQuotaExhausted: true` and `retryAfter: 60`.
  - Added a 60-second countdown in `Roadmap7View.tsx` that temporarily disables the Retry button to prevent repeated clicks, while preserving the existing roadmap in the view.
- **Verified Outcome:** 7-day roadmap generation succeeded live in 5,421 ms via `gemini-3.1-flash-lite`.

---

## Stage 4: Read-Only Pre-Deployment Audit

### Prompt 4.1: Comprehensive System Audit
- **User Prompt:**
  ```
  Perform a READ-ONLY pre-deployment audit of my existing PrepPilot AI application.
  Audit 12 areas: startup/build, profiles, skill-gap, roadmaps, interviews, progress, UI states,
  responsiveness, security, deployment readiness, storage, and potential blockers.
  Report PASS, FAIL, or NOT VERIFIED for each. Do not modify files.
  ```
- **Audit Findings:**
  - **PASS:** Startup, frontend build, profiles, skill-gap analysis, 7-day/30-day roadmaps, mock interviews, UI states, responsiveness, API key security, and storage backup.
  - **FAIL (Defect 1):** In `package.json`, `"start": "tsx server.ts"` depended on `tsx` located in `devDependencies`, which fails in pruned production environments.
  - **FAIL (Defect 2):** In `server.ts`, `/api/gemini/recommendations` lacked in-memory caching and failed with 503 high-demand during concurrent load.
  - **FAIL (Defect 3):** In `vite.config.ts`, `path.resolve(__dirname, '.')` triggered a native config deprecation warning in Vite 8.
- **Verified Outcome:** Delivered thorough 12-area audit report distinguishing code inspection from live execution without changing any project files.

---

## Stage 5: Resolving Runtime Parameter Errors

### Prompt 5.1: Invalid Argument (HTTP 400) on Fallback Model
- **User Prompt:**
  ```
  Fix the errors in the app
  [AIS_METADATA_SECTION_START]
  fix_it_trigger: manual
  error 0: [PrepPilot AI Warning] Call with model gemini-flash-lite-latest (attempt 1) transient network glitch:
  {"error":{"code":400,"message":"Request contains an invalid argument.","status":. Retrying...
  [AIS_METADATA_SECTION_END]
  ```
- **Investigation & Findings:**
  1. `callGeminiWithRetry` was unconditionally applying `thinkingConfig: { thinkingBudget: 0 }` to all models.
  2. `gemini-flash-lite-latest` does not support thinking configurations and rejects the parameter with HTTP 400 `INVALID_ARGUMENT`.
  3. The error handler treated 400 status as a generic transient network glitch, resulting in repetitive retry warnings.
- **Architectural Fix:**
  - Conditionally attached `thinkingConfig` only to models supporting extended thinking budgets, omitting it for `gemini-flash-lite-latest`.
  - Added an `INVALID_ARGUMENT` guard that bypasses to the next model without waiting through network retry intervals.
  - Added SHA-256 caching and 429/503 graceful handling to `/api/gemini/recommendations`.
  - Replaced `__dirname` in `vite.config.ts` with `path.resolve('.')`.
- **Verified Outcome:**
  - Direct call to `gemini-flash-lite-latest` succeeded with `Result: OK` and zero warnings.
  - Recommendations endpoint succeeded in 4,739 ms (miss) and 2 ms (hit).
  - Production build completed in 914 ms with zero deprecation warnings.

---

## Stage 6: Restoring Development Server

### Prompt 6.1: Dev Server Startup Failure
- **User Prompt:**
  ```
  The dev server didn't start, please fix it
  ```
- **Investigation & Findings:**
  1. Checked running processes; no Node process was active on port 3000.
  2. Manual invocation revealed `Cannot find package 'express'` because `node_modules` was missing in the container session.
- **Architectural Fix:**
  - Ran `install_applet_dependencies` to reinstall all packages cleanly from `package.json`.
  - Restarted development server via `restart_dev_server`.
- **Verified Outcome:**
  - Verified `GET /api/health` returned HTTP 200 (`PrepPilot AI Backend`).
  - Verified `GET /` returned HTTP 200 serving client SPA.

---

## Stage 7: Project Documentation

### Prompt 7.1: Comprehensive Documentation Generation
- **User Prompt:**
  ```
  Prepare documentation for my existing PrepPilot AI project: README.md, TESTING.md, PROMPT_JOURNEY.md.
  Do not rebuild or modify the app. Use only verified facts.
  Finish with a list of facts I must verify.
  ```
- **Action:**
  - Created `README.md` documenting architecture, features, run instructions, and limitations.
  - Created `TESTING.md` cataloging 30 test scenarios with PASS/FAIL/NOT VERIFIED classifications.
  - Created `PROMPT_JOURNEY.md` tracing chronological prompts, root cause analyses, and solutions.
- **Verified Outcome:** All three documents created in workspace root.

---

## Stage 8: Full-Stack Codebase Audit & Resilience Hardening

### Prompt 8.1: Full-Stack Audit & Evolution
- **User Intent:** Evolve PrepPilot AI into a professional, resume-worthy project through a comprehensive read-and-verify audit without rebuilding, modifying working architecture, or introducing unnecessary dependencies.
- **Audit Findings:**
  1. **Server-Side API Credential Exclusivity:** Verified that `GEMINI_API_KEY` is accessed strictly in `server.ts` and never bundled into frontend assets or exposed in telemetry logs.
  2. **Error & Quota Handling Inconsistency:** Error responses varied across endpoints; unified `handleEndpointError` to guarantee standard HTTP status codes (429 for quota, 504 for timeout, 500 for internal error) and standard `{ error, isQuotaExhausted, isTimeout, retryAfter }` payloads.
  3. **Client-Side Quota Cooldowns:** Extended the 60-second cooldown timer pattern from `Roadmap7View` to `Roadmap30View` and `SkillGapView`, preventing redundant quota re-exhaustion during peak traffic.
  4. **Mock Interview Answer Resilience:** Added defensive pre-persistence of candidate responses into local state and storage immediately before dispatching the evaluation call to Gemini, ensuring zero text loss if network interruption or rate limiting occurs.
  5. **Production Script Dependency Reliability:** Moved `tsx` from `devDependencies` to `dependencies` in `package.json` so `npm start` executes reliably in production environments that prune devDependencies.
- **Verified Outcome:**
  - TypeScript typecheck (`tsc --noEmit`) passed with 0 errors.
  - Production build (`vite build`) compiled cleanly in < 1 second.
  - Live API testing confirmed HTTP 200 responses for `/api/health`, `/api/gemini/skill-analysis`, and `/api/gemini/generate-roadmap-30`.
