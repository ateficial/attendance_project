/// <reference path="../pb_data/types.d.ts" />

const ATTENDANCE_JWT_SECRET = "smart-attendance-jwt-v1";
const ATTENDANCE_DEVICE_KEY = "smart-attendance-device-key";
const ATTENDANCE_MANUAL_STATUSES = ["Present", "Late", "Absent"];

function attRequestData(c) {
    const info = c.requestInfo();
    if (info.body && Object.keys(info.body).length > 0) return info.body;
    return info.data || {};
}

function attHeader(info, key) {
    if (!info || !info.headers) return "";
    return info.headers[key] || info.headers[key.toLowerCase()] || info.headers[key.toUpperCase()] || "";
}

function attClaims(c, allowedRoles) {
    const info = c.requestInfo();
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
    const info = c.requestInfo();
    const headerKey = attHeader(info, "x-device-key");
    const payloadKey = data.device_key || "";
    const provided = String(headerKey || payloadKey || "").trim();
    return provided.length > 0 && $security.equal(provided, ATTENDANCE_DEVICE_KEY);
}

function getSessionAndSchedule(sessionId) {
    const session = $app.findRecordById("sessions", sessionId);
    const schedule = $app.findRecordById("schedules", session.getString("schedule_id"));
    return { session, schedule };
}

function attCanManageSession(claims, session, schedule) {
    if (!claims) return false;
    if (claims.role === "admin") return true;

    const actorId = String(claims.sub || "").trim();
    if (!actorId) return false;

    if (claims.role === "professor") {
        return session.getString("professor_id") === actorId || schedule.getString("professor_id") === actorId;
    }

    if (claims.role === "ta") {
        return schedule.getString("ta_id") === actorId;
    }

    return false;
}

function attGetStudentCourseIds(student) {
    const fromRegistered = student.get("registered_courses") || [];
    if (Array.isArray(fromRegistered) && fromRegistered.length > 0) return fromRegistered;

    const fromEnrolled = student.get("enrolled_subjects") || [];
    if (Array.isArray(fromEnrolled) && fromEnrolled.length > 0) return fromEnrolled;

    return [];
}

function attValidateStudentForSchedule(student, schedule) {
    const subjectId = schedule.getString("subject_id");
    const groupId = schedule.getString("group_id");
    const registeredCourses = attGetStudentCourseIds(student);

    if (!Array.isArray(registeredCourses) || !registeredCourses.includes(subjectId)) {
        return {
            ok: false,
            status: 403,
            code: "NOT_ENROLLED",
            message: "Student is not enrolled in this subject",
            lcd_message: "Not Enrolled"
        };
    }

    let isInScheduledGroup = false;
    let scheduledGroupName = "";

    try {
        const scheduledGroup = $app.findRecordById("groups", groupId);
        scheduledGroupName = scheduledGroup.getString("group_name");
        const members = scheduledGroup.get("students");
        if (Array.isArray(members) && members.includes(student.getString("id"))) {
            isInScheduledGroup = true;
        }
    } catch (e) {
        // fallback to student.group_id check
    }

    const studentGroupId = student.getString("group_id");
    if (!isInScheduledGroup && studentGroupId && studentGroupId === groupId) {
        isInScheduledGroup = true;
    }

    if (!isInScheduledGroup) {
        let currentGroupName = "";
        try {
            if (studentGroupId) {
                const currentGroup = $app.findRecordById("groups", studentGroupId);
                currentGroupName = currentGroup.getString("group_name");
            }
        } catch (e) {
            // optional relation lookup
        }

        return {
            ok: false,
            status: 403,
            code: "WRONG_GROUP",
            message: "Student does not belong to the scheduled group",
            current_group: currentGroupName,
            expected_group: scheduledGroupName,
            lcd_message: "Wrong Group"
        };
    }

    return { ok: true };
}

function attUpsertAttendanceRecord(sessionId, subjectId, studentId, statusValue) {
    const normalizedStatus = String(statusValue || "").trim();
    const nowIso = new Date().toISOString();
    const attCollection = $app.findCollectionByNameOrId("attendance_records");

    let existing = null;
    try {
        existing = $app.findFirstRecordByFilter(
            "attendance_records",
            "student_id = {:studentId} && session_id = {:sessionId}",
            { studentId: studentId, sessionId: sessionId }
        );
    } catch (e) {
        existing = null;
    }

    if (existing) {
        existing.set("status", normalizedStatus);
        existing.set("check_in_time", nowIso);
        existing.set("verified", true);
        $app.save(existing);
        return { created: false, updated: true, row: existing, check_in_time: nowIso };
    }

    const record = new Record(attCollection);
    record.set("student_id", studentId);
    record.set("session_id", sessionId);
    record.set("subject_id", subjectId);
    record.set("check_in_time", nowIso);
    record.set("status", normalizedStatus);
    record.set("verified", true);
    $app.save(record);
    return { created: true, updated: false, row: record, check_in_time: nowIso };
}

function attRecalculateSessionCounts(session, schedule) {
    const sessionId = session.getString("id");
    const groupId = schedule.getString("group_id");

    const rows = $app.findRecordsByFilter(
        "attendance_records",
        "session_id = {:sessionId}",
        "",
        0,
        0,
        { sessionId: sessionId }
    );

    let present = 0;
    let absent = 0;

    for (const rec of rows) {
        const state = rec.getString("status");
        if (state === "Present" || state === "Late") present += 1;
        else if (state === "Absent") absent += 1;
    }

    let totalStudents = session.getInt("total_students") || 0;
    if (groupId) {
        try {
            const groupStudents = $app.findRecordsByFilter(
                "students",
                "group_id = {:groupId}",
                "",
                0,
                0,
                { groupId: groupId }
            );
            if (groupStudents.length > 0) {
                totalStudents = groupStudents.length;
            }
        } catch (e) {
            // keep fallback total
        }
    }

    if (totalStudents < present + absent) {
        totalStudents = present + absent;
    }

    const normalizedAbsent = Math.max(absent, totalStudents - present);
    session.set("present_count", present);
    session.set("absent_count", normalizedAbsent);
    session.set("total_students", totalStudents);
    $app.save(session);

    return {
        present_count: present,
        absent_count: normalizedAbsent,
        total_students: totalStudents
    };
}

// ============================================================
// POST /api/custom/record-attendance
// Called by ESP32 RFID workflow and professor dashboard utilities.
// ============================================================
routerAdd("POST", "/api/custom/record-attendance", (c) => {
    const data = attRequestData(c);
    const claims = attClaims(c, ["professor", "admin", "ta"]);
    const deviceAuth = hasAttendanceDeviceAccess(c, data);
    const rfidUid = String(data.rfid_uid || "").trim();
    const sessionId = String(data.session_id || "").trim();
    const studentId = String(data.student_id || "").trim();
    const requestedStatus = String(data.status || "").trim();
    const manualMode = Boolean(studentId || requestedStatus);

    if (!claims && !deviceAuth) {
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
            code: "MISSING_FIELDS",
            message: "session_id is required",
            lcd_message: "Missing Data"
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
            message: "Session not found",
            lcd_message: "No Session"
        });
    }

    if (claims && !attCanManageSession(claims, session, schedule)) {
        return c.json(403, {
            status: "error",
            code: "FORBIDDEN",
            message: "You cannot update attendance for this session",
            lcd_message: "Forbidden"
        });
    }

    if (session.getString("status") !== "Active") {
        return c.json(400, {
            status: "error",
            code: "SESSION_NOT_ACTIVE",
            message: "Session is not active",
            lcd_message: "Session Closed"
        });
    }

    if (manualMode) {
        if (!claims) {
            return c.json(401, {
                status: "error",
                code: "UNAUTHORIZED",
                message: "Manual marking requires user authorization"
            });
        }

        if (!studentId || ATTENDANCE_MANUAL_STATUSES.indexOf(requestedStatus) === -1) {
            return c.json(400, {
                status: "error",
                code: "INVALID_PAYLOAD",
                message: "student_id and status (Present|Late|Absent) are required"
            });
        }

        let student;
        try {
            student = $app.findRecordById("students", studentId);
        } catch (e) {
            return c.json(404, {
                status: "error",
                code: "STUDENT_NOT_FOUND",
                message: "Student not found"
            });
        }

        const enrollmentStatus = student.getString("enrollment_status");
        if (enrollmentStatus === "Suspended" || enrollmentStatus === "Inactive") {
            return c.json(403, {
                status: "error",
                code: enrollmentStatus === "Suspended" ? "STUDENT_SUSPENDED" : "STUDENT_INACTIVE",
                message: "Student is not eligible for attendance",
                student_name: student.getString("name_en")
            });
        }

        const relationCheck = attValidateStudentForSchedule(student, schedule);
        if (!relationCheck.ok) {
            return c.json(relationCheck.status || 403, {
                status: "error",
                code: relationCheck.code || "VALIDATION_FAILED",
                message: relationCheck.message || "Student validation failed",
                student_name: student.getString("name_en") || "",
                current_group: relationCheck.current_group || "",
                expected_group: relationCheck.expected_group || "",
                lcd_message: relationCheck.lcd_message || "Validation"
            });
        }

        const upsertResult = attUpsertAttendanceRecord(
            sessionId,
            schedule.getString("subject_id"),
            student.getString("id"),
            requestedStatus
        );

        const counters = attRecalculateSessionCounts(session, schedule);

        return c.json(200, {
            status: "ok",
            message: upsertResult.created ? "Attendance marked successfully" : "Attendance updated successfully",
            data: {
                session_id: sessionId,
                student_id: student.getString("id"),
                student_name: student.getString("name_en") || student.getString("name_ar") || "",
                status: requestedStatus,
                check_in_time: upsertResult.check_in_time,
                created: upsertResult.created,
                updated: upsertResult.updated,
                summary: counters
            }
        });
    }

    if (!rfidUid) {
        return c.json(400, {
            status: "error",
            code: "MISSING_FIELDS",
            message: "rfid_uid is required",
            lcd_message: "Missing Card"
        });
    }

    let student;
    try {
        student = $app.findFirstRecordByFilter(
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

    const relationCheck = attValidateStudentForSchedule(student, schedule);
    if (!relationCheck.ok) {
        return c.json(relationCheck.status || 403, {
            status: "error",
            code: relationCheck.code || "VALIDATION_FAILED",
            message: relationCheck.message || "Student validation failed",
            student_name: student.getString("name_en") || "",
            current_group: relationCheck.current_group || "",
            expected_group: relationCheck.expected_group || "",
            lcd_message: relationCheck.lcd_message || "Validation"
        });
    }

    try {
        const existing = $app.findFirstRecordByFilter(
            "attendance_records",
            "student_id = {:studentId} && session_id = {:sessionId}",
            { studentId: student.getString("id"), sessionId: sessionId }
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
    const subjectId = schedule.getString("subject_id");

    let subject = null;
    try {
        subject = $app.findRecordById("subjects", subjectId);
    } catch (e) {
        // Subject labels are optional in response.
    }

    attUpsertAttendanceRecord(sessionId, subjectId, student.getString("id"), attendanceStatus);
    const counters = attRecalculateSessionCounts(session, schedule);

    student.set("last_seen", now.toISOString());
    student.set("status", attendanceStatus === "Late" ? "Present" : attendanceStatus);
    $app.save(student);

    const studentName = student.getString("name_en");
    const lcdName = studentName.length > 13 ? studentName.substring(0, 13) + ".." : studentName;

    return c.json(200, {
        status: "ok",
        message: "تم تسجيل الحضور بنجاح",
        data: {
            attendance_status: attendanceStatus,
            student_id: student.getString("id"),
            student_name: student.getString("name_en"),
            student_name_ar: student.getString("name_ar"),
            subject: subject ? subject.getString("name_ar") : "",
            subject_en: subject ? subject.getString("name_en") : "",
            check_in_time: now.toISOString(),
            late_minutes: attendanceStatus === "Late" ? Math.round(diffMinutes) : 0,
            summary: counters
        },
        attendance_status: attendanceStatus,
        student_id: student.getString("id"),
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
    const claims = attClaims(c, ["professor", "admin", "ta"]);
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
    const studentIdsPayload = Array.isArray(data.student_ids) ? data.student_ids.map((value) => String(value || "").trim()).filter(Boolean) : [];

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

    if (!attCanManageSession(claims, session, schedule)) {
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

    const groupStudents = $app.findRecordsByFilter(
        "students",
        "group_id = {:groupId}",
        "",
        0,
        0,
        { groupId: groupId }
    );

    const studentsById = {};
    for (const student of groupStudents) {
        studentsById[student.getString("id")] = student;
    }

    const targetStudentIds = studentIdsPayload.length > 0
        ? studentIdsPayload.filter((id) => Boolean(studentsById[id]))
        : groupStudents.map((student) => student.getString("id"));

    let created = 0;
    let updatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const studentId of targetStudentIds) {
        const student = studentsById[studentId];
        if (!student) continue;

        const relationCheck = attValidateStudentForSchedule(student, schedule);
        if (!relationCheck.ok) continue;

        const result = attUpsertAttendanceRecord(sessionId, subjectId, studentId, status);
        if (result.created) created += 1;
        if (result.updated) {
            result.row.set("check_in_time", nowIso);
            $app.save(result.row);
            updatedCount += 1;
        }
    }

    const counters = attRecalculateSessionCounts(session, schedule);

    return c.json(200, {
        status: "ok",
        message: "Bulk attendance operation completed",
        data: {
            session_id: sessionId,
            created_records: created,
            updated_records: updatedCount,
            target_count: targetStudentIds.length,
            present_count: counters.present_count,
            absent_count: counters.absent_count,
            total_students: counters.total_students
        }
    });
});



