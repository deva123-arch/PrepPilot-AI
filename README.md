# PrepPilot AI — Placement Preparation & Readiness Intelligence Platform

> **Portfolio & Deployment Status:** Running in the Google AI Studio container environment on Cloud Run. Complete local verification, TypeScript validation, and automated unit test suites pass. Candidate data is stored in browser-local `localStorage` with automated backup snapshots and JSON export/import; cloud database synchronization across multiple devices is not implemented.

---

## 1. Problem Statement

Graduating computer science and software engineering students preparing for technical campus placements and software engineering internships encounter four major systemic hurdles:

1. **Uncalibrated Competency Gaps:** Candidates lack an objective benchmark comparing their self-reported technical skills against actual hiring standards across roles (Frontend, Backend, SDE, Full-Stack, System Design).
2. **Rigid, Impractical Roadmaps:** Generic placement roadmaps fail to adapt to a candidate's daily study availability (e.g., 2 hrs/day vs. 6 hrs/day), target interview timeline, or existing foundational strengths.
3. **High-Stress, Feedback-Deficient Interview Practice:** Practicing technical questions in isolation lacks structured rubrics, constructive critiques, model answers, or execution clarity.
4. **Velocity Blindspots:** Candidates cannot tell whether their daily pacing is sufficient to cover high-priority topics before placement drives commence.

**PrepPilot AI** addresses these challenges by serving as an intelligent, contest-ready placement accelerator. It pairs candidates with an AI placement coach that evaluates skill gaps, structures actionable **7-Day Sprints** and **30-Day Master Curriculums**, conducts interactive **Technical and Behavioral Mock Interviews** with a transparent 4-part rubric, and computes **Learning Velocity** to keep students on track.

---

## 2. Implemented Features

### A. Single Student Profile Architecture & Onboarding
- **Single Profile Per Student:** Enforces a 1-to-1 relationship between the student and their preparation account. Prevents confusing multi-profile duplication.
- **Dedicated Onboarding Flow:** Brand-new students are greeted with a welcome setup experience to configure their target role, skill baseline, and daily study commitment once.
- **Returning Student Continuity:** Returning students access their existing profile and dashboard directly without being prompted to create another profile.
- **In-Place Profile Editing:** Edit target role, study commitments, or competencies in place while strictly preserving historical roadmaps, task completion milestones, mock interview records, and unique student account ID.
- **Safe Legacy Profile Review & Archival:** For students who previously created multiple candidate tracks in older releases, a non-destructive review tool allows exporting each legacy track's data to a JSON backup and cleanly archiving secondary profiles without blind or erroneous data merging.
- **Target Role Specialization:** Calibrate preparation for Frontend Developer, Backend Engineer, SDE, Full-Stack Developer, and more.
- **Detailed Attributes:** Tracks known skills, target skills, experience level, daily study hours (1–12 hrs/day), target preparation duration (weeks), and preferred difficulty.

### B. Skill-Gap Assessment & Hiring Readiness
- **Known vs. Missing Skills:** Automatic classification of candidate competencies against industry hiring benchmarks.
- **Priority Competency Matrix:** High, medium, and low priority focus areas with concrete reasons technical interviewers evaluate them.
- **Practical Exercises & Resume Ideas:** Concrete coding exercises and portfolio mini-projects designed to close each identified gap.
- **Estimated Interview Readiness:** Heuristic readiness score (0–100%) and stage classification (Early Stage, Developing, Competitive, Interview Ready).
- **Explicit Disclaimers:** Transparent notice that readiness scores are AI-estimated heuristic benchmarks, not accredited employer assessments.

### C. Actionable 7-Day & 30-Day Preparation Roadmaps
- **7-Day Intensive Sprint:** High-impact daily sprints with topic titles, learning objectives, core concepts, practical coding exercises with hints, and estimated durations.
- **30-Day Master Curriculum:** 4-phase structured journey:
  - *Phase 1 (Days 1–7):* Fundamentals & Essential Concepts
  - *Phase 2 (Days 8–14):* Core Technical Skills & Problem-Solving
  - *Phase 3 (Days 15–21):* Practical Implementation & Project Building
  - *Phase 4 (Days 22–30):* Revision, Interview Practice & Placement Readiness
- **Realistic Categorization:** Balanced distribution across 6 tracks: *Programming*, *Data Structures & Algorithms*, *Computer Science Fundamentals*, *Projects & Architecture*, *Aptitude & Logical Reasoning*, and *Interview Practice*.
- **Interactive Task States:** Mark tasks as **Complete**, **Incomplete**, or **Skipped**.
- **Dynamic Availability Adjustment:** Edit daily study hours at any time; upcoming task durations recalculate dynamically.
- **Progress Metrics:** Visual progress bars, overall completion percentage, upcoming schedule items, and overdue task alerts.
- **Adaptive Recommendations:** AI suggestions adapt based on completed and skipped tasks without resetting roadmap history.

### D. Dynamic AI Mock Interviews
- **Configurable Interview Parameters:**
  - *Target Role:* Pre-filled from profile with custom role override.
  - *Interview Category:* Technical (DSA, Architecture, Core CS), Behavioral (STAR framework), or Mixed.
  - *Difficulty Level:* Fundamental, Intermediate, Advanced, or Adaptive.
  - *Question Count:* 3, 5, or 10 questions per round.
- **Interactive Question-by-Question Flow:** One question presented at a time with response textarea, code formatting, and elapsed timer.
- **Transparent 4-Part Evaluation Rubric:**
  - *Accuracy (0–25 pts):* Conceptual correctness, logic, and syntax.
  - *Completeness (0–25 pts):* Edge case coverage and complexity analysis.
  - *Clarity (0–25 pts):* Structure, articulation, and professional communication.
  - *Depth (0–25 pts):* Architectural trade-offs and scalability considerations.
- **Constructive Feedback Breakdown:** Highlights what was correct, missing points/misconceptions, comprehensive model answer, and targeted improvement tips.
- **Heuristic Execution Notice:** Coding questions explicitly disclose that submitted code text and explanations are evaluated heuristically by AI without isolated container execution.
- **Deterministic Scoring:** The final session score is the strict arithmetic average of individual question rubric scores.
- **Session History & Safe Recovery:** Active sessions survive page refreshes; completed sessions are logged in the candidate history ledger with delete capabilities.

### E. Student Progress Analytics & Velocity Dashboard
- **Deterministic Record Aggregation:** All analytics (task completion rates, active study days, logged study minutes, interview averages) are computed directly from verified `localStorage` records. No artificial or fabricated metrics are ever rendered.
- **Progress Over Time Charts:**
  - *Mock Interview Score Trajectory:* Interactive SVG progression curve plotting rubric-evaluated interview scores over time. Enforces a strict data sufficiency threshold (requires $\ge 2$ completed rounds; otherwise renders clear, constructive empty state guidance).
  - *Daily Activity Momentum:* Bar chart depicting completed tasks and recorded study minutes per day across the active timeframe.
- **Multi-Dimensional Filters:** Filter metrics dynamically by date range (*All Time*, *Past 7 Days*, *Past 30 Days*, *Past 90 Days*, or *Custom Date Bounds*) and preparation area (*Programming*, *Data Structures & Algorithms*, *Computer Science Fundamentals*, *Projects & Architecture*, *Aptitude & Logical Reasoning*, *Interview Practice*).
- **Skill-Gap Assessment Progression:** Compares successive AI diagnostics across time, tracking score deltas (+/- %), readiness tier shifts, newly closed skill gaps, and remaining gaps.
- **Clear Distinction of Estimates vs. Verified Records:** Explicit badges differentiate prompt-based AI diagnostic heuristics from rubric-evaluated interview scores and verified completed milestones.
- **Weekly Executive Summary:** Highlights achievements in the trailing 7 days, velocity period-over-period delta %, unfinished high-priority sprint tasks, and recommended next actions.
- **Manual Study Logging:** Students can log focused self-study, problem sets, and external drills (15–120 minutes) with instant activity ledger updates.

### F. Enterprise Client UX & Accessibility
- **Responsive Layout:** Adaptive desktop navigation bar and mobile drawer.
- **Theme Support:** Dark and Light mode toggle with zero-flash pre-hydration script.
- **Safety Alerts:** HTTP 429 quota alert with automated 60-second countdown timer and request throttling.
- **Zero-Data States:** Empty states, skeleton loaders, and non-blocking toast notifications.

---

## 3. Technology Stack

### Frontend
- **Framework:** React 19 (`react` 19.0.1, `react-dom` 19.0.1)
- **Build Tool:** Vite 8 (`vite` 8.3.0) with `@vitejs/plugin-react`
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite` 4.3.3, `@import "tailwindcss";`)
- **Icons:** Lucide React (`lucide-react` 0.546.0)
- **Language:** TypeScript 7 (`typescript` 7.0.2)

### Backend & Middleware
- **Runtime:** Node.js (v22 ESM) via `tsx` 4.21.0
- **Server Framework:** Express 4.21.2
- **AI SDK:** Google Gen AI SDK (`@google/genai` 2.4.0)
- **Environment:** Dotenv 17.2.3
- **Architecture:** Monolithic single-port full-stack architecture (Express mounts Vite dev middleware in development; serves pre-compiled static SPA in production).

---

## 4. System Architecture & Request Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Browser Client (React 19)                       │
│  - Storage Engine (localStorage + Redundant Auto-Backup Snapshot)     │
│  - In-Flight Request Deduplication Map (Prevents Duplicate Calls)      │
│  - Interactive Mock Interview & Roadmap Flow                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP JSON (/api/*)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Express Server (server.ts :3000)                    │
│  - Security Headers (nosniff, SAMEORIGIN, strict-origin)               │
│  - Body Parser Limit (1MB payload constraint)                          │
│  - In-Memory Rate Limiter (30 requests/min per IP)                     │
│  - Candidate Profile & Input Sanitization Validations                  │
│  - SHA-256 Response Cache Layer (TTL: 30 mins)                         │
│  - Multi-Model Fallback Router & Circuit Breaker                       │
│  - Vite Dev Middleware (Development) / Static dist/ (Production)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Server-Side Only SDK Call
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Google Gemini AI Platform                        │
│  - Primary: gemini-3.1-flash-lite                                      │
│  - Fallbacks: gemini-flash-lite-latest, gemini-flash-latest            │
│  - Adaptive Thinking Configuration (thinkingBudget: 0)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Security & Rate-Limiting Design

1. **Server-Side Exclusivity:** All calls to Google Gemini are executed inside `server.ts`. Zero Gemini API keys, SDK instances, or credentials exist in client bundles or source code.
2. **Payload & Size Constraints:** Express JSON body parser is restricted to `1mb`. User answers are constrained to a maximum of 25,000 characters; question session size is limited to 20 items.
3. **In-Memory Rate Limiter:** Protects against automated spam and quota exhaustion by enforcing a sliding-window ceiling of 30 requests per minute per IP address on `/api/gemini/*`.
4. **Safe Diagnostic Logging:** Server console logs record only model identifiers, latency durations, and token counts. User answer contents, prompts, and credentials are never written to logs.
5. **Circuit Breaker & Fallback Chain:** Automatically detects HTTP 429 (`RESOURCE_EXHAUSTED`) or capacity errors, applies model cooldowns, and routes to healthy fallback models without user disruption.

---

## 6. Storage & Data Persistence

- **Primary Storage:** Client-side `localStorage` under key `preppilot_v1_datastore`.
- **Redundant Snapshot:** Automated secondary backup snapshot maintained under `preppilot_v1_backup` upon state changes.
- **Export / Import:** Candidates can export their complete profile, roadmap, and interview session history as a `.json` backup file via the UI storage banner and restore it on demand.
- **Defensive Schema Migration:** `loadDataStore()` validates schema version and normalizes all nested dictionary structures (`analyses`, `roadmaps7`, `roadmaps30`, `interviews`, `activities`, `recommendations`), preventing runtime null-reference exceptions.
- **Important Persistence Notice:** There is **no cloud database** (no Cloud SQL, PostgreSQL, Firebase, or MongoDB). Candidate data is isolated to the local browser and does not synchronize across separate devices. Clearing browser storage will reset local data unless restored from an exported JSON file.

---

## 7. Local Setup & Running Instructions

### Prerequisites
- Node.js 20+ (Node.js 22 recommended)
- `npm` (v10+)

### Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (copy example)
cp .env.example .env

# 3. Add your GEMINI_API_KEY to .env:
# GEMINI_API_KEY="your_api_key_here"

# 4. Start local development server (runs full-stack on port 3000)
npm run dev

# 5. Open browser at:
# http://localhost:3000
```

### Production Build & Launch

```bash
# Compile client assets into dist/
npm run build

# Start production server
npm start
```

### Verification & Testing Commands

```bash
# Run all automated unit tests (21 tests across 3 suites)
npm test

# Run TypeScript type-checking
npm run lint
```

---

## 8. Automated Test Coverage Report

All automated tests run via Node's native test runner (`node:test` + `node:assert/strict` via `tsx`):

| Test Suite | Total Tests | Status | Key Verifications Covered |
|---|:---:|:---:|---|
| `test/skill-gap.test.ts` | 9 | **PASS** | Markdown code-fence stripping, role propagation, priority level normalization, safe fallback generation, non-objective disclaimer enforcement, score clamping (0–100), 429 error formatting, 504 timeout formatting, multi-role storage isolation. |
| `test/mock-interview.test.ts` | 6 | **PASS** | Answer validation (empty/whitespace rejection), 4-part rubric clamping (0–25 per dimension), heuristic execution notice for coding questions, deterministic arithmetic average score calculation, non-objective disclaimer, session history & multi-session recovery. |
| `test/production-readiness.test.ts` | 6 | **PASS** | Profile input constraint clamping, answer length limits (>25k chars), interview session question array limits (max 20), sliding window rate limiter simulation, defensive schema migration for partial/corrupted storage, deterministic roadmap progress calculations. |
| `test/analytics.test.ts` | 9 | **PASS** | Multi-dimensional date filtering (7d, 30d, 90d, all, custom), deterministic task metrics, preparation area filtering, study consistency and streak calculation, mock interview average score arithmetic, chart data sufficiency thresholds, skill-gap assessment progression deltas, weekly executive summary aggregation, safe empty state fallbacks. |
| `test/single-profile.test.ts` | 8 | **PASS** | Single profile resolution and primary profile retrieval, duplicate prevention (updating existing profile in place without creating extra entries), in-place profile updates preserving linked roadmaps and mock interviews, strict data isolation by unique student ID, safe legacy profile backup export with non-destructive archival, first-use onboarding creation and refresh persistence, safe primary profile selection from multiple legacy profiles, and malformed storage recovery from backup snapshots. |
| **Total** | **38** | **PASS** | **100% Passing (38/38)** |

---

## 8.1 Authentication, Multi-Tenant Architecture & Admin Access Strategy

### Current Reality & Data Boundary
- **Client Sandbox Persistence:** PrepPilot AI currently stores candidate data strictly in browser-local `localStorage` (`preppilot_v1_datastore`).
- **No Spoofed Identity Proof:** In accordance with production security principles, **a profile name, email field, localStorage record, or client-side role flag is never treated as proof of identity.**
- **Single Student Scope:** Each browser installation operates as an isolated sandbox for that student's placement preparation. There is currently no shared cross-device database or multi-tenant synchronization.

### Recommended Future Authentication Architecture
When transitioning from client-local storage to a multi-student cloud database:
1. **Simplest Suitable Option:** **Firebase Authentication** (Google Sign-In / Email Link) paired with **Firebase Firestore**, or an **Express session / JWT cookie** paired with **PostgreSQL (Cloud SQL)**.
2. **Access Control & Authorization Rules:**
   - Each student's roadmaps, interview transcripts, and activity logs must be keyed by their verified server user ID (`uid` or `student_id`).
   - Firestore security rules (`allow read, write: if request.auth != null && request.auth.uid == resource.data.studentId;`) or Express API middleware must verify authorization on every request.
   - Students must only be able to read and modify their own records.
3. **Administrator Dashboard Requirements:**
   - **Deferred by Design:** To prevent misleading or insecure implementations, an administrator dashboard that views student records **must not be implemented on client-only storage.**
   - Once server-verified authentication is provisioned, administrator access must be enforced via cryptographically signed server claims or verified database roles (`admin: true`), strictly limiting access to authorized management tasks without exposing credentials, passwords, or Gemini API keys.

---

## 9. Environment Variables Specification

Secrets must never be committed to source control or logged to standard output:

| Variable Name | Required | Default | Purpose |
|---|:---:|:---:|---|
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key used by `@google/genai` on the backend. |
| `APP_URL` | No | `http://localhost:3000` | Application host URL injected by cloud environments (e.g. Cloud Run). |
| `PORT` | No | `3000` | Server listen port (must bind to 3000 in AI Studio / Cloud Run). |
| `NODE_ENV` | No | `development` | Runtime mode (`development` vs `production`). |
| `DISABLE_HMR` | No | `false` | Set to `true` to disable file watching in containerized environments. |

---

## 10. Deployment & Hosting Guide

### Current AI Studio Hosting Configuration
- The application runs inside a Linux container on **Google Cloud Run**.
- Cloud Run routes requests through an internal Nginx proxy listening on port 8080 to the Node.js Express server listening on `PORT = 3000` on `0.0.0.0`.
- Client and API proxy routes share the same origin, avoiding cross-origin issues.

### Deployment on Other Cloud Providers
> **Static Hosting Incompatibility Notice:** Because PrepPilot AI utilizes an Express backend (`server.ts`) for server-side Gemini AI orchestration, rate limiting, and request validation, it **cannot** be hosted on purely static web hosts (such as GitHub Pages or AWS S3) without deploying the backend separately.
>
> Supported deployment targets include:
> - **Google Cloud Run (Recommended):** Deploy containerized Dockerfile exposing port 3000.
> - **Render / Railway / Fly.io:** Node.js Web Service running `npm run build` and `npm start`.
> - **AWS ECS / App Runner:** Container deployment with `GEMINI_API_KEY` passed as an environment secret.

---

## 11. Production Readiness Checklist

| Evaluation Area | Verification Item | Local / Automated Status | Production / Cloud Status |
|---|---|:---:|:---:|
| **Security** | Server-side Gemini API key exclusivity | Verified (0 client refs) | Confirmed via server proxy |
| **Security** | Request payload size limit (1MB) | Verified in `server.ts` | Confirmed |
| **Security** | Input validation & answer length boundaries | Verified (21 unit tests) | Confirmed |
| **Security** | Rate limiting (30 req/min per IP) | Verified in unit test | Confirmed |
| **Security** | Sensitive data exclusion from logs | Verified in diagnostics | Confirmed |
| **Reliability** | Multi-profile management & switching | Verified | Confirmed |
| **Reliability** | 7-day & 30-day roadmap task persistence | Verified | Confirmed |
| **Reliability** | Dynamic mock interview rubric evaluation | Verified | Confirmed |
| **Reliability** | Deterministic score calculations | Verified | Confirmed |
| **Reliability** | Storage corruption & defensive normalization | Verified | Confirmed |
| **Reliability** | HTTP 429 quota handling & countdown UI | Verified | Confirmed |
| **Build & Types** | TypeScript compilation (`tsc --noEmit`) | **0 Errors** | Ready |
| **Build & Types** | Vite production bundle (`vite build`) | **Success** | Ready |
| **Documentation** | Setup, env vars, data flow, architecture | Complete | Complete |
| **Infrastructure** | Multi-device cloud database sync | Not Implemented | LocalStorage Only |

---

## 12. Known Limitations & Roadmap

1. **Browser-Local Storage:** Data is stored in browser `localStorage`. Profiles and progress do not automatically sync across different devices or incognito sessions. Exporting JSON backups is recommended for migration.
2. **Free-Tier Gemini API Quotas:** High-frequency API calls may encounter temporary Google rate limits (15 RPM on flash-lite models). The UI provides an automatic 60-second countdown retry banner.
3. **Audio Transcription:** Mock interviews accept typed text or pasted code; speech-to-text verbal voice answering is not yet integrated.
4. **Heuristic Code Evaluation:** Coding exercises and interview answers are analyzed heuristically by AI without isolated WebAssembly or containerized code execution.