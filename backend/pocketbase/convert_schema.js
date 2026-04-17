const fs = require('fs');

const data = JSON.parse(fs.readFileSync('pb_schema.json', 'utf8'));

// Generate fixed 15-char ids for collections
const collectionIds = {
    subjects: "subjects1234567",
    rooms: "rooms1234567890",
    professors: "professors12345",
    groups: "groups123456789",
    students: "students1234567",
    schedules: "schedules123456",
    sessions: "sessions1234567",
    attendance_records: "att_records1234"
};

for (let col of data) {
    col.id = collectionIds[col.name];
    if (col.schema) {
        col.fields = col.schema.map(field => {
            const { options, ...rest } = field;
            // Generate a fake id for the field
            const f = { ...rest, ...options, id: field.name + "1234567" };
            f.id = f.id.replace(/[^a-z0-9]/g, '').padEnd(15, 'x').substring(0, 15);
            
            if (f.type === "relation" && f.collectionId) {
                // If it references a collection name, update to its fixed ID
                if (collectionIds[f.collectionId]) {
                    f.collectionId = collectionIds[f.collectionId];
                }
            }
            return f;
        });
        delete col.schema;
    }
}

fs.writeFileSync('pb_schema_v25.json', JSON.stringify(data, null, 2));
console.log("Converted pb_schema.json to pb_schema_v25.json with strict relations");
