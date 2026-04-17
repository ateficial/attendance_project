/// <reference path="../pb_data/types.d.ts" />

const TA_PORTAL_JWT_SECRET = "smart-attendance-jwt-v1";

function taQueryValue(c, key) {
    const info = c.requestInfo();
    const raw = info.query ? info.query[key] : "";
    if (Array.isArray(raw)) return String(raw[0] || "");
    return String(raw || "");
}

function taClaims(c, allowedRoles) {
    const info = c.requestInfo();
    const authHeader = info.headers?.authorization || info.headers?.Authorization || "";
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    try {
        const token = authHeader.slice(7).trim();
        const claims = $security.parseJWT(token, TA_PORTAL_JWT_SECRET);
        if (!claims || claims.type !== "access" || !claims.sub || !claims.role) return null;
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(claims.role)) return null;
        return claims;
    } catch (e) {
        return null;
    }
}

function taResolveIdentity(c, claims) {
    if (claims.role === "admin") {
        return String(taQueryValue(c, "ta_id") || "").trim();
    }
    return String(claims.sub || "").trim();
}

function getSubjectCode(subject) {
    return subject.getString("subject_code") || subject.getString("code");
}

function listTASchedules(taId, subjectId) {
    const schedules = $app.findRecordsByFilter(
        "schedules",
        "ta_id = {:taId}",
        "-start_time",
        0,
        0,
        { taId: taId }
    );

    return schedules.filter((schedule) => {
        const type = String(schedule.getString("session_type") || "").toLowerCase();
        const isSectionType = !type || type === "section";
        const subjectMatch = !subjectId || schedule.getString("subject_id") === subjectId;
        return isSectionType && subjectMatch;
    });
}

routerAdd("GET", "/api/custom/ta/subjects", (c) => {
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

    const resolveIdentity = ((claims) => {
        if (claims.role === "admin") {
            return String(queryValue("ta_id") || "").trim();
        }
        return String(claims.sub || "").trim();
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const listSchedules = ((taId, subjectId) => {
        const schedules = $app.findRecordsByFilter(
            "schedules",
            "ta_id = {:taId}",
            "-start_time",
            0,
            0,
            { taId: taId }
        );

        return schedules.filter((schedule) => {
            const type = String(schedule.getString("session_type") || "").toLowerCase();
            const isSectionType = !type || type === "section";
            const subjectMatch = !subjectId || schedule.getString("subject_id") === subjectId;
            return isSectionType && subjectMatch;
        });
    });

    const claims = resolveClaims(["ta", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const taId = resolveIdentity(claims);
    if (!taId) {
        return c.json(400, { status: "error", code: "MISSING_TA_ID", message: "ta_id is required" });
    }

    let ta;
    try {
        ta = $app.findRecordById("teaching_assistants", taId);
    } catch (e) {
        return c.json(404, { status: "error", code: "TA_NOT_FOUND", message: "Teaching assistant not found" });
    }

    const subjectIds = new Set();
    const assignedSubjects = ta.get("assigned_subjects") || [];
    if (Array.isArray(assignedSubjects)) {
        for (const subjectId of assignedSubjects) {
            if (subjectId) subjectIds.add(String(subjectId));
        }
    }

    if (subjectIds.size === 0) {
        const schedules = listSchedules(taId, "");
        for (const schedule of schedules) {
            const sid = schedule.getString("subject_id");
            if (sid) subjectIds.add(sid);
        }
    }

    const subjects = [];
    for (const subjectId of Array.from(subjectIds)) {
        try {
            const subject = $app.findRecordById("subjects", subjectId);
            subjects.push({
                id: subject.getString("id"),
                code: resolveSubjectCode(subject),
                name_en: subject.getString("name_en"),
                name_ar: subject.getString("name_ar"),
                level: subject.getString("level") || subject.getInt("level"),
                department: subject.getString("department"),
                subject_type: subject.getString("subject_type") || "section"
            });
        } catch (e) {
            // skip broken subject references
        }
    }

    return c.json(200, {
        status: "ok",
        data: {
            subjects: subjects
        }
    });
});

routerAdd("GET", "/api/custom/ta/sessions", (c) => {
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

    const resolveIdentity = ((claims) => {
        if (claims.role === "admin") {
            return String(queryValue("ta_id") || "").trim();
        }
        return String(claims.sub || "").trim();
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const listSchedules = ((taId, subjectId) => {
        const schedules = $app.findRecordsByFilter(
            "schedules",
            "ta_id = {:taId}",
            "-start_time",
            0,
            0,
            { taId: taId }
        );

        return schedules.filter((schedule) => {
            const type = String(schedule.getString("session_type") || "").toLowerCase();
            const isSectionType = !type || type === "section";
            const subjectMatch = !subjectId || schedule.getString("subject_id") === subjectId;
            return isSectionType && subjectMatch;
        });
    });

    const claims = resolveClaims(["ta", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const taId = resolveIdentity(claims);
    const subjectId = String(queryValue("subject_id") || "").trim();
    const limitRaw = Number(queryValue("limit") || "100");
    const limit = Number.isNaN(limitRaw) ? 100 : Math.max(1, Math.min(500, limitRaw));

    const schedules = listSchedules(taId, subjectId);
    const sessions = [];

    for (const schedule of schedules) {
        const rows = $app.findRecordsByFilter(
            "sessions",
            "schedule_id = {:scheduleId}",
            "-start_time",
            limit,
            0,
            { scheduleId: schedule.getString("id") }
        );

        for (const row of rows) {
            let subject = null;
            let group = null;
            try {
                subject = $app.findRecordById("subjects", schedule.getString("subject_id"));
            } catch (e) {
                // optional relation
            }
            try {
                const gid = schedule.getString("group_id");
                if (gid) group = $app.findRecordById("groups", gid);
            } catch (e) {
                // optional relation
            }

            sessions.push({
                id: row.getString("id"),
                status: row.getString("status"),
                start_time: row.getString("start_time"),
                end_time: row.getString("end_time"),
                total_students: row.getInt("total_students"),
                present_count: row.getInt("present_count"),
                absent_count: row.getInt("absent_count"),
                subject_id: subject ? subject.getString("id") : schedule.getString("subject_id"),
                subject_name_en: subject ? subject.getString("name_en") : "",
                subject_name_ar: subject ? subject.getString("name_ar") : "",
                subject_code: subject ? resolveSubjectCode(subject) : "",
                group_id: schedule.getString("group_id"),
                group_name: group ? group.getString("group_name") : "",
                session_type: schedule.getString("session_type") || "section"
            });
        }
    }

    sessions.sort((a, b) => String(b.start_time).localeCompare(String(a.start_time)));

    return c.json(200, {
        status: "ok",
        data: {
            sessions: sessions.slice(0, limit)
        }
    });
});

routerAdd("GET", "/api/custom/ta/recent-attendance", (c) => {
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

    const resolveIdentity = ((claims) => {
        if (claims.role === "admin") {
            return String(queryValue("ta_id") || "").trim();
        }
        return String(claims.sub || "").trim();
    });

    const resolveSubjectCode = ((subject) => subject.getString("subject_code") || subject.getString("code"));

    const listSchedules = ((taId, subjectId) => {
        const schedules = $app.findRecordsByFilter(
            "schedules",
            "ta_id = {:taId}",
            "-start_time",
            0,
            0,
            { taId: taId }
        );

        return schedules.filter((schedule) => {
            const type = String(schedule.getString("session_type") || "").toLowerCase();
            const isSectionType = !type || type === "section";
            const subjectMatch = !subjectId || schedule.getString("subject_id") === subjectId;
            return isSectionType && subjectMatch;
        });
    });

    const claims = resolveClaims(["ta", "admin"]);
    if (!claims) {
        return c.json(401, { status: "error", code: "UNAUTHORIZED", message: "Authorization required" });
    }

    const taId = resolveIdentity(claims);
    const limitRaw = Number(queryValue("limit") || "10");
    const limit = Number.isNaN(limitRaw) ? 10 : Math.max(1, Math.min(200, limitRaw));

    const schedules = listSchedules(taId, "");
    const scheduleIds = schedules.map((item) => item.getString("id"));
    if (scheduleIds.length === 0) {
        return c.json(200, { status: "ok", data: { records: [] } });
    }

    const sessionFilter = scheduleIds.map((id) => `schedule_id = \"${id}\"`).join(" || ");
    const sessionRows = $app.findRecordsByFilter("sessions", sessionFilter, "-start_time", 0, 0);
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
        } catch (e) {
            // optional relation
        }
        try {
            subject = $app.findRecordById("subjects", row.getString("subject_id"));
        } catch (e) {
            // optional relation
        }

        return {
            id: row.getString("id"),
            status: row.getString("status"),
            check_in_time: row.getString("check_in_time"),
            session_id: row.getString("session_id"),
            student: student
                ? {
                    id: student.getString("id"),
                    name_en: student.getString("name_en"),
                    name_ar: student.getString("name_ar"),
                    student_id_number: student.getString("student_id_number") || student.getString("national_id")
                }
                : null,
            subject: subject
                ? {
                    id: subject.getString("id"),
                    code: resolveSubjectCode(subject),
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
