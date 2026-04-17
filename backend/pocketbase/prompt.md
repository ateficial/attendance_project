Here is your comprehensive, production-grade prompt for GPT Codex:

---

# SMART ATTENDANCE SYSTEM — FULL-STACK ENGINEERING PROMPT

## CONTEXT & EXISTING STACK

You are working on a **Smart Attendance Management System** for a university (The Higher Future Institute for Specialized Technological Studies). The system is already partially built:

- **Backend**: PocketBase (local binary, port 8090), SQLite, JavaScript hooks (`*.pb.js` files in `pb_hooks/`)
- **Frontend**: React 19, Vite 6, Tailwind CSS 4 (via `@tailwindcss/vite`), React Router 7, PocketBase JS SDK, Chart.js + react-chartjs-2, @dnd-kit
- **Auth**: Admin uses PocketBase `_superusers`; Professors/Students use custom JWT via `POST /api/custom/auth/login` (returns `access_token` + `refresh_token`). JWT secret: `smart-attendance-jwt-v1`, access TTL: 30min, refresh TTL: 30 days
- **Auth state**: stored in `localStorage` key `smart_attendance_auth_v1`
- **API base**: `VITE_API_BASE_URL` or fallback `http://127.0.0.1:8090`
- **Frontend port**: 3000 (Vite config)

**Active backend hook files** (source of truth — always edit `.pb.js`, never legacy `.js`):
- `backend/pocketbase/pb_hooks/auth.pb.js`
- `backend/pocketbase/pb_hooks/portal.pb.js`
- `backend/pocketbase/pb_hooks/reports.pb.js`
- `backend/pocketbase/pb_hooks/sessions.pb.js`
- `backend/pocketbase/pb_hooks/attendance.pb.js`

**Known bug to fix**: `GET /api/custom/session-stats` currently returns 400 because it uses `c.queryParam` which is not supported in this PocketBase JS runtime. Replace all `c.queryParam(...)` usages with `c.request.url.searchParams.get(...)` throughout `sessions.pb.js`.

**Existing collections**: `subjects`, `rooms`, `professors`, `groups`, `students`, `schedules`, `sessions`, `attendance_records`

**Existing working endpoints**:
- `POST /api/custom/auth/login`, `POST /api/custom/auth/refresh`, `GET /api/custom/auth/me`
- `GET /api/custom/professor/courses`, `GET /api/custom/professor/sessions`, `GET /api/custom/professor/recent-attendance`
- `GET /api/custom/student/courses`, `GET /api/custom/student/history`
- `GET /api/custom/student-warnings`
- `GET /api/custom/attendance-report` (mode A: `?session_id=`, mode B: `?subject_id=&date_from=&date_to=`)
- `POST /api/custom/start-session`, `POST /api/custom/end-session`
- `POST /api/custom/record-attendance`, `POST /api/custom/attendance/bulk-mark`
- `GET /api/custom/admin/overview`

---

## PART 1 — BACKEND: NEW COLLECTIONS & SCHEMA MIGRATIONS

### 1.1 Teaching Assistants Collection (`teaching_assistants`)

Create a new PocketBase migration file at `backend/pocketbase/pb_migrations/TIMESTAMP_add_teaching_assistants.js` that adds:

```
teaching_assistants:
  - id (auto)
  - name (text, required)
  - name_ar (text)
  - email (text, required, unique)
  - password_hash (text)
  - employee_id (text, unique)
  - assigned_subjects (relation[] → subjects, required)  ← sections only
  - assigned_groups (relation[] → groups)
  - department (text)
  - phone (text)
  - avatar_url (text)
  - status (select: active|inactive, default: active)
  - created (auto)
  - updated (auto)
```

### 1.2 Extend `professors` Collection

Add via migration:
```
professors (additions):
  - session_passcode (text, required, default: "0000")   ← 4–8 digit PIN for keypad session unlock
  - passcode_updated_at (date)
  - name_ar (text)
  - employee_id (text, unique)
  - phone (text)
  - avatar_url (text)
  - department (text)
  - office_location (text)
  - assigned_subjects (relation[] → subjects)             ← lectures only
  - status (select: active|inactive, default: active)
```

### 1.3 Extend `students` Collection

Add via migration:
```
students (additions):
  - name_ar (text)
  - student_id_number (text, unique)                     ← e.g. 3000100020002
  - level (select: 1|2|3|4, required)
  - department (text, default: "Computer Science")
  - faculty (text, default: "Computer Science")
  - enrolled_subjects (relation[] → subjects)             ← must match level
  - group_id (relation → groups)
  - rfid_card_id (text, unique)
  - rfid_status (select: active|inactive|lost, default: active)
  - phone (text)
  - avatar_url (text)
  - national_id (text)
  - academic_year (text)
  - status (select: active|suspended|graduated, default: active)
  - warning_count (number, default: 0)
  - absence_percentage (number, default: 0)
```

### 1.4 Extend `subjects` Collection

Add via migration:
```
subjects (additions):
  - subject_code (text, unique, required)               ← e.g. CS202
  - level (select: 1|2|3|4, required)
  - department (text, default: "Computer Science")
  - credit_hours (number, default: 3)
  - subject_type (select: lecture|section|both, default: both)
  - semester (select: first|second, default: second)
  - academic_year (text, default: "2025-2026")
  - description (text)
```

### 1.5 Extend `schedules` Collection

The schedule system must support the full timetable data extracted from the uploaded images. Add via migration:
```
schedules (additions):
  - subject_id (relation → subjects, required)
  - professor_id (relation → professors)                 ← null for sections
  - ta_id (relation → teaching_assistants)               ← null for lectures
  - room_id (relation → rooms, required)
  - group_id (relation → groups)
  - day_of_week (select: sunday|monday|tuesday|wednesday|thursday|friday|saturday, required)
  - lecture_slot (select: 1|2|3|4|5|6|7|8, required)    ← slot number maps to time range
  - start_time (text, required)                          ← "09:00"
  - end_time (text, required)                            ← "10:00"
  - session_type (select: lecture|section, required)
  - level (select: 1|2|3|4, required)
  - section_number (text)                                ← e.g. "Sec 1", "G1"
  - semester (select: first|second, default: second)
  - academic_year (text, default: "2025-2026")
  - is_active (bool, default: true)
```

**Lecture slot time mapping** (encode as a constant in hooks and frontend):
```
Slot 1: 09:00–10:00
Slot 2: 10:00–11:00
Slot 3: 11:00–12:00
Slot 4: 12:00–13:00
Slot 5: 13:00–14:00
Slot 6: 14:00–15:00
Slot 7: 15:00–16:00
Slot 8: 16:00–16:30
```

### 1.6 New `schedule_versions` Collection

```
schedule_versions:
  - id (auto)
  - label (text, required)             ← e.g. "Second Semester 2025-2026 v1"
  - level (select: 1|2|3|4)
  - published_by (relation → _superusers)
  - published_at (date)
  - is_active (bool, default: false)
  - snapshot_json (json)               ← full schedule snapshot at publish time
  - created (auto)
```

---

## PART 2 — BACKEND: NEW & UPDATED API HOOK ROUTES

### 2.1 Fix Existing Bug

In `sessions.pb.js`, replace every occurrence of:
```js
c.queryParam("param_name")
```
with:
```js
new URL(c.request.url).searchParams.get("param_name")
```
This fixes the 400 error on `GET /api/custom/session-stats`.

### 2.2 New file: `backend/pocketbase/pb_hooks/ta.pb.js`

Teaching Assistant auth and portal routes:

```
POST /api/custom/auth/login           ← extend existing to support role: "ta"
GET  /api/custom/ta/subjects          ← returns TA's assigned_subjects with level/code
GET  /api/custom/ta/sessions          ← returns sessions for TA's subjects (sections only)
GET  /api/custom/ta/recent-attendance ← last 10 attendance records across TA's subjects
```

JWT claims for TA must include `{ role: "ta", id, email, name }`. Apply same 30-min access / 30-day refresh TTL pattern as professors/students.

### 2.3 New routes in `sessions.pb.js`

#### Passcode-based session initiation:
```
POST /api/custom/session/passcode-start
Body: { passcode: string }

Logic:
1. Find professor whose session_passcode matches the submitted passcode
2. Get current day and time (Cairo timezone UTC+2)
3. Query schedules for this professor where day_of_week = today
4. Filter to lecture-type schedules ordered by start_time
5. Find any schedule whose time window is NOW (start_time <= now <= end_time) or starts within the next 15 minutes
6. If found:
   a. Check if a session already exists for this subject+date that is open → return existing session
   b. Otherwise create a new session record: { subject_id, professor_id, room_id, group_id, started_at: now, status: "open", session_type: "lecture" }
   c. Return: { session_id, subject_name, subject_code, room, start_time, end_time, status: "started" }
7. If NOT found (no upcoming lecture within 15 min):
   a. Find the next scheduled lecture for this professor today or upcoming days (look ahead 7 days)
   b. Calculate time difference to next lecture
   c. Return: { status: "no_upcoming", next_subject: string, next_time: string, time_remaining: "Xh Ym", message: "Your next lecture starts in Xh Ym" }
8. If no schedule found at all:
   c. Return: { status: "no_schedule", message: "No lectures scheduled" }
```

#### Passcode change:
```
POST /api/custom/session/change-passcode
Auth: professor JWT required
Body: { current_passcode: string, new_passcode: string }

Validates current passcode matches, then updates professor.session_passcode. Passcode must be 4–8 digits only.
```

### 2.4 New routes in `portal.pb.js`

```
GET /api/custom/professor/schedule
  → Returns professor's full weekly schedule (from schedules collection) for current semester
  → Includes: day, slot, subject_name, subject_code, room, group, start_time, end_time, session_type, level

GET /api/custom/professor/dashboard-stats
  → Returns for the authenticated professor:
    - total_students: int (across all assigned subjects)
    - avg_attendance_rate: float (across all sessions this semester)
    - total_sessions_held: int
    - total_absent_count: int
    - subjects_summary: [{ subject_id, subject_name, subject_code, session_count, avg_rate, present_count, absent_count, late_count }]
    - recent_7_days_trend: [{ date, present_pct }]
    - status_distribution: { present: int, late: int, absent: int }
    - at_risk_students: [{ student_id, name, absence_pct, subject_name }]   ← absence > 25%

GET /api/custom/ta/dashboard-stats
  → Same structure as professor dashboard but scoped to TA's sections

GET /api/custom/student/dashboard-stats
  → Returns for the authenticated student:
    - enrolled_subjects_count: int
    - overall_attendance_pct: float
    - total_present: int, total_absent: int, total_late: int
    - subjects_breakdown: [{ subject_id, name, code, level, present, absent, late, pct, warning_level }]
    - monthly_trend: [{ month, pct }]
    - warning_status: { level: "ok"|"warning"|"danger"|"critical", threshold_pct: float, current_pct: float }
    - calendar_data: [{ date: "YYYY-MM-DD", status: "present"|"absent"|"late"|"no_session" }]

GET /api/custom/admin/schedule
  Query params: ?level=1|2|3|4&semester=second&academic_year=2025-2026
  → Returns full schedule grid for that level as structured JSON
  → Groups by day_of_week, then slot number
  → Includes professor/TA name, room, group, subject_code, session_type

POST /api/custom/admin/schedule/save
  Auth: Admin only
  Body: { entries: [{ subject_id, professor_id?, ta_id?, room_id, group_id?, day_of_week, lecture_slot, start_time, end_time, session_type, level, section_number, semester, academic_year }] }
  → Upsert all schedule entries (delete existing for this level+semester+year, then insert new)
  → Create a new schedule_versions record as draft

POST /api/custom/admin/schedule/publish
  Auth: Admin only
  Body: { version_id: string }
  → Sets that schedule_version.is_active = true, sets all others for same level to false
  → Sets all schedule records for this level to is_active = true

GET /api/custom/admin/students
  Query: ?level=&search=&group_id=&subject_id=&page=&per_page=
  → Returns paginated student list with expand: enrolled_subjects, group_id

PATCH /api/custom/admin/student/:id
  Auth: Admin only
  Body: { level?, enrolled_subjects?, group_id?, status?, rfid_card_id?, rfid_status? }
  → Updates student record, re-validates that enrolled_subjects match the student's level (subject.level must equal student.level)
  → Returns updated student

GET /api/custom/admin/teaching-assistants
  → List all TAs with expanded assigned_subjects

POST /api/custom/admin/teaching-assistants
  Body: { name, name_ar?, email, password, employee_id?, assigned_subjects[], assigned_groups[], department? }
  → Creates TA record, hashes password as sha256(lowercase(email) + "::" + password)

PATCH /api/custom/admin/teaching-assistants/:id
  → Updates TA fields

DELETE /api/custom/admin/teaching-assistants/:id

GET /api/custom/attendance/export
  Query: ?session_id=&format=json   (PDF/Excel export happens on frontend via libraries)
  → Returns full attendance data for the session including: student names, IDs, status, check_in_time, subject, date, professor/TA name

GET /api/custom/attendance/subject-export
  Query: ?subject_id=&date_from=&date_to=&format=json
  → Returns all attendance records for a subject in date range, grouped by session
```

### 2.5 Update `auth.pb.js`

Extend `POST /api/custom/auth/login` to handle `role: "ta"`:
- Look up `teaching_assistants` collection by email
- Verify password_hash (same sha256 pattern as professors)
- Issue JWT with `{ role: "ta", id, email, name, assigned_subjects[] }`

---

## PART 3 — SEED DATA UPDATE

Update `backend/pocketbase/seed_data.json` and `seed.js` to include:

1. **Seed 4 Teaching Assistants** with realistic Egyptian university names, emails in format `[name].ta@university.edu`, password `TA@123`, each assigned to 1–2 subjects (section type only).

2. **Seed subjects with correct fields** matching the uploaded schedule images:
   - Level 1: English Language, Object Oriented Programming, Discrete Mathematics, Electronics, Structured Programming, Computer Science Fundamentals
   - Level 2: Introduction to Computer Networks, Computer Architecture, System Analysis and Design(1), Differential Equation and Transformation, Design and Analysis of Algorithms
   - Level 3: Information Storage and Management, Image Processing, Neural Network, Mobile Application Development, Operating Systems, Software Engineering(1)
   - Level 4: Marketing and Sales, Computer Vision, Internet of Things, Cloud Computing, Virtual and Augmented Reality
   - Each subject gets: `subject_code` (e.g. CS202), `level`, `session_type`, `credit_hours: 3`, `semester: "second"`, `academic_year: "2025-2026"`

3. **Seed students with correct level and enrolled_subjects** that match the level from the schedule images.

4. **Seed professors** with `session_passcode: "1234"` as default, `assigned_subjects` pointing to lecture-type subjects.

5. **Seed schedules** from all 4 timetable images provided, covering all 4 levels. For each entry in the images, create a schedule record with correct: `subject_id`, `professor_id` or `ta_id`, `room_id`, `day_of_week`, `lecture_slot`, `start_time`, `end_time`, `session_type` (lecture for Dr./Prof., section for Eng./Sec.), `level`, `section_number`, `group_id`.

---

## PART 4 — FRONTEND: COMPLETE REDESIGN & FULL BACKEND WIRING

### 4.0 Design System

Define a single CSS variable file (`src/styles/tokens.css`) imported globally:

```css
:root {
  --bg-primary: #0A0F1E;
  --bg-secondary: #111827;
  --bg-card: #1A2235;
  --bg-card-hover: #1E2A40;
  --border: #2A3550;
  --border-light: #334466;
  --text-primary: #F0F4FF;
  --text-secondary: #8B9DC3;
  --text-muted: #4A5A80;
  --accent-blue: #3B82F6;
  --accent-blue-soft: #1D4ED8;
  --accent-green: #10B981;
  --accent-amber: #F59E0B;
  --accent-red: #EF4444;
  --accent-purple: #8B5CF6;
  --accent-teal: #06B6D4;
  --shadow-card: 0 4px 24px rgba(0,0,0,0.4);
  --shadow-glow-blue: 0 0 20px rgba(59,130,246,0.15);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --font-display: 'DM Sans', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

Import from Google Fonts in `index.html`: `DM Sans` (300,400,500,600,700) + `JetBrains Mono` (400,600). Remove all existing font links. Apply `font-family: var(--font-body)` globally.

**All pages must be fully responsive**: mobile-first breakpoints at 640px, 768px, 1024px, 1280px.

---

### 4.1 `src/lib/apiClient.js` — Extend

Add the following new service functions (same pattern as existing ones — Bearer token, error parsing, 401 → refresh → retry):

```js
// Professor
getProfessorSchedule()                                    → GET /api/custom/professor/schedule
getProfessorDashboardStats()                              → GET /api/custom/professor/dashboard-stats
changePasscode(current_passcode, new_passcode)            → POST /api/custom/session/change-passcode
startSessionWithPasscode(passcode)                        → POST /api/custom/session/passcode-start

// TA
getTASubjects()                                           → GET /api/custom/ta/subjects
getTASessions()                                           → GET /api/custom/ta/sessions
getTARecentAttendance()                                   → GET /api/custom/ta/recent-attendance
getTADashboardStats()                                     → GET /api/custom/ta/dashboard-stats

// Student
getStudentDashboardStats()                                → GET /api/custom/student/dashboard-stats

// Admin
getAdminSchedule(level, semester, academic_year)          → GET /api/custom/admin/schedule
saveAdminSchedule(entries)                                → POST /api/custom/admin/schedule/save
publishScheduleVersion(version_id)                        → POST /api/custom/admin/schedule/publish
getAdminStudents(filters)                                 → GET /api/custom/admin/students
updateAdminStudent(id, body)                              → PATCH /api/custom/admin/student/:id
getAdminTAs()                                             → GET /api/custom/admin/teaching-assistants
createAdminTA(body)                                       → POST /api/custom/admin/teaching-assistants
updateAdminTA(id, body)                                   → PATCH /api/custom/admin/teaching-assistants/:id
deleteAdminTA(id)                                         → DELETE /api/custom/admin/teaching-assistants/:id

// Export
getAttendanceExportData(session_id)                       → GET /api/custom/attendance/export?session_id=
getSubjectAttendanceExportData(subject_id, date_from, date_to) → GET /api/custom/attendance/subject-export
```

Add two utility functions:
```js
exportToExcel(data, columns, filename)   // Uses SheetJS (xlsx) — install if not present
exportToPDF(data, title, columns, filename)  // Uses jsPDF + jspdf-autotable — install if not present
```

---

### 4.2 `src/App.jsx` — Add TA Routes

Add to the router:
```jsx
/ta                   → TALayout + TAOverview
/ta/subjects          → TASubjects
/ta/attendance        → TAAttendance
/ta/reports           → TAReports
/ta/profile           → TAProfile
```

Update `ProtectedRoute` to handle `role === "ta"` with redirect to `/ta`.

---

### 4.3 Login Page — `src/pages/Login.jsx`

Complete redesign. Split layout: **left 40% = decorative panel**, **right 60% = form panel**.

**Left panel**:
- Deep navy background (`--bg-primary`) with animated constellation/grid SVG background
- University logo placeholder (rounded square, gradient fill)
- Bold display text: "Smart Attendance" in `--font-display` weight 700, size 2.5rem
- Subtitle: "Higher Future Institute — Academic Year 2025–2026"
- Three animated stat counters at bottom: "40K+ Students", "99.9% Accuracy", "4 Levels"
- Subtle animated grid lines using CSS `@keyframes`

**Right panel**:
- White/light background (`#F8FAFF`)
- "Welcome back" heading, "Access your portal" subtitle
- **Role selector**: Three cards side by side — Faculty, Student, Admin — each with icon, label, description. Selected card gets accent border + fill. Admin card is subtle (smaller, secondary styling)
- Email input with icon, Password input with show/hide toggle
- "Remember session" checkbox
- "Sign In →" button — full width, deep navy background, white text, hover: slide-up color transition
- "Forgot credentials?" link
- Footer: "Authorized access only. Institutional Privacy Policy & Data Protection Terms"
- Language toggle (EN/AR) top-right corner of right panel
- On `role === "admin"` selection: show additional small text "Admin credentials required"
- Error state: red banner below form, not inline
- Loading state: button shows spinner + "Signing in…"
- On success: route to `/professor`, `/student`, `/ta`, or `/admin` based on role from JWT response

---

### 4.4 Professor Portal — Complete Redesign

#### 4.4.1 `ProfessorLayout.jsx`

- Left sidebar (240px, collapsible to 64px on mobile)
- Sidebar header: Professor avatar (circular, initials fallback), name, "Senior Faculty" badge
- Nav items with icons (Material Symbols):
  - Overview (dashboard icon)
  - My Courses (book icon)
  - Attendance Sheets (checklist icon)
  - Reports & Analytics (bar_chart icon)
  - Schedule (calendar_month icon)
  - Settings (settings icon)
  - Logout (logout icon)
- Top bar: Search input (functional — searches across courses and students), notification bell (badge count from warnings count), language toggle, profile avatar dropdown (shows name, role, "Change Passcode" link, Logout)
- Top bar secondary links: DASHBOARD | SCHEDULE | SUPPORT — these are anchor links inside the layout, not separate routes. Remove these; they're redundant with sidebar nav.

#### 4.4.2 `professor/Overview.jsx` — Dashboard

Call `getProfessorDashboardStats()` on mount. Display:

**Row 1 — KPI Cards** (4 cards):
- Total Students Across Subjects (icon: group)
- Average Attendance Rate (icon: percent, color: green if ≥75%, amber if 60–74%, red if <60%)
- Sessions Held This Semester (icon: event_available)
- At-Risk Students (absence >25%) (icon: warning, color: amber)

**Row 2 — Main Charts** (2 columns):
- Left: **Attendance Trend Line Chart** — last 7 days, `%` on Y axis, dates on X axis. Uses `react-chartjs-2` Line. Real data from `recent_7_days_trend`. Smooth curves, gradient fill under line.
- Right: **Status Distribution Donut Chart** — Present/Late/Absent with counts in center. Real data from `status_distribution`.

**Row 3 — Subjects Summary Table**:
- Columns: Subject Name, Code, Level, Sessions, Avg Rate (progress bar), Present, Absent, Late
- Clicking a row navigates to Attendance Sheets filtered to that subject
- Real data from `subjects_summary`

**Row 4 — At-Risk Students Panel**:
- Card list showing students with absence >25%: name, subject, absence %, colored badge
- "View Full Report" link → Reports page

**Live sync**: useRealtimePulse drives auto-refresh every 30s. Show pulsing green dot "LIVE" indicator in top right.

#### 4.4.3 `professor/Courses.jsx`

Call `getProfessorCourses()`. Display course cards in a responsive CSS grid (3 cols desktop, 2 tablet, 1 mobile):

Each card:
- Gradient header (blue to indigo) with subject name + code
- Level badge (e.g. "Level 3")
- Stats row: Attendance Rate (color-coded), Credit Hours
- Two action buttons: "View Details" (opens modal with full subject info) + "Attendance Sheets" (navigates to `/professor/attendance?subject_id=X`)
- No static/fake data — all from API

Remove any hardcoded data arrays.

#### 4.4.4 `professor/Attendance.jsx` (renamed from Attendance Sheets)

Full redesign:

**Top controls row**:
- Course selector dropdown (populated from `getProfessorCourses()`)
- Session/Date selector dropdown (populated from `getProfessorSessions()` filtered by selected course — shows date + time + status (Open/Closed))
- Group filter dropdown (All Groups + individual group options)
- Status filter dropdown (All | Present | Late | Absent)
- Search input (filters student name in table in real-time, client-side)

**Stats row** (4 cards): Total Students, Present & Late (green), Absent (red), Attendance Rate (% with circular mini-gauge)

**Attendance table**:
- Columns: Student ID, Student Name (with avatar initial), Status (colored badge), Check-in Time, Actions
- Actions column: kebab menu (⋮) with "Mark Present", "Mark Late", "Mark Absent" — each calls `POST /api/custom/record-attendance` with `{ session_id, student_id, status }` then refreshes table row
- "Mark All Present" and "Mark All Absent" buttons call `POST /api/custom/attendance/bulk-mark` with `{ session_id, status, student_ids: [...all] }`
- Real-time polling via `useRealtimePulse`

**Export buttons** (top right, fully wired):
- **PDF**: calls `getAttendanceExportData(session_id)` then `exportToPDF(data, ...)` — generates a PDF table with: header (course name, date, professor name, session time), table (student ID, name, status, check-in time), footer (totals, attendance rate)
- **Excel**: calls same data, uses `exportToExcel(data, ...)` — generates xlsx with same structure

**Polling indicator**: green dot "Polling" or red dot "Offline" based on `useRealtimePulse.isLive`

#### 4.4.5 `professor/Analytics.jsx` (renamed from Reports)

Call `getAttendanceReport({ subject_id, date_from, date_to })`.

Controls:
- Subject selector (from courses)
- Date range picker (from/to — uses native `<input type="date">` styled with CSS)
- "Generate Report" button

Display:
- **4 KPI cards**: Average Attendance, Total Present, Total Late, Total Absent
- **Trend Line Chart**: session-by-session attendance percentage over time
- **Status Distribution Donut**: Present / Late / Absent counts and percentages
- **Per-student breakdown table**: Student Name, Total Sessions, Present, Absent, Late, Attendance %, Warning Level (badge: OK/Warning/Danger/Critical)
- Export buttons (PDF + Excel) for the filtered report data

#### 4.4.6 `professor/Schedule.jsx` (NEW PAGE)

Call `getProfessorSchedule()`.

Display a **weekly timetable grid**:
- Rows: Sunday, Monday, Tuesday, Wednesday, Thursday
- Columns: Slots 1–8 (with time labels 09:00–16:30)
- Each cell that has a lecture for this professor shows a colored card with: Subject Name, Subject Code, Room, Group, Level badge
- Color coding: lecture type = blue, section (if professor also has sections) = teal
- Empty cells are visually distinct (subtle dotted border)
- On mobile: collapse to a day-by-day list view (tabs for each day)
- No editing here — view only for professor

#### 4.4.7 `professor/Settings.jsx`

Section 1 — **Change Session Passcode**:
- Current passcode input (type="password" with show/hide toggle)
- New passcode input (4–8 digits, numeric only, validation)
- Confirm new passcode input
- "Update Passcode" button → calls `changePasscode(current, new)` → success toast / error message
- Info text: "Your session passcode is entered via the keypad to start attendance sessions"

Section 2 — **Notification Preferences** (local state, localStorage persisted):
- Toggle: Email alerts for at-risk students
- Toggle: Push notifications for session start reminders

Section 3 — **Display**:
- Language toggle (EN/AR)
- API base URL display (read-only, monospace font)

Remove threshold controls from professor settings (those belong in admin only).

---

### 4.5 Teaching Assistant Portal — NEW

Create files: `pages/ta/TALayout.jsx`, `TAOverview.jsx`, `TASubjects.jsx`, `TAAttendance.jsx`, `TAReports.jsx`, `TAProfile.jsx`

#### `TALayout.jsx`
Same structure as ProfessorLayout but:
- Sidebar shows: Overview, My Subjects, Attendance Sheets, Reports, Profile, Logout
- No Settings link (TAs cannot change passcode — sessions are started by professors)
- Top bar: same search + bell + language toggle

#### `TAOverview.jsx`
Call `getTADashboardStats()`. Same KPI cards + charts as professor overview but labeled "My Sections" instead of "Lectures".

#### `TASubjects.jsx`
Call `getTASubjects()`. Same card grid as professor Courses but cards show "Section" badge instead of "Lecture". No session start control.

#### `TAAttendance.jsx`
Same as professor Attendance Sheets but:
- Sessions only show section-type sessions for TA's subjects
- Same export functionality (PDF + Excel)
- Same bulk mark + individual mark

#### `TAReports.jsx`
Same as professor Analytics but scoped to TA's subjects.

#### `TAProfile.jsx`
TA profile card (same styling as student profile card but with TA-specific fields: Employee ID, Department, Assigned Subjects list, Assigned Groups list).

---

### 4.6 Student Portal — Complete Redesign

#### 4.6.1 `StudentLayout.jsx`

- Left sidebar with: Overview, My Courses, Attendance History, Reports & Warnings, Profile, Logout
- **Fix the duplicate nav bug**: "My Courses" → `/student/courses`, "Attendance History" → `/student/history`. These must be distinct routes.
- Top bar: notification bell, language toggle, profile avatar

#### 4.6.2 `student/Overview.jsx` — Dashboard

Call `getStudentDashboardStats()`. Display:

**Notification banner** (if warnings exist): amber/red banner "You have [N] absence warnings. View details →"

**Row 1 — KPI Cards** (4):
- Overall Attendance % (color-coded circular gauge)
- Total Present (green)
- Total Absent (red)
- Total Late (amber)

**Row 2** (2 columns):
- Left: **Attendance Calendar** — month view. Each day colored: green (present), red (absent), amber (late), grey (no session). Navigation: prev/next month buttons. Real data from `calendar_data`. Legend below.
- Right: **Recent Logs** — last 10 records from `getStudentHistory()`. Each row: subject icon, subject name, date+time, status badge (PRESENT/LATE/ABSENT). "Export PDF" button at top right of this panel → generates PDF of full history.

**Row 3 — Subjects Breakdown**:
- Per-subject attendance mini-cards: subject name, code, level badge, circular attendance gauge, present/absent/late counts, warning badge if below threshold.

**Polling mode banner**: if `useRealtimePulse.isLive`, show "POLLING MODE ACTIVE — Attendance window open" banner in accent blue.

#### 4.6.3 `student/History.jsx`

Call `getStudentHistory()`.

Controls:
- **Course filter**: dropdown with all enrolled subjects + "All Courses"
- **Status filter**: All | Present | Late | Absent
- **Date range**: from/to date pickers
- **Search**: text search on subject name
- All filters work client-side after data load (filter the array in state)

Display: chronological list. Each entry is a card row: subject icon + name, date, time, status badge (colored). Group by month with month headers.

Bottom stats: Total Lectures, Total Attended, Attendance Percentage (colored).

Export PDF button: generates PDF of filtered results with student name/ID header.

#### 4.6.4 `student/Warnings.jsx` (rename from Reports & Warnings)

Call `getStudentWarnings()`. Also call `getStudentDashboardStats()` for subject breakdown.

Display:
- **Overall warning status card** at top: large colored status badge (OK/Warning/Danger/Critical) with current % and threshold.
- **Per-subject warning cards**: each subject with color-coded status. Shows: subject name, total sessions, attended, absence %, threshold bar (visual progress bar showing how close to limit), projected status.
- Warning levels: OK (≥75%), Warning (60–74.9%), Danger (50–59.9%), Critical (<50%)

#### 4.6.5 `student/Profile.jsx`

**Fix the overlapping elements bug** from the uploaded screenshot. Redesign the student ID card:

The card must be a clean, non-overlapping design:
- Card dimensions: max-width 380px, centered
- Top section (teal/green gradient header): university name "SMART ATTENDANCE SYSTEM" in white, RFID chip icon top-right
- Avatar circle: centered, 80px, initials fallback (no overlapping with name text)
- Name in large bold text below avatar, then Arabic name in smaller text — both have enough vertical space
- Info grid (2×2): Faculty | Department | Level | Status — each in its own cell, no overlap
- RFID STATUS section: icon + "Active" badge
- QR code placeholder: bottom right corner
- Student ID: large monospace font in its own row with "STUDENT ID" label above it

Below the card: two info panels:
- Enrolled Subjects: list of subjects with level badges
- Academic Info: academic year, semester, group

---

### 4.7 Admin Portal — Enhancements

#### 4.7.1 `admin/Schedule.jsx` — Full Rebuild

The schedule builder must now:

**Level + Semester Selector** at top: level tabs (1 | 2 | 3 | 4) + semester select + academic year.

**Load from backend**: on tab change, call `getAdminSchedule(level, semester, year)` and populate the timetable grid.

**Grid layout**: same slot×day grid as professor Schedule view, but editable.

**Adding a schedule entry**: click an empty cell → open a modal with:
- Subject selector (filtered to match selected level)
- Session type: Lecture | Section
- Professor selector (if Lecture) OR TA selector (if Section)
- Room selector
- Group selector
- Section number (text input, optional)
- Start/End time (auto-populated from slot, but overridable)
- Save button

**Editing existing entry**: click a filled cell → same modal pre-populated with existing data. Include "Delete" button.

**Local conflict detection**: before saving, check if same room + same day + same slot already exists → show warning.

**Save Draft button**: calls `saveAdminSchedule(entries)` for current level.

**Publish button**: calls `publishScheduleVersion(version_id)` → shows success toast. Published version is displayed with green "Published" badge.

**Import from image (manual)**: provide a CSV template download and CSV upload button that parses the schedule from a standard format. Column headers: `day_of_week,lecture_slot,subject_code,session_type,professor_email,ta_email,room_name,group_name,section_number`

#### 4.7.2 `admin/Users.jsx` — Extend with TAs

Three tabs at top: **Students | Professors | Teaching Assistants**

**Students tab**:
- Filters: Level (1|2|3|4), Group, Status (active|suspended|graduated), Search by name/ID
- Table: Student ID Number, Name, Level, Group, Status, Enrolled Subjects count, Absence %, Actions
- Actions: Edit button → opens Edit Student Modal:
  - Editable fields: Level (select), Enrolled Subjects (multi-select filtered by level), Group, Status, RFID Card ID, RFID Status
  - Validation: subjects must match selected level
  - Save → `updateAdminStudent(id, body)`

**Professors tab**:
- Table: Employee ID, Name, Email, Department, Assigned Subjects, Session Passcode (masked), Status, Actions
- Actions: Edit button → opens modal (same fields as TA modal below)

**Teaching Assistants tab**:
- Table: Employee ID, Name, Email, Department, Assigned Subjects, Assigned Groups, Status, Actions
- "Add TA" button → opens Create TA Modal:
  - Fields: Name, Arabic Name, Email, Password, Employee ID, Department, Assigned Subjects (multi-select), Assigned Groups (multi-select)
  - Save → `createAdminTA(body)`
- Edit button → `updateAdminTA(id, body)`
- Delete button → confirmation dialog → `deleteAdminTA(id)`

#### 4.7.3 `admin/Reports.jsx`

Two tabs: **Session Reports | Student Warnings**

Session Reports tab:
- Level filter, Subject filter, Date range filter, Search
- Table: Session Date, Subject, Professor/TA, Room, Total Students, Present, Absent, Late, Attendance %
- Export Excel and Export PDF buttons — fully wired to `getSubjectAttendanceExportData()`

Student Warnings tab:
- Level filter, Subject filter, Threshold filter
- Table: Student ID, Name, Level, Subject, Absence %, Warning Level (badge)
- Export buttons

---

## PART 5 — FILTERING REQUIREMENTS (ALL PAGES)

Every filter on every page must function. Rules:
1. **Server-side filters** (large datasets): pass as query params to API call (e.g. `getAdminStudents({ level: 2, search: "ali" })`)
2. **Client-side filters** (small datasets already loaded): filter in-memory on the state array
3. **Date range filters**: use native `<input type="date">` styled with CSS. Validate that `date_from <= date_to`. Clear button to reset range.
4. **Dropdowns**: styled with Tailwind, close on outside click, keyboard navigable
5. **Search inputs**: debounced 300ms
6. **Filter reset button**: clear all active filters at once
7. **Filter state**: persisted in URL query params where appropriate (level, subject, date range in reports/schedule pages)

---

## PART 6 — EXPORT FUNCTIONALITY (ALL PAGES)

Install if not present: `npm install xlsx jspdf jspdf-autotable`

**`exportToExcel(rows, columns, filename)`**:
- Uses SheetJS (`xlsx`)
- Creates a workbook with a single sheet
- First row is bold header (column labels)
- Auto-column width
- Filename: `{filename}-{YYYY-MM-DD}.xlsx`

**`exportToPDF(rows, columns, title, meta, filename)`**:
- Uses jsPDF + jspdf-autotable
- Header: university name, title, meta info (professor/student name, date range, subject)
- Table: styled with alternating row colors
- Footer: "Generated on {date}" + page numbers
- Filename: `{filename}-{YYYY-MM-DD}.pdf`

Wire to:
- Professor Attendance Sheets: export current session's attendance
- Professor Analytics: export filtered report
- TA Attendance Sheets: same
- Student History: export filtered history
- Admin Reports: export session or warning reports

---

## PART 7 — REALTIME & POLLING

`useRealtimePulse.jsx` — enhance:
- Accept a `{ interval: ms, enabled: bool }` config parameter
- Return: `{ isLive, lastPulse, pulseCount }`
- On WebSocket connect failure: fall back to polling every `interval` ms
- Show "LIVE" or "POLLING" label based on WebSocket state

On all dashboard pages: show a connection status pill in top-right of the main content area:
- Green pulsing dot + "LIVE" if WebSocket active
- Blue pulsing dot + "POLLING" if fallback polling
- Red dot + "OFFLINE" if both failed

---

## PART 8 — INTERNATIONALIZATION

`src/lib/i18n.js` — add Arabic translations for all new UI strings including:
- TA portal labels
- Schedule grid days/slots in Arabic
- New settings labels
- Warning level labels
- Export button labels
- All new error messages

---

## PART 9 — QUALITY REQUIREMENTS

1. **Zero static/hardcoded data** in any component. Every piece of data shown must come from an API call or computed from API data.
2. **Zero non-functional buttons**. Every button either calls an API, triggers navigation, opens a modal, or performs a client-side action. If a feature is not yet implemented in the backend, show a `toast("Coming soon")` with a clear console warning.
3. **Loading states**: every async operation shows a skeleton loader or spinner. Use a consistent `<Skeleton />` component.
4. **Error states**: every API call has a try/catch. On error: show an `<ErrorBanner message={error} />` component in the relevant section. Do not silently fail.
5. **Empty states**: when API returns zero results, show a meaningful empty state illustration + message + action button.
6. **Toast notifications**: install `react-hot-toast` if not present. Use for: success actions (mark attendance, export, save schedule), error summaries, info messages.
7. **Responsive**: test and fix layout at 375px (mobile), 768px (tablet), 1280px (desktop). Use CSS Grid and Flexbox. No fixed pixel widths on containers.
8. **Accessibility**: all interactive elements have `aria-label`. Color is never the only indicator of state — pair with icon or text. Focus rings visible.

---

## PART 10 — FILE DELIVERY CHECKLIST

After implementing all changes, confirm the following files exist and are updated:

**Backend**:
- [ ] `pb_migrations/TIMESTAMP_add_teaching_assistants.js`
- [ ] `pb_migrations/TIMESTAMP_extend_professors.js`
- [ ] `pb_migrations/TIMESTAMP_extend_students.js`
- [ ] `pb_migrations/TIMESTAMP_extend_subjects.js`
- [ ] `pb_migrations/TIMESTAMP_extend_schedules.js`
- [ ] `pb_migrations/TIMESTAMP_add_schedule_versions.js`
- [ ] `pb_hooks/auth.pb.js` (updated — TA login support)
- [ ] `pb_hooks/sessions.pb.js` (updated — c.queryParam fix + passcode routes)
- [ ] `pb_hooks/portal.pb.js` (updated — schedule + dashboard stats routes)
- [ ] `pb_hooks/ta.pb.js` (new)
- [ ] `seed_data.json` (updated)
- [ ] `seed.js` (updated)

**Frontend**:
- [ ] `src/styles/tokens.css` (new)
- [ ] `src/lib/apiClient.js` (updated)
- [ ] `src/App.jsx` (updated — TA routes added)
- [ ] `src/hooks/useRealtimePulse.jsx` (updated)
- [ ] `src/pages/Login.jsx` (redesigned)
- [ ] `src/pages/professor/ProfessorLayout.jsx` (redesigned)
- [ ] `src/pages/professor/Overview.jsx` (redesigned)
- [ ] `src/pages/professor/Courses.jsx` (redesigned)
- [ ] `src/pages/professor/Attendance.jsx` (redesigned)
- [ ] `src/pages/professor/Analytics.jsx` (redesigned)
- [ ] `src/pages/professor/Schedule.jsx` (new)
- [ ] `src/pages/professor/Settings.jsx` (redesigned)
- [ ] `src/pages/ta/TALayout.jsx` (new)
- [ ] `src/pages/ta/TAOverview.jsx` (new)
- [ ] `src/pages/ta/TASubjects.jsx` (new)
- [ ] `src/pages/ta/TAAttendance.jsx` (new)
- [ ] `src/pages/ta/TAReports.jsx` (new)
- [ ] `src/pages/ta/TAProfile.jsx` (new)
- [ ] `src/pages/student/StudentLayout.jsx` (redesigned)
- [ ] `src/pages/student/Overview.jsx` (redesigned)
- [ ] `src/pages/student/History.jsx` (redesigned)
- [ ] `src/pages/student/Warnings.jsx` (redesigned)
- [ ] `src/pages/student/Profile.jsx` (fixed + redesigned)
- [ ] `src/pages/admin/Schedule.jsx` (full rebuild)
- [ ] `src/pages/admin/Users.jsx` (extended)
- [ ] `src/pages/admin/Reports.jsx` (extended)
- [ ] `src/lib/i18n.js` (updated)
- [ ] `package.json` (updated — new deps: xlsx, jspdf, jspdf-autotable, react-hot-toast if not already present)

---

END OF PROMPT