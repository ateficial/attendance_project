# Smart Attendance Project Knowledge Base (For New Chatbot)

This document is a complete onboarding context for a chatbot that has zero prior knowledge of this project.
It explains what exists, how it runs, how authentication works, what APIs are available, what each frontend page does, and where known issues are.

## 1) Project Mission

This project is a Smart Attendance Management System for a university-like environment.

Core goals:
- Manage attendance sessions for courses.
- Support hardware-assisted attendance (RFID + keypad workflows).
- Provide role-specific web portals:
  - Professor portal (courses, attendance sheets, analytics).
  - Student portal (history, warnings, profile).
  - Admin portal (overview, rooms, users, schedule builder, settings, reports).
- Keep data in PocketBase collections (SQLite under the hood).

Primary product/spec reference:
- attendance_sytem.md

## 2) Repository Layout

Root-level overview:

- attendance_sytem.md
- backend/
  - README.md
  - pocketbase/
    - pocketbase.exe (runtime binary, local)
    - pb_hooks/
    - pb_migrations/
    - pb_data/
    - pb_schema.json
    - pb_schema_v25.json
    - seed_data.json
    - seed.js
    - setup.ps1
    - utility scripts (convert/import/test/wipe)
- frontend/
  - package.json
  - vite.config.js
  - index.html
  - .env.example
  - credentials.md
  - src/
    - App.jsx
    - hooks/
    - lib/
    - pages/
  - stitch/ (static UI mock/prototype pages)

Important note about hooks folder:
- There are duplicate hook files in two styles:
  - legacy: *.js
  - runtime-compatible: *.pb.js
- Current active behavior should be treated as defined in *.pb.js files.

## 3) Technology Stack

Backend:
- PocketBase (local binary runtime)
- SQLite (inside pb_data)
- JavaScript hooks for custom API routes and business logic
- Migration files in pb_migrations

Frontend:
- React 19
- Vite
- Tailwind CSS (via @tailwindcss/vite)
- React Router
- PocketBase JS SDK
- Custom fetch-based API client for custom endpoints
- Chart.js + react-chartjs-2
- @dnd-kit for schedule builder drag-and-drop

## 4) Environment and Ports

Default URLs in code:
- Backend API base default: http://127.0.0.1:8090
- PocketBase admin panel: http://127.0.0.1:8090/_/
- Frontend API env override: frontend/.env.example -> VITE_API_BASE_URL=http://127.0.0.1:8090

Frontend dev port behavior:
- vite.config.js sets server.port = 3000.
- credentials.md currently mentions localhost:5173.
- Therefore, docs and runtime config are not fully synchronized here.

## 5) How Authentication Works

There are two auth paths:

### 5.1 Admin auth (PocketBase native)
- Frontend logs in admin via PocketBase _superusers authWithPassword.
- Admin session stores pb token + record.
- Admin pages use PocketBase SDK directly for CRUD/list operations.

### 5.2 Professor/Student auth (custom JWT)
- Custom route: POST /api/custom/auth/login
- Uses role + email + password.
- Issues access_token + refresh_token (JWT) with role claims.
- Refresh route: POST /api/custom/auth/refresh
- Current user route: GET /api/custom/auth/me

Custom auth details:
- JWT secret: smart-attendance-jwt-v1
- Access token TTL: 30 min
- Refresh token TTL: 30 days

Password verification behavior:
- Standard path verifies password_hash field.
- Compatibility fallback exists for students:
  - If student password_hash is missing, password Student@123 is accepted.
- This fallback was added because some live schema states may not contain student password_hash.

Frontend auth state:
- Stored in localStorage key smart_attendance_auth_v1.
- API client auto-refreshes tokens on 401 once, then retries original request.

## 6) Backend API Surface (Current)

Source of truth for endpoints:
- backend/pocketbase/pb_hooks/auth.pb.js
- backend/pocketbase/pb_hooks/portal.pb.js
- backend/pocketbase/pb_hooks/reports.pb.js
- backend/pocketbase/pb_hooks/sessions.pb.js
- backend/pocketbase/pb_hooks/attendance.pb.js

### 6.1 Auth routes
- POST /api/custom/auth/login
- POST /api/custom/auth/refresh
- GET /api/custom/auth/me

### 6.2 Portal routes
Professor-facing:
- GET /api/custom/professor/courses
- GET /api/custom/professor/sessions
- GET /api/custom/professor/recent-attendance

Student-facing:
- GET /api/custom/student/history
- GET /api/custom/student/courses

Admin-facing:
- GET /api/custom/admin/overview

### 6.3 Reports routes
- GET /api/custom/attendance-report
  - mode A: session report via session_id
  - mode B: subject report via subject_id (+ optional date_from/date_to)
- GET /api/custom/student-warnings

### 6.4 Session lifecycle routes
- POST /api/custom/start-session
- POST /api/custom/end-session
- GET /api/custom/session-stats

### 6.5 Attendance routes
- POST /api/custom/record-attendance
- POST /api/custom/attendance/bulk-mark

## 7) Endpoint Health / Runtime Notes

Confirmed working recently on port 8090:
- /api/custom/auth/login (professor + student)
- /api/custom/professor/courses
- /api/custom/professor/sessions
- /api/custom/professor/recent-attendance
- /api/custom/attendance-report
- /api/custom/student/courses
- /api/custom/student/history
- /api/custom/student-warnings

Known failing route:
- GET /api/custom/session-stats currently returns 400 in current runtime.
- Reason: sessions.pb.js still uses c.queryParam in this route, but this PocketBase JS runtime does not support c.queryParam.

Legacy route note:
- /api/custom/health currently returns 404 in this runtime.
- config.js contains this route, but there is no config.pb.js active, and legacy hook API usage in config.js is not aligned with current active runtime path.

## 8) Data Model Summary

Main collections:
- subjects
- rooms
- professors
- groups
- students
- schedules
- sessions
- attendance_records

Schema references:
- backend/pocketbase/pb_schema.json
- backend/pocketbase/pb_migrations/*.js

Seed dataset volumes (from seed_data.json):
- subjects: 5
- rooms: 5
- professors: 3
- groups: 5
- students: 8
- schedules: 6
- sessions: 6
- attendance_records: 19

## 9) Seeding and Data Initialization

Seed scripts/files:
- backend/pocketbase/seed_data.json
- backend/pocketbase/seed.js

Seed behavior:
- Authenticates as admin.
- Wipes collections in dependency-safe order.
- Creates base records in insertion order.
- Patches relation fields in a second pass.
- For professors/students, computes password hash when needed as:
  - sha256(lowercase(email) + "::" + plainPassword)

Configurable seed target:
- seed.js uses PB_URL from environment if set, otherwise defaults to 8090.

Example run:
- cd backend/pocketbase
- node seed.js

Targeting another instance:
- PowerShell: $env:PB_URL = "http://127.0.0.1:8091"; node .\seed.js

## 10) Frontend Architecture

Root router:
- frontend/src/App.jsx

Route map:
- /login
- /professor
  - /professor/courses
  - /professor/attendance
  - /professor/analytics
- /student
  - /student/history
  - /student/warnings
  - /student/profile
- /admin
  - /admin/rooms
  - /admin/users
  - /admin/schedule
  - /admin/settings
  - /admin/reports

Access control:
- ProtectedRoute enforces role gating based on useAuth context.

Core libraries:
- frontend/src/lib/apiClient.js
- frontend/src/lib/authStore.js
- frontend/src/lib/pb.js
- frontend/src/hooks/useAuth.jsx
- frontend/src/hooks/useRealtimePulse.jsx

### 10.1 API client behavior
- Uses VITE_API_BASE_URL or default 8090.
- Adds bearer token for authenticated requests.
- Parses error payloads into ApiError.
- On 401, attempts refresh token flow once then retries.
- Exposes role-specific helper functions (professor/student/report/bulk mark/etc).

### 10.2 Realtime behavior
- useRealtimePulse opens websocket to /api/realtime and triggers callback on messages.
- Also has periodic fallback polling interval.
- Returns isLive flag for UI indicators.

## 11) Frontend Page Behavior by Role

### 11.1 Login page
- File: frontend/src/pages/Login.jsx
- Supports role toggle (professor/student/admin).
- For admin: PocketBase superuser login.
- For professor/student: custom auth endpoint login.
- Includes language toggle and password visibility toggle.

### 11.2 Professor pages
- Overview:
  - fetches professor courses
  - fetches attendance report for selected subject
  - fetches recent attendance records
  - live pulse refresh
- Courses:
  - lists assigned courses using custom API
- Attendance:
  - loads sessions by selected course
  - loads session report table
  - supports bulk mark present/absent via custom API
  - live pulse refresh
- Analytics:
  - subject-level attendance trends and charts

### 11.3 Student pages
- Overview:
  - warning snapshot + recent history
  - live pulse refresh
- History:
  - timeline/list of attendance records
- Warnings:
  - warning cards by threshold level
- Profile:
  - identity and status card UI

### 11.4 Admin pages
- Overview:
  - counts rooms/students/professors/active sessions via PocketBase SDK directly
- Rooms:
  - create/delete rooms
- Users:
  - list professors and students
- Schedule:
  - drag-and-drop subject placement on timetable
  - local draft save
  - publish creates schedules records with derived end_time and academic period
- Settings:
  - local policy threshold controls and API URL display
- Reports:
  - session list and attendance ratio summary

Important admin note:
- Admin pages mostly use PocketBase collection CRUD directly, not the custom API routes.

## 12) Internationalization

Source file:
- frontend/src/lib/i18n.js

Languages:
- English (en)
- Arabic (ar)

Auth provider sets:
- document direction (ltr/rtl)
- document language
- persisted language in localStorage

## 13) Credentials and Local Test Accounts

Source:
- frontend/credentials.md

Admin:
- admin@attendance.edu / adminpassword123

Professors:
- ahmed.hassan@university.edu / Professor@123 / PIN 1234
- fatima.alsayed@university.edu / Professor@123 / PIN 5678
- omar.ibrahim@university.edu / Professor@123 / PIN 9012

Students:
- mohamed.ali@students.edu / Student@123
- sara.hassan@students.edu / Student@123
- youssef.ibrahim@students.edu / Student@123

## 14) How To Run (Recommended Local Flow)

### Backend
1. Open terminal at backend/pocketbase
2. Ensure pocketbase.exe exists (or run setup.ps1)
3. Start server:
   - .\pocketbase.exe serve --dev --hooksDir=".\pb_hooks" --migrationsDir=".\pb_migrations" --dir=".\pb_data"
4. Verify:
   - API: http://127.0.0.1:8090/api/
   - Admin UI: http://127.0.0.1:8090/_/

### Seed data (optional but recommended for demos)
1. cd backend/pocketbase
2. node seed.js

### Frontend
1. cd frontend
2. npm install
3. npm run dev

Note:
- Vite config uses port 3000.
- If another port appears, check Vite output and .env settings.

## 15) Verified Smoke Test Pattern

Professor flow baseline:
1. login professor
2. get professor courses
3. get professor sessions for a subject
4. get recent attendance
5. get subject attendance report

Student flow baseline:
1. login student
2. get student courses
3. get student history
4. get student warnings

All above flow endpoints are currently responding on 8090.

## 16) Known Caveats and Risks

1. Duplicate hook sets exist.
- pb_hooks contains both legacy .js and newer .pb.js.
- Active maintenance should target .pb.js for runtime compatibility.

2. Session stats endpoint bug.
- /api/custom/session-stats still uses unsupported c.queryParam in current runtime.
- Current behavior: 400 response.

3. Legacy config route mismatch.
- /api/custom/health currently 404 in this runtime.
- config.js uses older DAO/API style and is not aligned to current active runtime hook execution path.

4. Student schema variance risk.
- Some live DB states may not include students.password_hash.
- auth.pb.js includes compatibility fallback for Student@123 in that scenario.

5. Documentation port mismatch.
- credentials.md says frontend on 5173.
- vite.config.js is configured for 3000.

6. Some UI actions are visual-only placeholders.
- Example: several export buttons are present but not fully wired to backend export implementation.

## 17) File-Level Source of Truth Index

Backend runtime logic:
- backend/pocketbase/pb_hooks/auth.pb.js
- backend/pocketbase/pb_hooks/portal.pb.js
- backend/pocketbase/pb_hooks/reports.pb.js
- backend/pocketbase/pb_hooks/sessions.pb.js
- backend/pocketbase/pb_hooks/attendance.pb.js

Backend data and schema:
- backend/pocketbase/seed_data.json
- backend/pocketbase/seed.js
- backend/pocketbase/pb_schema.json
- backend/pocketbase/pb_migrations/

Frontend routing and auth:
- frontend/src/App.jsx
- frontend/src/hooks/useAuth.jsx
- frontend/src/lib/apiClient.js
- frontend/src/lib/authStore.js
- frontend/src/lib/pb.js
- frontend/src/hooks/useRealtimePulse.jsx

Frontend pages:
- frontend/src/pages/Login.jsx
- frontend/src/pages/professor/*
- frontend/src/pages/student/*
- frontend/src/pages/admin/*

Env and runtime config:
- frontend/.env.example
- frontend/vite.config.js
- frontend/credentials.md

## 18) Quick Mental Model For Another Chatbot

If you are a new chatbot entering this repo:
- Treat this as PocketBase + React attendance SaaS with role-based portals.
- Use .pb.js hooks as backend behavior source.
- Use App.jsx + apiClient.js + useAuth.jsx as frontend behavior source.
- Use credentials.md + seed_data.json for local login assumptions.
- Assume port 8090 is canonical backend unless explicitly overridden.
- Check known caveats before debugging auth/session issues.

## 19) Suggested First Checks For Any Future Debug Session

1. Is PocketBase running on 8090 with the latest hooksDir?
2. Are you editing .pb.js files (not legacy .js) for custom APIs?
3. Does student schema include password_hash, or are you relying on fallback?
4. Does frontend API base URL point to the same active backend port?
5. Do failing endpoints rely on c.queryParam in current runtime?

---

End of chatbot onboarding knowledge base.
