/// <reference path="../pb_data/types.d.ts" />

function toMinutes(time) {
    if (!time || typeof time !== "string" || !time.includes(":")) return -1;
    const parts = time.split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return -1;
    return (h * 60) + m;
}

function ensureDuration(startTime, endTime, durationMinutes) {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start < 0 || end < 0 || end <= start) {
        throw new BadRequestError("end_time must be after start_time");
    }

    if (!durationMinutes || durationMinutes <= 0) {
        throw new BadRequestError("duration_minutes is required");
    }

    const actual = end - start;
    if (Math.abs(actual - durationMinutes) > 5) {
        throw new BadRequestError(
            "duration_minutes (" + durationMinutes + ") does not match time range (" + actual + " min)"
        );
    }
}

function findOverlappingSchedules(record, excludeId) {
    const params = {
        day: record.getString("day_of_week"),
        semester: record.getString("semester"),
        academicYear: record.getString("academic_year"),
        startTime: record.getString("start_time"),
        endTime: record.getString("end_time")
    };

    let filter = "day_of_week = {:day} && semester = {:semester} && academic_year = {:academicYear} && start_time < {:endTime} && end_time > {:startTime}";
    if (excludeId) {
        filter += " && id != {:excludeId}";
        params.excludeId = excludeId;
    }

    return $app.dao().findRecordsByFilter("schedules", filter, "", 0, 0, params);
}

function validateConflicts(record, excludeId) {
    const overlaps = findOverlappingSchedules(record, excludeId);
    const roomId = record.getString("room_id");
    const professorId = record.getString("professor_id");
    const incomingSubject = $app.dao().findRecordById("subjects", record.getString("subject_id"));
    const incomingLevel = incomingSubject.getInt("level");

    for (const other of overlaps) {
        if (other.getString("room_id") === roomId) {
            throw new BadRequestError("Room conflict: room is already booked at the selected time");
        }

        if (other.getString("professor_id") === professorId) {
            throw new BadRequestError("Professor conflict: professor is already teaching at the selected time");
        }

        // Required by spec: block overlap for same year/level students.
        if (other.getString("academic_year") === record.getString("academic_year")) {
            try {
                const otherSubject = $app.dao().findRecordById("subjects", other.getString("subject_id"));
                if (otherSubject.getInt("level") === incomingLevel) {
                    throw new BadRequestError("Level conflict: same academic year/level overlap is not allowed");
                }
            } catch (e) {
                if (e instanceof BadRequestError) throw e;
            }
        }
    }
}

function applyCollectionRuleSet(collectionName, rules) {
    try {
        const collection = $app.findCollectionByNameOrId(collectionName);
        collection.listRule = rules.listRule;
        collection.viewRule = rules.viewRule;
        collection.createRule = rules.createRule;
        collection.updateRule = rules.updateRule;
        collection.deleteRule = rules.deleteRule;
        $app.save(collection);
    } catch (e) {
        // Keep bootstrap resilient when a collection is missing during first setup.
    }
}

onBootstrap(() => {
    const ANY_AUTH = "@request.auth.id != ''";
    const ADMIN_ONLY = "@request.auth.collectionName = '_superusers'";
    const ADMIN_OR_PROFESSOR = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors'";
    const ADMIN_OR_OWNER_STUDENT = "@request.auth.collectionName = '_superusers' || (@request.auth.collectionName = 'students' && id = @request.auth.id)";
    const ADMIN_OR_PROFESSOR_OR_OWNER_STUDENT = "@request.auth.collectionName = '_superusers' || @request.auth.collectionName = 'professors' || (@request.auth.collectionName = 'students' && id = @request.auth.id)";

    applyCollectionRuleSet("subjects", {
        listRule: ANY_AUTH,
        viewRule: ANY_AUTH,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY
    });

    applyCollectionRuleSet("rooms", {
        listRule: ANY_AUTH,
        viewRule: ANY_AUTH,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY
    });

    applyCollectionRuleSet("professors", {
        listRule: ADMIN_OR_PROFESSOR,
        viewRule: ADMIN_OR_PROFESSOR,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY
    });

    applyCollectionRuleSet("students", {
        listRule: ADMIN_OR_PROFESSOR,
        viewRule: ADMIN_OR_PROFESSOR_OR_OWNER_STUDENT,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY
    });

    applyCollectionRuleSet("groups", {
        listRule: ANY_AUTH,
        viewRule: ANY_AUTH,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY
    });

    applyCollectionRuleSet("schedules", {
        listRule: ANY_AUTH,
        viewRule: ANY_AUTH,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY
    });

    applyCollectionRuleSet("sessions", {
        listRule: ADMIN_OR_PROFESSOR,
        viewRule: ADMIN_OR_PROFESSOR,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY
    });

    applyCollectionRuleSet("attendance_records", {
        listRule: ADMIN_OR_PROFESSOR,
        viewRule: ADMIN_OR_PROFESSOR_OR_OWNER_STUDENT,
        createRule: ADMIN_OR_PROFESSOR,
        updateRule: ADMIN_OR_PROFESSOR,
        deleteRule: ADMIN_ONLY
    });
});

// ============================================================
// AUTO-SET DEFAULT VALUES ON RECORD CREATION
// ============================================================

onRecordBeforeCreateRequest((e) => {
    const record = e.record;
    if (!record.get("attendance_percentage")) record.set("attendance_percentage", 100);
    if (!record.getString("enrollment_status")) record.set("enrollment_status", "Active");
    if (!record.getString("status")) record.set("status", "Absent");
}, "students");

onRecordBeforeCreateRequest((e) => {
    const record = e.record;
    if (record.get("active_session_status") === undefined || record.get("active_session_status") === null) {
        record.set("active_session_status", false);
    }
}, "professors");

onRecordBeforeCreateRequest((e) => {
    const record = e.record;
    if (!record.get("max_capacity")) record.set("max_capacity", 30);
}, "groups");

onRecordBeforeCreateRequest((e) => {
    const record = e.record;
    if (!record.get("total_students")) record.set("total_students", 0);
    if (!record.get("present_count")) record.set("present_count", 0);
    if (!record.get("absent_count")) record.set("absent_count", 0);
    if (!record.getString("status")) record.set("status", "Active");
}, "sessions");

onRecordBeforeCreateRequest((e) => {
    const record = e.record;
    if (record.get("verified") === undefined || record.get("verified") === null) {
        record.set("verified", true);
    }
}, "attendance_records");

// ============================================================
// SCHEDULE VALIDATION AND CONFLICTS
// ============================================================

onRecordBeforeCreateRequest((e) => {
    const record = e.record;
    ensureDuration(
        record.getString("start_time"),
        record.getString("end_time"),
        record.getInt("duration_minutes")
    );
    validateConflicts(record, "");
}, "schedules");

onRecordBeforeUpdateRequest((e) => {
    const record = e.record;
    ensureDuration(
        record.getString("start_time"),
        record.getString("end_time"),
        record.getInt("duration_minutes")
    );
    validateConflicts(record, record.getId());
}, "schedules");


// ============================================================
// HEALTH CHECK ENDPOINT
// ============================================================
routerAdd("GET", "/api/custom/health", (c) => {
    const collections = ["subjects", "rooms", "professors", "students", "groups", "schedules", "sessions", "attendance_records"];
    const counts = {};

    for (const col of collections) {
        try {
            const records = $app.dao().findRecordsByFilter(col, "1=1", "", 0, 0);
            counts[col] = records.length;
        } catch (e) {
            counts[col] = -1; // Error
        }
    }

    // Count active sessions
    let activeSessions = 0;
    try {
        const active = $app.dao().findRecordsByFilter("sessions", "status = 'Active'", "", 0, 0);
        activeSessions = active.length;
    } catch (e) { /* ignore */ }

    return c.json(200, {
        status: "ok",
        version: "1.0.0",
        system: "Smart Attendance Management System",
        timestamp: new Date().toISOString(),
        active_sessions: activeSessions,
        collections: counts
    });
});


// ============================================================
// DASHBOARD STATS ENDPOINT
// ============================================================
routerAdd("GET", "/api/custom/dashboard-stats", (c) => {
    const professorId = c.queryParam("professor_id");

    const stats = {
        today_sessions: 0,
        active_sessions: 0,
        total_students_today: 0,
        average_attendance_today: 0
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    let filter = "start_time >= {:todayStart} && start_time < {:todayEnd}";
    const params = { todayStart: todayStart, todayEnd: todayEnd };

    if (professorId) {
        filter += " && professor_id = {:profId}";
        params.profId = professorId;
    }

    try {
        const todaySessions = $app.dao().findRecordsByFilter("sessions", filter, "", 0, 0, params);
        stats.today_sessions = todaySessions.length;

        let totalPercentage = 0;
        for (const sess of todaySessions) {
            if (sess.getString("status") === "Active") stats.active_sessions++;

            const total = sess.getInt("total_students");
            const present = sess.getInt("present_count");
            stats.total_students_today += total;

            if (total > 0) {
                totalPercentage += (present / total) * 100;
            }
        }

        if (todaySessions.length > 0) {
            stats.average_attendance_today = Math.round(totalPercentage / todaySessions.length);
        }
    } catch (e) { /* No sessions today */ }

    return c.json(200, { status: "ok", ...stats });
});
