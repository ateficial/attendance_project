/// <reference path="../pb_data/types.d.ts" />

const SMART_ATTENDANCE_JWT_SECRET = "smart-attendance-jwt-v1";
const HARDWARE_SHARED_KEY = "smart-attendance-device-key";
const EARLY_START_MINUTES = 15;
const CAIRO_UTC_OFFSET_HOURS = 2;
const DAY_NAMES_LOWER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const LECTURE_SLOT_TIME_MAPPING = {
    "1": { start: "09:00", end: "10:00" },
    "2": { start: "10:00", end: "11:00" },
    "3": { start: "11:00", end: "12:00" },
    "4": { start: "12:00", end: "13:00" },
    "5": { start: "13:00", end: "14:00" },
    "6": { start: "14:00", end: "15:00" },
    "7": { start: "15:00", end: "16:00" },
    "8": { start: "16:00", end: "16:30" }
};

function queryParamFromRequest(c, key) {
    try {
        const rawDirect = new URL(c.request.url).searchParams.get(key);
        if (rawDirect !== null && rawDirect !== undefined) return String(rawDirect);
    } catch (e) {
        // continue with fallbacks
    }

    try {
        const rawWithBase = new URL(String(c.request.url), "http://127.0.0.1").searchParams.get(key);
        if (rawWithBase !== null && rawWithBase !== undefined) return String(rawWithBase);
    } catch (e) {
        // continue with requestInfo fallback
    }

    const info = c.requestInfo();
    const raw = info.query ? info.query[key] : "";
    if (Array.isArray(raw)) return String(raw[0] || "");
    return String(raw || "");
}

function getRequestData(c) {
    const info = c.requestInfo();
    if (info.body && Object.keys(info.body).length > 0) {
        return info.body;
    }
    return info.data || {};
}

function getHeader(info, key) {
    if (!info || !info.headers) return "";
    return info.headers[key] || info.headers[key.toLowerCase()] || info.headers[key.toUpperCase()] || "";
}

function parseAccessClaims(c, allowedRoles) {
    const info = c.requestInfo();
    const authHeader = getHeader(info, "authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    try {
        const token = authHeader.slice(7).trim();
        const claims = $security.parseJWT(token, SMART_ATTENDANCE_JWT_SECRET);
        if (!claims || claims.type !== "access" || !claims.sub || !claims.role) {
            return null;
        }
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) {
            return null;
        }
        return claims;
    } catch (e) {
        return null;
    }
}

function isHardwareAuthorized(c, data) {
    const info = c.requestInfo();
    const headerKey = getHeader(info, "x-device-key");
    const payloadKey = data.device_key || "";
    const provided = String(headerKey || payloadKey || "").trim();
    return provided.length > 0 && $security.equal(provided, HARDWARE_SHARED_KEY);
}

function parseTimeToMinutes(time) {
    if (!time || typeof time !== "string" || !time.includes(":")) return -1;
    const parts = time.split(":");
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return -1;
    return (hours * 60) + minutes;
}

function getCairoNow() {
    return new Date(Date.now() + (CAIRO_UTC_OFFSET_HOURS * 60 * 60 * 1000));
}

function getCairoDayLower(date) {
    return DAY_NAMES_LOWER[date.getUTCDay()];
}

function getCairoMinutes(date) {
    return (date.getUTCHours() * 60) + date.getUTCMinutes();
}

function normalizeDayLower(dayValue) {
    return String(dayValue || "").trim().toLowerCase();
}

function normalizeSessionType(value) {
    return String(value || "").trim().toLowerCase();
}

function getDateKeyFromCairo(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
}

function getSubjectCode(subject) {
    return subject.getString("subject_code") || subject.getString("code");
}

function formatRemainingDuration(totalMinutes) {
    const safe = Math.max(0, Math.floor(totalMinutes));
    const hours = Math.floor(safe / 60);
    const minutes = safe % 60;
    if (hours > 0 && minutes > 0) return String(hours) + "h " + String(minutes) + "m";
    if (hours > 0) return String(hours) + "h";
    return String(minutes) + "m";
}

function getDayName(date) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
}

function getCurrentSemester(date) {
    const month = date.getMonth() + 1;
    if (month >= 9 || month <= 1) return "Fall";
    if (month >= 2 && month <= 6) return "Spring";
    return "Summer";
}

function getCurrentAcademicYear(date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const startYear = month >= 9 ? year : year - 1;
    return String(startYear) + "-" + String(startYear + 1);
}

function getSessionCoverage(schedule, now) {
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();
    const startMinutes = parseTimeToMinutes(schedule.getString("start_time"));
    const endMinutes = parseTimeToMinutes(schedule.getString("end_time"));
    if (startMinutes < 0 || endMinutes < 0) return false;
    return nowMinutes >= (startMinutes - EARLY_START_MINUTES) && nowMinutes <= endMinutes;
}

function resolveProfessorFromClaims(claims) {
    if (!claims || claims.role !== "professor") return null;
    try {
        return $app.findRecordById("professors", claims.sub);
    } catch (e) {
        return null;
    }
}

function buildStudentRoster(groupId) {
    const roster = new Set();
    try {
        const group = $app.findRecordById("groups", groupId);
        const linkedStudents = group.get("students");
        if (Array.isArray(linkedStudents)) {
            for (const studentId of linkedStudents) {
                roster.add(studentId);
            }
        }
    } catch (e) {
        // Fallback handled below.
    }

    try {
        const groupStudents = $app.findRecordsByFilter(
            "students",
            "group_id = {:groupId}",
            "",
            0,
            0,
            { groupId: groupId }
        );
        for (const student of groupStudents) {
            roster.add(student.getString("id"));
        }
    } catch (e) {
        // Ignore fallback errors.
    }

    return Array.from(roster);
}

// ============================================================
// POST /api/custom/start-session
// Called by ESP32 keypad or authenticated professor dashboard.
// ============================================================
routerAdd("POST", "/api/custom/start-session", (c) => {
    const data = getRequestData(c);
    const roomCode = String(data.room_code || "").trim();
    const claims = parseAccessClaims(c, ["professor", "admin"]);
    const hardwareAuth = isHardwareAuthorized(c, data);

    if (!claims && !hardwareAuth) {
        return c.json(401, {
            status: "error",
            code: "UNAUTHORIZED",
            message: "Unauthorized request",
            lcd_message: "Auth Required"
        });
    }

    if (!roomCode) {
        return c.json(400, {
            status: "error",
            code: "MISSING_ROOM_CODE",
            message: "room_code is required",
            lcd_message: "Missing Room"
        });
    }

    let professor = resolveProfessorFromClaims(claims);
    if (!professor) {
        const pin = String(data.pin || "").trim();
        if (!pin) {
            return c.json(400, {
                status: "error",
                code: "MISSING_PIN",
                message: "PIN is required for hardware session start",
                lcd_message: "Missing PIN"
            });
        }

        try {
            professor = $app.findFirstRecordByFilter(
                "professors",
                "session_pin = {:pin}",
                { pin: pin }
            );
        } catch (e) {
            return c.json(401, {
                status: "error",
                code: "INVALID_PIN",
                message: "رمز PIN غير صحيح",
                lcd_message: "Invalid PIN"
            });
        }
    }

    let room;
    try {
        room = $app.findFirstRecordByFilter(
            "rooms",
            "room_code = {:roomCode}",
            { roomCode: roomCode }
        );
    } catch (e) {
        return c.json(404, {
            status: "error",
            code: "ROOM_NOT_FOUND",
            message: "القاعة غير موجودة",
            lcd_message: "Room Not Found"
        });
    }

    const existingActiveSessions = $app.findRecordsByFilter(
        "sessions",
        "professor_id = {:profId} && status = 'Active'",
        "-start_time",
        0,
        0,
        { profId: professor.getString("id") }
    );

    if (existingActiveSessions.length > 0) {
        return c.json(409, {
            status: "error",
            code: "SESSION_ACTIVE",
            message: "يوجد جلسة نشطة بالفعل",
            session_id: existingActiveSessions[0].getString("id"),
            lcd_message: "Session Active"
        });
    }

    const now = new Date();
    const currentDay = getDayName(now);
    const semester = getCurrentSemester(now);
    const academicYear = getCurrentAcademicYear(now);

    const candidateSchedules = $app.findRecordsByFilter(
        "schedules",
        "professor_id = {:profId} && room_id = {:roomId} && day_of_week = {:day} && semester = {:semester} && academic_year = {:academicYear}",
        "start_time",
        0,
        0,
        {
            profId: professor.getString("id"),
            roomId: room.getString("id"),
            day: currentDay,
            semester: semester,
            academicYear: academicYear
        }
    );

    const schedule = candidateSchedules.find((item) => getSessionCoverage(item, now));
    if (!schedule) {
        return c.json(404, {
            status: "error",
            code: "NO_SCHEDULE",
            message: "لا يوجد محاضرة مجدولة في هذا الوقت أو الفصل الحالي",
            day_of_week: currentDay,
            semester: semester,
            academic_year: academicYear,
            lcd_message: "No Schedule"
        });
    }

    let subject;
    try {
        subject = $app.findRecordById("subjects", schedule.getString("subject_id"));
    } catch (e) {
        return c.json(500, {
            status: "error",
            code: "SUBJECT_NOT_FOUND",
            message: "خطأ في بيانات المادة",
            lcd_message: "Data Error"
        });
    }

    const roster = buildStudentRoster(schedule.getString("group_id"));
    const totalStudents = roster.length;

    const sessionsCollection = $app.findCollectionByNameOrId("sessions");
    const session = new Record(sessionsCollection);
    session.set("schedule_id", schedule.getString("id"));
    session.set("professor_id", professor.getString("id"));
    session.set("start_time", now.toISOString());
    session.set("status", "Active");
    session.set("total_students", totalStudents);
    session.set("present_count", 0);
    session.set("absent_count", totalStudents);
    $app.save(session);

    professor.set("active_session_status", true);
    professor.set("last_login", now.toISOString());
    $app.save(professor);

    const courseName = subject.getString("name_en");
    const lcdCourse = courseName.length > 12 ? courseName.substring(0, 12) + ".." : courseName;

    return c.json(200, {
        status: "ok",
        message: "تم بدء الجلسة بنجاح",
        data: {
            session_id: session.getString("id"),
            professor_id: professor.getString("id"),
            professor_name: professor.getString("name_en"),
            professor_name_ar: professor.getString("name_ar"),
            subject_id: subject.getString("id"),
            subject_code: subject.getString("code"),
            subject_name: subject.getString("name_en"),
            subject_name_ar: subject.getString("name_ar"),
            room_code: roomCode,
            total_students: totalStudents,
            semester: semester,
            academic_year: academicYear,
            schedule_start: schedule.getString("start_time"),
            schedule_end: schedule.getString("end_time")
        },
        session_id: session.getString("id"),
        lcd_message: "Active:" + lcdCourse
    });
});

// ============================================================
// POST /api/custom/end-session
// Called by keypad (# key) or professor/admin UI.
// ============================================================
routerAdd("POST", "/api/custom/end-session", (c) => {
    const data = getRequestData(c);
    const sessionId = String(data.session_id || "").trim();
    const claims = parseAccessClaims(c, ["professor", "admin"]);
    const hardwareAuth = isHardwareAuthorized(c, data);

    if (!claims && !hardwareAuth) {
        return c.json(401, {
            status: "error",
            code: "UNAUTHORIZED",
            message: "Unauthorized request",
            lcd_message: "Auth Required"
        });
    }

    if (!sessionId) {
        return c.json(400, {
            status: "error",
            code: "MISSING_SESSION_ID",
            message: "session_id is required",
            lcd_message: "Missing ID"
        });
    }

    let session;
    try {
        session = $app.findRecordById("sessions", sessionId);
    } catch (e) {
        return c.json(404, {
            status: "error",
            code: "SESSION_NOT_FOUND",
            message: "الجلسة غير موجودة",
            lcd_message: "Not Found"
        });
    }

    if (claims && claims.role === "professor" && session.getString("professor_id") !== claims.sub) {
        return c.json(403, {
            status: "error",
            code: "FORBIDDEN",
            message: "غير مصرح لك بإنهاء هذه الجلسة",
            lcd_message: "Forbidden"
        });
    }

    if (session.getString("status") !== "Active") {
        return c.json(400, {
            status: "error",
            code: "SESSION_NOT_ACTIVE",
            message: "الجلسة ليست نشطة",
            lcd_message: "Not Active"
        });
    }

    let schedule;
    try {
        schedule = $app.findRecordById("schedules", session.getString("schedule_id"));
    } catch (e) {
        return c.json(500, {
            status: "error",
            code: "SCHEDULE_NOT_FOUND",
            message: "لا يمكن إغلاق الجلسة بدون جدول",
            lcd_message: "Schedule Error"
        });
    }

    const roster = buildStudentRoster(schedule.getString("group_id"));
    const allRecords = $app.findRecordsByFilter(
        "attendance_records",
        "session_id = {:sessionId}",
        "",
        0,
        0,
        { sessionId: sessionId }
    );

    const checkedIn = new Set();
    let presentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let absentCount = 0;

    for (const rec of allRecords) {
        const status = rec.getString("status");
        const sid = rec.getString("student_id");
        checkedIn.add(sid);
        if (status === "Present") presentCount++;
        else if (status === "Late") lateCount++;
        else if (status === "Excused") excusedCount++;
        else if (status === "Absent") absentCount++;
    }

    const attCollection = $app.findCollectionByNameOrId("attendance_records");
    for (const studentId of roster) {
        if (checkedIn.has(studentId)) continue;
        const absentRecord = new Record(attCollection);
        absentRecord.set("student_id", studentId);
        absentRecord.set("session_id", sessionId);
        absentRecord.set("subject_id", schedule.getString("subject_id"));
        absentRecord.set("check_in_time", new Date().toISOString());
        absentRecord.set("status", "Absent");
        absentRecord.set("verified", true);
        try {
            $app.save(absentRecord);
            absentCount++;
        } catch (e) {
            // Avoid failing full session close if a duplicate is encountered.
        }
    }

    const totalStudents = roster.length > 0 ? roster.length : session.getInt("total_students");
    const attended = presentCount + lateCount;
    const attendancePercentage = totalStudents > 0
        ? Math.round((attended / totalStudents) * 100)
        : 0;

    session.set("end_time", new Date().toISOString());
    session.set("status", "Closed");
    session.set("total_students", totalStudents);
    session.set("present_count", attended);
    session.set("absent_count", absentCount);
    $app.save(session);

    try {
        const professor = $app.findRecordById("professors", session.getString("professor_id"));
        professor.set("active_session_status", false);
        $app.save(professor);
    } catch (e) {
        // Non-blocking.
    }

    return c.json(200, {
        status: "ok",
        message: "تم إنهاء الجلسة بنجاح",
        data: {
            session_id: sessionId,
            total_students: totalStudents,
            present_count: presentCount,
            late_count: lateCount,
            excused_count: excusedCount,
            absent_count: absentCount,
            attendance_percentage: attendancePercentage,
            end_time: session.getString("end_time")
        },
        session_id: sessionId,
        total_students: totalStudents,
        present_count: presentCount,
        absent_count: absentCount,
        attendance_percentage: attendancePercentage,
        lcd_message: "Ended P:" + String(presentCount) + " A:" + String(absentCount)
    });
});

function listProfessorLectureSchedules(professorId) {
    const schedules = $app.findRecordsByFilter(
        "schedules",
        "professor_id = {:professorId}",
        "start_time",
        0,
        0,
        { professorId: professorId }
    );

    return schedules.filter((schedule) => {
        const rawType = normalizeSessionType(schedule.getString("session_type"));
        return !rawType || rawType === "lecture";
    });
}

function getScheduleStartEndMinutes(schedule) {
    let startMinutes = parseTimeToMinutes(schedule.getString("start_time"));
    let endMinutes = parseTimeToMinutes(schedule.getString("end_time"));

    if (startMinutes < 0 || endMinutes < 0) {
        const slotKey = String(schedule.getString("lecture_slot") || "");
        const slotRange = LECTURE_SLOT_TIME_MAPPING[slotKey];
        if (slotRange) {
            startMinutes = parseTimeToMinutes(slotRange.start);
            endMinutes = parseTimeToMinutes(slotRange.end);
        }
    }

    return { startMinutes, endMinutes };
}

function findCurrentOrUpcomingLecture(schedules, nowMinutes) {
    const candidates = [];
    for (const schedule of schedules) {
        const window = getScheduleStartEndMinutes(schedule);
        if (window.startMinutes < 0 || window.endMinutes < 0) continue;

        const isCurrent = nowMinutes >= window.startMinutes && nowMinutes <= window.endMinutes;
        const isUpcoming = nowMinutes < window.startMinutes && (window.startMinutes - nowMinutes) <= 15;
        if (isCurrent || isUpcoming) {
            candidates.push({
                schedule: schedule,
                startMinutes: window.startMinutes,
                endMinutes: window.endMinutes,
                isCurrent: isCurrent
            });
        }
    }

    candidates.sort((a, b) => a.startMinutes - b.startMinutes);
    return candidates.length > 0 ? candidates[0].schedule : null;
}

function findNextLectureSchedule(schedules, currentDayIndex, currentMinutes) {
    let best = null;
    for (const schedule of schedules) {
        const dayIndex = DAY_NAMES_LOWER.indexOf(normalizeDayLower(schedule.getString("day_of_week")));
        if (dayIndex < 0) continue;

        const window = getScheduleStartEndMinutes(schedule);
        if (window.startMinutes < 0) continue;

        let deltaMinutes = ((dayIndex - currentDayIndex) * 24 * 60) + (window.startMinutes - currentMinutes);
        while (deltaMinutes <= 15) {
            deltaMinutes += 7 * 24 * 60;
        }

        if (!best || deltaMinutes < best.deltaMinutes) {
            best = {
                schedule: schedule,
                deltaMinutes: deltaMinutes,
                dayIndex: dayIndex,
                startMinutes: window.startMinutes
            };
        }
    }
    return best;
}

function openSessionForSchedule(schedule, professorId, nowIso) {
    const roster = buildStudentRoster(schedule.getString("group_id"));
    const totalStudents = roster.length;
    const sessionsCollection = $app.findCollectionByNameOrId("sessions");

    const session = new Record(sessionsCollection);
    session.set("schedule_id", schedule.getString("id"));
    session.set("professor_id", professorId);
    session.set("start_time", nowIso);
    session.set("status", "Active");
    session.set("total_students", totalStudents);
    session.set("present_count", 0);
    session.set("absent_count", totalStudents);
    $app.save(session);

    try {
        const professor = $app.findRecordById("professors", professorId);
        professor.set("active_session_status", true);
        $app.save(professor);
    } catch (e) {
        // non-blocking
    }

    return session;
}

routerAdd("POST", "/api/custom/session/passcode-start", (c) => {
    const data = getRequestData(c);
    const passcode = String(data.passcode || "").trim();

    if (!/^[0-9]{4,8}$/.test(passcode)) {
        return c.json(400, {
            status: "error",
            code: "INVALID_PASSCODE",
            message: "passcode must be 4-8 digits"
        });
    }

    let professor;
    try {
        professor = $app.findFirstRecordByFilter(
            "professors",
            "session_passcode = {:pin} || session_pin = {:pin}",
            { pin: passcode }
        );
    } catch (e) {
        return c.json(401, {
            status: "error",
            code: "INVALID_PASSCODE",
            message: "Invalid passcode"
        });
    }

    const professorId = professor.getString("id");
    const cairoNow = getCairoNow();
    const nowDayLower = getCairoDayLower(cairoNow);
    const nowMinutes = getCairoMinutes(cairoNow);
    const currentDayIndex = DAY_NAMES_LOWER.indexOf(nowDayLower);

    const allLectureSchedules = listProfessorLectureSchedules(professorId);
    const todayLectures = allLectureSchedules.filter((schedule) => {
        return normalizeDayLower(schedule.getString("day_of_week")) === nowDayLower;
    });

    const activeOrUpcomingSchedule = findCurrentOrUpcomingLecture(todayLectures, nowMinutes);

    if (activeOrUpcomingSchedule) {
        const openSessions = $app.findRecordsByFilter(
            "sessions",
            "schedule_id = {:scheduleId} && (status = 'Active' || status = 'open')",
            "-start_time",
            1,
            0,
            { scheduleId: activeOrUpcomingSchedule.getString("id") }
        );

        let session = openSessions.length > 0 ? openSessions[0] : null;
        const startedNow = !session;
        if (!session) {
            session = openSessionForSchedule(activeOrUpcomingSchedule, professorId, new Date().toISOString());
        }

        let subjectName = "";
        let subjectCode = "";
        let roomLabel = "";

        try {
            const subject = $app.findRecordById("subjects", activeOrUpcomingSchedule.getString("subject_id"));
            subjectName = subject.getString("name_en") || subject.getString("name_ar");
            subjectCode = getSubjectCode(subject);
        } catch (e) {
            // optional relation enrichment
        }

        try {
            const room = $app.findRecordById("rooms", activeOrUpcomingSchedule.getString("room_id"));
            roomLabel = room.getString("room_code") || room.getString("name") || room.getString("building");
        } catch (e) {
            // optional relation enrichment
        }

        const payload = {
            session_id: session.getString("id"),
            subject_name: subjectName,
            subject_code: subjectCode,
            room: roomLabel,
            start_time: activeOrUpcomingSchedule.getString("start_time"),
            end_time: activeOrUpcomingSchedule.getString("end_time"),
            status: startedNow ? "started" : "existing"
        };

        return c.json(200, {
            status: "ok",
            ...payload,
            data: payload
        });
    }

    const nextLecture = findNextLectureSchedule(allLectureSchedules, currentDayIndex, nowMinutes);
    if (nextLecture) {
        let nextSubjectName = "";
        try {
            const subject = $app.findRecordById("subjects", nextLecture.schedule.getString("subject_id"));
            nextSubjectName = subject.getString("name_en") || subject.getString("name_ar");
        } catch (e) {
            // optional
        }

        const nextDay = DAY_NAMES_LOWER[nextLecture.dayIndex];
        const nextTime = nextLecture.schedule.getString("start_time");
        const timeRemaining = formatRemainingDuration(nextLecture.deltaMinutes);

        return c.json(200, {
            status: "no_upcoming",
            next_subject: nextSubjectName,
            next_time: nextDay + " " + nextTime,
            time_remaining: timeRemaining,
            message: "Your next lecture starts in " + timeRemaining
        });
    }

    return c.json(200, {
        status: "no_schedule",
        message: "No lectures scheduled"
    });
});

routerAdd("POST", "/api/custom/session/change-passcode", (c) => {
    const claims = parseAccessClaims(c, ["professor"]);
    if (!claims) {
        return c.json(401, {
            status: "error",
            code: "UNAUTHORIZED",
            message: "Authorization required"
        });
    }

    const data = getRequestData(c);
    const currentPasscode = String(data.current_passcode || "").trim();
    const newPasscode = String(data.new_passcode || "").trim();

    if (!currentPasscode || !newPasscode) {
        return c.json(400, {
            status: "error",
            code: "MISSING_FIELDS",
            message: "current_passcode and new_passcode are required"
        });
    }

    if (!/^[0-9]{4,8}$/.test(newPasscode)) {
        return c.json(400, {
            status: "error",
            code: "INVALID_PASSCODE",
            message: "new_passcode must be 4-8 digits"
        });
    }

    let professor;
    try {
        professor = $app.findRecordById("professors", claims.sub);
    } catch (e) {
        return c.json(404, {
            status: "error",
            code: "PROFESSOR_NOT_FOUND",
            message: "Professor record not found"
        });
    }

    const storedPasscode = professor.getString("session_passcode") || professor.getString("session_pin");
    if (storedPasscode !== currentPasscode) {
        return c.json(403, {
            status: "error",
            code: "INVALID_CURRENT_PASSCODE",
            message: "Current passcode is incorrect"
        });
    }

    professor.set("session_passcode", newPasscode);
    if (newPasscode.length <= 6) {
        professor.set("session_pin", newPasscode);
    }
    professor.set("passcode_updated_at", new Date().toISOString());
    $app.save(professor);

    return c.json(200, {
        status: "ok",
        message: "Session passcode updated successfully"
    });
});

// ============================================================
// GET /api/custom/session-stats
// Used by ESP32 (*) key and dashboards.
// ============================================================
routerAdd("GET", "/api/custom/session-stats", (c) => {
    const sessionId = String(queryParamFromRequest(c, "session_id") || "").trim();
    const claims = parseAccessClaims(c, ["professor", "admin"]);
    const hardwareAuth = isHardwareAuthorized(c, {
        device_key: queryParamFromRequest(c, "device_key")
    });

    if (!claims && !hardwareAuth) {
        return c.json(401, {
            status: "error",
            code: "UNAUTHORIZED",
            message: "Unauthorized request"
        });
    }

    if (!sessionId) {
        return c.json(400, {
            status: "error",
            code: "MISSING_SESSION_ID",
            message: "session_id is required"
        });
    }

    let session;
    try {
        session = $app.findRecordById("sessions", sessionId);
    } catch (e) {
        return c.json(404, {
            status: "error",
            code: "SESSION_NOT_FOUND",
            message: "Session not found"
        });
    }

    if (claims && claims.role === "professor" && session.getString("professor_id") !== claims.sub) {
        return c.json(403, {
            status: "error",
            code: "FORBIDDEN",
            message: "You cannot access this session"
        });
    }

    const records = $app.findRecordsByFilter(
        "attendance_records",
        "session_id = {:sessionId}",
        "",
        0,
        0,
        { sessionId: sessionId }
    );

    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    for (const rec of records) {
        const status = rec.getString("status");
        if (status === "Present") present++;
        else if (status === "Late") late++;
        else if (status === "Absent") absent++;
        else if (status === "Excused") excused++;
    }

    const total = session.getInt("total_students");
    const checkedIn = present + late + absent + excused;
    const attendancePercentage = total > 0
        ? Math.round(((present + late) / total) * 100)
        : 0;

    return c.json(200, {
        status: "ok",
        data: {
            session_id: session.getString("id"),
            session_status: session.getString("status"),
            total_students: total,
            checked_in: checkedIn,
            present: present,
            late: late,
            absent: absent,
            excused: excused,
            attendance_percentage: attendancePercentage,
            start_time: session.getString("start_time"),
            end_time: session.getString("end_time")
        }
    });
});



