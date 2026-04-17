const crypto = require("crypto");

const PB_URL = process.env.PB_URL || "http://127.0.0.1:8090";
const ADMIN_EMAIL = "admin@attendance.edu";
const ADMIN_PASSWORD = "adminpassword123";

const seedData = require("./seed_data.json");

// Define a strict order where basic entities come first.
const INSERTION_ORDER = [
    "subjects",
    "rooms",
    "professors",
    "teaching_assistants",
    "groups",
    "students",
    "schedules",
    "sessions",
    "attendance_records"
];

const WIPE_ORDER = [
    "attendance_records",
    "sessions",
    "schedules",
    "students",
    "groups",
    "teaching_assistants",
    "professors",
    "subjects",
    "rooms"
];

// Identify fields that cause cyclic dependencies and should be patched in Pass 2.
const STRIP_FIELDS_PASS1 = {
    professors: ["assigned_courses"],
    teaching_assistants: ["assigned_groups"],
    subjects: ["professor_id"],
    groups: ["students"],
    students: ["registered_courses", "enrolled_subjects", "group_id"]
};

function normalizeIdentity(identity) {
    return String(identity || "").trim().toLowerCase();
}

function hashPassword(identity, plainPassword) {
    return crypto
        .createHash("sha256")
        .update(`${normalizeIdentity(identity)}::${String(plainPassword || "")}`)
        .digest("hex");
}

function prepareRecord(collection, record) {
    const prepared = { ...record };

    if ((collection === "professors" || collection === "students" || collection === "teaching_assistants") && !prepared.password_hash) {
        if (!prepared.email || !prepared.password) {
            throw new Error(
                `Record ${collection}/${prepared.id} must include either password_hash or email + password`
            );
        }

        prepared.password_hash = hashPassword(prepared.email, prepared.password);
    }

    delete prepared.password;
    return prepared;
}

async function authenticate() {
    const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    if (!res.ok) {
        throw new Error(`Auth failed: ${await res.text()}`);
    }
    return (await res.json()).token;
}

async function createRecord(token, collection, record) {
    const recordCopy = prepareRecord(collection, record);
    
    if (STRIP_FIELDS_PASS1[collection]) {
        for (const field of STRIP_FIELDS_PASS1[collection]) {
            delete recordCopy[field];
        }
    }

    if (recordCopy.level !== undefined && typeof recordCopy.level === "number") {
        recordCopy.level = String(recordCopy.level);
    }
    
    // Check if it already exists, if so delete
    const deleteRes = await fetch(`${PB_URL}/api/collections/${collection}/records/${record.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!deleteRes.ok && deleteRes.status !== 404) {
        console.warn(`  ⚠️ Could not delete existing ${collection} (${record.id}): ${await deleteRes.text()}`);
    }
    
    const res = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(recordCopy)
    });
    
    if (!res.ok) {
        console.error(`  ❌ Failed to create ${collection} (${record.id}):`, await res.text());
        return false;
    }
    console.log(`  ✅ Created ${collection}: ${record.id}`);
    return true;
}

async function wipeCollection(token, collection) {
    let deleted = 0;

    while (true) {
        const listRes = await fetch(`${PB_URL}/api/collections/${collection}/records?page=1&perPage=500`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!listRes.ok) {
            console.error(`  ❌ Failed to list ${collection} for wipe:`, await listRes.text());
            return false;
        }

        const payload = await listRes.json();
        const items = payload.items || [];
        if (items.length === 0) break;

        for (const item of items) {
            const delRes = await fetch(`${PB_URL}/api/collections/${collection}/records/${item.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!delRes.ok) {
                console.error(`  ❌ Failed to delete ${collection}/${item.id}:`, await delRes.text());
                return false;
            }

            deleted += 1;
        }
    }

    console.log(`  ✅ Cleared ${collection}: ${deleted} record(s)`);
    return true;
}

async function patchRecord(token, collection, record) {
    if (!STRIP_FIELDS_PASS1[collection]) return true; // Nothing to patch

    const patchData = {};
    for (const field of STRIP_FIELDS_PASS1[collection]) {
        if (record[field] !== undefined) {
            patchData[field] = record[field];
        }
    }
    
    if (Object.keys(patchData).length === 0) return true;

    const res = await fetch(`${PB_URL}/api/collections/${collection}/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(patchData)
    });
    
    if (!res.ok) {
        console.error(`  ❌ Failed to patch ${collection} (${record.id}):`, await res.text());
        return false;
    } else {
        console.log(`  ✅ Patched relations on ${collection}: ${record.id}`);
        return true;
    }
}

async function seed() {
    console.log("🔐 Authenticating with PocketBase...");
    const token = await authenticate();
    console.log("✅ Authenticated successfully\n");

    let failures = 0;

    console.log("--- PREP: WIPE EXISTING DATA ---");
    for (const collection of WIPE_ORDER) {
        console.log(`🧹 Clearing ${collection}...`);
        const ok = await wipeCollection(token, collection);
        if (!ok) failures++;
    }

    console.log("\n--- PASS 1: CREATE RECORDS ---");
    for (const collection of INSERTION_ORDER) {
        console.log(`📦 Creating ${collection}...`);
        for (const record of seedData[collection]) {
            const ok = await createRecord(token, collection, record);
            if (!ok) failures++;
        }
    }

    console.log("\n--- PASS 2: PATCH RELATIONS ---");
    for (const collection of INSERTION_ORDER) {
        for (const record of seedData[collection]) {
            const ok = await patchRecord(token, collection, record);
            if (!ok) failures++;
        }
    }

    if (failures > 0) {
        throw new Error(`${failures} seeding operation(s) failed`);
    }

    console.log("\n\n🎉 Seeding complete!");
}

seed().catch(err => {
    console.error("\n💥 Seed script failed:", err.message);
    process.exit(1);
});
