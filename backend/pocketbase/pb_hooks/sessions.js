/// <reference path="../pb_data/types.d.ts" />

const SMART_ATTENDANCE_JWT_SECRET = "smart-attendance-jwt-v1";
const HARDWARE_SHARED_KEY = "smart-attendance-device-key";
const EARLY_START_MINUTES = 15;

function getRequestData(c) {
    const info = $apis.requestInfo(c);
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
    const info = $apis.requestInfo(c);
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
    const info = $apis.requestInfo(c);
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
        return $app.dao().findRecordById("professors", claims.sub);
    } catch (e) {
        return null;
    }
}

function buildStudentRoster(groupId) {
    const roster = new Set();
    try {
        const group = $app.dao().findRecordById("groups", groupId);
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
        const groupStudents = $app.dao().findRecordsByFilter(
            "students",
            "group_id = {:groupId}",
            "",
            0,
            0,
            { groupId: groupId }
        );
        for (const student of groupStudents) {
            roster.add(student.getId());
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
            professor = $app.dao().findFirstRecordByFilter(
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
        room = $app.dao().findFirstRecordByFilter(
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

    const existingActiveSessions = $app.dao().findRecordsByFilter(
        "sessions",
        "professor_id = {:profId} && status = 'Active'",
        "-start_time",
        0,
        0,
        { profId: professor.getId() }
    );

    if (existingActiveSessions.length > 0) {
        return c.json(409, {
            status: "error",
            code: "SESSION_ACTIVE",
            message: "يوجد جلسة نشطة بالفعل",
            session_id: existingActiveSessions[0].getId(),
            lcd_message: "Session Active"
        });
    }

    const now = new Date();
    const currentDay = getDayName(now);
    const semester = getCurrentSemester(now);
    const academicYear = getCurrentAcademicYear(now);

    const candidateSchedules = $app.dao().findRecordsByFilter(
        "schedules",
        "professor_id = {:profId} && room_id = {:roomId} && day_of_week = {:day} && semester = {:semester} && academic_year = {:academicYear}",
        "start_time",
        0,
        0,
        {
            profId: professor.getId(),
            roomId: room.getId(),
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
        subject = $app.dao().findRecordById("subjects", schedule.getString("subject_id"));
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

    const sessionsCollection = $app.dao().findCollectionByNameOrId("sessions");
    const session = new Record(sessionsCollection);
    session.set("schedule_id", schedule.getId());
    session.set("professor_id", professor.getId());
    session.set("start_time", now.toISOString());
    session.set("status", "Active");
    session.set("total_students", totalStudents);
    session.set("present_count", 0);
    session.set("absent_count", totalStudents);
    $app.dao().saveRecord(session);

    professor.set("active_session_status", true);
    professor.set("last_login", now.toISOString());
    $app.dao().saveRecord(professor);

    const courseName = subject.getString("name_en");
    const lcdCourse = courseName.length > 12 ? courseName.substring(0, 12) + ".." : courseName;

    return c.json(200, {
        status: "ok",
        message: "تم بدء الجلسة بنجاح",
        data: {
            session_id: session.getId(),
            professor_id: professor.getId(),
            professor_name: professor.getString("name_en"),
            professor_name_ar: professor.getString("name_ar"),
            subject_id: subject.getId(),
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
        session_id: session.getId(),
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
        session = $app.dao().findRecordById("sessions", sessionId);
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
        schedule = $app.dao().findRecordById("schedules", session.getString("schedule_id"));
    } catch (e) {
        return c.json(500, {
            status: "error",
            code: "SCHEDULE_NOT_FOUND",
            message: "لا يمكن إغلاق الجلسة بدون جدول",
            lcd_message: "Schedule Error"
        });
    }

    const roster = buildStudentRoster(schedule.getString("group_id"));
    const allRecords = $app.dao().findRecordsByFilter(
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

    const attCollection = $app.dao().findCollectionByNameOrId("attendance_records");
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
            $app.dao().saveRecord(absentRecord);
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
    $app.dao().saveRecord(session);

    try {
        const professor = $app.dao().findRecordById("professors", session.getString("professor_id"));
        professor.set("active_session_status", false);
        $app.dao().saveRecord(professor);
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

// ============================================================
// GET /api/custom/session-stats
// Used by ESP32 (*) key and dashboards.
// ============================================================
routerAdd("GET", "/api/custom/session-stats", (c) => {
    const sessionId = String(c.queryParam("session_id") || "").trim();
    const claims = parseAccessClaims(c, ["professor", "admin"]);
    const hardwareAuth = isHardwareAuthorized(c, { device_key: c.queryParam("device_key") });

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
        session = $app.dao().findRecordById("sessions", sessionId);
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

    const records = $app.dao().findRecordsByFilter(
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
            session_id: session.getId(),
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
