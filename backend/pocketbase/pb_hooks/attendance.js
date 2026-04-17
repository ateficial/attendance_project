/// <reference path="../pb_data/types.d.ts" />

const ATTENDANCE_JWT_SECRET = "smart-attendance-jwt-v1";
const ATTENDANCE_DEVICE_KEY = "smart-attendance-device-key";

function attRequestData(c) {
    const info = $apis.requestInfo(c);
    if (info.body && Object.keys(info.body).length > 0) return info.body;
    return info.data || {};
}

function attHeader(info, key) {
    if (!info || !info.headers) return "";
    return info.headers[key] || info.headers[key.toLowerCase()] || info.headers[key.toUpperCase()] || "";
}

function attClaims(c, allowedRoles) {
    const info = $apis.requestInfo(c);
    const authHeader = attHeader(info, "authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    try {
        const token = authHeader.slice(7).trim();
        const claims = $security.parseJWT(token, ATTENDANCE_JWT_SECRET);
        if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
        return claims;
    } catch (e) {
        return null;
    }
}

function hasAttendanceDeviceAccess(c, data) {
    const info = $apis.requestInfo(c);
    const headerKey = attHeader(info, "x-device-key");
    const payloadKey = data.device_key || "";
    const provided = String(headerKey || payloadKey || "").trim();
    return provided.length > 0 && $security.equal(provided, ATTENDANCE_DEVICE_KEY);
}

function getSessionAndSchedule(sessionId) {
    const session = $app.dao().findRecordById("sessions", sessionId);
    const schedule = $app.dao().findRecordById("schedules", session.getString("schedule_id"));
    return { session, schedule };
}

// ============================================================
// POST /api/custom/record-attendance
// Called by ESP32 RFID workflow and professor dashboard utilities.
// ============================================================
routerAdd("POST", "/api/custom/record-attendance", (c) => {
    const data = attRequestData(c);
    const claims = attClaims(c, ["professor", "admin"]);
    const deviceAuth = hasAttendanceDeviceAccess(c, data);
    const rfidUid = String(data.rfid_uid || "").trim();
    const sessionId = String(data.session_id || "").trim();

    if (!claims && !deviceAuth) {
        return c.json(401, {
            status: "error",
            code: "UNAUTHORIZED",
            message: "Unauthorized request",
            lcd_message: "Auth Required"
        });
    }

    if (!rfidUid || !sessionId) {
        return c.json(400, {
            status: "error",
            code: "MISSING_FIELDS",
            message: "RFID UID and session_id are required",
            lcd_message: "Missing Data"
        });
    }

    let student;
    try {
        student = $app.dao().findFirstRecordByFilter(
            "students",
            "rfid_uid = {:rfid}",
            { rfid: rfidUid }
        );
    } catch (e) {
        return c.json(404, {
            status: "error",
            code: "STUDENT_NOT_FOUND",
            message: "البطاقة غير مسجلة",
            lcd_message: "Unknown Card"
        });
    }

    const enrollmentStatus = student.getString("enrollment_status");
    if (enrollmentStatus === "Suspended" || enrollmentStatus === "Inactive") {
        return c.json(403, {
            status: "error",
            code: enrollmentStatus === "Suspended" ? "STUDENT_SUSPENDED" : "STUDENT_INACTIVE",
            message: enrollmentStatus === "Suspended" ? "الطالب موقوف" : "الطالب غير نشط",
            student_name: student.getString("name_en"),
            lcd_message: enrollmentStatus === "Suspended" ? "Suspended" : "Inactive"
        });
    }

    let session;
    let schedule;
    try {
        const bundle = getSessionAndSchedule(sessionId);
        session = bundle.session;
        schedule = bundle.schedule;
    } catch (e) {
        return c.json(404, {
            status: "error",
            code: "SESSION_NOT_FOUND",
            message: "الجلسة غير موجودة",
            lcd_message: "No Session"
        });
    }

    if (claims && claims.role === "professor" && session.getString("professor_id") !== claims.sub) {
        return c.json(403, {
            status: "error",
            code: "FORBIDDEN",
            message: "لا يمكنك تسجيل الحضور لهذه الجلسة",
            lcd_message: "Forbidden"
        });
    }

    if (session.getString("status") !== "Active") {
        return c.json(400, {
            status: "error",
            code: "SESSION_NOT_ACTIVE",
            message: "الجلسة غير نشطة",
            lcd_message: "Session Closed"
        });
    }

    const subjectId = schedule.getString("subject_id");
    const groupId = schedule.getString("group_id");
    const registeredCourses = student.get("registered_courses");
    if (!Array.isArray(registeredCourses) || !registeredCourses.includes(subjectId)) {
        return c.json(403, {
            status: "error",
            code: "NOT_ENROLLED",
            message: "الطالب غير مسجل في هذه المادة",
            student_name: student.getString("name_en"),
            lcd_message: "Not Enrolled"
        });
    }

    let isInScheduledGroup = false;
    let scheduledGroupName = "";
    try {
        const scheduledGroup = $app.dao().findRecordById("groups", groupId);
        scheduledGroupName = scheduledGroup.getString("group_name");
        const members = scheduledGroup.get("students");
        if (Array.isArray(members) && members.includes(student.getId())) {
            isInScheduledGroup = true;
        }
    } catch (e) {
        // Fall through to the legacy group_id check.
    }

    const studentGroupId = student.getString("group_id");
    if (!isInScheduledGroup && studentGroupId && studentGroupId === groupId) {
        isInScheduledGroup = true;
    }

    if (!isInScheduledGroup) {
        let currentGroupName = "";
        try {
            if (studentGroupId) {
                const currentGroup = $app.dao().findRecordById("groups", studentGroupId);
                currentGroupName = currentGroup.getString("group_name");
            }
        } catch (e) {
            // Optional field enrichment.
        }

        return c.json(403, {
            status: "error",
            code: "WRONG_GROUP",
            message: "مجموعة غير صحيحة",
            student_name: student.getString("name_en"),
            current_group: currentGroupName,
            expected_group: scheduledGroupName,
            lcd_message: "Wrong Group"
        });
    }

    try {
        const existing = $app.dao().findFirstRecordByFilter(
            "attendance_records",
            "student_id = {:studentId} && session_id = {:sessionId}",
            { studentId: student.getId(), sessionId: sessionId }
        );
        if (existing) {
            return c.json(409, {
                status: "error",
                code: "ALREADY_CHECKED",
                message: "تم التسجيل مسبقاً",
                student_name: student.getString("name_en"),
                check_in_time: existing.getString("check_in_time"),
                lcd_message: "Already In"
            });
        }
    } catch (e) {
        // No duplicate found.
    }

    const now = new Date();
    const sessionStart = new Date(session.getString("start_time"));
    const diffMinutes = (now.getTime() - sessionStart.getTime()) / 60000;
    const attendanceStatus = diffMinutes > 15 ? "Late" : "Present";

    let subject = null;
    try {
        subject = $app.dao().findRecordById("subjects", subjectId);
    } catch (e) {
        // Subject labels are optional in response.
    }

    const attCollection = $app.dao().findCollectionByNameOrId("attendance_records");
    const record = new Record(attCollection);
    record.set("student_id", student.getId());
    record.set("session_id", sessionId);
    record.set("subject_id", subjectId);
    record.set("check_in_time", now.toISOString());
    record.set("status", attendanceStatus);
    record.set("verified", true);
    $app.dao().saveRecord(record);

    const currentPresent = session.getInt("present_count");
    const totalStudents = session.getInt("total_students");
    const effectivePresent = currentPresent + 1;
    session.set("present_count", effectivePresent);
    session.set("absent_count", Math.max(0, totalStudents - effectivePresent));
    $app.dao().saveRecord(session);

    student.set("last_seen", now.toISOString());
    student.set("status", attendanceStatus === "Late" ? "Present" : attendanceStatus);
    $app.dao().saveRecord(student);

    const studentName = student.getString("name_en");
    const lcdName = studentName.length > 13 ? studentName.substring(0, 13) + ".." : studentName;

    return c.json(200, {
        status: "ok",
        message: "تم تسجيل الحضور بنجاح",
        data: {
            attendance_status: attendanceStatus,
            student_id: student.getId(),
            student_name: student.getString("name_en"),
            student_name_ar: student.getString("name_ar"),
            subject: subject ? subject.getString("name_ar") : "",
            subject_en: subject ? subject.getString("name_en") : "",
            check_in_time: now.toISOString(),
            late_minutes: attendanceStatus === "Late" ? Math.round(diffMinutes) : 0
        },
        attendance_status: attendanceStatus,
        student_id: student.getId(),
        student_name: student.getString("name_en"),
        student_name_ar: student.getString("name_ar"),
        subject: subject ? subject.getString("name_ar") : "",
        student_name_en: student.getString("name_en"),
        check_in_time: now.toISOString(),
        lcd_message: "Welcome " + lcdName
    });
});

// ============================================================
// POST /api/custom/attendance/bulk-mark
// Professor marks all remaining students as Present or Absent.
// ============================================================
routerAdd("POST", "/api/custom/attendance/bulk-mark", (c) => {
    const claims = attClaims(c, ["professor", "admin"]);
    if (!claims) {
        return c.json(401, {
            status: "error",
            code: "UNAUTHORIZED",
            message: "Authorization is required"
        });
    }

    const data = attRequestData(c);
    const sessionId = String(data.session_id || "").trim();
    const status = String(data.status || "").trim();

    if (!sessionId || !["Present", "Absent"].includes(status)) {
        return c.json(400, {
            status: "error",
            code: "INVALID_PAYLOAD",
            message: "session_id and status (Present|Absent) are required"
        });
    }

    let session;
    let schedule;
    try {
        const bundle = getSessionAndSchedule(sessionId);
        session = bundle.session;
        schedule = bundle.schedule;
    } catch (e) {
        return c.json(404, {
            status: "error",
            code: "SESSION_NOT_FOUND",
            message: "Session not found"
        });
    }

    if (claims.role === "professor" && session.getString("professor_id") !== claims.sub) {
        return c.json(403, {
            status: "error",
            code: "FORBIDDEN",
            message: "You cannot update attendance for this session"
        });
    }

    if (session.getString("status") !== "Active") {
        return c.json(400, {
            status: "error",
            code: "SESSION_NOT_ACTIVE",
            message: "Session is not active"
        });
    }

    const groupId = schedule.getString("group_id");
    const subjectId = schedule.getString("subject_id");

    const allStudents = $app.dao().findRecordsByFilter(
        "students",
        "group_id = {:groupId}",
        "",
        0,
        0,
        { groupId: groupId }
    );

    const existing = $app.dao().findRecordsByFilter(
        "attendance_records",
        "session_id = {:sessionId}",
        "",
        0,
        0,
        { sessionId: sessionId }
    );

    const alreadyMarked = new Set(existing.map((item) => item.getString("student_id")));
    const attCollection = $app.dao().findCollectionByNameOrId("attendance_records");
    let created = 0;

    for (const student of allStudents) {
        if (alreadyMarked.has(student.getId())) continue;
        const row = new Record(attCollection);
        row.set("student_id", student.getId());
        row.set("session_id", sessionId);
        row.set("subject_id", subjectId);
        row.set("check_in_time", new Date().toISOString());
        row.set("status", status);
        row.set("verified", true);
        try {
            $app.dao().saveRecord(row);
            created++;
        } catch (e) {
            // Skip duplicates to keep operation idempotent.
        }
    }

    const updated = $app.dao().findRecordsByFilter(
        "attendance_records",
        "session_id = {:sessionId}",
        "",
        0,
        0,
        { sessionId: sessionId }
    );

    let present = 0;
    let absent = 0;
    for (const rec of updated) {
        const state = rec.getString("status");
        if (state === "Present" || state === "Late") present++;
        else if (state === "Absent") absent++;
    }

    session.set("present_count", present);
    session.set("absent_count", absent);
    session.set("total_students", allStudents.length);
    $app.dao().saveRecord(session);

    return c.json(200, {
        status: "ok",
        message: "Bulk attendance operation completed",
        data: {
            session_id: sessionId,
            created_records: created,
            present_count: present,
            absent_count: absent,
            total_students: allStudents.length
        }
    });
});
