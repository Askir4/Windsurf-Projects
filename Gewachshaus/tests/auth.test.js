const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');

const BASE_URL = 'http://localhost:3001';

// Helper für HTTP Requests
async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
}

// Cookie aus Set-Cookie Header extrahieren
function extractCookie(headers) {
    const setCookie = headers.get('set-cookie');
    if (!setCookie) return null;
    return setCookie.split(';')[0];
}

describe('Auth API Tests', () => {
    let adminCookie = null;
    let userCookie = null;
    let testUserId = null;
    
    test('POST /api/auth/login - sollte mit falschen Daten fehlschlagen', async () => {
        const { status, data } = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: 'invalid', password: 'invalid' })
        });
        
        assert.strictEqual(status, 401);
        assert.ok(data.error);
    });
    
    test('POST /api/auth/login - sollte Admin einloggen', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123!' })
        });
        
        const data = await res.json();
        adminCookie = extractCookie(res.headers);
        
        assert.strictEqual(res.status, 200);
        assert.ok(data.success);
        assert.strictEqual(data.user.role, 'ADMIN');
    });
    
    test('GET /api/auth/me - sollte User-Daten zurückgeben', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Cookie': adminCookie }
        });
        const data = await res.json();
        
        assert.strictEqual(res.status, 200);
        assert.ok(data.user);
        assert.strictEqual(data.user.username, 'admin');
    });
});

describe('RBAC Tests', () => {
    let adminCookie = null;
    let userCookie = null;
    let testUserId = null;
    
    before(async () => {
        // Admin einloggen
        const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123!' })
        });
        adminCookie = extractCookie(adminRes.headers);
    });
    
    test('GET /api/users - Admin sollte Zugriff haben', async () => {
        const res = await fetch(`${BASE_URL}/api/users`, {
            headers: { 'Cookie': adminCookie }
        });
        
        assert.strictEqual(res.status, 200);
        const users = await res.json();
        assert.ok(Array.isArray(users));
    });
    
    test('GET /api/users - ohne Auth sollte 401 zurückgeben', async () => {
        const res = await fetch(`${BASE_URL}/api/users`);
        assert.strictEqual(res.status, 401);
    });
    
    test('POST /api/users - Admin sollte User erstellen können', async () => {
        const res = await fetch(`${BASE_URL}/api/users`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': adminCookie 
            },
            body: JSON.stringify({
                username: 'testuser_' + Date.now(),
                password: 'testpass123',
                role: 'NORMAL_USER'
            })
        });
        
        const data = await res.json();
        testUserId = data.userId;
        
        assert.strictEqual(res.status, 200);
        assert.ok(data.success);
        assert.ok(data.userId);
    });
    
    test('GET /api/audit-logs - Admin sollte Zugriff haben', async () => {
        const res = await fetch(`${BASE_URL}/api/audit-logs`, {
            headers: { 'Cookie': adminCookie }
        });
        
        assert.strictEqual(res.status, 200);
        const logs = await res.json();
        assert.ok(Array.isArray(logs));
    });
    
    test('GET /api/audit-logs - ohne Auth sollte 401 zurückgeben', async () => {
        const res = await fetch(`${BASE_URL}/api/audit-logs`);
        assert.strictEqual(res.status, 401);
    });
    
    after(async () => {
        // Test-User aufräumen
        if (testUserId) {
            await fetch(`${BASE_URL}/api/users/${testUserId}`, {
                method: 'DELETE',
                headers: { 'Cookie': adminCookie }
            });
        }
    });
});

describe('Password Security Tests', () => {
    let adminCookie = null;
    
    before(async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123!' })
        });
        adminCookie = extractCookie(res.headers);
    });
    
    test('POST /api/auth/change-password - sollte zu kurzes Passwort ablehnen', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': adminCookie 
            },
            body: JSON.stringify({
                currentPassword: 'admin123!',
                newPassword: '123' // zu kurz
            })
        });
        
        assert.strictEqual(res.status, 400);
    });
    
    test('POST /api/auth/change-password - sollte falsches aktuelles Passwort ablehnen', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': adminCookie 
            },
            body: JSON.stringify({
                currentPassword: 'wrongpassword',
                newPassword: 'newpassword123'
            })
        });
        
        assert.strictEqual(res.status, 401);
    });
});

describe('Rate Limiting Tests', () => {
    test('Login sollte nach zu vielen Fehlversuchen blocken', async () => {
        // 6 Fehlversuche hintereinander (Limit ist 5)
        const results = [];
        for (let i = 0; i < 6; i++) {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'invalid', password: 'invalid' })
            });
            results.push(res.status);
        }
        
        // Letzter Request sollte 429 sein
        assert.strictEqual(results[5], 429, 'Rate limit sollte nach 5 Versuchen greifen');
    });
});

describe('Audit Log Tests', () => {
    let adminCookie = null;
    
    before(async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123!' })
        });
        adminCookie = extractCookie(res.headers);
    });
    
    test('Login sollte Audit-Log Eintrag erstellen', async () => {
        const res = await fetch(`${BASE_URL}/api/audit-logs?action=LOGIN_SUCCESS&limit=1`, {
            headers: { 'Cookie': adminCookie }
        });
        
        assert.strictEqual(res.status, 200);
        const logs = await res.json();
        assert.ok(logs.length > 0, 'Sollte LOGIN_SUCCESS Logs haben');
        assert.strictEqual(logs[0].action, 'LOGIN_SUCCESS');
    });
    
    test('Audit-Logs sollten keine Passwörter enthalten', async () => {
        const res = await fetch(`${BASE_URL}/api/audit-logs?limit=50`, {
            headers: { 'Cookie': adminCookie }
        });
        
        const logs = await res.json();
        
        for (const log of logs) {
            if (log.metadata_json) {
                assert.ok(!log.metadata_json.includes('password'), 
                    'Audit log sollte kein Passwort enthalten');
                assert.ok(!log.metadata_json.includes('admin123'), 
                    'Audit log sollte keine Passwort-Werte enthalten');
            }
        }
    });
});

console.log('Auth Tests - Führe "npm test" aus während der Server läuft');
