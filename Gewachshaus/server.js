const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Express App initialisieren
const app = express();
const PORT = process.env.PORT || 3001;

// Environment Variables mit Defaults
const SESSION_SECRET = process.env.SESSION_SECRET || 'gewachshaus-secret-change-in-production-' + uuidv4();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gewachshaus.local';
const BCRYPT_ROUNDS = 12;

// Rollen-Konstanten
const ROLES = {
    ADMIN: 'ADMIN',
    NORMAL_USER: 'NORMAL_USER'
};

// Rate Limiting - einfache In-Memory Implementierung
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const RATE_LIMIT_MAX = 100; // Max Requests pro Minute

function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }
    
    const record = rateLimitStore.get(ip);
    
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }
    
    if (record.count >= RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warten Sie.' });
    }
    
    record.count++;
    next();
}

// Rate Limit Store periodisch aufräumen
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitStore.entries()) {
        if (now > record.resetTime + RATE_LIMIT_WINDOW) {
            rateLimitStore.delete(ip);
        }
    }
}, 5 * 60 * 1000); // Alle 5 Minuten

// Input Validation Helpers
function sanitizeString(str, maxLength = 255) {
    if (typeof str !== 'string') return '';
    return str.slice(0, maxLength).trim();
}

function validateNumber(val, min = -Infinity, max = Infinity, defaultVal = 0) {
    const num = parseFloat(val);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(max, num));
}

function validateInteger(val, min = -Infinity, max = Infinity, defaultVal = 0) {
    const num = parseInt(val, 10);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(max, num));
}

// CORS Konfiguration - Development: alle localhost erlauben
const corsOptions = {
    origin: function(origin, callback) {
        // In Development: alle localhost/127.0.0.1 Origins erlauben
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            callback(null, true);
        } else {
            callback(new Error('CORS nicht erlaubt'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 Stunden
};

// Uploads Verzeichnis erstellen
const uploadsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer für Avatar-Upload konfigurieren
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${req.session.userId}_${Date.now()}${ext}`);
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Nur PNG, JPG, JPEG, WEBP erlaubt'));
        }
    }
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname));

// Session Middleware
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: __dirname
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true in production mit HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 Stunden
    }
}));

app.use(rateLimiter);

// Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Datenbank initialisieren
const dbPath = path.join(__dirname, 'fertilizer.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Fehler beim Öffnen der Datenbank:', err.message);
    } else {
        console.log('Datenbank verbunden');
        initializeDatabase();
    }
});

// Tabellen erstellen
function initializeDatabase() {
    // Zones Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_id INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        rows INTEGER NOT NULL,
        cols INTEGER NOT NULL,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Slots Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_id INTEGER UNIQUE NOT NULL,
        zone_id INTEGER NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        row INTEGER NOT NULL,
        col INTEGER NOT NULL,
        plant_id INTEGER,
        occupied BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (zone_id) REFERENCES zones (zone_id)
    )`);

    // Plants Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant_id INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        custom_name TEXT,
        slot_id INTEGER NOT NULL,
        nitrogen REAL DEFAULT 0,
        phosphorus REAL DEFAULT 0,
        potassium REAL DEFAULT 0,
        notes TEXT,
        harvest_events TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (slot_id) REFERENCES slots (slot_id)
    )`);

    // Logs Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Settings Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Users Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'NORMAL_USER',
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, function(err) {
        if (!err) {
            // Default Admin erstellen falls nicht vorhanden
            createDefaultAdmin();
        }
    });

    // Audit Logs Tabelle
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id INTEGER,
        actor_username TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        metadata_json TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actor_user_id) REFERENCES users (id)
    )`);

    // Notes Tabelle (für Forum-Style Kommentare)
    db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        author_user_id INTEGER,
        author_username TEXT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_user_id) REFERENCES users (id)
    )`);

    console.log('Datenbank-Tabellen initialisiert');
}

// Default Admin User erstellen
async function createDefaultAdmin() {
    db.get('SELECT id FROM users WHERE username = ?', [ADMIN_USERNAME], async (err, row) => {
        if (!row) {
            try {
                const hash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
                db.run(
                    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                    [ADMIN_USERNAME, ADMIN_EMAIL, hash, ROLES.ADMIN],
                    function(err) {
                        if (!err) {
                            console.log(`✅ Default Admin erstellt: ${ADMIN_USERNAME}`);
                        }
                    }
                );
            } catch (e) {
                console.error('Fehler beim Erstellen des Admin-Users:', e.message);
            }
        }
    });
}

// ============== AUTH MIDDLEWARE ==============

// Prüft ob User eingeloggt ist
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    next();
}

// Prüft ob User eine bestimmte Rolle hat
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' });
        }
        if (!roles.includes(req.session.role)) {
            return res.status(403).json({ error: 'Keine Berechtigung' });
        }
        next();
    };
}

// Rate Limiter speziell für Auth-Endpoints
const authRateLimitStore = new Map();
function authRateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const window = 60 * 1000; // 1 Minute
    const maxAttempts = 5;
    
    if (!authRateLimitStore.has(ip)) {
        authRateLimitStore.set(ip, { count: 1, resetTime: now + window });
        return next();
    }
    
    const record = authRateLimitStore.get(ip);
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + window;
        return next();
    }
    
    if (record.count >= maxAttempts) {
        return res.status(429).json({ error: 'Zu viele Login-Versuche. Bitte warten.' });
    }
    
    record.count++;
    next();
}

// ============== AUDIT LOGGING ==============

function auditLog(req, action, entityType = null, entityId = null, metadata = null) {
    const userId = req.session?.userId || null;
    const username = req.session?.username || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = sanitizeString(req.get('User-Agent') || '', 500);
    
    let metaJson = null;
    if (metadata) {
        try {
            // Sensitive Daten entfernen
            const sanitized = JSON.parse(JSON.stringify(metadata, (key, value) => {
                const sensitiveKeys = ['password', 'token', 'secret', 'hash'];
                if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
                    return '[REDACTED]';
                }
                return value;
            }));
            metaJson = JSON.stringify(sanitized);
        } catch (e) {
            metaJson = null;
        }
    }
    
    db.run(
        `INSERT INTO audit_logs (actor_user_id, actor_username, action, entity_type, entity_id, metadata_json, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, action, entityType, entityId, metaJson, ip, userAgent]
    );
}

// Logging-Funktion mit sicherer Serialisierung
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const safeLevel = sanitizeString(level, 10).toUpperCase() || 'INFO';
    const safeMessage = sanitizeString(message, 1000);
    
    let safeData = null;
    if (data) {
        try {
            // Entferne sensitive Daten aus Logs
            const sanitized = JSON.parse(JSON.stringify(data, (key, value) => {
                const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
                if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
                    return '[REDACTED]';
                }
                return value;
            }));
            safeData = JSON.stringify(sanitized);
        } catch (e) {
            safeData = '[Serialization Error]';
        }
    }
    
    // In Datenbank speichern
    db.run(
        'INSERT INTO logs (level, message, data, timestamp) VALUES (?, ?, ?, ?)',
        [safeLevel, safeMessage, safeData, timestamp],
        (err) => {
            if (err) console.error('Fehler beim Speichern des Logs:', err.message);
        }
    );
    
    // In Konsole ausgeben (ohne sensitive Daten)
    console.log(`[${timestamp}] ${safeLevel}: ${safeMessage}`);
}

// ============== AUTH ENDPOINTS ==============

// Login
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username und Passwort erforderlich' });
    }
    
    const safeUsername = sanitizeString(username, 50);
    
    db.get(
        'SELECT id, username, email, password_hash, role, avatar_url FROM users WHERE username = ?',
        [safeUsername],
        async (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            }
            
            try {
                const valid = await bcrypt.compare(password, user.password_hash);
                if (!valid) {
                    auditLog(req, 'LOGIN_FAILED', 'user', user.id, { username: safeUsername });
                    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
                }
                
                // Session erstellen
                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.role = user.role;
                
                auditLog(req, 'LOGIN_SUCCESS', 'user', user.id);
                
                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        avatar_url: user.avatar_url
                    }
                });
            } catch (e) {
                res.status(500).json({ error: 'Serverfehler' });
            }
        }
    );
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    if (req.session.userId) {
        auditLog(req, 'LOGOUT', 'user', req.session.userId);
    }
    req.session.destroy((err) => {
        res.json({ success: true });
    });
});

// Aktuellen User abrufen
app.get('/api/auth/me', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.json({ user: null });
    }
    
    db.get(
        'SELECT id, username, email, role, avatar_url, created_at FROM users WHERE id = ?',
        [req.session.userId],
        (err, user) => {
            if (err || !user) {
                return res.json({ user: null });
            }
            res.json({ user });
        }
    );
});

// Passwort ändern
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
    }
    
    // Password Policy: Min 8 Zeichen
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
    }
    
    db.get('SELECT password_hash FROM users WHERE id = ?', [req.session.userId], async (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User nicht gefunden' });
        }
        
        try {
            const valid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!valid) {
                return res.status(401).json({ error: 'Aktuelles Passwort falsch' });
            }
            
            const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
            
            db.run(
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newHash, req.session.userId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Datenbankfehler' });
                    }
                    
                    auditLog(req, 'PASSWORD_CHANGED', 'user', req.session.userId);
                    
                    // Session neu erstellen (alte invalidieren)
                    const userId = req.session.userId;
                    const username = req.session.username;
                    const role = req.session.role;
                    
                    req.session.regenerate((err) => {
                        req.session.userId = userId;
                        req.session.username = username;
                        req.session.role = role;
                        res.json({ success: true });
                    });
                }
            );
        } catch (e) {
            res.status(500).json({ error: 'Serverfehler' });
        }
    });
});

// ============== USER MANAGEMENT (ADMIN ONLY) ==============

// Alle User abrufen
app.get('/api/users', requireRole(ROLES.ADMIN), (req, res) => {
    db.all(
        'SELECT id, username, email, role, avatar_url, created_at, updated_at FROM users ORDER BY created_at DESC',
        (err, users) => {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            res.json(users || []);
        }
    );
});

// User erstellen
app.post('/api/users', requireRole(ROLES.ADMIN), async (req, res) => {
    const { username, email, password, role } = req.body || {};
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username und Passwort erforderlich' });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
    }
    
    const safeUsername = sanitizeString(username, 50);
    const safeEmail = sanitizeString(email, 100);
    const safeRole = [ROLES.ADMIN, ROLES.NORMAL_USER].includes(role) ? role : ROLES.NORMAL_USER;
    
    try {
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        
        db.run(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [safeUsername, safeEmail || null, hash, safeRole],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(409).json({ error: 'Username oder Email bereits vergeben' });
                    }
                    return res.status(500).json({ error: 'Datenbankfehler' });
                }
                
                auditLog(req, 'USER_CREATED', 'user', this.lastID, { username: safeUsername, role: safeRole });
                
                res.json({ success: true, userId: this.lastID });
            }
        );
    } catch (e) {
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// User aktualisieren
app.put('/api/users/:id', requireRole(ROLES.ADMIN), (req, res) => {
    const userId = validateInteger(req.params.id, 1);
    const { username, email, role } = req.body || {};
    
    const updates = [];
    const params = [];
    
    if (username) {
        updates.push('username = ?');
        params.push(sanitizeString(username, 50));
    }
    if (email !== undefined) {
        updates.push('email = ?');
        params.push(email ? sanitizeString(email, 100) : null);
    }
    if (role && [ROLES.ADMIN, ROLES.NORMAL_USER].includes(role)) {
        updates.push('role = ?');
        params.push(role);
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: 'Keine Änderungen' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);
    
    db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: 'Username oder Email bereits vergeben' });
                }
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            auditLog(req, 'USER_UPDATED', 'user', userId, { changes: updates.slice(0, -1) });
            
            res.json({ success: true });
        }
    );
});

// User Passwort zurücksetzen (Admin)
app.post('/api/users/:id/reset-password', requireRole(ROLES.ADMIN), async (req, res) => {
    const userId = validateInteger(req.params.id, 1);
    const { newPassword } = req.body || {};
    
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
    }
    
    try {
        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        
        db.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hash, userId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Datenbankfehler' });
                }
                
                auditLog(req, 'PASSWORD_RESET_BY_ADMIN', 'user', userId);
                
                res.json({ success: true });
            }
        );
    } catch (e) {
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// User löschen
app.delete('/api/users/:id', requireRole(ROLES.ADMIN), (req, res) => {
    const userId = validateInteger(req.params.id, 1);
    
    // Verhindere Selbst-Löschung
    if (userId === req.session.userId) {
        return res.status(400).json({ error: 'Eigenen Account nicht löschbar' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        
        auditLog(req, 'USER_DELETED', 'user', userId);
        
        res.json({ success: true });
    });
});

// ============== AVATAR UPLOAD ==============

app.post('/api/users/avatar', requireAuth, avatarUpload.single('avatar'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
    
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // Altes Avatar löschen falls vorhanden
    db.get('SELECT avatar_url FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (user && user.avatar_url) {
            const oldPath = path.join(__dirname, user.avatar_url);
            fs.unlink(oldPath, () => {}); // Fehler ignorieren
        }
        
        db.run(
            'UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [avatarUrl, req.session.userId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Datenbankfehler' });
                }
                
                auditLog(req, 'AVATAR_UPDATED', 'user', req.session.userId);
                
                res.json({ success: true, avatar_url: avatarUrl });
            }
        );
    });
});

// ============== AUDIT LOGS (ADMIN ONLY) ==============

app.get('/api/audit-logs', requireRole(ROLES.ADMIN), (req, res) => {
    const { action, actor, entity_type, limit, offset } = req.query;
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (action) {
        query += ' AND action = ?';
        params.push(sanitizeString(action, 50));
    }
    if (actor) {
        query += ' AND actor_username LIKE ?';
        params.push(`%${sanitizeString(actor, 50)}%`);
    }
    if (entity_type) {
        query += ' AND entity_type = ?';
        params.push(sanitizeString(entity_type, 50));
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(validateInteger(limit, 1, 500, 100));
    params.push(validateInteger(offset, 0, 100000, 0));
    
    db.all(query, params, (err, logs) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        res.json(logs || []);
    });
});

// ============== NOTES API (Forum-Style) ==============

// Notes für Entity abrufen
app.get('/api/notes/:entityType/:entityId', requireAuth, (req, res) => {
    const entityType = sanitizeString(req.params.entityType, 20);
    const entityId = validateInteger(req.params.entityId, 1);
    
    db.all(
        `SELECT n.*, u.avatar_url 
         FROM notes n 
         LEFT JOIN users u ON n.author_user_id = u.id 
         WHERE n.entity_type = ? AND n.entity_id = ? 
         ORDER BY n.created_at DESC`,
        [entityType, entityId],
        (err, notes) => {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            res.json(notes || []);
        }
    );
});

// Note erstellen
app.post('/api/notes', requireAuth, (req, res) => {
    const { entityType, entityId, content } = req.body || {};
    
    if (!entityType || !entityId || !content) {
        return res.status(400).json({ error: 'entityType, entityId und content erforderlich' });
    }
    
    const safeContent = sanitizeString(content, 5000);
    
    db.run(
        `INSERT INTO notes (entity_type, entity_id, author_user_id, author_username, content)
         VALUES (?, ?, ?, ?, ?)`,
        [sanitizeString(entityType, 20), validateInteger(entityId, 1), req.session.userId, req.session.username, safeContent],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            auditLog(req, 'NOTE_CREATED', entityType, entityId);
            
            res.json({ success: true, noteId: this.lastID });
        }
    );
});

// Note löschen (nur Author oder Admin)
app.delete('/api/notes/:id', requireAuth, (req, res) => {
    const noteId = validateInteger(req.params.id, 1);
    
    db.get('SELECT author_user_id FROM notes WHERE id = ?', [noteId], (err, note) => {
        if (err || !note) {
            return res.status(404).json({ error: 'Note nicht gefunden' });
        }
        
        // Nur Author oder Admin darf löschen
        if (note.author_user_id !== req.session.userId && req.session.role !== ROLES.ADMIN) {
            return res.status(403).json({ error: 'Keine Berechtigung' });
        }
        
        db.run('DELETE FROM notes WHERE id = ?', [noteId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            auditLog(req, 'NOTE_DELETED', 'note', noteId);
            
            res.json({ success: true });
        });
    });
});

// ============== PFLANZEN/DATA ENDPOINTS ==============

// Alle Daten abrufen
app.get('/api/data', (req, res) => {
    log('INFO', 'Daten abgerufen', { ip: req.ip });
    
    db.all(`
        SELECT 
            z.zone_id, z.name as zone_name, z.x, z.y, z.width, z.height, z.rows, z.cols, z.color,
            s.slot_id, s.x as slot_x, s.y as slot_y, s.width as slot_width, s.height as slot_height, s.row, s.col, s.occupied,
            p.plant_id, p.name as plant_name, p.custom_name, p.nitrogen, p.phosphorus, p.potassium, p.notes, p.harvest_events
        FROM zones z
        LEFT JOIN slots s ON z.zone_id = s.zone_id
        LEFT JOIN plants p ON s.slot_id = p.slot_id
        ORDER BY z.zone_id, s.slot_id
    `, (err, rows) => {
        if (err) {
            log('ERROR', 'Fehler beim Abrufen der Daten', err);
            res.status(500).json({ error: 'Datenbankfehler' });
        } else {
            // Daten in Frontend-Format umwandeln
            const zones = {};
            const slots = [];
            const plants = [];
            
            rows.forEach(row => {
                // Zone hinzufügen
                if (!zones[row.zone_id]) {
                    zones[row.zone_id] = {
                        id: row.zone_id,
                        name: row.zone_name,
                        x: row.x,
                        y: row.y,
                        width: row.width,
                        height: row.height,
                        rows: row.rows,
                        cols: row.cols,
                        color: row.color
                    };
                }
                
                // Slot hinzufügen
                if (row.slot_id) {
                    slots.push({
                        id: row.slot_id,
                        zoneId: row.zone_id,
                        x: row.slot_x,
                        y: row.slot_y,
                        width: row.slot_width,
                        height: row.slot_height,
                        row: row.row,
                        col: row.col,
                        plantId: row.plant_id,
                        occupied: row.occupied
                    });
                }
                
                // Pflanze hinzufügen
                if (row.plant_id) {
                    plants.push({
                        id: row.plant_id,
                        name: row.plant_name,
                        customName: row.custom_name,
                        slotId: row.slot_id,
                        fertilizer: {
                            nitrogen: row.nitrogen,
                            phosphorus: row.phosphorus,
                            potassium: row.potassium
                        },
                        notes: row.notes ? JSON.parse(row.notes) : [],
                        harvestEvents: row.harvest_events ? JSON.parse(row.harvest_events) : []
                    });
                }
            });
            
            res.json({
                zones: Object.values(zones),
                slots,
                plants,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Daten speichern - mit korrekter Transaction-Handling und Input Validation
app.post('/api/data', (req, res) => {
    const { zones, slots, plants } = req.body;
    
    // Input Validation
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Ungültige Anfrage' });
    }
    
    // Maximale Array-Größen prüfen
    const MAX_ZONES = 100;
    const MAX_SLOTS = 10000;
    const MAX_PLANTS = 10000;
    
    if (zones && zones.length > MAX_ZONES) {
        return res.status(400).json({ error: `Maximale Anzahl Zonen überschritten (max: ${MAX_ZONES})` });
    }
    if (slots && slots.length > MAX_SLOTS) {
        return res.status(400).json({ error: `Maximale Anzahl Slots überschritten (max: ${MAX_SLOTS})` });
    }
    if (plants && plants.length > MAX_PLANTS) {
        return res.status(400).json({ error: `Maximale Anzahl Pflanzen überschritten (max: ${MAX_PLANTS})` });
    }
    
    log('INFO', 'Daten-Speicherung gestartet', { 
        zones: zones?.length || 0,
        slots: slots?.length || 0,
        plants: plants?.length || 0
    });
    
    // Promise-basierte Transaction für korrektes Error Handling
    const runAsync = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    };
    
    (async () => {
        try {
            await runAsync('BEGIN TRANSACTION');
            
            // Zones speichern
            if (zones && Array.isArray(zones) && zones.length > 0) {
                await runAsync('DELETE FROM zones');
                
                for (const zone of zones) {
                    await runAsync(`
                        INSERT INTO zones (zone_id, name, x, y, width, height, rows, cols, color)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        validateInteger(zone.id, 1),
                        sanitizeString(zone.name, 100),
                        validateNumber(zone.x, 0, 100),
                        validateNumber(zone.y, 0, 100),
                        validateNumber(zone.width, 1, 100),
                        validateNumber(zone.height, 1, 100),
                        validateInteger(zone.rows, 1, 50, 1),
                        validateInteger(zone.cols, 1, 50, 1),
                        sanitizeString(zone.color, 20)
                    ]);
                }
            }
            
            // Slots speichern
            if (slots && Array.isArray(slots) && slots.length > 0) {
                await runAsync('DELETE FROM slots');
                
                for (const slot of slots) {
                    await runAsync(`
                        INSERT INTO slots (slot_id, zone_id, x, y, width, height, row, col, plant_id, occupied)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        validateInteger(slot.id, 1),
                        validateInteger(slot.zoneId, 1),
                        validateNumber(slot.x, 0, 100),
                        validateNumber(slot.y, 0, 100),
                        validateNumber(slot.width, 0, 100),
                        validateNumber(slot.height, 0, 100),
                        validateInteger(slot.row, 0),
                        validateInteger(slot.col, 0),
                        slot.plantId ? validateInteger(slot.plantId, 1) : null,
                        slot.occupied ? 1 : 0
                    ]);
                }
            }
            
            // Plants speichern
            if (plants && Array.isArray(plants) && plants.length > 0) {
                await runAsync('DELETE FROM plants');
                
                for (const plant of plants) {
                    const fertilizer = plant.fertilizer || {};
                    let notesJson = '[]';
                    let harvestJson = '[]';
                    
                    try {
                        notesJson = JSON.stringify(plant.notes || []);
                        harvestJson = JSON.stringify(plant.harvestEvents || []);
                    } catch (e) {
                        // Fallback auf leere Arrays
                    }
                    
                    await runAsync(`
                        INSERT INTO plants (plant_id, name, custom_name, slot_id, nitrogen, phosphorus, potassium, notes, harvest_events)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        validateInteger(plant.id, 1),
                        sanitizeString(plant.name, 100),
                        sanitizeString(plant.customName, 100),
                        validateInteger(plant.slotId, 1),
                        validateNumber(fertilizer.nitrogen, 0, 1000, 0),
                        validateNumber(fertilizer.phosphorus, 0, 1000, 0),
                        validateNumber(fertilizer.potassium, 0, 1000, 0),
                        notesJson,
                        harvestJson
                    ]);
                }
            }
            
            await runAsync('COMMIT');
            log('INFO', 'Daten erfolgreich gespeichert');
            res.json({ success: true, message: 'Daten gespeichert' });
            
        } catch (error) {
            await runAsync('ROLLBACK').catch(() => {});
            log('ERROR', 'Fehler beim Speichern der Daten', { message: error.message });
            // Keine internen Details an Client senden
            res.status(500).json({ error: 'Speicherfehler. Bitte versuchen Sie es erneut.' });
        }
    })();
});

// Logs abrufen - mit validiertem Input
app.get('/api/logs', (req, res) => {
    const { level, limit } = req.query;
    
    // Validierung
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const safeLevel = level && validLevels.includes(level.toUpperCase()) ? level.toUpperCase() : null;
    const safeLimit = validateInteger(limit, 1, 1000, 100);
    
    let query = 'SELECT id, level, message, timestamp FROM logs'; // Keine Data-Spalte standardmäßig
    let params = [];
    
    if (safeLevel) {
        query += ' WHERE level = ?';
        params.push(safeLevel);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(safeLimit);
    
    db.all(query, params, (err, rows) => {
        if (err) {
            log('ERROR', 'Fehler beim Abrufen der Logs', { message: err.message });
            res.status(500).json({ error: 'Datenbankfehler' });
        } else {
            res.json(rows);
        }
    });
});

// Logs speichern (Frontend sendet Logs hierhin) - mit Validierung
app.post('/api/logs', (req, res) => {
    const { level, message, data, timestamp } = req.body || {};
    
    // Validierung
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    if (!level || !validLevels.includes(level.toUpperCase())) {
        return res.status(400).json({ error: 'Ungültiges Log-Level' });
    }
    
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message ist erforderlich' });
    }
    
    const safeLevel = level.toUpperCase();
    const safeMessage = sanitizeString(message, 1000);
    const ts = timestamp && !isNaN(Date.parse(timestamp)) ? timestamp : new Date().toISOString();
    
    let payload = null;
    if (data) {
        try {
            // Sichere Serialisierung mit Größenlimit
            const jsonStr = JSON.stringify(data);
            if (jsonStr.length > 10000) {
                payload = JSON.stringify({ truncated: true, message: 'Data zu groß' });
            } else {
                payload = jsonStr;
            }
        } catch (e) {
            payload = null;
        }
    }

    db.run(
        'INSERT INTO logs (level, message, data, timestamp) VALUES (?, ?, ?, ?)',
        [safeLevel, safeMessage, payload, ts],
        (err) => {
            if (err) {
                console.error('Fehler beim Speichern des Logs:', err.message);
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            res.json({ success: true });
        }
    );
});

// Sensordaten empfangen (für Arduino/ESP/Python Sensoren)
app.post('/api/sensors', (req, res) => {
    const { type, value, unit, timestamp } = req.body || {};
    
    // Validierung
    const validTypes = ['temperature', 'humidity', 'soilMoisture', 'waterLevel', 'waterTemperature'];
    if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ error: 'Ungültiger Sensor-Typ', validTypes });
    }
    
    const numValue = validateNumber(value, -50, 1000);
    const safeUnit = sanitizeString(unit, 10) || '°C';
    const ts = timestamp && !isNaN(Date.parse(timestamp)) ? timestamp : new Date().toISOString();
    
    // In Datenbank speichern
    db.run(`
        INSERT INTO sensor_data (type, value, unit, timestamp)
        VALUES (?, ?, ?, ?)
    `, [type, numValue, safeUnit, ts], function(err) {
        if (err) {
            // Tabelle existiert möglicherweise nicht - erstellen
            db.run(`CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, () => {
                // Erneut versuchen
                db.run(`INSERT INTO sensor_data (type, value, unit, timestamp) VALUES (?, ?, ?, ?)`,
                    [type, numValue, safeUnit, ts]);
            });
        }
    });
    
    log('INFO', `Sensordaten empfangen: ${type}`, { value: numValue, unit: safeUnit });
    res.json({ success: true, type, value: numValue, timestamp: ts });
});

// Sensordaten abrufen
app.get('/api/sensors', (req, res) => {
    const { type, limit } = req.query;
    const safeLimit = validateInteger(limit, 1, 1000, 100);
    
    let query = 'SELECT * FROM sensor_data';
    let params = [];
    
    if (type) {
        query += ' WHERE type = ?';
        params.push(sanitizeString(type, 20));
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(safeLimit);
    
    db.all(query, params, (err, rows) => {
        if (err) {
            // Tabelle existiert möglicherweise nicht
            return res.json([]);
        }
        res.json(rows || []);
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint nicht gefunden' });
});

// Globaler Error Handler - keine sensitiven Infos leaken
app.use((err, req, res, next) => {
    console.error('ERROR:', err.message, err.stack);
    log('ERROR', 'Unbehandelter Fehler', { message: err.message, path: req.path });
    res.status(500).json({ error: 'Interner Serverfehler' });
});

// Server starten
app.listen(PORT, () => {
    log('INFO', `Server gestartet auf Port ${PORT}`);
    console.log(`🌾 Düngeanlage Server läuft auf http://localhost:${PORT}`);
    console.log(`📊 API verfügbar unter http://localhost:${PORT}/api`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    log('INFO', 'Server wird heruntergefahren');
    db.close((err) => {
        if (err) {
            console.error('Fehler beim Schließen der Datenbank:', err.message);
        } else {
            console.log('Datenbank-Verbindung geschlossen');
        }
        process.exit(0);
    });
});
