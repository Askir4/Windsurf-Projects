const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Express App initialisieren
const app = express();
const PORT = process.env.PORT || 3001;

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

// CORS Konfiguration - restriktiv
const corsOptions = {
    origin: function(origin, callback) {
        // Erlaubte Origins (localhost für Entwicklung)
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:8080'
        ];
        // Erlaube auch Requests ohne Origin (z.B. von Postman oder lokalen Dateien)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS nicht erlaubt'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: false,
    maxAge: 86400 // 24 Stunden
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' })); // Limit request body size
app.use(express.static(__dirname));
app.use(rateLimiter);

// Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
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

    console.log('Datenbank-Tabellen initialisiert');
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

// API Endpoints

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
