const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Express App initialisieren
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// Logging-Funktion
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        data: data ? JSON.stringify(data) : null
    };
    
    // In Datenbank speichern
    db.run(
        'INSERT INTO logs (level, message, data, timestamp) VALUES (?, ?, ?, ?)',
        [level, message, logEntry.data, timestamp],
        (err) => {
            if (err) console.error('Fehler beim Speichern des Logs:', err.message);
        }
    );
    
    // In Konsole ausgeben
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
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

// Daten speichern
app.post('/api/data', (req, res) => {
    const { zones, slots, plants } = req.body;
    
    log('INFO', 'Daten gespeichert', { 
        zones: zones?.length || 0,
        slots: slots?.length || 0,
        plants: plants?.length || 0,
        ip: req.ip 
    });
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        try {
            // Zones speichern
            if (zones && zones.length > 0) {
                const deleteZones = 'DELETE FROM zones';
                db.run(deleteZones);
                
                zones.forEach(zone => {
                    db.run(`
                        INSERT INTO zones (zone_id, name, x, y, width, height, rows, cols, color)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [zone.id, zone.name, zone.x, zone.y, zone.width, zone.height, zone.rows, zone.cols, zone.color]);
                });
            }
            
            // Slots speichern
            if (slots && slots.length > 0) {
                const deleteSlots = 'DELETE FROM slots';
                db.run(deleteSlots);
                
                slots.forEach(slot => {
                    db.run(`
                        INSERT INTO slots (slot_id, zone_id, x, y, width, height, row, col, plant_id, occupied)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [slot.id, slot.zoneId, slot.x, slot.y, slot.width, slot.height, slot.row, slot.col, slot.plantId, slot.occupied]);
                });
            }
            
            // Plants speichern
            if (plants && plants.length > 0) {
                const deletePlants = 'DELETE FROM plants';
                db.run(deletePlants);
                
                plants.forEach(plant => {
                    db.run(`
                        INSERT INTO plants (plant_id, name, custom_name, slot_id, nitrogen, phosphorus, potassium, notes, harvest_events)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        plant.id, 
                        plant.name, 
                        plant.customName, 
                        plant.slotId, 
                        plant.fertilizer.nitrogen, 
                        plant.fertilizer.phosphorus, 
                        plant.fertilizer.potassium,
                        JSON.stringify(plant.notes || []),
                        JSON.stringify(plant.harvestEvents || [])
                    ]);
                });
            }
            
            db.run('COMMIT');
            log('INFO', 'Daten erfolgreich gespeichert');
            res.json({ success: true, message: 'Daten gespeichert' });
            
        } catch (error) {
            db.run('ROLLBACK');
            log('ERROR', 'Fehler beim Speichern der Daten', error);
            res.status(500).json({ error: 'Speicherfehler', details: error.message });
        }
    });
});

// Logs abrufen
app.get('/api/logs', (req, res) => {
    const { level, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM logs';
    let params = [];
    
    if (level) {
        query += ' WHERE level = ?';
        params.push(level);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            log('ERROR', 'Fehler beim Abrufen der Logs', err);
            res.status(500).json({ error: 'Datenbankfehler' });
        } else {
            res.json(rows);
        }
    });
});

// Logs speichern (Frontend sendet Logs hierhin)
app.post('/api/logs', (req, res) => {
    const { level, message, data, timestamp } = req.body || {};

    if (!level || !message) {
        return res.status(400).json({ error: 'level und message sind erforderlich' });
    }

    const ts = timestamp || new Date().toISOString();
    const payload = data ? JSON.stringify(data) : null;

    db.run(
        'INSERT INTO logs (level, message, data, timestamp) VALUES (?, ?, ?, ?)',
        [level, message, payload, ts],
        (err) => {
            if (err) {
                console.error('Fehler beim Speichern des Logs:', err.message);
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            res.json({ success: true });
        }
    );
});

// Server starten
app.listen(PORT, () => {
    log('INFO', `Server gestartet auf Port ${PORT}`);
    console.log(`🌾 Düngeanlage Server läuft auf http://localhost:${PORT}`);
    console.log(`📊 API-Dokumentation: http://localhost:${PORT}/api`);
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
