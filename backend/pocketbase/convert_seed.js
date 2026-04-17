const fs = require('fs');

const seedData = JSON.parse(fs.readFileSync('seed_data.json', 'utf8'));

// Build a map of old -> new IDs
const idMap = {};

function makeId(oldId) {
    let clean = oldId.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (clean.length < 15) {
        clean = clean.padEnd(15, '0');
    } else if (clean.length > 15) {
        clean = clean.substring(0, 15);
    }
    return clean;
}

// 1. First pass to generate all mapped IDs
for (const [collection, records] of Object.entries(seedData)) {
    for (const record of records) {
        if (record.id) {
            const newId = makeId(record.id);
            idMap[record.id] = newId;
            record.id = newId;
        }
    }
}

// 2. Second pass to update all relation fields based on the map
function updateRelations(obj) {
    for (const key in obj) {
        if (typeof obj[key] === 'string' && idMap[obj[key]]) {
            obj[key] = idMap[obj[key]]; // single reference
        } else if (Array.isArray(obj[key])) {
            obj[key] = obj[key].map(val => (typeof val === 'string' && idMap[val] ? idMap[val] : val));
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            updateRelations(obj[key]);
        }
    }
}

updateRelations(seedData);

fs.writeFileSync('seed_data.json', JSON.stringify(seedData, null, 2));
console.log("Updated seed_data.json to have exactly 15-character IDs and mapped all relationships correctly.");
