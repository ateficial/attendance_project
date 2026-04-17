# Frontend System Handoff For External AI Analysis

## 1) Purpose
This document is a complete technical handoff of the frontend system in this repository.
Use it as context for another AI model to:
1. Analyze architecture, code quality, UX, and maintainability.
2. Identify risks and improvement opportunities.
3. Return a high quality implementation prompt that can be used by a coding agent.

Repository root of interest:
- frontend/

Primary code locations:
- frontend/src/
- frontend/src/pages/
- frontend/src/lib/
- frontend/src/hooks/

---

## 2) Stack And Tooling
- Framework: React 19
- Build tool: Vite 6
- Router: react-router-dom 7
- Styling: Tailwind CSS v4 + custom token CSS
- Charts: chart.js + react-chartjs-2
- Notifications: react-hot-toast
- Backend client: PocketBase JS SDK + custom REST API client
- Export tooling: xlsx, jspdf, jspdf-autotable
- Drag and drop deps present: @dnd-kit/*

Build/dev scripts (from frontend/package.json):
- npm run dev
- npm run build
- npm run preview

Vite config:
- Dev server port: 3000
- /api proxy -> http://127.0.0.1:8090

Environment base URL behavior:
- API base URL from VITE_API_BASE_URL
- Fallback base URL: http://127.0.0.1:8090

---

## 3) High-Level Architecture
The frontend uses a role-based portal model:
- Login page selects role (professor, student, admin; TA supported through routing/auth role)
- AuthProvider restores session and guards role access
- Routes are split by role layout shells
- Feature pages mostly use apiClient abstraction, but some admin pages directly use PocketBase client

Core shell files:
- frontend/src/main.jsx
- frontend/src/App.jsx
- frontend/src/hooks/useAuth.jsx

No Redux/Zustand or global state library is used.
State management style:
- React local state in pages/layouts
- Context only for auth/session/lang

---

## 4) Route Map
Defined in frontend/src/App.jsx.

Public:
- /login

Professor:
- /professor (overview)
- /professor/courses
- /professor/attendance
- /professor/analytics
- /professor/schedule
- /professor/settings

Student:
- /student (overview)
- /student/courses
- /student/history
- /student/warnings
- /student/profile

Admin:
- /admin (overview)
- /admin/rooms
- /admin/users
- /admin/schedule
- /admin/settings
- /admin/reports

Teaching Assistant:
- /ta (overview)
- /ta/subjects
- /ta/attendance
- /ta/reports
- /ta/profile

Route guard:
- ProtectedRoute checks user and userType from AuthContext.
- Redirects users to their own role route if mismatched.

---

## 5) Auth, Session, And Identity
Files:
- frontend/src/hooks/useAuth.jsx
- frontend/src/lib/authStore.js
- frontend/src/lib/pb.js
- frontend/src/lib/apiClient.js

Session storage:
- localStorage key: smart_attendance_auth_v1

Auth flows:
- Admin:
  - Uses PocketBase superuser auth directly: pb.collection('_superusers').authWithPassword
  - Stores pb_token + pb_record in session
- Professor/Student/TA:
  - Uses custom endpoint: POST /api/custom/auth/login
  - Stores access_token + refresh_token and expiry metadata

Session restore:
- Restores from authStore on app start
- For admin, saves token to pb.authStore
- For non-admin roles, calls GET /api/custom/auth/me

Refresh behavior:
- If protected request returns 401 and refresh token exists:
  - Calls POST /api/custom/auth/refresh
  - Updates tokens and retries once

Logout:
- Clears pb.authStore and local storage session

Language handling:
- lang persisted in localStorage
- sets document dir and lang attributes

---

## 6) API Layer Design
Main file:
- frontend/src/lib/apiClient.js

### Request abstraction
- buildUrl(path, params)
- request(path, options)
- Adds Authorization header from session (access_token or pb_token)
- Parses JSON/non-JSON responses
- Throws custom ApiError on failure

### Endpoint inventory used by frontend
Auth:
- POST /api/custom/auth/login
- POST /api/custom/auth/refresh
- GET /api/custom/auth/me

Professor:
- GET /api/custom/professor/courses
- GET /api/custom/professor/sessions
- GET /api/custom/professor/recent-attendance
- GET /api/custom/professor/schedule
- GET /api/custom/professor/dashboard-stats

Student:
- GET /api/custom/student/courses
- GET /api/custom/student/history
- GET /api/custom/student-warnings
- GET /api/custom/student/dashboard-stats

TA:
- GET /api/custom/ta/subjects
- GET /api/custom/ta/sessions
- GET /api/custom/ta/recent-attendance
- GET /api/custom/ta/dashboard-stats

Attendance and reporting:
- GET /api/custom/attendance-report
- POST /api/custom/attendance/bulk-mark
- POST /api/custom/record-attendance
- GET /api/custom/attendance/export
- GET /api/custom/attendance/subject-export

Session passcode:
- POST /api/custom/session/change-passcode
- POST /api/custom/session/passcode-start

Admin schedule and users:
- GET /api/custom/admin/schedule
- POST /api/custom/admin/schedule/save
- POST /api/custom/admin/schedule/publish
- GET /api/custom/admin/students
- PATCH /api/custom/admin/student/{id}
- GET /api/custom/admin/teaching-assistants
- POST /api/custom/admin/teaching-assistants
- PATCH /api/custom/admin/teaching-assistants/{id}
- DELETE /api/custom/admin/teaching-assistants/{id}

### Export helpers (frontend side)
- exportToExcel(data, columns, filename)
- exportToPDF(data, ...args)

---

## 7) PocketBase Direct Usage (Bypassing apiClient)
Several admin pages use pb.collection(... ) directly.
This creates a hybrid data access style.

Direct PB usage examples:
- admin/Overview.jsx
  - collection counts and sessions list
- admin/Rooms.jsx
  - CRUD for rooms directly
- admin/Users.jsx
  - reads subjects/groups/professors directly; mixed with admin custom endpoints
- admin/Schedule.jsx
  - reads metadata lists (subjects/rooms/groups/professors/TAs)
- admin/Reports.jsx
  - loads multiple full lists directly

Implication:
- Some pages depend on PB schema details and client permissions directly.
- Other pages depend on backend custom route contracts.

---

## 8) Realtime/Polling Strategy
File:
- frontend/src/hooks/useRealtimePulse.jsx

Behavior:
- Builds websocket URL from API base URL (/api/realtime)
- Tries live WS mode first
- On failure, falls back to interval polling
- Attempts reconnect every 5 seconds
- Exposes state:
  - isLive
  - isPolling
  - lastPulse
  - pulseCount
  - connectionStatus

Used in dashboard-like pages for near-realtime refresh.

---

## 9) Role Feature Summary

### Login
File: frontend/src/pages/Login.jsx
- Role card selection UI
- Email/password validation
- Calls login from AuthContext
- Stores remember flag (smart_attendance_remember)
- Redirect by resolved role route

### Professor
Files:
- ProfessorLayout.jsx
- Overview.jsx
- Courses.jsx
- Attendance.jsx
- Analytics.jsx
- Schedule.jsx
- Settings.jsx

Key features:
- Header quick data preload (dashboard stats + courses + recent attendance)
- Overview with charts and at-risk list
- Course list and drill-down to attendance
- Attendance sheet: session selection, row actions, bulk mark, exports
- Analytics: subject/date range reports, charting, per-student warning level derivation, exports
- View schedule matrix
- Passcode change + local notification prefs

### Student
Files:
- StudentLayout.jsx
- Overview.jsx
- Courses.jsx
- History.jsx
- Warnings.jsx
- Profile.jsx

Key features:
- Dashboard stats + warning snapshot + history
- Calendar-like attendance status map
- History filters (course/status/date/search) and exports
- Warning-level summaries from warning + dashboard sources
- Profile card with academic info and enrolled subjects

### Admin
Files:
- AdminLayout.jsx
- Overview.jsx
- Rooms.jsx
- Users.jsx
- Schedule.jsx
- Reports.jsx
- Settings.jsx

Key features:
- System overview counts and recent sessions
- Room CRUD
- User management tabs:
  - Students: filter + edit modal + update endpoint
  - Professors: edit via direct PB update
  - TAs: create/edit/delete via custom admin endpoints
- Schedule builder:
  - term filtering
  - metadata-driven modal editing
  - conflict detection
  - CSV template download/import + validation
  - save draft + publish flow
- Reports:
  - Session reports with filters and exports
  - Warning reports generated from subject exports and thresholds
- Settings currently mostly local UI state (threshold form and API URL display)

### TA
Files:
- TALayout.jsx
- TAOverview.jsx
- TASubjects.jsx
- TAAttendance.jsx
- TAReports.jsx
- TAProfile.jsx

Key features:
- Similar interaction model to professor, scoped to TA assignments
- Subjects list and attendance sheet operations
- Reports with date/subject filters + exports
- Profile shows assigned subjects/groups and identity metadata

---

## 10) UI System And Styling
Files:
- frontend/src/index.css
- frontend/src/styles/tokens.css
- frontend/src/components/ui/Skeleton.jsx
- frontend/src/components/ui/ErrorBanner.jsx

Observations:
- Tailwind CSS v4 plus large custom CSS token/theme definitions
- Mix of multiple visual languages:
  - M3-like tokens in index.css
  - separate token set in tokens.css
  - role-specific unique themes in layouts
- Shared lightweight UI primitives:
  - Skeleton
  - ErrorBanner

Potential design-system concern:
- Multiple token systems and role-specific styling may cause inconsistency and maintenance overhead.

---

## 11) Data Contracts Implicit In Frontend
The frontend expects backend payload shapes similar to:
- { status, data: ... }
- records arrays for attendance/report endpoints
- subject/session objects with id/code/name and counts
- dashboard objects containing distribution/trend/breakdown keys

Contract fragility:
- Many pages transform backend payloads directly with minimal runtime validation.
- API shape drift can break pages quickly.

---

## 12) Known Strengths
- Clear role-based separation and route structure
- Strong feature coverage across professor/student/admin/TA
- Robust API wrapper with refresh token retry logic
- Export capabilities (Excel/PDF) integrated into workflows
- Realtime fallback strategy (WS -> polling)

---

## 13) Known Risks / Improvement Opportunities
1. Hybrid data-access approach (direct PB + custom API) increases coupling and inconsistency.
2. Inconsistent naming conventions across entities (code vs subject_code, name vs name_en).
3. Limited centralized schema validation at API boundary.
4. Many page components are large and handle too many responsibilities.
5. Partial i18n usage: many page strings are hardcoded English.
6. Some admin settings are local-only UI and not persisted server-side.
7. Styling system has overlapping token layers and role-specific one-off design patterns.
8. Error handling UX is inconsistent (toast, banner, silent fallback, console only).

---

## 14) Suggested Output Expected From External AI
Please return:
1. A concise architecture assessment (what is good, what is risky).
2. A prioritized roadmap (high impact first, short-term + medium-term).
3. A single master implementation prompt that can be given to a coding agent.

The master prompt should request:
- Refactor plan with minimal regression risk
- Standardized API contract handling
- Unified frontend data layer strategy
- Reusable component extraction strategy
- i18n completion plan
- Design-system normalization plan
- Test strategy (unit + integration + smoke)
- Measurable acceptance criteria

---

## 15) Copy/Paste Prompt Request For External AI
Use the following with another AI model:

"You are a senior frontend architect and refactoring strategist. Analyze the provided Smart Attendance frontend system context. Produce:
1) An architecture diagnosis with key strengths and top risks.
2) A prioritized modernization/refactor roadmap with phases.
3) A single actionable prompt I can give to a coding agent to implement the roadmap safely in iterations.

Constraints:
- Preserve existing role-based behavior (professor, student, TA, admin).
- Do not break current API contracts unless you include compatibility adapters.
- Prefer incremental refactor over big-bang rewrite.
- Include concrete file-level guidance.
- Include testing and validation checkpoints per phase.
- Include rollback strategy for risky steps.

Output format:
- Section A: Findings (severity-ranked)
- Section B: Roadmap (phase-by-phase)
- Section C: Final coding-agent prompt"

---

## 16) Quick File Index
Top-level frontend files:
- frontend/package.json
- frontend/vite.config.js
- frontend/index.html

Core app files:
- frontend/src/main.jsx
- frontend/src/App.jsx
- frontend/src/hooks/useAuth.jsx
- frontend/src/hooks/useRealtimePulse.jsx
- frontend/src/lib/apiClient.js
- frontend/src/lib/authStore.js
- frontend/src/lib/pb.js
- frontend/src/lib/i18n.js

Role pages:
- frontend/src/pages/admin/*
- frontend/src/pages/professor/*
- frontend/src/pages/student/*
- frontend/src/pages/ta/*

UI shared:
- frontend/src/components/ui/Skeleton.jsx
- frontend/src/components/ui/ErrorBanner.jsx
