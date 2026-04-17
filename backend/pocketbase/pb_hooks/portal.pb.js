/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/custom/professor/courses", (c) => {
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const portalClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            return null;
        }
    });

    const claims = portalClaims(["professor", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const professorId = claims.role === "admin"
        ? String(queryValue("professor_id") || "").trim()
        : claims.sub;

    if (!professorId) {
        return c.json(400, { status: "error", code: "MISSING_PROFESSOR_ID", message: "professor_id is required" });
    }

    const schedules = $app.findRecordsByFilter(
        "schedules",
        "professor_id = {:professorId}",
        "",
        0,
        0,
        { professorId: professorId }
    );
    const subjectSet = new Set();
    for (const sched of schedules) {
        subjectSet.add(sched.getString("subject_id"));
    }

    const subjectIds = Array.from(subjectSet);
    const results = [];

    for (const subjectId of subjectIds) {
        try {
            const subject = $app.findRecordById("subjects", subjectId);
            const groups = $app.findRecordsByFilter(
                "groups",
                "subject_id = {:subjectId}",
                "",
                0,
                0,
                { subjectId: subjectId }
            );

            const sessions = $app.findRecordsByFilter(
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
                const schedule = $app.findRecordById("schedules", sess.getString("schedule_id"));
                if (schedule.getString("subject_id") !== subjectId) continue;
                total += 1;
                const denominator = Math.max(1, sess.getInt("total_students"));
                attended += Math.round((sess.getInt("present_count") / denominator) * 100);
            }

            results.push({
                id: subject.getString("id"),
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
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const portalClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            return null;
        }
    });

    const claims = portalClaims(["professor", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const professorId = claims.role === "admin"
        ? String(queryValue("professor_id") || "").trim()
        : claims.sub;
    const subjectId = String(queryValue("subject_id") || "").trim();

    let schedules = [];
    if (subjectId) {
        schedules = $app.findRecordsByFilter(
            "schedules",
            "subject_id = {:subjectId} && professor_id = {:professorId}",
            "",
            0,
            0,
            { subjectId: subjectId, professorId: professorId }
        );
    } else {
        schedules = $app.findRecordsByFilter(
            "schedules",
            "professor_id = {:professorId}",
            "",
            0,
            0,
            { professorId: professorId }
        );
    }

    const scheduleIds = schedules.map((row) => row.getString("id"));
    const sessionRows = [];
    if (scheduleIds.length > 0) {
        const filter = scheduleIds.map((id) => `schedule_id = \"${id}\"`).join(" || ");
        const rows = $app.findRecordsByFilter("sessions", filter, "-start_time", 100, 0);

        for (const row of rows) {
            try {
                const sched = $app.findRecordById("schedules", row.getString("schedule_id"));
                const subj = $app.findRecordById("subjects", sched.getString("subject_id"));
                sessionRows.push({
                    id: row.getString("id"),
                    status: row.getString("status"),
                    start_time: row.getString("start_time"),
                    end_time: row.getString("end_time"),
                    total_students: row.getInt("total_students"),
                    present_count: row.getInt("present_count"),
                    absent_count: row.getInt("absent_count"),
                    subject_id: subj.getString("id"),
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
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const portalClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            return null;
        }
    });

    const claims = portalClaims(["professor", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const professorId = claims.role === "admin"
        ? String(queryValue("professor_id") || "").trim()
        : claims.sub;
    const subjectId = String(queryValue("subject_id") || "").trim();
    const limit = Number(queryValue("limit") || "20") || 20;

    const schedules = $app.findRecordsByFilter(
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

    const scheduleIds = schedules.map((row) => row.getString("id"));
    if (scheduleIds.length === 0) {
        return c.json(200, { status: "ok", data: { records: [] } });
    }

    const sessionFilter = scheduleIds.map((id) => `schedule_id = \"${id}\"`).join(" || ");
    const sessionRows = $app.findRecordsByFilter("sessions", sessionFilter, "-start_time", 200, 0);
    const sessionIds = sessionRows.map((row) => row.getString("id"));
    if (sessionIds.length === 0) {
        return c.json(200, { status: "ok", data: { records: [] } });
    }

    const attendanceFilter = sessionIds.map((id) => `session_id = \"${id}\"`).join(" || ");
    const attendanceRows = $app.findRecordsByFilter("attendance_records", attendanceFilter, "-check_in_time", limit, 0);

    const records = attendanceRows.map((row) => {
        let student = null;
        let subject = null;
        try {
            student = $app.findRecordById("students", row.getString("student_id"));
            subject = $app.findRecordById("subjects", row.getString("subject_id"));
        } catch (e) {
            // Keep partial row if expansion fails.
        }

        return {
            id: row.getString("id"),
            status: row.getString("status"),
            check_in_time: row.getString("check_in_time"),
            student: student
                ? {
                    id: student.getString("id"),
                    national_id: student.getString("national_id"),
                    name_en: student.getString("name_en"),
                    name_ar: student.getString("name_ar")
                }
                : null,
            subject: subject
                ? {
                    id: subject.getString("id"),
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
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const portalClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            return null;
        }
    });

    const claims = portalClaims(["student", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const studentId = claims.role === "admin"
        ? String(queryValue("student_id") || "").trim()
        : claims.sub;
    const courseId = String(queryValue("course_id") || "").trim();

    const baseFilter = courseId
        ? "student_id = {:studentId} && subject_id = {:subjectId}"
        : "student_id = {:studentId}";

    const params = courseId
        ? { studentId: studentId, subjectId: courseId }
        : { studentId: studentId };

    const rows = $app.findRecordsByFilter("attendance_records", baseFilter, "-check_in_time", 300, 0, params);
    const records = rows.map((row) => {
        let subject = null;
        try {
            subject = $app.findRecordById("subjects", row.getString("subject_id"));
        } catch (e) {
            // keep partial row
        }

        return {
            id: row.getString("id"),
            status: row.getString("status"),
            check_in_time: row.getString("check_in_time"),
            subject: subject
                ? {
                    id: subject.getString("id"),
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
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const portalClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            return null;
        }
    });

    const claims = portalClaims(["student", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const studentId = claims.role === "admin"
        ? String(queryValue("student_id") || "").trim()
        : claims.sub;

    let student;
    try {
        student = $app.findRecordById("students", studentId);
    } catch (e) {
        return c.json(404, { status: "error", code: "STUDENT_NOT_FOUND", message: "Student not found" });
    }

    const registered = student.get("registered_courses");
    let courseIds = Array.isArray(registered) ? registered.filter(Boolean) : [];

    if (courseIds.length === 0) {
        const attendanceRows = $app.findRecordsByFilter(
            "attendance_records",
            "student_id = {:studentId}",
            "",
            0,
            0,
            { studentId: studentId }
        );
        const subjectSet = new Set();
        for (const row of attendanceRows) {
            const subjectId = row.getString("subject_id");
            if (subjectId) subjectSet.add(subjectId);
        }
        courseIds = Array.from(subjectSet);
    }

    const results = [];

    for (const subjectId of courseIds) {
        try {
            const subject = $app.findRecordById("subjects", subjectId);
            const rows = $app.findRecordsByFilter(
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
                id: subject.getString("id"),
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
    const portalClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const claims = portalClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const collections = ["professors", "students", "rooms", "subjects", "sessions"];
    const counts = {};
    for (const col of collections) {
        try {
            counts[col] = $app.findRecordsByFilter(col, "id != ''", "", 0, 0).length;
        } catch (e) {
            counts[col] = 0;
        }
    }

    let activeSessions = 0;
    try {
        activeSessions = $app.findRecordsByFilter("sessions", "status = 'Active'", "", 0, 0).length;
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

const PORTAL_V2_JWT_SECRET = "smart-attendance-jwt-v1";
const PORTAL_V2_DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PORTAL_V2_SLOT_MAP = {
    "1": { start: "09:00", end: "10:00" },
    "2": { start: "10:00", end: "11:00" },
    "3": { start: "11:00", end: "12:00" },
    "4": { start: "12:00", end: "13:00" },
    "5": { start: "13:00", end: "14:00" },
    "6": { start: "14:00", end: "15:00" },
    "7": { start: "15:00", end: "16:00" },
    "8": { start: "16:00", end: "16:30" }
};

function portalV2RequestData(c) {
    const info = c.requestInfo();
    if (info.body && Object.keys(info.body).length > 0) return info.body;
    return info.data || {};
}

function portalV2Query(c, key) {
    const info = c.requestInfo();
    const raw = info.query ? info.query[key] : "";
    if (Array.isArray(raw)) return String(raw[0] || "");
    return String(raw || "");
}

function portalV2Claims(c, allowedRoles) {
    const info = c.requestInfo();
    const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    try {
        const token = authHeader.slice(7).trim();
        const claims = $security.parseJWT(token, PORTAL_V2_JWT_SECRET);
        if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
        return claims;
    } catch (e) {
        try {
            // Admins sign in via PocketBase superuser auth in the frontend.
            // Accept superuser auth tokens as an admin identity fallback.
            const token = authHeader.slice(7).trim();
            const authRecord = $app.findAuthRecordByToken(token, "auth");
            const collectionName = authRecord.collection().name;
            if (collectionName !== "_superusers") return null;

            const claims = {
                sub: authRecord.getString("id"),
                role: "admin",
                type: "access",
                email: authRecord.getString("email")
            };
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (fallbackError) {
            return null;
        }
    }
}

function portalV2ResolveSubjectCode(subject) {
    return subject.getString("subject_code") || subject.getString("code");
}

function portalV2NormalizeDay(dayValue) {
    return String(dayValue || "").trim().toLowerCase();
}

function portalV2NormalizeSemester(semesterValue) {
    const val = String(semesterValue || "").trim().toLowerCase();
    if (val === "spring") return "second";
    if (val === "fall") return "first";
    return val;
}

function portalV2CurrentSemester() {
    const now = new Date();
    const month = now.getMonth() + 1;
    return month >= 2 && month <= 8 ? "second" : "first";
}

function portalV2CurrentAcademicYear() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startYear = month >= 9 ? year : year - 1;
    return String(startYear) + "-" + String(startYear + 1);
}

function portalV2ParseMinutes(timeValue) {
    const value = String(timeValue || "");
    if (!value.includes(":")) return -1;
    const parts = value.split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return -1;
    return (h * 60) + m;
}

function portalV2GuessSlot(startTime) {
    const startMinutes = portalV2ParseMinutes(startTime);
    if (startMinutes < 0) return "";
    for (const slotKey of Object.keys(PORTAL_V2_SLOT_MAP)) {
        const slotMinutes = portalV2ParseMinutes(PORTAL_V2_SLOT_MAP[slotKey].start);
        if (slotMinutes === startMinutes) return slotKey;
    }
    return "";
}

function portalV2StudentIdsFromGroup(groupId) {
    const ids = new Set();
    if (!groupId) return ids;

    try {
        const group = $app.findRecordById("groups", groupId);
        const linked = group.get("students");
        if (Array.isArray(linked)) {
            for (const studentId of linked) {
                if (studentId) ids.add(String(studentId));
            }
        }
    } catch (e) {
        // ignore and continue with fallback
    }

    try {
        const rows = $app.findRecordsByFilter(
            "students",
            "group_id = {:gid}",
            "",
            0,
            0,
            { gid: groupId }
        );
        for (const row of rows) {
            ids.add(row.getString("id"));
        }
    } catch (e) {
        // ignore fallback errors
    }

    return ids;
}

function portalV2ComputeDashboardFromSchedules(scheduleRows) {
    const subjectMap = {};
    const scheduleById = {};
    const uniqueStudentIds = new Set();

    for (const schedule of scheduleRows) {
        const sid = schedule.getString("id");
        scheduleById[sid] = schedule;

        const subjectId = schedule.getString("subject_id");
        if (!subjectId) continue;

        if (!subjectMap[subjectId]) {
            subjectMap[subjectId] = {
                subject_id: subjectId,
                subject_name: "",
                subject_code: "",
                level: schedule.getString("level") || schedule.getInt("level") || "",
                session_count: 0,
                present_count: 0,
                absent_count: 0,
                late_count: 0
            };

            try {
                const subject = $app.findRecordById("subjects", subjectId);
                subjectMap[subjectId].subject_name = subject.getString("name_en") || subject.getString("name_ar");
                subjectMap[subjectId].subject_code = portalV2ResolveSubjectCode(subject);
                subjectMap[subjectId].level = subject.getString("level") || subject.getInt("level") || subjectMap[subjectId].level;
            } catch (e) {
                // keep partial subject data
            }
        }

        const groupIds = portalV2StudentIdsFromGroup(schedule.getString("group_id"));
        for (const studentId of groupIds) {
            uniqueStudentIds.add(studentId);
        }
    }

    const today = new Date();
    const trendBucket = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        trendBucket[key] = { attended: 0, total: 0 };
    }

    const statusDistribution = { present: 0, late: 0, absent: 0 };
    const atRiskMap = {};

    const scheduleIds = Object.keys(scheduleById);
    const sessions = [];
    for (const scheduleId of scheduleIds) {
        const rows = $app.findRecordsByFilter(
            "sessions",
            "schedule_id = {:sid}",
            "-start_time",
            0,
            0,
            { sid: scheduleId }
        );
        for (const row of rows) sessions.push(row);
    }

    let attendanceNumerator = 0;
    let attendanceDenominator = 0;

    for (const session of sessions) {
        const schedule = scheduleById[session.getString("schedule_id")];
        if (!schedule) continue;

        const subjectId = schedule.getString("subject_id");
        if (subjectMap[subjectId]) {
            subjectMap[subjectId].session_count += 1;
        }

        const attendanceRows = $app.findRecordsByFilter(
            "attendance_records",
            "session_id = {:sessionId}",
            "",
            0,
            0,
            { sessionId: session.getString("id") }
        );

        let present = 0;
        let late = 0;
        let absent = 0;
        let excused = 0;

        for (const rec of attendanceRows) {
            const status = String(rec.getString("status") || "").toLowerCase();
            const studentId = rec.getString("student_id");
            if (status === "present") present += 1;
            else if (status === "late") late += 1;
            else if (status === "absent") absent += 1;
            else excused += 1;

            if (subjectMap[subjectId]) {
                if (status === "present") subjectMap[subjectId].present_count += 1;
                if (status === "late") subjectMap[subjectId].late_count += 1;
                if (status === "absent") subjectMap[subjectId].absent_count += 1;
            }

            if (status === "present") statusDistribution.present += 1;
            else if (status === "late") statusDistribution.late += 1;
            else if (status === "absent") statusDistribution.absent += 1;

            const riskKey = studentId + "::" + subjectId;
            if (!atRiskMap[riskKey]) {
                atRiskMap[riskKey] = {
                    student_id: studentId,
                    subject_id: subjectId,
                    total: 0,
                    absent: 0
                };
            }
            atRiskMap[riskKey].total += 1;
            if (status === "absent") atRiskMap[riskKey].absent += 1;
        }

        attendanceNumerator += present + late;
        attendanceDenominator += present + late + absent + excused;

        const sessionDate = String(session.getString("start_time") || "").slice(0, 10);
        if (trendBucket[sessionDate]) {
            trendBucket[sessionDate].attended += present + late;
            trendBucket[sessionDate].total += present + late + absent + excused;
        }
    }

    const subjectsSummary = Object.values(subjectMap).map((item) => {
        const total = item.present_count + item.absent_count + item.late_count;
        return {
            subject_id: item.subject_id,
            subject_name: item.subject_name,
            subject_code: item.subject_code,
            level: item.level,
            session_count: item.session_count,
            avg_rate: total > 0 ? Number((((item.present_count + item.late_count) / total) * 100).toFixed(2)) : 0,
            present_count: item.present_count,
            absent_count: item.absent_count,
            late_count: item.late_count
        };
    });

    const recentTrend = Object.keys(trendBucket).sort().map((dateKey) => {
        const bucket = trendBucket[dateKey];
        return {
            date: dateKey,
            present_pct: bucket.total > 0 ? Number(((bucket.attended / bucket.total) * 100).toFixed(2)) : 0
        };
    });

    const atRiskStudents = [];
    for (const riskKey of Object.keys(atRiskMap)) {
        const row = atRiskMap[riskKey];
        const absencePct = row.total > 0 ? (row.absent / row.total) * 100 : 0;
        if (absencePct <= 25) continue;

        let studentName = "";
        let subjectName = "";
        try {
            const student = $app.findRecordById("students", row.student_id);
            studentName = student.getString("name_en") || student.getString("name_ar");
        } catch (e) {
            // optional relation
        }
        try {
            const subject = $app.findRecordById("subjects", row.subject_id);
            subjectName = subject.getString("name_en") || subject.getString("name_ar");
        } catch (e) {
            // optional relation
        }

        atRiskStudents.push({
            student_id: row.student_id,
            name: studentName,
            absence_pct: Number(absencePct.toFixed(2)),
            subject_name: subjectName
        });
    }

    return {
        total_students: uniqueStudentIds.size,
        avg_attendance_rate: attendanceDenominator > 0
            ? Number(((attendanceNumerator / attendanceDenominator) * 100).toFixed(2))
            : 0,
        total_sessions_held: sessions.length,
        total_absent_count: statusDistribution.absent,
        subjects_summary: subjectsSummary,
        recent_7_days_trend: recentTrend,
        status_distribution: statusDistribution,
        at_risk_students: atRiskStudents
    };
}

function portalV2ExpandStudent(studentRecord) {
    const subjectIds = studentRecord.get("enrolled_subjects") || studentRecord.get("registered_courses") || [];
    const expandedSubjects = [];
    if (Array.isArray(subjectIds)) {
        for (const subjectId of subjectIds) {
            try {
                const subject = $app.findRecordById("subjects", subjectId);
                expandedSubjects.push({
                    id: subject.getString("id"),
                    code: portalV2ResolveSubjectCode(subject),
                    name_en: subject.getString("name_en"),
                    name_ar: subject.getString("name_ar"),
                    level: subject.getString("level") || subject.getInt("level")
                });
            } catch (e) {
                // skip broken subject relations
            }
        }
    }

    let expandedGroup = null;
    const groupId = studentRecord.getString("group_id");
    if (groupId) {
        try {
            const group = $app.findRecordById("groups", groupId);
            expandedGroup = {
                id: group.getString("id"),
                group_name: group.getString("group_name"),
                section_number: group.getInt("section_number")
            };
        } catch (e) {
            // optional relation
        }
    }

    return {
        enrolled_subjects: expandedSubjects,
        group_id: expandedGroup
    };
}

routerAdd("GET", "/api/custom/professor/schedule", (c) => {
    const SLOT_MAP = {
        "1": { start: "09:00", end: "10:00" },
        "2": { start: "10:00", end: "11:00" },
        "3": { start: "11:00", end: "12:00" },
        "4": { start: "12:00", end: "13:00" },
        "5": { start: "13:00", end: "14:00" },
        "6": { start: "14:00", end: "15:00" },
        "7": { start: "15:00", end: "16:00" },
        "8": { start: "16:00", end: "16:30" }
    };

    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const normalizeSemester = ((semesterValue) => {
        const val = String(semesterValue || "").trim().toLowerCase();
        if (val === "spring") return "second";
        if (val === "fall") return "first";
        return val;
    });

    const normalizeDay = ((dayValue) => String(dayValue || "").trim().toLowerCase());

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const currentSemester = (() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        return month >= 2 && month <= 8 ? "second" : "first";
    });

    const currentAcademicYear = (() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const startYear = month >= 9 ? year : year - 1;
        return String(startYear) + "-" + String(startYear + 1);
    });

    const parseMinutes = ((timeValue) => {
        const value = String(timeValue || "");
        if (!value.includes(":")) return -1;
        const parts = value.split(":");
        const h = Number(parts[0]);
        const m = Number(parts[1]);
        if (Number.isNaN(h) || Number.isNaN(m)) return -1;
        return (h * 60) + m;
    });

    const guessSlot = ((startTime) => {
        const startMinutes = parseMinutes(startTime);
        if (startMinutes < 0) return "";
        for (const slotKey of Object.keys(SLOT_MAP)) {
            const slotMinutes = parseMinutes(SLOT_MAP[slotKey].start);
            if (slotMinutes === startMinutes) return slotKey;
        }
        return "";
    });

    const claims = resolveClaims(["professor", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const professorId = claims.role === "admin"
        ? String(queryValue("professor_id") || "").trim()
        : String(claims.sub || "").trim();
    if (!professorId) {
        return c.json(400, { status: "error", code: "MISSING_PROFESSOR_ID", message: "professor_id is required" });
    }

    const semester = String(queryValue("semester") || currentSemester()).toLowerCase();
    const academicYear = String(queryValue("academic_year") || currentAcademicYear());

    const schedules = $app.findRecordsByFilter(
        "schedules",
        "professor_id = {:pid}",
        "day_of_week,start_time",
        0,
        0,
        { pid: professorId }
    ).filter((schedule) => {
        const sem = normalizeSemester(schedule.getString("semester"));
        const ay = String(schedule.getString("academic_year") || "");
        const semesterMatches = !semester || !sem || sem === semester;
        const yearMatches = !academicYear || !ay || ay === academicYear;
        return semesterMatches && yearMatches;
    });

    const rows = [];
    for (const schedule of schedules) {
        let subject = null;
        let room = null;
        let group = null;

        try { subject = $app.findRecordById("subjects", schedule.getString("subject_id")); } catch (e) { }
        try { room = $app.findRecordById("rooms", schedule.getString("room_id")); } catch (e) { }
        try {
            const groupId = schedule.getString("group_id");
            if (groupId) group = $app.findRecordById("groups", groupId);
        } catch (e) { }

        rows.push({
            id: schedule.getString("id"),
            day: normalizeDay(schedule.getString("day_of_week")),
            slot: schedule.getString("lecture_slot") || guessSlot(schedule.getString("start_time")),
            subject_name: subject ? (subject.getString("name_en") || subject.getString("name_ar")) : "",
            subject_code: subject ? resolveSubjectCode(subject) : "",
            room: room ? (room.getString("room_code") || room.getString("name") || room.getString("building")) : "",
            group: group ? group.getString("group_name") : "",
            start_time: schedule.getString("start_time"),
            end_time: schedule.getString("end_time"),
            session_type: String(schedule.getString("session_type") || "lecture").toLowerCase(),
            level: schedule.getString("level") || schedule.getInt("level") || (subject ? (subject.getString("level") || subject.getInt("level")) : "")
        });
    }

    return c.json(200, {
        status: "ok",
        data: {
            schedule: rows
        }
    });
});

routerAdd("GET", "/api/custom/professor/dashboard-stats", (c) => {
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const studentIdsFromGroup = ((groupId) => {
        const ids = new Set();
        if (!groupId) return ids;

        try {
            const group = $app.findRecordById("groups", groupId);
            const linked = group.get("students");
            if (Array.isArray(linked)) {
                for (const studentId of linked) {
                    if (studentId) ids.add(String(studentId));
                }
            }
        } catch (e) {
            // ignore and continue with fallback
        }

        try {
            const rows = $app.findRecordsByFilter(
                "students",
                "group_id = {:gid}",
                "",
                0,
                0,
                { gid: groupId }
            );
            for (const row of rows) {
                ids.add(row.getString("id"));
            }
        } catch (e) {
            // ignore fallback errors
        }

        return ids;
    });

    const computeDashboard = ((scheduleRows) => {
        const subjectMap = {};
        const scheduleById = {};
        const uniqueStudentIds = new Set();

        for (const schedule of scheduleRows) {
            const sid = schedule.getString("id");
            scheduleById[sid] = schedule;

            const subjectId = schedule.getString("subject_id");
            if (!subjectId) continue;

            if (!subjectMap[subjectId]) {
                subjectMap[subjectId] = {
                    subject_id: subjectId,
                    subject_name: "",
                    subject_code: "",
                    level: schedule.getString("level") || schedule.getInt("level") || "",
                    session_count: 0,
                    present_count: 0,
                    absent_count: 0,
                    late_count: 0
                };

                try {
                    const subject = $app.findRecordById("subjects", subjectId);
                    subjectMap[subjectId].subject_name = subject.getString("name_en") || subject.getString("name_ar");
                    subjectMap[subjectId].subject_code = resolveSubjectCode(subject);
                    subjectMap[subjectId].level = subject.getString("level") || subject.getInt("level") || subjectMap[subjectId].level;
                } catch (e) {
                    // keep partial subject data
                }
            }

            const groupIds = studentIdsFromGroup(schedule.getString("group_id"));
            for (const studentId of groupIds) {
                uniqueStudentIds.add(studentId);
            }
        }

        const today = new Date();
        const trendBucket = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            trendBucket[key] = { attended: 0, total: 0 };
        }

        const statusDistribution = { present: 0, late: 0, absent: 0 };
        const atRiskMap = {};

        const scheduleIds = Object.keys(scheduleById);
        const sessions = [];
        for (const scheduleId of scheduleIds) {
            const rows = $app.findRecordsByFilter(
                "sessions",
                "schedule_id = {:sid}",
                "-start_time",
                0,
                0,
                { sid: scheduleId }
            );
            for (const row of rows) sessions.push(row);
        }

        let attendanceNumerator = 0;
        let attendanceDenominator = 0;

        for (const session of sessions) {
            const schedule = scheduleById[session.getString("schedule_id")];
            if (!schedule) continue;

            const subjectId = schedule.getString("subject_id");
            if (subjectMap[subjectId]) {
                subjectMap[subjectId].session_count += 1;
            }

            const attendanceRows = $app.findRecordsByFilter(
                "attendance_records",
                "session_id = {:sessionId}",
                "",
                0,
                0,
                { sessionId: session.getString("id") }
            );

            let present = 0;
            let late = 0;
            let absent = 0;
            let excused = 0;

            for (const rec of attendanceRows) {
                const status = String(rec.getString("status") || "").toLowerCase();
                const studentId = rec.getString("student_id");
                if (status === "present") present += 1;
                else if (status === "late") late += 1;
                else if (status === "absent") absent += 1;
                else excused += 1;

                if (subjectMap[subjectId]) {
                    if (status === "present") subjectMap[subjectId].present_count += 1;
                    if (status === "late") subjectMap[subjectId].late_count += 1;
                    if (status === "absent") subjectMap[subjectId].absent_count += 1;
                }

                if (status === "present") statusDistribution.present += 1;
                else if (status === "late") statusDistribution.late += 1;
                else if (status === "absent") statusDistribution.absent += 1;

                const riskKey = studentId + "::" + subjectId;
                if (!atRiskMap[riskKey]) {
                    atRiskMap[riskKey] = {
                        student_id: studentId,
                        subject_id: subjectId,
                        total: 0,
                        absent: 0
                    };
                }
                atRiskMap[riskKey].total += 1;
                if (status === "absent") atRiskMap[riskKey].absent += 1;
            }

            attendanceNumerator += present + late;
            attendanceDenominator += present + late + absent + excused;

            const sessionDate = String(session.getString("start_time") || "").slice(0, 10);
            if (trendBucket[sessionDate]) {
                trendBucket[sessionDate].attended += present + late;
                trendBucket[sessionDate].total += present + late + absent + excused;
            }
        }

        const subjectsSummary = Object.values(subjectMap).map((item) => {
            const total = item.present_count + item.absent_count + item.late_count;
            return {
                subject_id: item.subject_id,
                subject_name: item.subject_name,
                subject_code: item.subject_code,
                level: item.level,
                session_count: item.session_count,
                avg_rate: total > 0 ? Number((((item.present_count + item.late_count) / total) * 100).toFixed(2)) : 0,
                present_count: item.present_count,
                absent_count: item.absent_count,
                late_count: item.late_count
            };
        });

        const recentTrend = Object.keys(trendBucket).sort().map((dateKey) => {
            const bucket = trendBucket[dateKey];
            return {
                date: dateKey,
                present_pct: bucket.total > 0 ? Number(((bucket.attended / bucket.total) * 100).toFixed(2)) : 0
            };
        });

        const atRiskStudents = [];
        for (const riskKey of Object.keys(atRiskMap)) {
            const row = atRiskMap[riskKey];
            const absencePct = row.total > 0 ? (row.absent / row.total) * 100 : 0;
            if (absencePct <= 25) continue;

            let studentName = "";
            let subjectName = "";
            try {
                const student = $app.findRecordById("students", row.student_id);
                studentName = student.getString("name_en") || student.getString("name_ar");
            } catch (e) {
                // optional relation
            }
            try {
                const subject = $app.findRecordById("subjects", row.subject_id);
                subjectName = subject.getString("name_en") || subject.getString("name_ar");
            } catch (e) {
                // optional relation
            }

            atRiskStudents.push({
                student_id: row.student_id,
                name: studentName,
                absence_pct: Number(absencePct.toFixed(2)),
                subject_name: subjectName
            });
        }

        return {
            total_students: uniqueStudentIds.size,
            avg_attendance_rate: attendanceDenominator > 0
                ? Number(((attendanceNumerator / attendanceDenominator) * 100).toFixed(2))
                : 0,
            total_sessions_held: sessions.length,
            total_absent_count: statusDistribution.absent,
            subjects_summary: subjectsSummary,
            recent_7_days_trend: recentTrend,
            status_distribution: statusDistribution,
            at_risk_students: atRiskStudents
        };
    });

    const claims = resolveClaims(["professor", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const professorId = claims.role === "admin"
        ? String(queryValue("professor_id") || "").trim()
        : String(claims.sub || "").trim();
    if (!professorId) {
        return c.json(400, { status: "error", code: "MISSING_PROFESSOR_ID", message: "professor_id is required" });
    }

    const schedules = $app.findRecordsByFilter(
        "schedules",
        "professor_id = {:pid}",
        "",
        0,
        0,
        { pid: professorId }
    );

    return c.json(200, {
        status: "ok",
        data: computeDashboard(schedules)
    });
});

routerAdd("GET", "/api/custom/ta/dashboard-stats", (c) => {
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const studentIdsFromGroup = ((groupId) => {
        const ids = new Set();
        if (!groupId) return ids;

        try {
            const group = $app.findRecordById("groups", groupId);
            const linked = group.get("students");
            if (Array.isArray(linked)) {
                for (const studentId of linked) {
                    if (studentId) ids.add(String(studentId));
                }
            }
        } catch (e) {
            // ignore and continue with fallback
        }

        try {
            const rows = $app.findRecordsByFilter(
                "students",
                "group_id = {:gid}",
                "",
                0,
                0,
                { gid: groupId }
            );
            for (const row of rows) {
                ids.add(row.getString("id"));
            }
        } catch (e) {
            // ignore fallback errors
        }

        return ids;
    });

    const computeDashboard = ((scheduleRows) => {
        const subjectMap = {};
        const scheduleById = {};
        const uniqueStudentIds = new Set();

        for (const schedule of scheduleRows) {
            const sid = schedule.getString("id");
            scheduleById[sid] = schedule;

            const subjectId = schedule.getString("subject_id");
            if (!subjectId) continue;

            if (!subjectMap[subjectId]) {
                subjectMap[subjectId] = {
                    subject_id: subjectId,
                    subject_name: "",
                    subject_code: "",
                    level: schedule.getString("level") || schedule.getInt("level") || "",
                    session_count: 0,
                    present_count: 0,
                    absent_count: 0,
                    late_count: 0
                };

                try {
                    const subject = $app.findRecordById("subjects", subjectId);
                    subjectMap[subjectId].subject_name = subject.getString("name_en") || subject.getString("name_ar");
                    subjectMap[subjectId].subject_code = resolveSubjectCode(subject);
                    subjectMap[subjectId].level = subject.getString("level") || subject.getInt("level") || subjectMap[subjectId].level;
                } catch (e) {
                    // keep partial subject data
                }
            }

            const groupIds = studentIdsFromGroup(schedule.getString("group_id"));
            for (const studentId of groupIds) {
                uniqueStudentIds.add(studentId);
            }
        }

        const today = new Date();
        const trendBucket = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            trendBucket[key] = { attended: 0, total: 0 };
        }

        const statusDistribution = { present: 0, late: 0, absent: 0 };
        const atRiskMap = {};

        const scheduleIds = Object.keys(scheduleById);
        const sessions = [];
        for (const scheduleId of scheduleIds) {
            const rows = $app.findRecordsByFilter(
                "sessions",
                "schedule_id = {:sid}",
                "-start_time",
                0,
                0,
                { sid: scheduleId }
            );
            for (const row of rows) sessions.push(row);
        }

        let attendanceNumerator = 0;
        let attendanceDenominator = 0;

        for (const session of sessions) {
            const schedule = scheduleById[session.getString("schedule_id")];
            if (!schedule) continue;

            const subjectId = schedule.getString("subject_id");
            if (subjectMap[subjectId]) {
                subjectMap[subjectId].session_count += 1;
            }

            const attendanceRows = $app.findRecordsByFilter(
                "attendance_records",
                "session_id = {:sessionId}",
                "",
                0,
                0,
                { sessionId: session.getString("id") }
            );

            let present = 0;
            let late = 0;
            let absent = 0;
            let excused = 0;

            for (const rec of attendanceRows) {
                const status = String(rec.getString("status") || "").toLowerCase();
                const studentId = rec.getString("student_id");
                if (status === "present") present += 1;
                else if (status === "late") late += 1;
                else if (status === "absent") absent += 1;
                else excused += 1;

                if (subjectMap[subjectId]) {
                    if (status === "present") subjectMap[subjectId].present_count += 1;
                    if (status === "late") subjectMap[subjectId].late_count += 1;
                    if (status === "absent") subjectMap[subjectId].absent_count += 1;
                }

                if (status === "present") statusDistribution.present += 1;
                else if (status === "late") statusDistribution.late += 1;
                else if (status === "absent") statusDistribution.absent += 1;

                const riskKey = studentId + "::" + subjectId;
                if (!atRiskMap[riskKey]) {
                    atRiskMap[riskKey] = {
                        student_id: studentId,
                        subject_id: subjectId,
                        total: 0,
                        absent: 0
                    };
                }
                atRiskMap[riskKey].total += 1;
                if (status === "absent") atRiskMap[riskKey].absent += 1;
            }

            attendanceNumerator += present + late;
            attendanceDenominator += present + late + absent + excused;

            const sessionDate = String(session.getString("start_time") || "").slice(0, 10);
            if (trendBucket[sessionDate]) {
                trendBucket[sessionDate].attended += present + late;
                trendBucket[sessionDate].total += present + late + absent + excused;
            }
        }

        const subjectsSummary = Object.values(subjectMap).map((item) => {
            const total = item.present_count + item.absent_count + item.late_count;
            return {
                subject_id: item.subject_id,
                subject_name: item.subject_name,
                subject_code: item.subject_code,
                level: item.level,
                session_count: item.session_count,
                avg_rate: total > 0 ? Number((((item.present_count + item.late_count) / total) * 100).toFixed(2)) : 0,
                present_count: item.present_count,
                absent_count: item.absent_count,
                late_count: item.late_count
            };
        });

        const recentTrend = Object.keys(trendBucket).sort().map((dateKey) => {
            const bucket = trendBucket[dateKey];
            return {
                date: dateKey,
                present_pct: bucket.total > 0 ? Number(((bucket.attended / bucket.total) * 100).toFixed(2)) : 0
            };
        });

        const atRiskStudents = [];
        for (const riskKey of Object.keys(atRiskMap)) {
            const row = atRiskMap[riskKey];
            const absencePct = row.total > 0 ? (row.absent / row.total) * 100 : 0;
            if (absencePct <= 25) continue;

            let studentName = "";
            let subjectName = "";
            try {
                const student = $app.findRecordById("students", row.student_id);
                studentName = student.getString("name_en") || student.getString("name_ar");
            } catch (e) {
                // optional relation
            }
            try {
                const subject = $app.findRecordById("subjects", row.subject_id);
                subjectName = subject.getString("name_en") || subject.getString("name_ar");
            } catch (e) {
                // optional relation
            }

            atRiskStudents.push({
                student_id: row.student_id,
                name: studentName,
                absence_pct: Number(absencePct.toFixed(2)),
                subject_name: subjectName
            });
        }

        return {
            total_students: uniqueStudentIds.size,
            avg_attendance_rate: attendanceDenominator > 0
                ? Number(((attendanceNumerator / attendanceDenominator) * 100).toFixed(2))
                : 0,
            total_sessions_held: sessions.length,
            total_absent_count: statusDistribution.absent,
            subjects_summary: subjectsSummary,
            recent_7_days_trend: recentTrend,
            status_distribution: statusDistribution,
            at_risk_students: atRiskStudents
        };
    });

    const claims = resolveClaims(["ta", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const taId = claims.role === "admin"
        ? String(queryValue("ta_id") || "").trim()
        : String(claims.sub || "").trim();
    if (!taId) {
        return c.json(400, { status: "error", code: "MISSING_TA_ID", message: "ta_id is required" });
    }

    const schedules = $app.findRecordsByFilter(
        "schedules",
        "ta_id = {:taId}",
        "",
        0,
        0,
        { taId: taId }
    ).filter((schedule) => {
        const sessionType = String(schedule.getString("session_type") || "").toLowerCase();
        return !sessionType || sessionType === "section";
    });

    return c.json(200, {
        status: "ok",
        data: computeDashboard(schedules)
    });
});

routerAdd("GET", "/api/custom/student/dashboard-stats", (c) => {
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const claims = resolveClaims(["student", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const studentId = claims.role === "admin"
        ? String(queryValue("student_id") || "").trim()
        : String(claims.sub || "").trim();
    if (!studentId) {
        return c.json(400, { status: "error", code: "MISSING_STUDENT_ID", message: "student_id is required" });
    }

    let student;
    try {
        student = $app.findRecordById("students", studentId);
    } catch (e) {
        return c.json(404, { status: "error", code: "STUDENT_NOT_FOUND", message: "Student not found" });
    }

    let enrolledSubjectIds = student.get("enrolled_subjects") || student.get("registered_courses") || [];
    if (!Array.isArray(enrolledSubjectIds)) enrolledSubjectIds = [];

    const attendanceRows = $app.findRecordsByFilter(
        "attendance_records",
        "student_id = {:studentId}",
        "-check_in_time",
        0,
        0,
        { studentId: studentId }
    );

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    for (const row of attendanceRows) {
        const status = String(row.getString("status") || "").toLowerCase();
        if (status === "present") totalPresent += 1;
        else if (status === "absent") totalAbsent += 1;
        else if (status === "late") totalLate += 1;
    }

    const totalRecords = totalPresent + totalAbsent + totalLate;
    const overallPct = totalRecords > 0
        ? Number((((totalPresent + totalLate) / totalRecords) * 100).toFixed(2))
        : 0;

    const recordsBySubject = {};
    for (const row of attendanceRows) {
        const subjectId = row.getString("subject_id");
        if (!subjectId) continue;
        if (!recordsBySubject[subjectId]) {
            recordsBySubject[subjectId] = { present: 0, absent: 0, late: 0 };
        }
        const status = String(row.getString("status") || "").toLowerCase();
        if (status === "present") recordsBySubject[subjectId].present += 1;
        else if (status === "absent") recordsBySubject[subjectId].absent += 1;
        else if (status === "late") recordsBySubject[subjectId].late += 1;
    }

    if (enrolledSubjectIds.length === 0) {
        enrolledSubjectIds = Object.keys(recordsBySubject);
    }

    const subjectsBreakdown = [];
    for (const subjectId of enrolledSubjectIds) {
        const stats = recordsBySubject[subjectId] || { present: 0, absent: 0, late: 0 };
        let subject = null;
        try {
            subject = $app.findRecordById("subjects", subjectId);
        } catch (e) {
            // keep partial row
        }

        const total = stats.present + stats.absent + stats.late;
        const pct = total > 0 ? Number((((stats.present + stats.late) / total) * 100).toFixed(2)) : 0;
        let warningLevel = "critical";
        if (pct >= 75) warningLevel = "ok";
        else if (pct >= 60) warningLevel = "warning";
        else if (pct >= 50) warningLevel = "danger";

        subjectsBreakdown.push({
            subject_id: subjectId,
            name: subject ? (subject.getString("name_en") || subject.getString("name_ar")) : "",
            code: subject ? resolveSubjectCode(subject) : "",
            level: subject ? (subject.getString("level") || subject.getInt("level")) : "",
            present: stats.present,
            absent: stats.absent,
            late: stats.late,
            pct: pct,
            warning_level: warningLevel
        });
    }

    const monthlyBucket = {};
    for (const row of attendanceRows) {
        const key = String(row.getString("check_in_time") || "").slice(0, 7);
        if (!key) continue;
        if (!monthlyBucket[key]) monthlyBucket[key] = { attended: 0, total: 0 };
        const status = String(row.getString("status") || "").toLowerCase();
        if (status === "present" || status === "late") monthlyBucket[key].attended += 1;
        monthlyBucket[key].total += 1;
    }

    const monthlyTrend = Object.keys(monthlyBucket).sort().map((monthKey) => {
        const item = monthlyBucket[monthKey];
        return {
            month: monthKey,
            pct: item.total > 0 ? Number(((item.attended / item.total) * 100).toFixed(2)) : 0
        };
    });

    const calendarMap = {};
    for (const row of attendanceRows) {
        const dateKey = String(row.getString("check_in_time") || "").slice(0, 10);
        if (!dateKey) continue;
        const status = String(row.getString("status") || "").toLowerCase();
        if (!calendarMap[dateKey]) {
            calendarMap[dateKey] = status;
        } else if (status === "absent") {
            calendarMap[dateKey] = "absent";
        } else if (status === "late" && calendarMap[dateKey] === "present") {
            calendarMap[dateKey] = "late";
        }
    }

    const calendarData = [];
    const base = new Date();
    for (let i = 59; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        const dateKey = d.toISOString().slice(0, 10);
        calendarData.push({
            date: dateKey,
            status: calendarMap[dateKey] || "no_session"
        });
    }

    let warningLevel = "critical";
    if (overallPct >= 75) warningLevel = "ok";
    else if (overallPct >= 60) warningLevel = "warning";
    else if (overallPct >= 50) warningLevel = "danger";

    return c.json(200, {
        status: "ok",
        data: {
            enrolled_subjects_count: enrolledSubjectIds.length,
            overall_attendance_pct: overallPct,
            total_present: totalPresent,
            total_absent: totalAbsent,
            total_late: totalLate,
            subjects_breakdown: subjectsBreakdown,
            monthly_trend: monthlyTrend,
            warning_status: {
                level: warningLevel,
                threshold_pct: 75,
                current_pct: overallPct
            },
            calendar_data: calendarData
        }
    });
});

routerAdd("GET", "/api/custom/admin/schedule", (c) => {
    const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const SLOT_MAP = {
        "1": { start: "09:00", end: "10:00" },
        "2": { start: "10:00", end: "11:00" },
        "3": { start: "11:00", end: "12:00" },
        "4": { start: "12:00", end: "13:00" },
        "5": { start: "13:00", end: "14:00" },
        "6": { start: "14:00", end: "15:00" },
        "7": { start: "15:00", end: "16:00" },
        "8": { start: "16:00", end: "16:30" }
    };

    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const normalizeSemester = ((semesterValue) => {
        const val = String(semesterValue || "").trim().toLowerCase();
        if (val === "spring") return "second";
        if (val === "fall") return "first";
        return val;
    });

    const normalizeDay = ((dayValue) => String(dayValue || "").trim().toLowerCase());

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const currentSemester = (() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        return month >= 2 && month <= 8 ? "second" : "first";
    });

    const currentAcademicYear = (() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const startYear = month >= 9 ? year : year - 1;
        return String(startYear) + "-" + String(startYear + 1);
    });

    const parseMinutes = ((timeValue) => {
        const value = String(timeValue || "");
        if (!value.includes(":")) return -1;
        const parts = value.split(":");
        const h = Number(parts[0]);
        const m = Number(parts[1]);
        if (Number.isNaN(h) || Number.isNaN(m)) return -1;
        return (h * 60) + m;
    });

    const guessSlot = ((startTime) => {
        const startMinutes = parseMinutes(startTime);
        if (startMinutes < 0) return "";
        for (const slotKey of Object.keys(SLOT_MAP)) {
            const slotMinutes = parseMinutes(SLOT_MAP[slotKey].start);
            if (slotMinutes === startMinutes) return slotKey;
        }
        return "";
    });

    const claims = resolveClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const level = String(queryValue("level") || "").trim();
    const semester = String(queryValue("semester") || currentSemester()).toLowerCase();
    const academicYear = String(queryValue("academic_year") || currentAcademicYear());

    const allRows = $app.findRecordsByFilter("schedules", "id != ''", "", 0, 0);
    const rows = allRows.filter((row) => {
        const rowLevel = String(row.getString("level") || row.getInt("level") || "");
        const rowSemester = normalizeSemester(row.getString("semester"));
        const rowYear = String(row.getString("academic_year") || "");

        const levelMatch = !level || rowLevel === level;
        const semesterMatch = !semester || !rowSemester || rowSemester === semester;
        const yearMatch = !academicYear || !rowYear || rowYear === academicYear;
        return levelMatch && semesterMatch && yearMatch;
    });

    const grid = {};
    for (const day of DAY_ORDER) {
        grid[day] = {};
        for (const slot of Object.keys(SLOT_MAP)) {
            grid[day][slot] = [];
        }
    }

    const entries = [];
    for (const row of rows) {
        let subject = null;
        let professor = null;
        let ta = null;
        let room = null;
        let group = null;

        try { subject = $app.findRecordById("subjects", row.getString("subject_id")); } catch (e) { }
        try {
            const pid = row.getString("professor_id");
            if (pid) professor = $app.findRecordById("professors", pid);
        } catch (e) { }
        try {
            const tid = row.getString("ta_id");
            if (tid) ta = $app.findRecordById("teaching_assistants", tid);
        } catch (e) { }
        try { room = $app.findRecordById("rooms", row.getString("room_id")); } catch (e) { }
        try {
            const gid = row.getString("group_id");
            if (gid) group = $app.findRecordById("groups", gid);
        } catch (e) { }

        const day = normalizeDay(row.getString("day_of_week"));
        const slot = row.getString("lecture_slot") || guessSlot(row.getString("start_time"));
        const item = {
            id: row.getString("id"),
            day_of_week: day,
            lecture_slot: slot,
            level: row.getString("level") || row.getInt("level") || "",
            semester: row.getString("semester") || "",
            academic_year: row.getString("academic_year") || "",
            subject_id: row.getString("subject_id"),
            subject_code: subject ? resolveSubjectCode(subject) : "",
            subject_name: subject ? (subject.getString("name_en") || subject.getString("name_ar")) : "",
            session_type: String(row.getString("session_type") || "").toLowerCase(),
            professor_id: row.getString("professor_id"),
            professor_name: professor ? (professor.getString("name_en") || professor.getString("name_ar") || professor.getString("name")) : "",
            ta_id: row.getString("ta_id"),
            ta_name: ta ? (ta.getString("name") || ta.getString("name_en") || ta.getString("name_ar")) : "",
            room_id: row.getString("room_id"),
            room_name: room ? (room.getString("room_code") || room.getString("name") || room.getString("building")) : "",
            group_id: row.getString("group_id"),
            group_name: group ? group.getString("group_name") : "",
            section_number: row.getString("section_number"),
            start_time: row.getString("start_time"),
            end_time: row.getString("end_time")
        };

        entries.push(item);
        if (grid[day] && grid[day][slot]) {
            grid[day][slot].push(item);
        }
    }

    return c.json(200, {
        status: "ok",
        data: {
            level: level,
            semester: semester,
            academic_year: academicYear,
            grid: grid,
            entries: entries
        }
    });
});

routerAdd("POST", "/api/custom/admin/schedule/save", (c) => {
    const SLOT_MAP = {
        "1": { start: "09:00", end: "10:00" },
        "2": { start: "10:00", end: "11:00" },
        "3": { start: "11:00", end: "12:00" },
        "4": { start: "12:00", end: "13:00" },
        "5": { start: "13:00", end: "14:00" },
        "6": { start: "14:00", end: "15:00" },
        "7": { start: "15:00", end: "16:00" },
        "8": { start: "16:00", end: "16:30" }
    };

    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const requestData = (() => {
        const info = c.requestInfo();
        if (info.body && Object.keys(info.body).length > 0) return info.body;
        return info.data || {};
    });

    const normalizeSemester = ((semesterValue) => {
        const val = String(semesterValue || "").trim().toLowerCase();
        if (val === "spring") return "second";
        if (val === "fall") return "first";
        return val;
    });

    const currentSemester = (() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        return month >= 2 && month <= 8 ? "second" : "first";
    });

    const currentAcademicYear = (() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const startYear = month >= 9 ? year : year - 1;
        return String(startYear) + "-" + String(startYear + 1);
    });

    const claims = resolveClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const data = requestData;
    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (entries.length === 0) {
        return c.json(400, { status: "error", code: "INVALID_PAYLOAD", message: "entries array is required" });
    }

    const level = String(entries[0].level || "").trim();
    const semester = String(entries[0].semester || currentSemester()).toLowerCase();
    const academicYear = String(entries[0].academic_year || currentAcademicYear());

    const existingRows = $app.findRecordsByFilter("schedules", "id != ''", "", 0, 0);
    for (const row of existingRows) {
        const rowLevel = String(row.getString("level") || row.getInt("level") || "");
        const rowSemester = normalizeSemester(row.getString("semester"));
        const rowYear = String(row.getString("academic_year") || "");
        if (rowLevel === level && rowSemester === semester && rowYear === academicYear) {
            $app.delete(row);
        }
    }

    const schedulesCollection = $app.findCollectionByNameOrId("schedules");
    const createdIds = [];

    for (const entry of entries) {
        const row = new Record(schedulesCollection);
        row.set("subject_id", String(entry.subject_id || ""));
        row.set("professor_id", entry.professor_id ? String(entry.professor_id) : "");
        row.set("ta_id", entry.ta_id ? String(entry.ta_id) : "");
        row.set("room_id", String(entry.room_id || ""));
        row.set("group_id", entry.group_id ? String(entry.group_id) : "");
        row.set("day_of_week", String(entry.day_of_week || "").toLowerCase());
        row.set("lecture_slot", String(entry.lecture_slot || ""));

        const slotRange = SLOT_MAP[String(entry.lecture_slot || "")];
        row.set("start_time", String(entry.start_time || (slotRange ? slotRange.start : "")));
        row.set("end_time", String(entry.end_time || (slotRange ? slotRange.end : "")));
        row.set("session_type", String(entry.session_type || "lecture").toLowerCase());
        row.set("level", String(entry.level || level));
        row.set("section_number", String(entry.section_number || ""));
        row.set("semester", String(entry.semester || semester).toLowerCase());
        row.set("academic_year", String(entry.academic_year || academicYear));
        row.set("is_active", false);
        $app.save(row);
        createdIds.push(row.getString("id"));
    }

    let version = null;
    try {
        const versionsCollection = $app.findCollectionByNameOrId("schedule_versions");
        version = new Record(versionsCollection);
        version.set("label", "Semester " + semester + " " + academicYear + " v" + String(Date.now()));
        version.set("level", level);
        version.set("is_active", false);
        version.set("snapshot_json", entries);

        try {
            const superuser = $app.findRecordById("_superusers", claims.sub);
            version.set("published_by", superuser.getString("id"));
        } catch (e) {
            // optional relation
        }

        $app.save(version);
    } catch (e) {
        // schedule versions may not exist yet; do not fail schedule save
    }

    return c.json(200, {
        status: "ok",
        message: "Schedule draft saved",
        data: {
            level: level,
            semester: semester,
            academic_year: academicYear,
            created_count: createdIds.length,
            created_ids: createdIds,
            version_id: version ? version.getString("id") : ""
        }
    });
});

routerAdd("POST", "/api/custom/admin/schedule/publish", (c) => {
    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const requestData = (() => {
        const info = c.requestInfo();
        if (info.body && Object.keys(info.body).length > 0) return info.body;
        return info.data || {};
    });

    const normalizeSemester = ((semesterValue) => {
        const val = String(semesterValue || "").trim().toLowerCase();
        if (val === "spring") return "second";
        if (val === "fall") return "first";
        return val;
    });

    const claims = resolveClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const data = requestData;
    const versionId = String(data.version_id || "").trim();
    if (!versionId) {
        return c.json(400, { status: "error", code: "MISSING_VERSION_ID", message: "version_id is required" });
    }

    let version;
    try {
        version = $app.findRecordById("schedule_versions", versionId);
    } catch (e) {
        return c.json(404, { status: "error", code: "VERSION_NOT_FOUND", message: "Schedule version not found" });
    }

    const targetLevel = String(version.getString("level") || "");
    const allVersions = $app.findRecordsByFilter(
        "schedule_versions",
        "level = {:level}",
        "",
        0,
        0,
        { level: targetLevel }
    );

    for (const row of allVersions) {
        row.set("is_active", row.getString("id") === versionId);
        if (row.getString("id") === versionId) {
            row.set("published_at", new Date().toISOString());
            try {
                const superuser = $app.findRecordById("_superusers", claims.sub);
                row.set("published_by", superuser.getString("id"));
            } catch (e) {
                // optional relation
            }
        }
        $app.save(row);
    }

    let publishedSemester = "";
    let publishedYear = "";
    const snapshot = version.get("snapshot_json");
    if (Array.isArray(snapshot) && snapshot.length > 0) {
        publishedSemester = String(snapshot[0].semester || "").toLowerCase();
        publishedYear = String(snapshot[0].academic_year || "");
    }

    const allSchedules = $app.findRecordsByFilter("schedules", "id != ''", "", 0, 0);
    for (const row of allSchedules) {
        const rowLevel = String(row.getString("level") || row.getInt("level") || "");
        if (rowLevel !== targetLevel) continue;

        const rowSemester = normalizeSemester(row.getString("semester"));
        const rowYear = String(row.getString("academic_year") || "");
        const isTarget = (!publishedSemester || rowSemester === publishedSemester) && (!publishedYear || rowYear === publishedYear);
        row.set("is_active", isTarget);
        $app.save(row);
    }

    return c.json(200, {
        status: "ok",
        message: "Schedule version published",
        data: {
            version_id: versionId,
            level: targetLevel
        }
    });
});

routerAdd("GET", "/api/custom/admin/students", (c) => {
    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const expandStudent = ((studentRecord) => {
        const subjectIds = studentRecord.get("enrolled_subjects") || studentRecord.get("registered_courses") || [];
        const expandedSubjects = [];
        if (Array.isArray(subjectIds)) {
            for (const subjectId of subjectIds) {
                try {
                    const subject = $app.findRecordById("subjects", subjectId);
                    expandedSubjects.push({
                        id: subject.getString("id"),
                        code: resolveSubjectCode(subject),
                        name_en: subject.getString("name_en"),
                        name_ar: subject.getString("name_ar"),
                        level: subject.getString("level") || subject.getInt("level")
                    });
                } catch (e) {
                    // skip broken subject relations
                }
            }
        }

        let expandedGroup = null;
        const groupId = studentRecord.getString("group_id");
        if (groupId) {
            try {
                const group = $app.findRecordById("groups", groupId);
                expandedGroup = {
                    id: group.getString("id"),
                    group_name: group.getString("group_name"),
                    section_number: group.getInt("section_number")
                };
            } catch (e) {
                // optional relation
            }
        }

        return {
            enrolled_subjects: expandedSubjects,
            group_id: expandedGroup
        };
    });

    const claims = resolveClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const level = String(queryValue("level") || "").trim();
    const search = String(queryValue("search") || "").trim().toLowerCase();
    const groupId = String(queryValue("group_id") || "").trim();
    const subjectId = String(queryValue("subject_id") || "").trim();
    const statusFilter = String(queryValue("status") || "").trim().toLowerCase();
    const pageRaw = Number(queryValue("page") || "1");
    const perPageRaw = Number(queryValue("per_page") || "20");
    const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
    const perPage = Number.isNaN(perPageRaw) ? 20 : Math.max(1, Math.min(200, perPageRaw));

    const allStudents = $app.findRecordsByFilter("students", "id != ''", "-id", 0, 0);
    const filtered = allStudents.filter((student) => {
        const studentLevel = String(student.getString("level") || student.getInt("level") || student.getInt("level_semester") || "");
        const levelMatch = !level || studentLevel === level;

        const studentGroupId = String(student.getString("group_id") || "");
        const groupMatch = !groupId || studentGroupId === groupId;

        const subjectIds = student.get("enrolled_subjects") || student.get("registered_courses") || [];
        const subjectMatch = !subjectId || (Array.isArray(subjectIds) && subjectIds.includes(subjectId));

        const accountStatus = String(student.getString("status") || student.getString("enrollment_status") || "").toLowerCase();
        const statusMatch = !statusFilter || accountStatus === statusFilter;

        const haystack = [
            student.getString("name_en"),
            student.getString("name_ar"),
            student.getString("student_id_number"),
            student.getString("national_id"),
            student.getString("email")
        ].join(" ").toLowerCase();
        const searchMatch = !search || haystack.includes(search);

        return levelMatch && groupMatch && subjectMatch && statusMatch && searchMatch;
    });

    const totalItems = filtered.length;
    const offset = (page - 1) * perPage;
    const rows = filtered.slice(offset, offset + perPage).map((student) => {
        return {
            id: student.getString("id"),
            name_en: student.getString("name_en"),
            name_ar: student.getString("name_ar"),
            email: student.getString("email"),
            student_id_number: student.getString("student_id_number") || student.getString("national_id"),
            level: student.getString("level") || student.getInt("level") || student.getInt("level_semester"),
            group_id: student.getString("group_id"),
            status: student.getString("status") || student.getString("enrollment_status"),
            rfid_card_id: student.getString("rfid_card_id") || student.getString("rfid_uid"),
            rfid_status: student.getString("rfid_status"),
            absence_percentage: student.getFloat("absence_percentage") || student.getFloat("attendance_percentage"),
            expand: expandStudent(student)
        };
    });

    return c.json(200, {
        status: "ok",
        data: {
            page: page,
            per_page: perPage,
            total_items: totalItems,
            total_pages: Math.max(1, Math.ceil(totalItems / perPage)),
            items: rows
        }
    });
});

routerAdd("PATCH", "/api/custom/admin/student/{id}", (c) => {
    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const requestData = (() => {
        const info = c.requestInfo();
        if (info.body && Object.keys(info.body).length > 0) return info.body;
        return info.data || {};
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const expandStudent = ((studentRecord) => {
        const subjectIds = studentRecord.get("enrolled_subjects") || studentRecord.get("registered_courses") || [];
        const expandedSubjects = [];
        if (Array.isArray(subjectIds)) {
            for (const subjectId of subjectIds) {
                try {
                    const subject = $app.findRecordById("subjects", subjectId);
                    expandedSubjects.push({
                        id: subject.getString("id"),
                        code: resolveSubjectCode(subject),
                        name_en: subject.getString("name_en"),
                        name_ar: subject.getString("name_ar"),
                        level: subject.getString("level") || subject.getInt("level")
                    });
                } catch (e) {
                    // skip broken subject relations
                }
            }
        }

        let expandedGroup = null;
        const groupId = studentRecord.getString("group_id");
        if (groupId) {
            try {
                const group = $app.findRecordById("groups", groupId);
                expandedGroup = {
                    id: group.getString("id"),
                    group_name: group.getString("group_name"),
                    section_number: group.getInt("section_number")
                };
            } catch (e) {
                // optional relation
            }
        }

        return {
            enrolled_subjects: expandedSubjects,
            group_id: expandedGroup
        };
    });

    const claims = resolveClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const studentId = String(c.request.pathValue("id") || "").trim();
    if (!studentId) {
        return c.json(400, { status: "error", code: "MISSING_STUDENT_ID", message: "student id is required" });
    }

    let student;
    try {
        student = $app.findRecordById("students", studentId);
    } catch (e) {
        return c.json(404, { status: "error", code: "STUDENT_NOT_FOUND", message: "Student not found" });
    }

    const body = requestData;
    const targetLevel = body.level !== undefined
        ? String(body.level)
        : String(student.getString("level") || student.getInt("level") || student.getInt("level_semester") || "");

    if (Array.isArray(body.enrolled_subjects)) {
        for (const subjectId of body.enrolled_subjects) {
            let subject;
            try {
                subject = $app.findRecordById("subjects", subjectId);
            } catch (e) {
                return c.json(400, { status: "error", code: "INVALID_SUBJECT", message: "Subject not found: " + subjectId });
            }

            const subjectLevel = String(subject.getString("level") || subject.getInt("level") || "");
            if (targetLevel && subjectLevel && targetLevel !== subjectLevel) {
                return c.json(400, {
                    status: "error",
                    code: "SUBJECT_LEVEL_MISMATCH",
                    message: "Subject " + (subject.getString("name_en") || subjectId) + " does not match student level"
                });
            }
        }
        student.set("enrolled_subjects", body.enrolled_subjects);
        student.set("registered_courses", body.enrolled_subjects);
    }

    if (body.level !== undefined) student.set("level", String(body.level));
    if (body.group_id !== undefined) student.set("group_id", body.group_id ? String(body.group_id) : "");
    if (body.rfid_card_id !== undefined) student.set("rfid_card_id", String(body.rfid_card_id || ""));
    if (body.rfid_status !== undefined) student.set("rfid_status", String(body.rfid_status || ""));

    if (body.status !== undefined) {
        const statusValue = String(body.status || "").toLowerCase();
        const enrollmentMap = {
            active: "Active",
            suspended: "Suspended",
            graduated: "Graduated"
        };
        if (enrollmentMap[statusValue]) {
            student.set("enrollment_status", enrollmentMap[statusValue]);
        }
    }

    $app.save(student);

    return c.json(200, {
        status: "ok",
        message: "Student updated",
        data: {
            id: student.getString("id"),
            name_en: student.getString("name_en"),
            name_ar: student.getString("name_ar"),
            level: student.getString("level") || student.getInt("level") || student.getInt("level_semester"),
            group_id: student.getString("group_id"),
            status: student.getString("status") || student.getString("enrollment_status"),
            rfid_card_id: student.getString("rfid_card_id") || student.getString("rfid_uid"),
            rfid_status: student.getString("rfid_status"),
            expand: expandStudent(student)
        }
    });
});

routerAdd("GET", "/api/custom/admin/teaching-assistants", (c) => {
    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const claims = resolveClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const rows = $app.findRecordsByFilter("teaching_assistants", "id != ''", "-id", 0, 0);
    const items = rows.map((ta) => {
        const subjectIds = ta.get("assigned_subjects") || [];
        const groupIds = ta.get("assigned_groups") || [];
        const expandedSubjects = [];
        const expandedGroups = [];

        if (Array.isArray(subjectIds)) {
            for (const subjectId of subjectIds) {
                try {
                    const subject = $app.findRecordById("subjects", subjectId);
                    expandedSubjects.push({
                        id: subject.getString("id"),
                        code: resolveSubjectCode(subject),
                        name_en: subject.getString("name_en"),
                        name_ar: subject.getString("name_ar"),
                        level: subject.getString("level") || subject.getInt("level")
                    });
                } catch (e) {
                    // skip missing relation
                }
            }
        }

        if (Array.isArray(groupIds)) {
            for (const groupId of groupIds) {
                try {
                    const group = $app.findRecordById("groups", groupId);
                    expandedGroups.push({
                        id: group.getString("id"),
                        group_name: group.getString("group_name"),
                        section_number: group.getInt("section_number")
                    });
                } catch (e) {
                    // skip missing relation
                }
            }
        }

        return {
            id: ta.getString("id"),
            name: ta.getString("name"),
            name_ar: ta.getString("name_ar"),
            email: ta.getString("email"),
            employee_id: ta.getString("employee_id"),
            department: ta.getString("department"),
            phone: ta.getString("phone"),
            status: ta.getString("status"),
            assigned_subjects: ta.get("assigned_subjects") || [],
            assigned_groups: ta.get("assigned_groups") || [],
            expand: {
                assigned_subjects: expandedSubjects,
                assigned_groups: expandedGroups
            }
        };
    });

    return c.json(200, {
        status: "ok",
        data: {
            items: items
        }
    });
});

routerAdd("POST", "/api/custom/admin/teaching-assistants", (c) => {
    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const requestData = (() => {
        const info = c.requestInfo();
        if (info.body && Object.keys(info.body).length > 0) return info.body;
        return info.data || {};
    });

    const claims = resolveClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const body = requestData;
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const assignedSubjects = Array.isArray(body.assigned_subjects) ? body.assigned_subjects : [];
    const assignedGroups = Array.isArray(body.assigned_groups) ? body.assigned_groups : [];

    if (!name || !email || !password || assignedSubjects.length === 0) {
        return c.json(400, {
            status: "error",
            code: "INVALID_PAYLOAD",
            message: "name, email, password, and assigned_subjects are required"
        });
    }

    const collection = $app.findCollectionByNameOrId("teaching_assistants");
    const ta = new Record(collection);
    ta.set("name", name);
    ta.set("name_ar", String(body.name_ar || ""));
    ta.set("email", email);
    ta.set("password_hash", $security.sha256(email + "::" + password));
    ta.set("employee_id", String(body.employee_id || ""));
    ta.set("assigned_subjects", assignedSubjects);
    ta.set("assigned_groups", assignedGroups);
    ta.set("department", String(body.department || ""));
    ta.set("phone", String(body.phone || ""));
    ta.set("status", String(body.status || "active"));
    $app.save(ta);

    return c.json(201, {
        status: "ok",
        message: "Teaching assistant created",
        data: {
            id: ta.getString("id"),
            name: ta.getString("name"),
            email: ta.getString("email"),
            employee_id: ta.getString("employee_id"),
            assigned_subjects: ta.get("assigned_subjects") || [],
            assigned_groups: ta.get("assigned_groups") || []
        }
    });
});

routerAdd("PATCH", "/api/custom/admin/teaching-assistants/{id}", (c) => {
    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const requestData = (() => {
        const info = c.requestInfo();
        if (info.body && Object.keys(info.body).length > 0) return info.body;
        return info.data || {};
    });

    const claims = resolveClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const taId = String(c.request.pathValue("id") || "").trim();
    if (!taId) {
        return c.json(400, { status: "error", code: "MISSING_TA_ID", message: "ta id is required" });
    }

    let ta;
    try {
        ta = $app.findRecordById("teaching_assistants", taId);
    } catch (e) {
        return c.json(404, { status: "error", code: "TA_NOT_FOUND", message: "Teaching assistant not found" });
    }

    const body = requestData;
    if (body.name !== undefined) ta.set("name", String(body.name || ""));
    if (body.name_ar !== undefined) ta.set("name_ar", String(body.name_ar || ""));
    if (body.email !== undefined) ta.set("email", String(body.email || "").trim().toLowerCase());
    if (body.employee_id !== undefined) ta.set("employee_id", String(body.employee_id || ""));
    if (body.department !== undefined) ta.set("department", String(body.department || ""));
    if (body.phone !== undefined) ta.set("phone", String(body.phone || ""));
    if (body.status !== undefined) ta.set("status", String(body.status || "active"));
    if (Array.isArray(body.assigned_subjects)) ta.set("assigned_subjects", body.assigned_subjects);
    if (Array.isArray(body.assigned_groups)) ta.set("assigned_groups", body.assigned_groups);

    if (body.password !== undefined) {
        const email = String(ta.getString("email") || "").toLowerCase();
        ta.set("password_hash", $security.sha256(email + "::" + String(body.password || "")));
    }

    $app.save(ta);

    return c.json(200, {
        status: "ok",
        message: "Teaching assistant updated",
        data: {
            id: ta.getString("id"),
            name: ta.getString("name"),
            email: ta.getString("email"),
            employee_id: ta.getString("employee_id"),
            assigned_subjects: ta.get("assigned_subjects") || [],
            assigned_groups: ta.get("assigned_groups") || [],
            status: ta.getString("status")
        }
    });
});

routerAdd("DELETE", "/api/custom/admin/teaching-assistants/{id}", (c) => {
    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const claims = resolveClaims(["admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const taId = String(c.request.pathValue("id") || "").trim();
    if (!taId) {
        return c.json(400, { status: "error", code: "MISSING_TA_ID", message: "ta id is required" });
    }

    let ta;
    try {
        ta = $app.findRecordById("teaching_assistants", taId);
    } catch (e) {
        return c.json(404, { status: "error", code: "TA_NOT_FOUND", message: "Teaching assistant not found" });
    }

    $app.delete(ta);
    return c.json(200, {
        status: "ok",
        message: "Teaching assistant deleted"
    });
});

routerAdd("GET", "/api/custom/attendance/export", (c) => {
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const claims = resolveClaims(["professor", "ta", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const sessionId = String(queryValue("session_id") || "").trim();
    if (!sessionId) {
        return c.json(400, { status: "error", code: "MISSING_SESSION_ID", message: "session_id is required" });
    }

    let session;
    let schedule;
    try {
        session = $app.findRecordById("sessions", sessionId);
        schedule = $app.findRecordById("schedules", session.getString("schedule_id"));
    } catch (e) {
        return c.json(404, { status: "error", code: "SESSION_NOT_FOUND", message: "Session not found" });
    }

    let subject = null;
    let professor = null;
    let ta = null;
    try { subject = $app.findRecordById("subjects", schedule.getString("subject_id")); } catch (e) { }
    try {
        const pid = schedule.getString("professor_id") || session.getString("professor_id");
        if (pid) professor = $app.findRecordById("professors", pid);
    } catch (e) { }
    try {
        const tid = schedule.getString("ta_id");
        if (tid) ta = $app.findRecordById("teaching_assistants", tid);
    } catch (e) { }

    const rows = $app.findRecordsByFilter(
        "attendance_records",
        "session_id = {:sid}",
        "check_in_time",
        0,
        0,
        { sid: sessionId }
    );

    const records = rows.map((row) => {
        let student = null;
        try { student = $app.findRecordById("students", row.getString("student_id")); } catch (e) { }
        return {
            attendance_id: row.getString("id"),
            student_id: row.getString("student_id"),
            student_name: student ? (student.getString("name_en") || student.getString("name_ar")) : "",
            student_name_ar: student ? student.getString("name_ar") : "",
            student_id_number: student ? (student.getString("student_id_number") || student.getString("national_id")) : "",
            status: row.getString("status"),
            check_in_time: row.getString("check_in_time")
        };
    });

    return c.json(200, {
        status: "ok",
        data: {
            session_id: sessionId,
            date: String(session.getString("start_time") || "").slice(0, 10),
            subject: {
                id: subject ? subject.getString("id") : schedule.getString("subject_id"),
                name: subject ? (subject.getString("name_en") || subject.getString("name_ar")) : "",
                code: subject ? resolveSubjectCode(subject) : ""
            },
            professor_ta_name: ta
                ? (ta.getString("name") || ta.getString("name_en") || ta.getString("name_ar"))
                : (professor ? (professor.getString("name_en") || professor.getString("name_ar") || professor.getString("name")) : ""),
            start_time: session.getString("start_time"),
            end_time: session.getString("end_time"),
            records: records
        }
    });
});

routerAdd("GET", "/api/custom/attendance/subject-export", (c) => {
    const queryValue = ((key) => {
        const info = c.requestInfo();
        const raw = info.query ? info.query[key] : "";
        if (Array.isArray(raw)) return String(raw[0] || "");
        return String(raw || "");
    });

    const resolveClaims = ((allowedRoles) => {
        const info = c.requestInfo();
        const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        try {
            const token = authHeader.slice(7).trim();
            const claims = $security.parseJWT(token, "smart-attendance-jwt-v1");
            if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
            return claims;
        } catch (e) {
            try {
                const token = authHeader.slice(7).trim();
                const authRecord = $app.findAuthRecordByToken(token, "auth");
                const collectionName = authRecord.collection().name;
                if (collectionName !== "_superusers") return null;

                const claims = {
                    sub: authRecord.getString("id"),
                    role: "admin",
                    type: "access",
                    email: authRecord.getString("email")
                };
                if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
                return claims;
            } catch (fallbackError) {
                return null;
            }
        }
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const claims = resolveClaims(["professor", "ta", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const subjectId = String(queryValue("subject_id") || "").trim();
    const dateFrom = String(queryValue("date_from") || "").trim();
    const dateTo = String(queryValue("date_to") || "").trim();

    if (!subjectId) {
        return c.json(400, { status: "error", code: "MISSING_SUBJECT_ID", message: "subject_id is required" });
    }

    let subject;
    try {
        subject = $app.findRecordById("subjects", subjectId);
    } catch (e) {
        return c.json(404, { status: "error", code: "SUBJECT_NOT_FOUND", message: "Subject not found" });
    }

    const schedules = $app.findRecordsByFilter(
        "schedules",
        "subject_id = {:sid}",
        "",
        0,
        0,
        { sid: subjectId }
    );

    const groupedSessions = [];
    for (const schedule of schedules) {
        let sessionFilter = "schedule_id = {:scheduleId}";
        const params = { scheduleId: schedule.getString("id") };

        if (dateFrom) {
            sessionFilter += " && start_time >= {:dateFrom}";
            params.dateFrom = dateFrom;
        }
        if (dateTo) {
            sessionFilter += " && start_time <= {:dateTo}";
            params.dateTo = dateTo;
        }

        const sessions = $app.findRecordsByFilter("sessions", sessionFilter, "start_time", 0, 0, params);
        for (const session of sessions) {
            const attendanceRows = $app.findRecordsByFilter(
                "attendance_records",
                "session_id = {:sessionId}",
                "check_in_time",
                0,
                0,
                { sessionId: session.getString("id") }
            );

            const records = attendanceRows.map((row) => {
                let student = null;
                try { student = $app.findRecordById("students", row.getString("student_id")); } catch (e) { }
                return {
                    attendance_id: row.getString("id"),
                    student_id: row.getString("student_id"),
                    student_name: student ? (student.getString("name_en") || student.getString("name_ar")) : "",
                    student_id_number: student ? (student.getString("student_id_number") || student.getString("national_id")) : "",
                    status: row.getString("status"),
                    check_in_time: row.getString("check_in_time")
                };
            });

            let professor = null;
            let ta = null;
            try {
                const pid = schedule.getString("professor_id") || session.getString("professor_id");
                if (pid) professor = $app.findRecordById("professors", pid);
            } catch (e) { }
            try {
                const tid = schedule.getString("ta_id");
                if (tid) ta = $app.findRecordById("teaching_assistants", tid);
            } catch (e) { }

            groupedSessions.push({
                session_id: session.getString("id"),
                date: String(session.getString("start_time") || "").slice(0, 10),
                start_time: session.getString("start_time"),
                end_time: session.getString("end_time"),
                session_type: schedule.getString("session_type") || "",
                instructor: ta
                    ? (ta.getString("name") || ta.getString("name_en") || ta.getString("name_ar"))
                    : (professor ? (professor.getString("name_en") || professor.getString("name_ar") || professor.getString("name")) : ""),
                records: records
            });
        }
    }

    groupedSessions.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

    return c.json(200, {
        status: "ok",
        data: {
            subject: {
                id: subject.getString("id"),
                name: subject.getString("name_en") || subject.getString("name_ar"),
                code: resolveSubjectCode(subject)
            },
            date_from: dateFrom || "",
            date_to: dateTo || "",
            sessions: groupedSessions
        }
    });
});



