const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create database connection
const dbPath = path.join(__dirname, 'recipes.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      ingredients TEXT NOT NULL,
      spices TEXT,
      beverages TEXT,
      instructions TEXT NOT NULL,
      prep_time INTEGER,
      cook_time INTEGER,
      servings INTEGER,
      category TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Recipes table ready');
    }
  });

  // Migration: Add spices and beverages columns if they don't exist
  db.run(`ALTER TABLE recipes ADD COLUMN spices TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      // Column already exists, ignore
    }
  });
  db.run(`ALTER TABLE recipes ADD COLUMN beverages TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      // Column already exists, ignore
    }
  });
});

module.exports = db;
