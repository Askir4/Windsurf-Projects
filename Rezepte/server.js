const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'client/build')));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// API Routes

// Get all recipes
app.get('/api/recipes', (req, res) => {
  const { search, category } = req.query;
  let sql = 'SELECT * FROM recipes';
  const params = [];
  const conditions = [];

  if (search) {
    conditions.push('(title LIKE ? OR description LIKE ? OR ingredients LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get single recipe
app.get('/api/recipes/:id', (req, res) => {
  db.get('SELECT * FROM recipes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(row);
  });
});

// Create recipe
app.post('/api/recipes', upload.single('image'), (req, res) => {
  const { title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = `INSERT INTO recipes (title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, image_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, image_url], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: 'Recipe created successfully' });
  });
});

// Update recipe
app.put('/api/recipes/:id', upload.single('image'), (req, res) => {
  const { title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category } = req.body;
  
  let sql, params;
  
  if (req.file) {
    const image_url = `/uploads/${req.file.filename}`;
    sql = `UPDATE recipes SET title = ?, description = ?, ingredients = ?, spices = ?, beverages = ?, instructions = ?, 
           prep_time = ?, cook_time = ?, servings = ?, category = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`;
    params = [title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, image_url, req.params.id];
  } else {
    sql = `UPDATE recipes SET title = ?, description = ?, ingredients = ?, spices = ?, beverages = ?, instructions = ?, 
           prep_time = ?, cook_time = ?, servings = ?, category = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`;
    params = [title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, req.params.id];
  }

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe updated successfully' });
  });
});

// Delete recipe
app.delete('/api/recipes/:id', (req, res) => {
  db.run('DELETE FROM recipes WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe deleted successfully' });
  });
});

// Get all categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM recipes WHERE category IS NOT NULL', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const defaultCategories = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Appetizer', 'Soup', 'Salad', 'Beverage', 'Cocktails', 'Mocktails'];
    const existingCategories = rows.map(r => r.category);
    const allCategories = [...new Set([...defaultCategories, ...existingCategories])].sort();
    res.json(allCategories);
  });
});

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Recipe server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from other devices using your Pi's IP address`);
});
