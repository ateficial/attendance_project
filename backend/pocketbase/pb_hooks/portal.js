/// <reference path="../pb_data/types.d.ts" />

const PORTAL_JWT_SECRET = "smart-attendance-jwt-v1";

function portalClaims(c, allowedRoles) {
    const info = $apis.requestInfo(c);
    const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    try {
        const token = authHeader.slice(7).trim();
        const claims = $security.parseJWT(token, PORTAL_JWT_SECRET);
        if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
        return claims;
    } catch (e) {
        return null;
    }
}

function professorSubjectIds(professorId) {
    const schedules = $app.dao().findRecordsByFilter(
        "schedules",
        "professor_id = {:professorId}",
        "",
        0,
        0,
        { professorId: professorId }
    );
    const set = new Set();
    for (const sched of schedules) {
        set.add(sched.getString("subject_id"));
    }
    return Array.from(set);
}

routerAdd("GET", "/api/custom/professor/courses", (c) => {
    const claims = portalClaims(c, ["professor", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const professorId = claims.role === "admin"
        ? String(c.queryParam("professor_id") || "").trim()
        : claims.sub;

    if (!professorId) {
        return c.json(400, { status: "error", code: "MISSING_PROFESSOR_ID", message: "professor_id is required" });
    }

    const subjectIds = professorSubjectIds(professorId);
    const results = [];

    for (const subjectId of subjectIds) {
        try {
            const subject = $app.dao().findRecordById("subjects", subjectId);
            const groups = $app.dao().findRecordsByFilter(
                "groups",
                "subject_id = {:subjectId}",
                "",
                0,
                0,
                { subjectId: subjectId }
            );

            const sessions = $app.dao().findRecordsByFilter(
                "sessions",
                "professor_id = {:professorId}",
                "-start_time",
                0,
                0,
                { professorId: professorId }
            );

            let attended = 0;
            let total = 0;
            for (const sess of sessions) {
                const schedule = $app.dao().findRecordById("schedules", sess.getString("schedule_id"));
                if (schedule.getString("subject_id") !== subjectId) continue;
                total += 1;
                const denominator = Math.max(1, sess.getInt("total_students"));
                attended += Math.round((sess.getInt("present_count") / denominator) * 100);
            }

            results.push({
                id: subject.getId(),
                code: subject.getString("code"),
                name_en: subject.getString("name_en"),
                name_ar: subject.getString("name_ar"),
                level: subject.getInt("level"),
                credit_hours: subject.getInt("credit_hours"),
                groups_count: groups.length,
                attendance_percentage: total > 0 ? Math.round(attended / total) : 0
            });
        } catch (e) {
            // Skip broken relation rows.
        }
    }

    return c.json(200, {
        status: "ok",
        data: {
            courses: results
        }
    });
});

routerAdd("GET", "/api/custom/professor/sessions", (c) => {
    const claims = portalClaims(c, ["professor", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const professorId = claims.role === "admin"
        ? String(c.queryParam("professor_id") || "").trim()
        : claims.sub;
    const subjectId = String(c.queryParam("subject_id") || "").trim();

    let schedules = [];
    if (subjectId) {
        schedules = $app.dao().findRecordsByFilter(
            "schedules",
            "subject_id = {:subjectId} && professor_id = {:professorId}",
            "",
            0,
            0,
            { subjectId: subjectId, professorId: professorId }
        );
    } else {
        schedules = $app.dao().findRecordsByFilter(
            "schedules",
            "professor_id = {:professorId}",
            "",
            0,
            0,
            { professorId: professorId }
        );
    }

    const scheduleIds = schedules.map((row) => row.getId());
    const sessionRows = [];
    if (scheduleIds.length > 0) {
        const filter = scheduleIds.map((id) => `schedule_id = \"${id}\"`).join(" || ");
        const rows = $app.dao().findRecordsByFilter("sessions", filter, "-start_time", 0, 100);

        for (const row of rows) {
            try {
                const sched = $app.dao().findRecordById("schedules", row.getString("schedule_id"));
                const subj = $app.dao().findRecordById("subjects", sched.getString("subject_id"));
                sessionRows.push({
                    id: row.getId(),
                    status: row.getString("status"),
                    start_time: row.getString("start_time"),
                    end_time: row.getString("end_time"),
                    total_students: row.getInt("total_students"),
                    present_count: row.getInt("present_count"),
                    absent_count: row.getInt("absent_count"),
                    subject_id: subj.getId(),
                    subject_name_en: subj.getString("name_en"),
                    subject_code: subj.getString("code")
                });
            } catch (e) {
                // Skip broken rows.
            }
        }
    }

    return c.json(200, {
        status: "ok",
        data: {
            sessions: sessionRows
        }
    });
});

routerAdd("GET", "/api/custom/professor/recent-attendance", (c) => {
    const claims = portalClaims(c, ["professor", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const professorId = claims.role === "admin"
        ? String(c.queryParam("professor_id") || "").trim()
        : claims.sub;
    const subjectId = String(c.queryParam("subject_id") || "").trim();
    const limit = Number(c.queryParam("limit") || "20") || 20;

    const schedules = $app.dao().findRecordsByFilter(
        "schedules",
        subjectId
            ? "professor_id = {:professorId} && subject_id = {:subjectId}"
            : "professor_id = {:professorId}",
        "",
        0,
        0,
        subjectId
            ? { professorId: professorId, subjectId: subjectId }
            : { professorId: professorId }
    );

    const scheduleIds = schedules.map((row) => row.getId());
    if (scheduleIds.length === 0) {
        return c.json(200, { status: "ok", data: { records: [] } });
    }

    const sessionFilter = scheduleIds.map((id) => `schedule_id = \"${id}\"`).join(" || ");
    const sessionRows = $app.dao().findRecordsByFilter("sessions", sessionFilter, "-start_time", 0, 200);
    const sessionIds = sessionRows.map((row) => row.getId());
    if (sessionIds.length === 0) {
        return c.json(200, { status: "ok", data: { records: [] } });
    }

    const attendanceFilter = sessionIds.map((id) => `session_id = \"${id}\"`).join(" || ");
    const attendanceRows = $app.dao().findRecordsByFilter("attendance_records", attendanceFilter, "-check_in_time", 0, limit);

    const records = attendanceRows.map((row) => {
        let student = null;
        let subject = null;
        try {
            student = $app.dao().findRecordById("students", row.getString("student_id"));
            subject = $app.dao().findRecordById("subjects", row.getString("subject_id"));
        } catch (e) {
            // Keep partial row if expansion fails.
        }

        return {
            id: row.getId(),
            status: row.getString("status"),
            check_in_time: row.getString("check_in_time"),
            student: student
                ? {
                    id: student.getId(),
                    national_id: student.getString("national_id"),
                    name_en: student.getString("name_en"),
                    name_ar: student.getString("name_ar")
                }
                : null,
            subject: subject
                ? {
                    id: subject.getId(),
                    code: subject.getString("code"),
                    name_en: subject.getString("name_en"),
                    name_ar: subject.getString("name_ar")
                }
                : null
        };
    });

    return c.json(200, {
        status: "ok",
        data: {
            records: records
        }
    });
});

routerAdd("GET", "/api/custom/student/history", (c) => {
    const claims = portalClaims(c, ["student", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const studentId = claims.role === "admin"
        ? String(c.queryParam("student_id") || "").trim()
        : claims.sub;
    const courseId = String(c.queryParam("course_id") || "").trim();

    const baseFilter = courseId
        ? "student_id = {:studentId} && subject_id = {:subjectId}"
        : "student_id = {:studentId}";

    const params = courseId
        ? { studentId: studentId, subjectId: courseId }
        : { studentId: studentId };

    const rows = $app.dao().findRecordsByFilter("attendance_records", baseFilter, "-check_in_time", 0, 300, params);
    const records = rows.map((row) => {
        let subject = null;
        try {
            subject = $app.dao().findRecordById("subjects", row.getString("subject_id"));
        } catch (e) {
            // keep partial row
        }

        return {
            id: row.getId(),
            status: row.getString("status"),
            check_in_time: row.getString("check_in_time"),
            subject: subject
                ? {
                    id: subject.getId(),
                    code: subject.getString("code"),
                    name_en: subject.getString("name_en"),
                    name_ar: subject.getString("name_ar")
                }
                : null
        };
    });

    return c.json(200, {
        status: "ok",
        data: {
            records: records
        }
    });
});

routerAdd("GET", "/api/custom/student/courses", (c) => {
    const claims = portalClaims(c, ["student", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const studentId = claims.role === "admin"
        ? String(c.queryParam("student_id") || "").trim()
        : claims.sub;

    let student;
    try {
        student = $app.dao().findRecordById("students", studentId);
    } catch (e) {
        return c.json(404, { status: "error", code: "STUDENT_NOT_FOUND", message: "Student not found" });
    }

    const registered = student.get("registered_courses");
    const results = [];

    for (const subjectId of Array.isArray(registered) ? registered : []) {
        try {
            const subject = $app.dao().findRecordById("subjects", subjectId);
            const rows = $app.dao().findRecordsByFilter(
                "attendance_records",
                "student_id = {:studentId} && subject_id = {:subjectId}",
                "",
                0,
                0,
                { studentId: studentId, subjectId: subjectId }
            );

            let attended = 0;
            for (const row of rows) {
                const status = row.getString("status");
                if (status === "Present" || status === "Late") attended++;
            }

            const total = rows.length;
            results.push({
                id: subject.getId(),
                code: subject.getString("code"),
                name_en: subject.getString("name_en"),
                name_ar: subject.getString("name_ar"),
                attendance_percentage: total > 0 ? Math.round((attended / total) * 100) : 100,
                lectures_attended: attended,
                total_lectures: total,
                level: subject.getInt("level")
            });
        } catch (e) {
            // skip broken links
        }
    }

    return c.json(200, {
        status: "ok",
        data: {
            courses: results
        }
    });
});

routerAdd("GET", "/api/custom/admin/overview", (c) => {
    const claims = portalClaims(c, ["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const collections = ["professors", "students", "rooms", "subjects", "sessions"];
    const counts = {};
    for (const col of collections) {
        try {
            counts[col] = $app.dao().findRecordsByFilter(col, "id != ''", "", 0, 0).length;
        } catch (e) {
            counts[col] = 0;
        }
    }

    let activeSessions = 0;
    try {
        activeSessions = $app.dao().findRecordsByFilter("sessions", "status = 'Active'", "", 0, 0).length;
    } catch (e) {
        // keep default
    }

    return c.json(200, {
        status: "ok",
        data: {
            total_professors: counts.professors || 0,
            total_students: counts.students || 0,
            total_rooms: counts.rooms || 0,
            total_courses: counts.subjects || 0,
            active_sessions: activeSessions
        }
    });
});
