# 🎓 Smart Attendance Management System
## Complete Workflow & Development Prompts Guide

---

## 📊 SYSTEM ARCHITECTURE (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           SMART ATTENDANCE MANAGEMENT SYSTEM                                 │
│                                    RFID Technology                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────────┐
                                    │   👨‍🏫 PROFESSOR   │
                                    │   Enters PIN     │
                                    └────────┬─────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HARDWARE LAYER                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  ⌨️ Keypad   │   │ 📶 RFID     │   │ 🖥️ LCD      │   │ 💡 LEDs     │   │ 🔔 Buzzer   │     │
│  │   4x4       │   │  RC522      │   │  16x2 I2C   │   │ Red/Green   │   │  Active     │     │
│  │  (PIN)      │   │  (Card)     │   │ (Messages)  │   │ (Feedback)  │   │ (Sound)     │     │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│         │                 │                 │                 │                 │            │
│         └─────────────────┴─────────────────┼─────────────────┴─────────────────┘            │
│                                             │                                                │
│                              ┌──────────────┴──────────────┐                                 │
│                              │        🧠 ESP32              │                                 │
│                              │    (Main Controller)        │                                 │
│                              │  • Wi-Fi Enabled            │                                 │
│                              │  • SPI for RFID             │                                 │
│                              │  • I2C for LCD              │                                 │
│                              └──────────────┬──────────────┘                                 │
└──────────────────────────────────────────────│───────────────────────────────────────────────┘
                                               │
                                               │ HTTP POST (JSON)
                                               │ { "rfid_uid": "XX:XX:XX:XX" }
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BACKEND LAYER                                              │
│                              ┌──────────────────────────┐                                     │
│                              │    🗄️ PocketBase         │                                     │
│                              │   (Backend + Database)   │                                     │
│                              │                          │                                     │
│                              │  ┌────────────────────┐  │                                     │
│                              │  │   REST API         │  │                                     │
│                              │  │   • /api/attend    │  │                                     │
│                              │  │   • /api/auth      │  │                                     │
│                              │  │   • /api/reports   │  │                                     │
│                              │  └────────────────────┘  │                                     │
│                              │                          │                                     │
│                              │  ┌────────────────────┐  │                                     │
│                              │  │   SQLite Database  │  │                                     │
│                              │  │   ├── professors   │  │                                     │
│                              │  │   ├── students     │  │                                     │
│                              │  │   ├── subjects     │  │                                     │
│                              │  │   ├── rooms        │  │                                     │
│                              │  │   ├── schedules    │  │                                     │
│                              │  │   └── attendance   │  │                                     │
│                              │  └────────────────────┘  │                                     │
│                              └────────────┬─────────────┘                                     │
└───────────────────────────────────────────│──────────────────────────────────────────────────┘
                                            │
                                            │ JSON Response
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND LAYER                                             │
│                                                                                               │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐                │
│   │  👨‍🏫 PROFESSOR       │   │  👨‍🎓 STUDENT         │   │  🔧 ADMIN            │                │
│   │     DASHBOARD       │   │     DASHBOARD       │   │    DASHBOARD        │                │
│   │                     │   │                     │   │                     │                │
│   │ • View Courses      │   │ • View Attendance   │   │ • Manage Rooms      │                │
│   │ • Attendance Sheets │   │ • Absence Warnings  │   │ • Schedule Creator  │                │
│   │ • Group Statistics  │   │ • Course Progress   │   │ • Conflict Checker  │                │
│   │ • Export PDF/Excel  │   │ • Enrollment Status │   │ • User Management   │                │
│   │ • Analytics Charts  │   │                     │   │ • Drag & Drop Table │                │
│   └─────────────────────┘   └─────────────────────┘   └─────────────────────┘                │
│                                                                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 USER JOURNEY WORKFLOW (ASCII)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         ATTENDANCE SESSION WORKFLOW                                      │
└────────────────────────────────────────────────────────────────────────────────────────┘

    STEP 1: SESSION INITIALIZATION (Professor)
    ==========================================
    
         👨‍🏫 Professor                    ⌨️ Keypad                    🗄️ Server
              │                              │                              │
              │    Enter PIN Code            │                              │
              │─────────────────────────────>│                              │
              │                              │   POST /api/session/start    │
              │                              │─────────────────────────────>│
              │                              │                              │
              │                              │   Validate:                  │
              │                              │   • PIN matches professor    │
              │                              │   • Current time = schedule  │
              │                              │   • Room is assigned         │
              │                              │<─────────────────────────────│
              │                              │   {"status":"active",        │
              │                              │    "course":"Software Eng"}  │
              │                              │                              │
              │    🖥️ LCD: "Session Active"  │                              │
              │<─────────────────────────────│                              │
              
              
    STEP 2: STUDENT CHECK-IN
    ========================
    
         👨‍🎓 Student                     📶 RFID                      🗄️ Server
              │                              │                              │
              │    Tap RFID Card             │                              │
              │─────────────────────────────>│                              │
              │                              │  POST /api/attendance        │
              │                              │  {"rfid":"A1:B2:C3:D4",      │
              │                              │   "session_id":"xxx"}        │
              │                              │─────────────────────────────>│
              │                              │                              │
              │                              │   Server Checks:             │
              │                              │   ✓ Student exists?          │
              │                              │   ✓ Enrolled in course?      │
              │                              │   ✓ Correct group/section?   │
              │                              │   ✓ Not already checked in?  │
              │                              │<─────────────────────────────│
              │                              │                              │
              │                              │                              │
              ▼                              ▼                              │
    ┌─────────────────────────────────────────────────────────┐            │
    │                    SUCCESS PATH                          │            │
    │   🖥️ LCD: "Welcome, [Student Name]"                      │            │
    │   💡 Green LED: Flash                                    │            │
    │   🔔 Buzzer: Short beep                                  │            │
    │   📝 Attendance: Recorded                                │            │
    └─────────────────────────────────────────────────────────┘            │
                              OR                                            │
    ┌─────────────────────────────────────────────────────────┐            │
    │                    FAILURE PATH                          │            │
    │   🖥️ LCD: "Access Denied: [Reason]"                      │            │
    │   💡 Red LED: Flash                                      │            │
    │   🔔 Buzzer: Long tone                                   │            │
    │   ❌ Attendance: Not recorded                            │            │
    └─────────────────────────────────────────────────────────┘            │
    
    
    STEP 3: SESSION END & REPORTING
    ================================
    
         ⏰ Timer                         🗄️ Server                    👨‍🏫 Professor
              │                              │                              │
              │  Lecture Time Ends           │                              │
              │─────────────────────────────>│                              │
              │                              │                              │
              │                              │  Auto-generate:              │
              │                              │  • Attendance Sheet          │
              │                              │  • Statistics                │
              │                              │  • Absent list               │
              │                              │                              │
              │                              │    Notification              │
              │                              │─────────────────────────────>│
              │                              │  "Attendance report ready"   │
              │                              │                              │
              │                              │                              │
              │                              │    View Dashboard            │
              │                              │<─────────────────────────────│
              │                              │                              │
```

---

## 📊 DATABASE SCHEMA (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA (PocketBase)                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐          ┌──────────────────────────────┐
│        PROFESSORS            │          │         STUDENTS             │
├──────────────────────────────┤          ├──────────────────────────────┤
│ • id (PK)                    │          │ • id (PK)                    │
│ • national_id                │          │ • national_id                │
│ • name_en                    │          │ • name_en                    │
│ • name_ar                    │          │ • name_ar                    │
│ • rfid_uid                   │          │ • rfid_uid                   │
│ • session_pin                │          │ • email                      │
│ • department                 │          │ • faculty                    │
│ • academic_rank              │          │ • major                      │
│ • email                      │          │ • academic_year              │
│ • office_location            │          │ • level_semester             │
│ • assigned_courses []        │◄─────────┤ • enrollment_status          │
│ • active_session_status      │          │ • group_id (FK)              │
│ • schedule_id (FK)           │          │ • registered_courses []      │
│ • last_login                 │          │ • attendance_percentage      │
│ • password                   │          │ • last_seen                  │
└──────────────────────────────┘          │ • status                     │
              │                           └──────────────────────────────┘
              │                                         │
              │                                         │
              ▼                                         ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│         SUBJECTS             │          │         GROUPS               │
├──────────────────────────────┤          ├──────────────────────────────┤
│ • id (PK)                    │          │ • id (PK)                    │
│ • code                       │◄─────────│ • subject_id (FK)            │
│ • name_en                    │          │ • group_name                 │
│ • name_ar                    │          │ • section_number             │
│ • department                 │          │ • students []                │
│ • level                      │          │ • max_capacity               │
│ • credit_hours               │          └──────────────────────────────┘
│ • professor_id (FK)          │                        │
└──────────────────────────────┘                        │
              │                                         │
              │                                         ▼
              │                           ┌──────────────────────────────┐
              │                           │    ATTENDANCE_RECORDS        │
              │                           ├──────────────────────────────┤
              ▼                           │ • id (PK)                    │
┌──────────────────────────────┐          │ • student_id (FK)            │
│          ROOMS               │          │ • session_id (FK)            │
├──────────────────────────────┤          │ • subject_id (FK)            │
│ • id (PK)                    │          │ • check_in_time              │
│ • room_code                  │          │ • status (present/absent)    │
│ • building                   │◄─────────│ • verified                   │
│ • capacity                   │          └──────────────────────────────┘
│ • room_type (class/lab)      │                        ▲
│ • equipment []               │                        │
└──────────────────────────────┘                        │
              │                                         │
              │                                         │
              ▼                                         │
┌──────────────────────────────┐          ┌──────────────────────────────┐
│        SCHEDULES             │          │        SESSIONS              │
├──────────────────────────────┤          ├──────────────────────────────┤
│ • id (PK)                    │          │ • id (PK)                    │
│ • subject_id (FK)            │─────────>│ • schedule_id (FK)           │
│ • room_id (FK)               │          │ • professor_id (FK)          │
│ • professor_id (FK)          │          │ • start_time                 │
│ • group_id (FK)              │          │ • end_time                   │
│ • day_of_week                │          │ • status (active/closed)     │
│ • start_time                 │          │ • total_students             │
│ • end_time                   │          │ • present_count              │
│ • duration_minutes           │          │ • absent_count               │
│ • semester                   │          └──────────────────────────────┘
│ • academic_year              │
└──────────────────────────────┘
```

---

## 🛠️ DEVELOPMENT PROMPTS

### PHASE 1: Backend Setup (PocketBase)

---

#### **PROMPT 1: Initialize PocketBase & Database Schema**

```
I need you to help me set up PocketBase for a Smart Attendance Management System.

Create the following collections with their complete field definitions:

1. **professors** collection:
   - id (auto)
   - national_id (text, unique, required)
   - name_en (text, required)
   - name_ar (text, required)
   - rfid_uid (text, unique)
   - session_pin (text, required, min:4, max:6)
   - department (text, required)
   - academic_rank (select: Professor, Associate Professor, Assistant Professor, Lecturer)
   - email (email, unique, required)
   - office_location (text)
   - assigned_courses (relation, multiple, to subjects)
   - active_session_status (bool, default: false)
   - schedule_id (relation, to schedules)
   - last_login (date)
   - password (text, required)

2. **students** collection:
   - id (auto)
   - national_id (text, unique, required)
   - name_en (text, required)
   - name_ar (text, required)
   - rfid_uid (text, unique, required)
   - email (email, unique, required)
   - faculty (text, required)
   - major (text, required)
   - academic_year (number, min:1, max:6)
   - level_semester (number, min:1, max:12)
   - enrollment_status (select: Active, Inactive, Graduated, Suspended)
   - group_id (relation, to groups)
   - registered_courses (relation, multiple, to subjects)
   - attendance_percentage (number, default: 100)
   - last_seen (date)
   - status (select: Present, Absent, Excused)

3. **subjects** collection:
   - id (auto)
   - code (text, unique, required)
   - name_en (text, required)
   - name_ar (text, required)
   - department (text, required)
   - level (number, min:1, max:4)
   - credit_hours (number, min:1, max:4)
   - professor_id (relation, to professors)

4. **rooms** collection:
   - id (auto)
   - room_code (text, unique, required)
   - building (text, required)
   - capacity (number, required)
   - room_type (select: Classroom, Lab, Lecture Hall)
   - equipment (json)

5. **schedules** collection:
   - id (auto)
   - subject_id (relation, to subjects, required)
   - room_id (relation, to rooms, required)
   - professor_id (relation, to professors, required)
   - group_id (relation, to groups, required)
   - day_of_week (select: Sunday, Monday, Tuesday, Wednesday, Thursday)
   - start_time (text, required) // format: "HH:MM"
   - end_time (text, required)
   - duration_minutes (number, required)
   - semester (select: Fall, Spring, Summer)
   - academic_year (text, required)

6. **groups** collection:
   - id (auto)
   - subject_id (relation, to subjects, required)
   - group_name (text, required)
   - section_number (number, required)
   - students (relation, multiple, to students)
   - max_capacity (number, default: 30)

7. **sessions** collection:
   - id (auto)
   - schedule_id (relation, to schedules, required)
   - professor_id (relation, to professors, required)
   - start_time (date, required)
   - end_time (date)
   - status (select: Active, Closed, Cancelled)
   - total_students (number, default: 0)
   - present_count (number, default: 0)
   - absent_count (number, default: 0)

8. **attendance_records** collection:
   - id (auto)
   - student_id (relation, to students, required)
   - session_id (relation, to sessions, required)
   - subject_id (relation, to subjects, required)
   - check_in_time (date, required)
   - status (select: Present, Absent, Late, Excused)
   - verified (bool, default: true)

Please provide me with:
1. PocketBase schema JSON for importing
2. API Rules for each collection (who can read/write)
3. Sample data for testing
```

---

#### **PROMPT 2: Create Custom API Endpoints**

```
Create custom PocketBase hooks/endpoints for the Smart Attendance System:

1. **POST /api/custom/start-session**
   Input: { "pin": "1234", "room_code": "A101" }
   Logic:
   - Validate professor PIN
   - Check current time against schedule
   - Verify room assignment
   - Create new session record
   - Return session details or error

2. **POST /api/custom/record-attendance**
   Input: { "rfid_uid": "XX:XX:XX:XX", "session_id": "xxx" }
   Logic:
   - Find student by RFID
   - Verify student is enrolled in the course
   - Check if correct group/section
   - Prevent duplicate check-ins
   - Record attendance with timestamp
   - Return student name and status

3. **POST /api/custom/end-session**
   Input: { "session_id": "xxx", "professor_id": "xxx" }
   Logic:
   - Mark session as closed
   - Calculate attendance statistics
   - Mark all non-checked students as absent
   - Generate attendance summary

4. **GET /api/custom/attendance-report**
   Input: { "session_id": "xxx" } or { "subject_id": "xxx", "date_range": {...} }
   Logic:
   - Compile attendance data
   - Calculate percentages
   - Return structured report

5. **GET /api/custom/student-warnings**
   Input: { "student_id": "xxx" }
   Logic:
   - Calculate attendance percentage per subject
   - Check against warning thresholds (75%, 60%, 50%)
   - Return subjects with warnings

Please provide:
1. Complete JavaScript/Go code for PocketBase hooks
2. Error handling for all edge cases
3. JSON response formats for each endpoint
```

---

### PHASE 2: Frontend Development

---

#### **PROMPT 3: Create Login Page**

```
Create a professional login page for the Smart Attendance System with the following requirements:

**Design:**
- Modern, clean UI with university theme
- Support for RTL (Arabic) and LTR (English)
- Three login options: Professor, Student, Admin (with different colors)
- Responsive design (mobile-first)

**Components:**
- Logo placeholder at top
- User type selector (tabs or cards)
- Email/ID input field
- Password input field with show/hide toggle
- "Remember me" checkbox
- Login button
- "Forgot password" link
- Language switcher (AR/EN)

**Functionality:**
- Form validation (email format, required fields)
- Loading state during authentication
- Error messages display
- Redirect based on user type after successful login
- JWT token storage in localStorage

**Tech Stack:**
- HTML5, CSS3 (Tailwind CSS or custom)
- JavaScript (Vanilla or React/Vue)
- Integration with PocketBase Auth API

Please provide:
1. Complete HTML/CSS code
2. JavaScript for form handling and API calls
3. Responsive breakpoints
4. Arabic and English text variables
```

---

#### **PROMPT 4: Create Professor Dashboard**

```
Create a comprehensive Professor Dashboard for the Smart Attendance System:

**Layout:**
- Sidebar navigation (collapsible on mobile)
- Top header with profile dropdown
- Main content area

**Sidebar Items:**
1. Dashboard (Overview)
2. My Courses
3. Attendance Sheets
4. Reports & Analytics
5. Settings
6. Logout

**Dashboard Overview Page:**
- Welcome message with professor name
- Today's schedule cards
- Quick stats: Total students, Average attendance, Active session
- Recent attendance activity feed
- Quick action buttons: Start Session, View Reports

**My Courses Page:**
- Grid/List view of assigned courses
- Each course card shows:
  - Course name & code
  - Number of groups/sections
  - Overall attendance percentage
  - Next scheduled lecture
- Click to expand and see groups

**Attendance Sheet Page:**
- Course & Group selector (dropdowns)
- Date picker for specific lecture
- Table with columns: Student ID, Name, Status, Check-in Time
- Bulk actions: Mark all present, Mark all absent
- Export buttons: PDF, Excel
- Real-time updates when session is active

**Analytics Page:**
- Charts using Chart.js or similar:
  - Line chart: Attendance trend over time
  - Bar chart: Attendance by group comparison
  - Pie chart: Present vs Absent ratio
- Filters: Course, Group, Date range
- Summary statistics

**Tech Stack:**
- React.js or Vue.js
- Tailwind CSS or Bootstrap 5
- Chart.js or Recharts
- PocketBase JS SDK

Please provide:
1. Component structure
2. Complete code for each page
3. API integration code
4. State management approach
5. Responsive design implementation
```

---

#### **PROMPT 5: Create Student Dashboard**

```
Create a Student Dashboard for tracking attendance:

**Layout:**
- Simple, clean interface
- Mobile-optimized (students use phones)

**Main Features:**

1. **My Attendance Overview:**
   - Circular progress showing overall attendance percentage
   - Color coding: Green (>75%), Yellow (60-75%), Red (<60%)
   
2. **Courses List:**
   - Each course shows:
     - Course name
     - Attendance percentage
     - Warning badge if below threshold
     - Lectures attended / Total lectures
   
3. **Attendance History:**
   - Calendar view with color-coded days
   - List view with date, course, status
   - Filter by course
   
4. **Warnings Section:**
   - Alert cards for subjects at risk
   - Shows: "You have X absences left before warning"
   - Critical warnings highlighted in red

5. **Profile Section:**
   - Student info display
   - RFID card status
   - QR code for alternative check-in (optional)

**Notifications:**
- Push notification permission request
- In-app notifications for:
  - Successful check-in
  - Absence recorded
  - Warning threshold reached

Please provide:
1. Complete mobile-responsive code
2. API calls for fetching student data
3. Real-time updates implementation
4. Notification system setup
```

---

#### **PROMPT 6: Create Admin Dashboard with Interactive Schedule**

```
Create an Admin Dashboard with an interactive drag-and-drop schedule manager:

**Admin Dashboard Features:**

1. **Overview Page:**
   - System statistics: Total professors, students, rooms, courses
   - Active sessions count
   - System health indicators
   - Recent activity log

2. **Room Management:**
   - CRUD operations for rooms
   - Room availability calendar
   - Equipment tracking
   - Capacity management

3. **User Management:**
   - Professors list with actions (add, edit, disable)
   - Students list with bulk import (CSV)
   - Admin accounts management
   - Role-based permissions

4. **Interactive Schedule Builder:**
   
   **Requirements:**
   - Visual timetable grid (Days x Time slots)
   - Rooms displayed as rows
   - Time slots as columns (8:00 AM - 8:00 PM)
   - Configurable slot duration: 15min, 30min, 1hr steps
   
   **Drag & Drop Features:**
   - Drag subjects from a sidebar panel
   - Drop onto the schedule grid
   - Resize slots by dragging edges
   - Move existing slots to new positions
   
   **Conflict Detection:**
   - Real-time conflict highlighting (red overlay)
   - Warning popup when:
     - Same room, same time conflict
     - Same professor, same time conflict
     - Same year/level students overlap
   - Block invalid drops
   
   **Duration Controls:**
   - Duration selector: 1hr, 1.5hr, 2hr, 2.5hr, 3hr, 4hr
   - Step adjustment selector (15min or 30min)
   - Quick resize buttons
   
   **Filters:**
   - Filter by building
   - Filter by room type (class/lab)
   - Filter by professor
   - Filter by academic year

5. **Reports:**
   - Room utilization reports
   - Attendance summary reports
   - Export to PDF/Excel

**Tech Requirements:**
- React with React DnD or Vue Draggable
- Tailwind CSS for styling
- Real-time conflict validation
- Undo/Redo functionality
- Save draft / Publish schedule

Please provide:
1. Complete drag-and-drop schedule component
2. Conflict detection algorithm
3. API endpoints for schedule CRUD
4. Responsive design (tablet minimum)
5. Keyboard accessibility
```

---

### PHASE 3: Hardware Integration

---

#### **PROMPT 7: ESP32 Complete Code**

```
Create complete Arduino/ESP32 code for the Smart Attendance terminal:

**Hardware Configuration:**
- ESP32 DevKit V1
- RC522 RFID Reader (SPI)
- 16x2 LCD with I2C adapter
- 4x4 Matrix Keypad
- Green LED (GPIO 25)
- Red LED (GPIO 26)
- Active Buzzer (GPIO 27)

**Pin Assignments:**
- RFID: SDA(5), SCK(18), MOSI(23), MISO(19), RST(4)
- LCD I2C: SDA(21), SCL(22)
- Keypad: Rows(13,12,14,27), Cols(26,25,33,32)
- LEDs: Green(25), Red(26)
- Buzzer: (27)

**Functionality:**

1. **Startup Sequence:**
   - Connect to WiFi
   - Display "System Ready" on LCD
   - Short beep to confirm

2. **Session Mode:**
   - Wait for PIN input from keypad
   - Display masked input (****)
   - Send PIN to server for validation
   - If valid: Display "Session Active: [Course]"
   - If invalid: Display error, allow retry

3. **Attendance Mode:**
   - Continuously scan for RFID cards
   - On card detected:
     - Read UID
     - Send to server with session ID
     - Wait for response
   - On success:
     - Display "Welcome, [Name]"
     - Flash green LED
     - Short beep
   - On failure:
     - Display "[Error message]"
     - Flash red LED
     - Long beep

4. **Error Handling:**
   - WiFi disconnection: Auto-reconnect, display status
   - Server timeout: Retry 3 times, then show error
   - Invalid card: Clear error message

5. **Special Features:**
   - # key: End session (requires PIN confirmation)
   - * key: Display session stats
   - Auto-timeout: Return to idle after 5 min inactivity

**Code Structure:**
- Use non-blocking code (millis() instead of delay())
- Modular functions for each component
- Configuration section for WiFi credentials and server URL
- Debug mode with Serial output

Please provide:
1. Complete .ino file with all libraries
2. Required library list for Arduino IDE
3. Wiring diagram description
4. Configuration instructions
5. Troubleshooting guide
```

---

### PHASE 4: Integration & Testing

---

#### **PROMPT 8: Full System Integration**

```
Help me integrate all components of the Smart Attendance System:

**Integration Tasks:**

1. **Frontend-Backend Connection:**
   - Configure CORS for PocketBase
   - Set up environment variables for API URLs
   - Implement authentication flow
   - Handle token refresh
   - Error handling for API failures

2. **Hardware-Backend Connection:**
   - Configure ESP32 API endpoint URL
   - Implement request/response handling
   - Handle network errors gracefully
   - Implement retry logic

3. **Real-time Features:**
   - PocketBase realtime subscriptions for:
     - Live attendance updates on professor dashboard
     - Session status changes
     - New attendance records
   - WebSocket connection management

4. **Data Synchronization:**
   - Ensure attendance records are consistent
   - Handle concurrent check-ins
   - Implement optimistic updates

5. **Testing Checklist:**
   - [ ] Professor login and dashboard access
   - [ ] Student login and dashboard access
   - [ ] Admin login and schedule management
   - [ ] Session start via keypad
   - [ ] RFID attendance recording
   - [ ] Real-time dashboard updates
   - [ ] Attendance report generation
   - [ ] PDF/Excel export
   - [ ] Conflict detection in schedule
   - [ ] Warning system for students
   - [ ] Multi-language support

**Deployment:**
- PocketBase hosting options
- Frontend deployment (Vercel/Netlify)
- SSL certificate setup
- Domain configuration

Please provide:
1. Integration code snippets
2. Configuration files
3. Testing scripts
4. Deployment checklist
5. Common issues and solutions
```

---

## 📁 PROJECT STRUCTURE

```
smart-attendance-system/
│
├── 📂 hardware/
│   ├── attendance_terminal.ino
│   ├── config.h
│   ├── libraries.txt
│   └── wiring_diagram.png
│
├── 📂 backend/
│   ├── pocketbase/
│   │   ├── pb_data/
│   │   ├── pb_hooks/
│   │   │   ├── attendance.js
│   │   │   └── sessions.js
│   │   └── pb_migrations/
│   ├── schema.json
│   └── seed_data.json
│
├── 📂 frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login/
│   │   │   ├── ProfessorDashboard/
│   │   │   ├── StudentDashboard/
│   │   │   ├── AdminDashboard/
│   │   │   └── shared/
│   │   ├── pages/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── i18n/
│   │   │   ├── ar.json
│   │   │   └── en.json
│   │   └── App.js
│   ├── package.json
│   └── tailwind.config.js
│
├── 📂 docs/
│   ├── API_DOCUMENTATION.md
│   ├── HARDWARE_SETUP.md
│   ├── USER_GUIDE.md
│   └── TROUBLESHOOTING.md
│
└── README.md
```

---

## 🔐 API RESPONSE FORMATS

### Attendance Check-in Response

```json
// SUCCESS
{
  "status": "ok",
  "message": "تم تسجيل الحضور بنجاح",
  "student_name": "محمد أحمد علي",
  "student_name_en": "Mohamed Ahmed Ali",
  "subject": "هندسة البرمجيات",
  "check_in_time": "2024-03-15T09:05:23Z",
  "lcd_message": "Welcome Mohamed"
}

// ERROR - Not enrolled
{
  "status": "error",
  "code": "NOT_ENROLLED",
  "message": "الطالب غير مسجل في هذه المادة",
  "lcd_message": "Not Enrolled"
}

// ERROR - Wrong group
{
  "status": "error", 
  "code": "WRONG_GROUP",
  "message": "مجموعة غير صحيحة",
  "lcd_message": "Wrong Group"
}

// ERROR - Already checked in
{
  "status": "error",
  "code": "ALREADY_CHECKED",
  "message": "تم التسجيل مسبقاً",
  "lcd_message": "Already In"
}
```

---

## 🎯 MILESTONES CHECKLIST

```
Week 1:
├── [ ] Hardware team: Components testing individually
├── [ ] Software team: PocketBase setup + Database schema
├── [ ] Frontend team: Wireframes + Login page design
└── [ ] Presentation team: Documentation start + Flowcharts

Week 2:
├── [ ] Hardware team: Full wiring + RFID reading code
├── [ ] Software team: API endpoints for attendance
├── [ ] Frontend team: Professor dashboard implementation
└── [ ] Presentation team: Hardware photos + Documentation

Week 3:
├── [ ] Hardware team: WiFi + HTTP integration
├── [ ] Software team: Auth system + Export functions
├── [ ] Frontend team: Student + Admin dashboards
└── [ ] Presentation team: Demo video recording

Week 4:
├── [ ] All teams: Full system integration testing
├── [ ] All teams: Bug fixing and UI polish
├── [ ] All teams: Presentation rehearsal
└── [ ] All teams: Final preparations
```

---

## 📞 TEAM COMMUNICATION

```
┌──────────────────────────────────────────────────────────────┐
│                    TEAM INTERFACES                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   HARDWARE ←───API Contract───→ SOFTWARE                      │
│      │                              │                         │
│      │  POST /api/attendance        │                         │
│      │  {rfid_uid, session_id}      │                         │
│      │                              │                         │
│      │  Response:                   │                         │
│      │  {status, name, message}     │                         │
│      │                              │                         │
│   SOFTWARE ←───API───→ FRONTEND                               │
│      │                              │                         │
│      │  PocketBase REST API         │                         │
│      │  + Realtime subscriptions    │                         │
│      │                              │                         │
│   ALL TEAMS ←───Docs───→ PRESENTATION                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

**Created for University Smart Attendance System Project**
**4 Teams | 4 Weeks | 1 Goal: Professional RFID Attendance System**
