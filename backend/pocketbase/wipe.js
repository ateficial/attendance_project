const collections = ["subjects", "rooms", "professors", "students", "groups", "schedules", "sessions", "attendance_records"];

async function wipeDatabase() {
    const authRes = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'admin@attendance.edu', password: 'adminpassword123'})
    });
    const token = (await authRes.json()).token;

    for (const coll of collections) {
        console.log(`Wiping ${coll}...`);
        const res = await fetch(`http://127.0.0.1:8090/api/collections/${coll}/records`, {
            headers: { 'Authorization': token }
        });
        if (res.ok) {
            const data = await res.json();
            for (const item of data.items) {
                await fetch(`http://127.0.0.1:8090/api/collections/${coll}/records/${item.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': token }
                });
            }
        }
    }
    console.log("Database wiped!");
}
wipeDatabase();
