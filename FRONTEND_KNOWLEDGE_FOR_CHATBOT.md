# Frontend Knowledge Base (Chatbot Onboarding)

This document is a frontend-only technical briefing for a new chatbot that does not know the project.
It explains how the React app is organized, how authentication and API calls work, what each page does, and how to run/debug frontend behavior.

## 1) Scope

In scope:
- frontend app architecture
- routing
- auth/session handling
- API client behavior
- role dashboards and page features
- runtime and build configuration
- frontend caveats and troubleshooting

Out of scope:
- backend implementation internals
- database/migration internals (except what frontend depends on)

## 2) Frontend Stack

Core technologies:
- React 19
- Vite 6
- React Router 7
- Tailwind CSS 4 (via @tailwindcss/vite)
- PocketBase JS SDK
- Chart.js + react-chartjs-2
- @dnd-kit (drag-and-drop schedule builder)

Main dependency file:
- frontend/package.json

## 3) Frontend Folder Structure

Top-level frontend folder:
- frontend/
  - package.json
  - vite.config.js
  - index.html
  - .env.example
  - credentials.md
  - src/
    - App.jsx
    - main.jsx
    - index.css
    - hooks/
      - useAuth.jsx
      - useRealtimePulse.jsx
    - lib/
      - apiClient.js
      - authStore.js
      - i18n.js
      - pb.js
    - pages/
      - Login.jsx
      - professor/
        - ProfessorLayout.jsx
        - Overview.jsx
        - Courses.jsx
        - Attendance.jsx
        - Analytics.jsx
      - student/
        - StudentLayout.jsx
        - Overview.jsx
        - History.jsx
        - Warnings.jsx
        - Profile.jsx
      - admin/
        - AdminLayout.jsx
        - Overview.jsx
        - Rooms.jsx
        - Users.jsx
        - Schedule.jsx
        - Settings.jsx
        - Reports.jsx
    - components/
      - layout/ (currently empty)
      - ui/ (currently empty)

## 4) App Bootstrap and Runtime

Entry flow:
1. frontend/src/main.jsx mounts React app.
2. App root is frontend/src/App.jsx.
3. AuthProvider wraps BrowserRouter.
4. ProtectedRoute enforces role-based route access.

Font and global html setup:
- frontend/index.html loads Google fonts and Material Symbols.

## 5) Routing Model

Defined in frontend/src/App.jsx.

Public route:
- /login

Professor routes:
- /professor
- /professor/courses
- /professor/attendance
- /professor/analytics

Student routes:
- /student
- /student/history
- /student/warnings
- /student/profile

Admin routes:
- /admin
- /admin/rooms
- /admin/users
- /admin/schedule
- /admin/settings
- /admin/reports

Guard logic:
- If not authenticated, redirect to /login.
- If authenticated but role mismatch, redirect to role home.

## 6) Authentication and Session Flow

Main auth source:
- frontend/src/hooks/useAuth.jsx

### 6.1 Session storage
- localStorage key: smart_attendance_auth_v1
- storage helpers in frontend/src/lib/authStore.js

### 6.2 Legacy migration support
useAuth can import old keys:
- auth_user
- auth_type
- auth_token
Then rewrites to smart_attendance_auth_v1.

### 6.3 Login behavior by role
Admin:
- Uses PocketBase native superuser auth:
  - pb.collection('_superusers').authWithPassword(email, password)
- Session stores pb token/record.

Professor/Student:
- Uses custom API auth via apiClient.loginWithCustomAuth(role, email, password)
- Receives access and refresh tokens.
- Session persisted with user role and token timestamps.

### 6.4 Session restore on app load
- Reads session from localStorage.
- For admin: restores PocketBase auth store directly.
- For professor/student: calls fetchCurrentUser() against /api/custom/auth/me.
- If invalid, clears session.

### 6.5 Language state
- useAuth stores language in localStorage key lang.
- Updates document dir/lang for Arabic vs English.
- Translation source: frontend/src/lib/i18n.js.

## 7) API Client Contract (Frontend Perspective)

Primary file:
- frontend/src/lib/apiClient.js

### 7.1 Base URL
- VITE_API_BASE_URL env variable if present.
- Fallback: http://127.0.0.1:8090

### 7.2 Request behavior
- Uses fetch with JSON body/headers.
- Adds Authorization bearer token when required.
- Parses structured errors into ApiError.

### 7.3 Token refresh strategy
- On 401 for authenticated request:
  - calls /api/custom/auth/refresh once
  - updates session tokens
  - retries original request once
- If refresh fails, clears non-admin session.

### 7.4 Exposed frontend service functions
Auth:
- loginWithCustomAuth
- fetchCurrentUser

Professor:
- getProfessorCourses
- getProfessorSessions
- getProfessorRecentAttendance

Student:
- getStudentCourses
- getStudentHistory
- getStudentWarnings

Reports and attendance actions:
- getAttendanceReport
- bulkMarkAttendance

Admin overview helper:
- getAdminOverview

Utility:
- getApiBaseUrl

## 8) PocketBase SDK Usage in Frontend

Primary SDK init:
- frontend/src/lib/pb.js

Important note:
- Several admin pages use PocketBase SDK collection CRUD directly.
- This means admin functionality is tightly coupled to PocketBase auth session.

Pages using direct pb calls include:
- admin/Overview.jsx
- admin/Rooms.jsx
- admin/Users.jsx
- admin/Schedule.jsx
- admin/Reports.jsx

## 9) Realtime and Polling

Hook:
- frontend/src/hooks/useRealtimePulse.jsx

Behavior:
- Builds websocket URL from API base URL:
  - http -> ws
  - https -> wss
- Connects to /api/realtime.
- On ws message, triggers callback pulse.
- Also runs interval polling fallback.
- Exposes isLive state.

Used in key pages:
- professor/Overview.jsx
- professor/Attendance.jsx
- student/Overview.jsx
- admin/Overview.jsx

## 10) Role Page Behavior Summary

## 10.1 Login page
- file: frontend/src/pages/Login.jsx
- Role selection: professor/student/admin
- Language toggle
- Password show/hide toggle
- Navigates to role dashboard on success

## 10.2 Professor area
Layout:
- frontend/src/pages/professor/ProfessorLayout.jsx

Overview:
- loads courses, subject analytics, recent attendance
- displays analytics cards and records table
- live sync indicator via useRealtimePulse

Courses:
- lists professor assigned courses

Attendance:
- select course and session
- fetches session report table
- supports bulk mark present/absent
- supports report export UI actions (buttons present)

Analytics:
- chart visualizations from subject attendance report
- trend line + status distribution

## 10.3 Student area
Layout:
- frontend/src/pages/student/StudentLayout.jsx

Overview:
- warning snapshot + recent history summary
- attendance KPI cards and calendar UI
- live sync indicator

History:
- chronological attendance timeline list

Warnings:
- warning cards by severity (critical/danger/warning)

Profile:
- student profile card UI using current user data

## 10.4 Admin area
Layout:
- frontend/src/pages/admin/AdminLayout.jsx

Overview:
- live operational panel style
- counts rooms/students/professors/active sessions via PocketBase lists

Rooms:
- create and delete room records

Users:
- list professors and students

Schedule:
- drag subject into timetable cells
- local conflict pre-check in UI state
- saves draft to localStorage
- publish creates schedules collection rows

Settings:
- local threshold state controls
- displays current API base URL

Reports:
- session list with attendance percentage summary

## 11) Frontend Configuration and Commands

Env example:
- frontend/.env.example
  - VITE_API_BASE_URL=http://127.0.0.1:8090

Vite config:
- frontend/vite.config.js
- server.port is configured to 3000
- /api proxy target points to 127.0.0.1:8090

Run commands:
1. cd frontend
2. npm install
3. npm run dev
4. npm run build
5. npm run preview

## 12) Credentials Used by Frontend Login

Reference file:
- frontend/credentials.md

Portal credentials listed there include:
- professor emails + password + PIN metadata
- student emails + password
- admin credentials

## 13) Frontend-Visible Known Caveats

1) Port mismatch in docs vs Vite config
- credentials.md mentions localhost:5173.
- vite.config.js sets frontend dev port to 3000.

2) Mixed data access strategy
- Role portals (professor/student) rely on custom API client.
- Admin pages mostly use PocketBase direct collection access.

3) Duplicate nav destination in StudentLayout
- My Courses and Attendance History both point to /student/history.

4) UI placeholder actions still present
- Some export and utility buttons are visual and not fully wired.

5) Realtime endpoint dependency
- useRealtimePulse assumes /api/realtime websocket availability.
- If backend websocket is unavailable, app falls back to polling.

## 14) Debug Checklist for Frontend Issues

When debugging frontend login/data problems:
1. Confirm backend API base URL used by frontend (env + apiClient default).
2. Confirm active backend process is on the same port frontend expects.
3. Confirm role login path:
   - admin via PocketBase superuser
   - professor/student via custom auth endpoints
4. Inspect localStorage keys:
   - smart_attendance_auth_v1
   - lang
5. Verify refresh flow on 401 in apiClient.
6. Verify route role guard behavior in App.jsx ProtectedRoute.

## 15) Key Frontend Source Index

Routing and app shell:
- frontend/src/main.jsx
- frontend/src/App.jsx

Auth/session:
- frontend/src/hooks/useAuth.jsx
- frontend/src/lib/authStore.js

API and backend communication:
- frontend/src/lib/apiClient.js
- frontend/src/lib/pb.js
- frontend/.env.example

Realtime:
- frontend/src/hooks/useRealtimePulse.jsx

Role pages:
- frontend/src/pages/Login.jsx
- frontend/src/pages/professor/*
- frontend/src/pages/student/*
- frontend/src/pages/admin/*

UI and i18n:
- frontend/src/index.css
- frontend/src/lib/i18n.js
- frontend/index.html

---

End of frontend-only chatbot onboarding document.
