/// <reference path="../pb_data/types.d.ts" />

const REPORTS_JWT_SECRET = "smart-attendance-jwt-v1";

function reportHeader(info, key) {
    if (!info || !info.headers) return "";
    return info.headers[key] || info.headers[key.toLowerCase()] || info.headers[key.toUpperCase()] || "";
}

function reportClaims(c, allowedRoles) {
    const info = $apis.requestInfo(c);
    const authHeader = reportHeader(info, "authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    try {
        const token = authHeader.slice(7).trim();
        const claims = $security.parseJWT(token, REPORTS_JWT_SECRET);
        if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
        return claims;
    } catch (e) {
        return null;
    }
}

// ============================================================
// GET /api/custom/attendance-report
// Query params: ?session_id=xxx OR ?subject_id=xxx&date_from=...&date_to=...
// ============================================================
routerAdd("GET", "/api/custom/attendance-report", (c) => {
    const claims = reportClaims(c, ["professor", "student", "admin"]);
    if (!claims) {
        return c.json(401, {
            status: "error",
            code: "UNAUTHORIZED",
            message: "Authorization is required"
        });
    }

    const sessionId = c.queryParam("session_id");
    const subjectId = c.queryParam("subject_id");
    const dateFrom = c.queryParam("date_from");
    const dateTo = c.queryParam("date_to");

    // --- Mode 1: Single session report ---
    if (sessionId) {
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

        if (claims.role === "professor" && session.getString("professor_id") !== claims.sub) {
            return c.json(403, {
                status: "error",
                code: "FORBIDDEN",
                message: "You can only access your own sessions"
            });
        }

        if (claims.role === "student") {
            const ownRecord = $app.dao().findRecordsByFilter(
                "attendance_records",
                "session_id = {:sid} && student_id = {:studentId}",
                "",
                0,
                1,
                { sid: sessionId, studentId: claims.sub }
            );
            if (ownRecord.length === 0) {
                return c.json(403, {
                    status: "error",
                    code: "FORBIDDEN",
                    message: "Students can only access sessions they attended"
                });
            }
        }

        // Get schedule + subject info
        let schedule, subject, group, professor;
        try {
            schedule = $app.dao().findRecordById("schedules", session.getString("schedule_id"));
            subject = $app.dao().findRecordById("subjects", schedule.getString("subject_id"));
            group = $app.dao().findRecordById("groups", schedule.getString("group_id"));
            professor = $app.dao().findRecordById("professors", session.getString("professor_id"));
        } catch (e) { /* partial info ok */ }

        // Get attendance records
        const records = $app.dao().findRecordsByFilter(
            "attendance_records",
            "session_id = {:sid}",
            "check_in_time",
            0, 0,
            { sid: sessionId }
        );

        const attendanceList = [];
        let presentCount = 0, absentCount = 0, lateCount = 0, excusedCount = 0;

        for (const rec of records) {
            let studentInfo = null;
            try {
                studentInfo = $app.dao().findRecordById("students", rec.getString("student_id"));
            } catch (e) { /* skip */ }

            const status = rec.getString("status");
            if (status === "Present") presentCount++;
            else if (status === "Absent") absentCount++;
            else if (status === "Late") lateCount++;
            else if (status === "Excused") excusedCount++;

            attendanceList.push({
                student_id: rec.getString("student_id"),
                student_name: studentInfo ? studentInfo.getString("name_en") : "Unknown",
                student_name_ar: studentInfo ? studentInfo.getString("name_ar") : "غير معروف",
                national_id: studentInfo ? studentInfo.getString("national_id") : "",
                status: status,
                check_in_time: rec.getString("check_in_time"),
                verified: rec.getBool("verified")
            });
        }

        const totalStudents = session.getInt("total_students") || records.length;
        const attendancePercentage = totalStudents > 0
            ? Math.round(((presentCount + lateCount) / totalStudents) * 100)
            : 0;

        return c.json(200, {
            status: "ok",
            message: "Attendance report generated",
            report_type: "session",
            session: {
                id: session.getId(),
                start_time: session.getString("start_time"),
                end_time: session.getString("end_time"),
                status: session.getString("status")
            },
            subject: subject ? {
                code: subject.getString("code"),
                name_en: subject.getString("name_en"),
                name_ar: subject.getString("name_ar")
            } : null,
            group: group ? {
                name: group.getString("group_name"),
                section: group.getInt("section_number")
            } : null,
            professor: professor ? {
                name_en: professor.getString("name_en"),
                name_ar: professor.getString("name_ar")
            } : null,
            summary: {
                total_students: totalStudents,
                present: presentCount,
                late: lateCount,
                absent: absentCount,
                excused: excusedCount,
                attendance_percentage: attendancePercentage
            },
            records: attendanceList,
            data: {
                summary: {
                    total_students: totalStudents,
                    present: presentCount,
                    late: lateCount,
                    absent: absentCount,
                    excused: excusedCount,
                    attendance_percentage: attendancePercentage
                },
                records: attendanceList
            }
        });
    }

    // --- Mode 2: Subject report across date range ---
    if (subjectId) {
        let subject;
        try {
            subject = $app.dao().findRecordById("subjects", subjectId);
        } catch (e) {
            return c.json(404, { status: "error", code: "SUBJECT_NOT_FOUND", message: "Subject not found" });
        }

        if (claims.role === "professor") {
            const professorSchedules = $app.dao().findRecordsByFilter(
                "schedules",
                "subject_id = {:subjectId} && professor_id = {:professorId}",
                "",
                0,
                1,
                { subjectId: subjectId, professorId: claims.sub }
            );
            if (professorSchedules.length === 0) {
                return c.json(403, {
                    status: "error",
                    code: "FORBIDDEN",
                    message: "You can only access subjects assigned to you"
                });
            }
        }

        if (claims.role === "student") {
            const student = $app.dao().findRecordById("students", claims.sub);
            const registeredCourses = student.get("registered_courses");
            if (!Array.isArray(registeredCourses) || !registeredCourses.includes(subjectId)) {
                return c.json(403, {
                    status: "error",
                    code: "FORBIDDEN",
                    message: "You can only access your own subjects"
                });
            }
        }

        // Find all schedules for this subject
        const schedules = $app.dao().findRecordsByFilter(
            "schedules", "subject_id = {:subId}", "", 0, 0, { subId: subjectId }
        );
        const scheduleIds = schedules.map(s => s.getId());

        if (scheduleIds.length === 0) {
            return c.json(200, {
                status: "ok",
                report_type: "subject",
                subject: { code: subject.getString("code"), name_en: subject.getString("name_en") },
                sessions: [],
                overall_attendance: 0
            });
        }

        // Find sessions in date range
        let filter = "schedule_id IN {:schedIds}";
        const params = { schedIds: scheduleIds };
        if (dateFrom) { filter += " && start_time >= {:dateFrom}"; params.dateFrom = dateFrom; }
        if (dateTo) { filter += " && start_time <= {:dateTo}"; params.dateTo = dateTo; }

        const sessions = $app.dao().findRecordsByFilter("sessions", filter, "start_time", 0, 0, params);

        let totalPresent = 0, totalAbsent = 0, totalLate = 0;
        const sessionSummaries = [];

        for (const sess of sessions) {
            const records = $app.dao().findRecordsByFilter(
                "attendance_records", "session_id = {:sid}", "", 0, 0, { sid: sess.getId() }
            );
            let sp = 0, sa = 0, sl = 0;
            for (const r of records) {
                const st = r.getString("status");
                if (st === "Present") sp++;
                else if (st === "Absent") sa++;
                else if (st === "Late") sl++;
            }
            totalPresent += sp; totalAbsent += sa; totalLate += sl;
            sessionSummaries.push({
                session_id: sess.getId(),
                date: sess.getString("start_time"),
                status: sess.getString("status"),
                present: sp, absent: sa, late: sl,
                total: sp + sa + sl
            });
        }

        const grandTotal = totalPresent + totalAbsent + totalLate;
        const overallPercentage = grandTotal > 0 ? Math.round(((totalPresent + totalLate) / grandTotal) * 100) : 0;

        return c.json(200, {
            status: "ok",
            message: "Attendance report generated",
            report_type: "subject",
            subject: { code: subject.getString("code"), name_en: subject.getString("name_en"), name_ar: subject.getString("name_ar") },
            date_range: { from: dateFrom || "all", to: dateTo || "all" },
            overall: { total_records: grandTotal, present: totalPresent, late: totalLate, absent: totalAbsent, attendance_percentage: overallPercentage },
            sessions: sessionSummaries,
            data: {
                overall: { total_records: grandTotal, present: totalPresent, late: totalLate, absent: totalAbsent, attendance_percentage: overallPercentage },
                sessions: sessionSummaries
            }
        });
    }

    return c.json(400, { status: "error", code: "MISSING_PARAMS", message: "Provide session_id or subject_id" });
});


// ============================================================
// GET /api/custom/student-warnings
// Query params: ?student_id=xxx
// ============================================================
routerAdd("GET", "/api/custom/student-warnings", (c) => {
    const claims = reportClaims(c, ["professor", "student", "admin"]);
    if (!claims) {
        return c.json(401, {
            status: "error",
            code: "UNAUTHORIZED",
            message: "Authorization is required"
        });
    }

    const studentId = c.queryParam("student_id");

    if (!studentId) {
        return c.json(400, { status: "error", code: "MISSING_STUDENT_ID", message: "student_id is required" });
    }

    if (claims.role === "student" && claims.sub !== studentId) {
        return c.json(403, {
            status: "error",
            code: "FORBIDDEN",
            message: "You can only access your own warnings"
        });
    }

    if (claims.role === "professor") {
        const student = $app.dao().findRecordById("students", studentId);
        const registeredCourses = student.get("registered_courses");
        const taught = $app.dao().findRecordsByFilter(
            "schedules",
            "professor_id = {:profId}",
            "",
            0,
            0,
            { profId: claims.sub }
        );
        const taughtSubjects = new Set(taught.map((item) => item.getString("subject_id")));
        const canAccess = Array.isArray(registeredCourses) && registeredCourses.some((subjectId) => taughtSubjects.has(subjectId));
        if (!canAccess) {
            return c.json(403, {
                status: "error",
                code: "FORBIDDEN",
                message: "You can only access warnings for your own students"
            });
        }
    }

    let student;
    try {
        student = $app.dao().findRecordById("students", studentId);
    } catch (e) {
        return c.json(404, { status: "error", code: "STUDENT_NOT_FOUND", message: "Student not found" });
    }

    const registeredCourses = student.get("registered_courses");
    if (!Array.isArray(registeredCourses) || registeredCourses.length === 0) {
        return c.json(200, {
            status: "ok",
            student_name: student.getString("name_en"),
            warnings: [],
            overall_status: "good"
        });
    }

    const warnings = [];
    let worstPercentage = 100;

    for (const courseId of registeredCourses) {
        let subject;
        try { subject = $app.dao().findRecordById("subjects", courseId); } catch (e) { continue; }

        // Get all attendance records for this student + subject
        const records = $app.dao().findRecordsByFilter(
            "attendance_records",
            "student_id = {:studentId} && subject_id = {:subjectId}",
            "", 0, 0,
            { studentId: studentId, subjectId: courseId }
        );

        if (records.length === 0) continue;

        let present = 0, absent = 0, late = 0, excused = 0;
        for (const r of records) {
            const st = r.getString("status");
            if (st === "Present") present++;
            else if (st === "Absent") absent++;
            else if (st === "Late") late++;
            else if (st === "Excused") excused++;
        }

        const totalSessions = present + absent + late + excused;
        const attendedSessions = present + late; // Late still counts as attended
        const percentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 100;

        if (percentage < worstPercentage) worstPercentage = percentage;

        let warningLevel = "none";
        let warningMessage = "";

        if (percentage < 50) {
            warningLevel = "critical";
            warningMessage = "تحذير حرج: نسبة الحضور أقل من 50% - قد يتم حرمانك من المادة";
        } else if (percentage < 60) {
            warningLevel = "danger";
            warningMessage = "تحذير خطير: نسبة الحضور أقل من 60%";
        } else if (percentage < 75) {
            warningLevel = "warning";
            warningMessage = "تنبيه: نسبة الحضور أقل من 75%";
        }

        if (warningLevel !== "none") {
            // Calculate how many absences left before next threshold
            let nextThreshold, nextLabel;
            if (percentage >= 60) { nextThreshold = 60; nextLabel = "danger (60%)"; }
            else if (percentage >= 50) { nextThreshold = 50; nextLabel = "critical (50%)"; }
            else { nextThreshold = 0; nextLabel = "denied"; }

            const maxAbsences = Math.floor(totalSessions * (1 - nextThreshold / 100));
            const currentAbsences = absent;
            const absencesLeft = Math.max(0, maxAbsences - currentAbsences);

            warnings.push({
                subject_code: subject.getString("code"),
                subject_name: subject.getString("name_en"),
                subject_name_ar: subject.getString("name_ar"),
                attendance_percentage: percentage,
                total_sessions: totalSessions,
                attended: attendedSessions,
                absences: absent,
                late_count: late,
                excused_count: excused,
                warning_level: warningLevel,
                warning_message: warningMessage,
                absences_left_before_next_threshold: absencesLeft,
                next_threshold_label: nextLabel
            });
        }
    }

    // Sort warnings by severity
    const severityOrder = { critical: 0, danger: 1, warning: 2 };
    warnings.sort((a, b) => severityOrder[a.warning_level] - severityOrder[b.warning_level]);

    let overallStatus = "good";
    if (worstPercentage < 50) overallStatus = "critical";
    else if (worstPercentage < 60) overallStatus = "danger";
    else if (worstPercentage < 75) overallStatus = "warning";

    return c.json(200, {
        status: "ok",
        message: "Student warning report generated",
        student_id: studentId,
        student_name: student.getString("name_en"),
        student_name_ar: student.getString("name_ar"),
        overall_status: overallStatus,
        warnings_count: warnings.length,
        warnings: warnings,
        data: {
            student_id: studentId,
            warnings: warnings,
            overall_status: overallStatus
        }
    });
});
