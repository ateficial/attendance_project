/// <reference path="../pb_data/types.d.ts" />

const AUTH_JWT_SECRET = "smart-attendance-jwt-v1";
const ACCESS_TOKEN_TTL_SECONDS = 60 * 30;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

function authRequestData(c) {
    const info = $apis.requestInfo(c);
    if (info.body && Object.keys(info.body).length > 0) return info.body;
    return info.data || {};
}

function normalizeIdentity(identity) {
    return String(identity || "").trim().toLowerCase();
}

function hashPassword(identity, plainPassword) {
    return $security.sha256(normalizeIdentity(identity) + "::" + String(plainPassword || ""));
}

function verifyPassword(record, plainPassword) {
    const identity = record.getString("email");
    const storedHash = String(record.getString("password_hash") || "");
    if (!storedHash) return false;
    const candidate = hashPassword(identity, plainPassword);
    return $security.equal(storedHash, candidate);
}

function issueTokens(record, role) {
    const basePayload = {
        sub: record.getId(),
        role: role,
        email: record.getString("email")
    };

    const accessToken = $security.createJWT(
        { ...basePayload, type: "access" },
        AUTH_JWT_SECRET,
        ACCESS_TOKEN_TTL_SECONDS
    );

    const refreshToken = $security.createJWT(
        { ...basePayload, type: "refresh" },
        AUTH_JWT_SECRET,
        REFRESH_TOKEN_TTL_SECONDS
    );

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_expires_in: REFRESH_TOKEN_TTL_SECONDS
    };
}

function extractClaims(c, expectedType) {
    const info = $apis.requestInfo(c);
    const header = info.headers?.authorization || info.headers?.Authorization || "";
    if (!header || !header.startsWith("Bearer ")) {
        return null;
    }

    try {
        const token = header.slice(7).trim();
        const claims = $security.parseJWT(token, AUTH_JWT_SECRET);
        if (!claims || !claims.sub || !claims.role || claims.type !== expectedType) {
            return null;
        }
        return claims;
    } catch (e) {
        return null;
    }
}

function findUserRecordByRole(role, userId) {
    if (role === "professor") {
        return $app.dao().findRecordById("professors", userId);
    }
    if (role === "student") {
        return $app.dao().findRecordById("students", userId);
    }
    throw new BadRequestError("Unsupported role");
}

function publicUser(record, role) {
    return {
        id: record.getId(),
        role: role,
        email: record.getString("email"),
        name_en: record.getString("name_en"),
        name_ar: record.getString("name_ar"),
        national_id: record.getString("national_id"),
        student_id_number: record.getString("student_id_number"),
        level: record.getString("level"),
        department: record.getString("department"),
        faculty: record.getString("faculty"),
        academic_year: record.getString("academic_year"),
        status: record.getString("status"),
        rfid_status: record.getString("rfid_status"),
        rfid_card_id: record.getString("rfid_card_id"),
        phone: record.getString("phone"),
        avatar_url: record.getString("avatar_url"),
        enrollment_status: record.getString("enrollment_status"),
        assigned_courses: record.get("assigned_courses") || [],
        registered_courses: record.get("registered_courses") || [],
        group_id: record.getString("group_id")
    };
}

routerAdd("POST", "/api/custom/auth/login", (c) => {
    const data = authRequestData(c);
    const role = String(data.role || "").trim();
    const email = normalizeIdentity(data.email);
    const password = String(data.password || "");

    if (!["professor", "student"].includes(role)) {
        return c.json(400, {
            status: "error",
            code: "INVALID_ROLE",
            message: "role must be professor or student"
        });
    }

    if (!email || !password) {
        return c.json(400, {
            status: "error",
            code: "MISSING_CREDENTIALS",
            message: "email and password are required"
        });
    }

    const collection = role === "professor" ? "professors" : "students";
    let userRecord;

    try {
        userRecord = $app.dao().findFirstRecordByFilter(
            collection,
            "email = {:email}",
            { email: email }
        );
    } catch (e) {
        return c.json(401, {
            status: "error",
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password"
        });
    }

    if (!verifyPassword(userRecord, password)) {
        return c.json(401, {
            status: "error",
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password"
        });
    }

    if (role === "student") {
        const enrollment = userRecord.getString("enrollment_status");
        if (enrollment === "Suspended" || enrollment === "Inactive") {
            return c.json(403, {
                status: "error",
                code: "ACCOUNT_INACTIVE",
                message: "Student account is not active"
            });
        }
    }

    userRecord.set("last_login", new Date().toISOString());
    try {
        $app.dao().saveRecord(userRecord);
    } catch (e) {
        // last_login update is non-blocking
    }

    const tokens = issueTokens(userRecord, role);
    return c.json(200, {
        status: "ok",
        message: "Login successful",
        user: publicUser(userRecord, role),
        ...tokens,
        data: {
            user: publicUser(userRecord, role),
            ...tokens
        }
    });
});

routerAdd("POST", "/api/custom/auth/refresh", (c) => {
    const data = authRequestData(c);
    const refreshToken = String(data.refresh_token || "").trim();

    if (!refreshToken) {
        return c.json(400, {
            status: "error",
            code: "MISSING_REFRESH_TOKEN",
            message: "refresh_token is required"
        });
    }

    let claims;
    try {
        claims = $security.parseJWT(refreshToken, AUTH_JWT_SECRET);
    } catch (e) {
        return c.json(401, {
            status: "error",
            code: "INVALID_REFRESH_TOKEN",
            message: "Invalid refresh token"
        });
    }

    if (!claims || claims.type !== "refresh" || !claims.sub || !claims.role) {
        return c.json(401, {
            status: "error",
            code: "INVALID_REFRESH_TOKEN",
            message: "Invalid refresh token"
        });
    }

    let userRecord;
    try {
        userRecord = findUserRecordByRole(claims.role, claims.sub);
    } catch (e) {
        return c.json(401, {
            status: "error",
            code: "USER_NOT_FOUND",
            message: "User not found"
        });
    }

    const tokens = issueTokens(userRecord, claims.role);
    return c.json(200, {
        status: "ok",
        message: "Token refreshed",
        ...tokens,
        data: tokens
    });
});

routerAdd("GET", "/api/custom/auth/me", (c) => {
    const claims = extractClaims(c, "access");
    if (!claims) {
        return c.json(401, {
            status: "error",
            code: "UNAUTHORIZED",
            message: "Authorization is required"
        });
    }

    let userRecord;
    try {
        userRecord = findUserRecordByRole(claims.role, claims.sub);
    } catch (e) {
        return c.json(401, {
            status: "error",
            code: "USER_NOT_FOUND",
            message: "User not found"
        });
    }

    return c.json(200, {
        status: "ok",
        data: {
            user: publicUser(userRecord, claims.role)
        }
    });
});
