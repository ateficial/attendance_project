# 🗄️ PocketBase Backend — Smart Attendance System

## Quick Start

```powershell
cd backend\pocketbase
.\setup.ps1
```

This will:
1. Download PocketBase v0.25.9 for Windows
2. Verify the directory structure
3. Start the server with hooks enabled

## Manual Setup

If the script doesn't work, do these steps manually:

### 1. Download PocketBase
- Go to [pocketbase.io/docs](https://pocketbase.io/docs/)
- Download the Windows build
- Extract `pocketbase.exe` into this folder

### 2. Start PocketBase
```powershell
.\pocketbase.exe serve --http="0.0.0.0:8090" --hooksDir=pb_hooks --migrationsDir=pb_migrations
```

### 3. Create Admin Account
- Local machine: http://127.0.0.1:8090/_/
- Other devices on the same Wi-Fi: http://YOUR_PC_LAN_IP:8090/_/
- Create your admin account

### 4. Import Schema
- Go to **Settings → Import Collections**
- Paste the contents of `pb_schema.json`
- Click **Review → Confirm**

### 5. Seed Sample Data
```powershell
# Edit seed.js first — set admin email/password
node seed.js
```

## Directory Structure

```
pocketbase/
├── pocketbase.exe          # PocketBase binary (downloaded by setup.ps1)
├── setup.ps1               # One-click setup script
├── pb_schema.json          # Importable collection schema
├── seed_data.json          # Sample test data
├── seed.js                 # Script to populate test data
├── pb_hooks/               # Custom API endpoints (auto-loaded)
│   ├── sessions.js         # start-session, end-session
│   ├── attendance.js       # record-attendance (RFID check-in)
│   ├── reports.js          # attendance-report, student-warnings
│   └── config.js           # defaults, validation, conflict detection
├── pb_migrations/          # Schema migrations (auto-run)
│   └── 1712782800_create_collections.js
└── pb_data/                # SQLite database (auto-created)
```

## Custom API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/custom/start-session` | Professor starts session via PIN |
| POST | `/api/custom/record-attendance` | Student RFID check-in |
| POST | `/api/custom/end-session` | Close session + mark absentees |
| GET | `/api/custom/attendance-report` | Session or subject report |
| GET | `/api/custom/student-warnings` | Attendance warning thresholds |
| GET | `/api/custom/health` | System health check |
| GET | `/api/custom/dashboard-stats` | Dashboard statistics |

## Test Credentials

### Professor PINs
| Professor | PIN |
|-----------|-----|
| Dr. Ahmed Hassan | 1234 |
| Dr. Fatima Al-Sayed | 5678 |
| Prof. Omar Ibrahim | 9012 |

### Student RFID UIDs
| Student | RFID |
|---------|------|
| Mohamed Ahmed Ali | A1:B2:C3:D1 |
| Sara Mohamed Hassan | A1:B2:C3:D2 |
| Youssef Khaled Ibrahim | A1:B2:C3:D3 |
| Nour El-Din Mahmoud | A1:B2:C3:D4 |
| Aya Abdel-Rahman | A1:B2:C3:D5 |
| Hassan Tarek Mostafa | A1:B2:C3:D6 |
| Mariam Adel Fouad | A1:B2:C3:D7 |
| Kareem Samir Fathy | A1:B2:C3:D8 |

## Testing with cURL (PowerShell)

```powershell
# Start a session
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8090/api/custom/start-session" `
  -ContentType "application/json" `
  -Body '{"pin": "1234", "room_code": "A101"}'

# Record attendance
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8090/api/custom/record-attendance" `
  -ContentType "application/json" `
  -Body '{"rfid_uid": "A1:B2:C3:D1", "session_id": "YOUR_SESSION_ID"}'

# End session
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8090/api/custom/end-session" `
  -ContentType "application/json" `
  -Body '{"session_id": "YOUR_SESSION_ID", "professor_id": "prof_ahmed"}'

# Health check
Invoke-RestMethod -Uri "http://127.0.0.1:8090/api/custom/health"
```

## Built-in Features

- **Schedule conflict detection** — Prevents double-booking rooms or professors
- **Time validation** — Ensures end_time > start_time and duration matches
- **Auto-defaults** — Sets attendance_percentage=100, status=Active, etc.
- **Late detection** — Auto-marks students as "Late" if >15 min after start
- **Absent auto-fill** — When ending session, creates "Absent" records for missing students
- **Warning thresholds** — 75% (warning), 60% (danger), 50% (critical)
