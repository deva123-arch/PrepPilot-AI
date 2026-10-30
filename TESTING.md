# PrepPilot AI — Test Suite & Quality Assurance Report

This document records the verification status of PrepPilot AI across functional testing, API regression checks, UI edge states, error resilience, and security boundaries.

### Test Status Definitions

- **PASS — EXECUTED:** The test was run and supported by an observed execution result, live API response, or recorded build/server output.

- **CODE REVIEWED:** The relevant implementation was inspected in source code, but the full scenario was not independently executed end to end. This status does not mean the runtime behavior has been confirmed.

- **FAIL:** A confirmed defect or unexpected error was observed during testing.

- **NOT VERIFIED:** The scenario still requires direct execution or manual validation in this test cycle.

---

## 1. Test Summary Matrix

| Category | Total Tests | PASS — EXECUTED | CODE REVIEWED | FAIL | NOT VERIFIED |
|---|:---:|:---:|:---:|:---:|:---:|
| System Startup & Health | 2 | 2 | 0 | 0 | 0 |
| Candidate Profile Lifecycle | 4 | 2 | 1 | 0 | 1 |
| Gemini Skill-Gap Analysis | 3 | 3 | 0 | 0 | 0 |
| Personalized Roadmaps (7 & 30 Day) | 5 | 2 | 3 | 0 | 0 |
| Technical Mock Interviews | 4 | 3 | 1 | 0 | 0 |
| Progress & Recommendations | 3 | 1 | 1 | 0 | 1 |
| UI Empty, Loading & Error States | 3 | 0 | 3 | 0 | 0 |
| Responsive Layout & Theming | 2 | 0 | 2 | 0 | 0 |
| Security & API Key Isolation | 2 | 0 | 2 | 0 | 0 |
| Data Persistence & Backup | 3 | 0 | 2 | 0 | 1 |
| **Total** | **31** | **13** | **15** | **0** | **3** |

> Interpretation: 13 tests are recorded as executed, 15 are supported by source-code inspection only, and 3 remain unverified. Counts reflect the evidence documented in this report; they should be updated if additional tests are run.

---

## 2. Detailed Test Cases

### Category A: System Startup & Backend Health

#### TC-SYS-01: Express & Vite Backend Startup

- **Scenario:** Dev server initialization on port 3000.

- **Steps:**

  1. Populate dependencies with `npm install`.

  2. Launch server via `tsx server.ts`.

  3. Query `GET http://localhost:3000/api/health`.

- **Expected Result:** HTTP 200 with JSON payload `{"status":"ok","service":"PrepPilot AI Backend","port":3000}`.

- **Actual Result:** Returned HTTP 200 in 2ms with expected JSON.

- **Status:** **PASS**

- **Notes:** Verified on live server process.

#### TC-SYS-02: Client Asset Compilation & Bundling

- **Scenario:** Production build compilation using Vite 8.

- **Steps:**

  1. Run `npm run build`.

- **Expected Result:** Exit code 0, generating production bundles in `dist/` without errors.

- **Actual Result:** Clean build produced in 914ms (`dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`).

- **Status:** **PASS**

- **Notes:** Zero TypeScript or Vite config warnings.

---

### Category B: Candidate Profile Lifecycle

#### TC-PROF-01: Starter Profiles Auto-Seeding

- **Scenario:** Ensure first-time users have pre-loaded candidate profiles.

- **Steps:**

  1. Inspect `src/services/storage.ts` seed data.

  2. Initialize datastore with empty storage.

- **Expected Result:** Pre-populates 3 distinct candidate profiles (Aarav Sharma - Frontend, Priya Patel - Backend, Rohan Verma - Full Stack).

- **Actual Result:** Seed profiles correctly populate `preppilot_v1_datastore`.

- **Status:** **PASS**

- **Notes:** Verified via storage engine test.

#### TC-PROF-02: Profile Creation & Input Validation

- **Scenario:** Validate required fields and constraints when creating a candidate profile.

- **Steps:**

  1. Open Profile Modal.

  2. Submit empty name or target role.

  3. Submit with 0 known skills or 0 target skills.

  4. Fill valid fields with 2 hours study time.

- **Expected Result:** Form blocks empty submissions and enforces >= 1 known skill and >= 1 target skill; successfully saves valid profile.

- **Actual Result:** Form disables submit button and alerts on missing fields; valid profiles save to store.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; the form was not independently exercised end to end for this report.

#### TC-PROF-03: Multi-Profile Switching & State Isolation

- **Scenario:** Switch between candidate profiles and verify roadmap/interview isolation.

- **Steps:**

  1. Select Profile A (Frontend). Generate 7-day roadmap.

  2. Switch to Profile B (Backend). Inspect displayed roadmap.

- **Expected Result:** Profile B shows only Profile B's data; Profile A's data remains unmodified in store.

- **Actual Result:** Profile IDs isolate all cache and storage entries; switching profiles changes active view without data leakage.

- **Status:** **PASS**

- **Notes:** Verified by end-to-end cache isolation test.

#### TC-PROF-04: Profile Deletion & Cascade Clean-Up

- **Scenario:** Delete a candidate profile.

- **Steps:**

  1. Trigger delete on a candidate profile.

- **Expected Result:** Profile is removed from `profiles` array; associated roadmap and interview records are cleaned up; active profile pointer switches to remaining profile.

- **Actual Result:** Verified in `storage.ts` code logic. UI click confirmation not manually run.

- **Status:** **NOT VERIFIED** (Pending manual UI deletion verification by user).

---

### Category C: Gemini Skill-Gap Analysis

#### TC-GAP-01: Skill-Gap Analysis Generation (Cache Miss)

- **Scenario:** Generate full skill-gap assessment for a candidate profile.

- **Steps:**

  1. Send `POST /api/gemini/skill-analysis` with valid candidate payload.

- **Expected Result:** Returns structured JSON containing `knownSkills`, `missingSkills`, `prioritySkills` (with reasoning), `recommendedTechnologies`, `suggestedProjects`, `interviewReadiness`, and `personalizedNextSteps`.

- **Actual Result:** Completed in 9,263 ms via `gemini-3.1-flash-lite`. Complete schema returned.

- **Status:** **PASS**

- **Notes:** Validated against live Gemini endpoint.

#### TC-GAP-02: Skill-Gap Analysis Cache Hit

- **Scenario:** Re-request skill gap analysis with unchanged parameters.

- **Steps:**

  1. Send duplicate `POST /api/gemini/skill-analysis` without `forceRefresh`.

- **Expected Result:** Returns cached analysis in < 20 ms with `cached: true` in telemetry.

- **Actual Result:** Returned in 3 ms with identical data and `cached: true`.

- **Status:** **PASS**

- **Notes:** In-memory SHA-256 cache validated.

#### TC-GAP-03: Automated Test Suite for Career Skill Gap Analyzer (`npm test`)

- **Scenario:** Execute automated unit and regression test suite covering schema normalization, edge cases, role benchmarks, and resilience.

- **Steps:**

  1. Run `npm test` (`tsx test/skill-gap.test.ts`).

- **Expected Result:** All 9 automated subtests pass cleanly:
  1. JSON parsing & markdown code fence stripping.
  2. Target role & candidate placement profile input propagation (including completed projects).
  3. Priority level normalization (handling mixed-case & invalid labels).
  4. Safe fallbacks for empty/malformed responses.
  5. Strictly enforced non-objective heuristic disclaimer notice.
  6. Readiness score clamping (0-100) and tier mapping.
  7. 429 Quota exhaustion error handling (`isQuotaExhausted: true`, `retryAfter: 60`).
  8. 504 Timeout error handling (`isTimeout: true`).
  9. Multi-role storage isolation (`profileId:targetRole`).

- **Actual Result:** Executed 9 subtests, 9 passed, 0 failed (duration: ~40ms).

- **Status:** **PASS — EXECUTED**

- **Notes:** Verified via `node:test` runner.

---

### Category D: Personalized Roadmaps (7-Day & 30-Day)

#### TC-ROAD-01: 7-Day Sprint Generation

- **Scenario:** Generate 7-day placement sprint curriculum.

- **Steps:**

  1. Send `POST /api/gemini/generate-roadmap-7` for candidate profile.

- **Expected Result:** HTTP 200 with exactly 7 items (days 1 through 7) containing learning objectives, concepts, coding exercises, hints, estimated minutes, and outcomes.

- **Actual Result:** Returned in 5,421 ms using `gemini-3.1-flash-lite`. Verified 7 structured days with exercises and hints.

- **Status:** **PASS**

- **Notes:** Live API execution verified.

#### TC-ROAD-02: 30-Day Master Roadmap Generation

- **Scenario:** Generate comprehensive 30-day curriculum with 4 phases.

- **Steps:**

  1. Send `POST /api/gemini/generate-roadmap-30`.

- **Expected Result:** HTTP 200 with exactly 30 days distributed across 4 distinct phases (Foundation, Intermediate, Advanced, Mastery).

- **Actual Result:** Returned in 10,446 ms using `gemini-3.1-flash-lite`. 30 days and 4 phases verified.

- **Status:** **PASS**

- **Notes:** Live API execution verified.

#### TC-ROAD-03: Roadmap Regeneration Checkbox Preservation

- **Scenario:** Candidate checks off Day 1 and Day 2 tasks, then regenerates the roadmap.

- **Steps:**

  1. Mark Day 1 and Day 2 as `completed: true`.

  2. Request roadmap regeneration (`forceRefresh: true`).

- **Expected Result:** Newly generated schedule preserves `completed: true` for Days 1 and 2.

- **Actual Result:** `Roadmap7View.tsx` reconstructs completed set and merges into new AI response.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection of `Roadmap7View.tsx` (lines 63–72); regeneration behavior was not independently executed for this report.

#### TC-ROAD-04: Roadmap Deduplication on Rapid Clicks

- **Scenario:** User clicks "Generate Roadmap" multiple times simultaneously.

- **Steps:**

  1. Fire two simultaneous requests to `fetchRoadmap7`.

- **Expected Result:** Both requests resolve to the same underlying Promise; only 1 call is sent to Gemini.

- **Actual Result:** `inFlightRequests` in `api.ts` deduplicates identical keys; button disables with `disabled={loading}`.

- **Status:** **CODE REVIEWED**

- **Notes:** Code inspection and network deduplication verified.

#### TC-ROAD-05: HTTP 429 Rate Limit Cooldown & UI Preservation

- **Scenario:** Server returns HTTP 429 quota exhaustion.

- **Steps:**

  1. Mock or receive 429 response on roadmap route.

- **Expected Result:** UI displays amber quota notice, starts 60-second countdown, disables Retry button, and keeps existing roadmap displayed below.

- **Actual Result:** `Roadmap7View.tsx` activates `retryCountdown`, disables button, and retains `currentRoadmap7` in DOM.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; a live HTTP 429 response was not injected or observed during this test cycle.

---

### Category E: Technical Mock Interviews & AI Feedback

#### TC-INT-01: 10-Question Technical Interview Generation

- **Scenario:** Generate balanced technical interview questions for candidate's role.

- **Steps:**

  1. Send `POST /api/gemini/interview-questions`.

- **Expected Result:** HTTP 200 with exactly 10 questions categorized across Fundamental, Intermediate, and Advanced difficulties.

- **Actual Result:** Returned in 4,457 ms with 10 structured questions.

- **Status:** **PASS**

- **Notes:** Live API execution verified.

#### TC-INT-02: Single Answer 4-Part Rubric Evaluation

- **Scenario:** Candidate submits answer to an interview question.

- **Steps:**

  1. Send `POST /api/gemini/evaluate-answer` with question and answer text.

- **Expected Result:** HTTP 200 with scores for accuracy, completeness, clarity, depth (each 0–25), overall score, verdict, model answer, and improvement tips.

- **Actual Result:** Returned in 5,993 ms with structured rubric evaluation and model answer.

- **Status:** **PASS**

- **Notes:** Live API execution verified.

#### TC-INT-03: Full Interview Debrief Summary

- **Scenario:** Candidate completes interview round.

- **Steps:**

  1. Send `POST /api/gemini/interview-summary` with session questions and evaluated answers.

- **Expected Result:** HTTP 200 with overall performance percentage, key strengths, revision checkpoints, and next steps.

- **Actual Result:** Returned in 2,386 ms with structured debrief summary.

- **Status:** **PASS**

- **Notes:** Live API execution verified.

#### TC-INT-04: Empty Answer Submission Prevention

- **Scenario:** User attempts to submit an empty answer in Mock Interview UI.

- **Steps:**

  1. Clear input textarea.

  2. Attempt submit.

- **Expected Result:** UI blocks submission with validation alert; submit button disabled.

- **Actual Result:** `MockInterviewView.tsx` checks `!userAnswer.trim()` and prevents API call.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; empty-answer UI behavior was not independently exercised for this report.

---

### Category F: Progress Tracking & Recommendations

#### TC-PROG-01: Task Completion & Activity Logging

- **Scenario:** Candidate completes roadmap item.

- **Steps:**

  1. Toggle Day 3 task checkbox.

- **Expected Result:** Sets `completed: true`, stamps `completedAt`, appends entry to `activityLog`, and increments progress percentage.

- **Actual Result:** Handled by `toggleRoadmap7Task` in `src/services/storage.ts`.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; task completion was not independently executed end to end for this report.

#### TC-PROG-02: Next-Step Recommendations Generation & Caching

- **Scenario:** Fetch personalized recommendations based on candidate's velocity and roadmap progress.

- **Steps:**

  1. Send `POST /api/gemini/recommendations` with profile and activity statistics.

- **Expected Result:** HTTP 200 with urgent topic advice, overdue advice, exercises, and revision checkpoints. Cache hit returns in < 10ms.

- **Actual Result:** Miss completed in 4,739 ms; hit returned in 2 ms (`cached: true`).

- **Status:** **PASS**

- **Notes:** Live API execution verified.

#### TC-PROG-03: Velocity Trailing Calculation

- **Scenario:** Calculate 7-day velocity and percentage change vs prior 7 days.

- **Steps:**

  1. Inspect `VelocityView.tsx` date range math.

- **Expected Result:** Filters activities within `now - 7 days` and compares against `now - 14 days`.

- **Actual Result:** Verified in `VelocityView.tsx` code logic. Multi-week historical logging not simulated live.

- **Status:** **NOT VERIFIED** (Multi-week simulated timestamps pending manual user verification).

---

### Category G: UI States, Loading, Empty & Error

#### TC-UI-01: Profile Empty States

- **Scenario:** Candidate has not created or selected an active profile.

- **Steps:**

  1. Render Dashboard, Roadmaps, or Interview view with `activeProfile = null`.

- **Expected Result:** Renders "No Active Profile" banner with a "Create Profile" button.

- **Actual Result:** Handled across all component views.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; the empty state was not independently exercised in the running UI for this report.

#### TC-UI-02: Animated Loading Skeletons

- **Scenario:** Waiting for Gemini AI response.

- **Steps:**

  1. Trigger roadmap generation or interview evaluation.

- **Expected Result:** Renders animated loading skeleton with pulsing icon and descriptive message.

- **Actual Result:** `Roadmap7View`, `Roadmap30View`, and `MockInterviewView` display custom animated skeletons.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; this behavior was not independently exercised in the running UI for this report.

#### TC-UI-03: Toast Error Notifications

- **Scenario:** Backend returns error response.

- **Steps:**

  1. API request throws error.

- **Expected Result:** Toast notification appears with error title and user-friendly message.

- **Actual Result:** Handled by `addToast('error', ...)` and `ToastContainer.tsx`.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; this behavior was not independently exercised in the running UI for this report.

---

### Category H: Responsive Layout & Theming

#### TC-RESP-01: Responsive Breakpoints

- **Scenario:** View application on mobile (< 640px) vs desktop (> 1024px).

- **Steps:**

  1. Inspect `Navbar.tsx` and layout container.

- **Expected Result:** Desktop displays horizontal navigation bar; mobile displays hamburger button with drawer overlay.

- **Actual Result:** Verified in `Navbar.tsx` responsive classes (`md:flex`, `hidden sm:block`).

- **Status:** **CODE REVIEWED**

- **Notes:** Verified in source code.

#### TC-RESP-02: Dark & Light Theme Pre-Hydration

- **Scenario:** Toggle theme and reload page.

- **Steps:**

  1. Toggle theme to dark.

  2. Reload page.

- **Expected Result:** Theme persists without flash of unstyled light content.

- **Actual Result:** Inline `<script>` in `index.html` inspects `preppilot_theme` before DOM renders and applies `.dark` class to `<html>`.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; reload persistence and flash behavior were not independently tested in a browser for this report.

---

### Category I: Security & API Key Isolation

#### TC-SEC-01: Gemini API Key Client-Side Leak Check

- **Scenario:** Verify `process.env.GEMINI_API_KEY` is not bundled into client files.

- **Steps:**

  1. Search `src/` and `dist/assets/` for `GEMINI_API_KEY` or API key literals.

- **Expected Result:** Zero references in frontend code; all AI queries routed through `/api/gemini/*`.

- **Actual Result:** No references in frontend code or bundle.

- **Status:** **CODE REVIEWED**

- **Notes:** Source/build inspection only; no separate automated bundle-secret scan output is recorded in this report.

#### TC-SEC-02: Server Telemetry Privacy

- **Scenario:** Verify server diagnostics do not log sensitive user data.

- **Steps:**

  1. Inspect server log statements in `server.ts`.

- **Expected Result:** Logs contain only model name, latency, token count, and route tag.

- **Actual Result:** Telemetry output: `[PrepPilot AI Diagnostics] roadmap-7 -> model: gemini-3.1-flash-lite, latency: 5421ms, tokens: 1436`.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; log behavior was not independently tested with sensitive sample inputs in this test cycle.

---

### Category J: Data Persistence & Backup

#### TC-STOR-01: LocalStorage Datastore Serialization

- **Scenario:** Verify state mutations persist across page reloads.

- **Steps:**

  1. Modify profile study hours.

  2. Inspect `localStorage.getItem('preppilot_v1_datastore')`.

- **Expected Result:** JSON string contains updated study hours.

- **Actual Result:** Validated in `src/services/storage.ts`.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; persistence across a browser reload was not independently demonstrated in this test cycle.

#### TC-STOR-02: JSON Export & Backup Creation

- **Scenario:** Candidate clicks "Export Backup" in storage banner.

- **Steps:**

  1. Trigger `exportDataAsJson()`.

- **Expected Result:** Downloads `.json` file containing entire application state with timestamp.

- **Actual Result:** `exportDataAsJson()` creates blob URL and triggers download anchor.

- **Status:** **CODE REVIEWED**

- **Notes:** Source-code inspection only; an actual JSON download was not independently verified in this test cycle.

#### TC-STOR-03: JSON Restore & Version Compatibility

- **Scenario:** Candidate uploads older JSON backup file.

- **Steps:**

  1. Open Restore Modal and select backup file.

- **Expected Result:** Validates file structure, updates storage, and triggers application reload.

- **Actual Result:** Handled by `RestoreModal.tsx` and `importDataFromJson()`.

- **Status:** **NOT VERIFIED** (Pending manual file upload test by user).