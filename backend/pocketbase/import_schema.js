const fs = require('fs');

async function importSchema() {
    try {
        console.log("Authenticating...");
        const authRes = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'admin@attendance.edu', password: 'adminpassword123'})
        });
        
        if (!authRes.ok) {
            throw new Error(`Auth failed: ${await authRes.text()}`);
        }
        
        const authData = await authRes.json();
        const token = authData.token;
        console.log("Authenticated successfully.");

        const schemaContent = fs.readFileSync('pb_schema_v25.json', 'utf8');
        const collections = JSON.parse(schemaContent);

        console.log(`Importing ${collections.length} collections...`);
        const importRes = await fetch('http://127.0.0.1:8090/api/collections/import', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            },
            body: JSON.stringify({ 
                collections: collections, 
                deleteMissing: false 
            })
        });

        if (!importRes.ok) {
            throw new Error(`Import failed: ${importRes.status} ${importRes.statusText}\n${await importRes.text()}`);
        }

        console.log("Schema imported successfully! All collections created.");
        
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

importSchema();
