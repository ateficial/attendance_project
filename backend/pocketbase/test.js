const fs = require('fs');

async function getCollections() {
    try {
        const authRes = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'admin@attendance.edu', password: 'adminpassword123'})
        });
        const token = (await authRes.json()).token;

        const res = await fetch('http://127.0.0.1:8090/api/collections', {
            headers: { 'Authorization': token }
        });
        const data = await res.json();
        console.log(JSON.stringify(data.items[0], null, 2));
    } catch (e) {
        console.error(e);
    }
}
getCollections();
