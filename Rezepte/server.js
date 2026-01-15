const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const cheerio = require('cheerio');
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
  const { title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, external_image_url, custom_sections } = req.body;
  // Use uploaded image, or external URL, or null
  const image_url = req.file ? `/uploads/${req.file.filename}` : (external_image_url || null);

  const sql = `INSERT INTO recipes (title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, image_url, custom_sections)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, image_url, custom_sections || null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: 'Recipe created successfully' });
  });
});

// Update recipe
app.put('/api/recipes/:id', upload.single('image'), (req, res) => {
  const { title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, custom_sections } = req.body;
  
  let sql, params;
  
  if (req.file) {
    const image_url = `/uploads/${req.file.filename}`;
    sql = `UPDATE recipes SET title = ?, description = ?, ingredients = ?, spices = ?, beverages = ?, instructions = ?, 
           prep_time = ?, cook_time = ?, servings = ?, category = ?, image_url = ?, custom_sections = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`;
    params = [title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, image_url, custom_sections || null, req.params.id];
  } else {
    sql = `UPDATE recipes SET title = ?, description = ?, ingredients = ?, spices = ?, beverages = ?, instructions = ?, 
           prep_time = ?, cook_time = ?, servings = ?, category = ?, custom_sections = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`;
    params = [title, description, ingredients, spices, beverages, instructions, prep_time, cook_time, servings, category, custom_sections || null, req.params.id];
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

// ===================================
// RECIPE IMPORT FROM URL
// ===================================

// Parse JSON-LD schema.org Recipe data
function parseJsonLd($) {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const json = JSON.parse($(scripts[i]).html());
      // Handle array of schemas
      const schemas = Array.isArray(json) ? json : [json];
      for (const schema of schemas) {
        if (schema['@type'] === 'Recipe') {
          return schema;
        }
        // Check @graph for Recipe
        if (schema['@graph']) {
          const recipe = schema['@graph'].find(item => item['@type'] === 'Recipe');
          if (recipe) return recipe;
        }
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

// Extract recipe from schema.org data
function extractFromSchema(schema) {
  const recipe = {
    title: schema.name || '',
    description: schema.description || '',
    ingredients: '',
    instructions: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    image_url: '',
    source_url: '',
    custom_sections: []
  };

  // Ingredients
  if (schema.recipeIngredient) {
    recipe.ingredients = Array.isArray(schema.recipeIngredient) 
      ? schema.recipeIngredient.join('\n') 
      : schema.recipeIngredient;
  }

  // Instructions
  if (schema.recipeInstructions) {
    if (Array.isArray(schema.recipeInstructions)) {
      recipe.instructions = schema.recipeInstructions.map((inst, idx) => {
        if (typeof inst === 'string') return `${idx + 1}. ${inst}`;
        if (inst.text) return `${idx + 1}. ${inst.text}`;
        if (inst.itemListElement) {
          return inst.itemListElement.map((sub, subIdx) => 
            `${subIdx + 1}. ${sub.text || sub}`
          ).join('\n');
        }
        return '';
      }).filter(Boolean).join('\n');
    } else {
      recipe.instructions = schema.recipeInstructions;
    }
  }

  // Times (convert ISO 8601 duration)
  const parseDuration = (duration) => {
    if (!duration) return '';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = parseInt(match[1]) || 0;
      const minutes = parseInt(match[2]) || 0;
      if (hours > 0) return `${hours}h ${minutes}min`;
      return `${minutes} min`;
    }
    return duration;
  };

  recipe.prep_time = parseDuration(schema.prepTime);
  recipe.cook_time = parseDuration(schema.cookTime) || parseDuration(schema.totalTime);

  // Servings
  if (schema.recipeYield) {
    const yield_val = Array.isArray(schema.recipeYield) ? schema.recipeYield[0] : schema.recipeYield;
    recipe.servings = String(yield_val).replace(/[^\d]/g, '') || yield_val;
  }

  // Image
  if (schema.image) {
    if (typeof schema.image === 'string') {
      recipe.image_url = schema.image;
    } else if (Array.isArray(schema.image)) {
      recipe.image_url = schema.image[0];
    } else if (schema.image.url) {
      recipe.image_url = schema.image.url;
    }
  }

  return recipe;
}

// Helper function to parse ingredient sections from HTML
function parseIngredientSections($) {
  const sections = [];
  let currentSection = { name: '', ingredients: [] };
  
  // Common section header patterns
  const sectionPatterns = [
    /^für\s+(die|den|das)\s+/i,
    /^zum\s+/i,
    /^beilage/i,
    /^soße/i,
    /^sauce/i,
    /^teig/i,
    /^füllung/i,
    /^topping/i,
    /^garnierung/i,
    /^marinade/i,
    /^dressing/i
  ];
  
  const isSectionHeader = (text) => {
    const cleanText = text.trim().toLowerCase();
    return sectionPatterns.some(p => p.test(cleanText)) || 
           (cleanText.startsWith('für ') && cleanText.length < 50);
  };
  
  // Try to find ingredient groups with headers
  $('[class*="ingredient"], .ingredients, table.ingredients').each((i, container) => {
    $(container).find('h3, h4, strong, b, th[colspan], .ingredient-header, [class*="header"]').each((j, header) => {
      const headerText = $(header).text().trim();
      if (headerText && (isSectionHeader(headerText) || headerText.length < 40)) {
        // Save previous section if it has ingredients
        if (currentSection.ingredients.length > 0) {
          sections.push({ ...currentSection });
        }
        currentSection = { name: headerText, ingredients: [] };
      }
    });
  });
  
  return sections;
}

// Site-specific parsers for sites without proper schema.org
const siteParsers = {
  // Chefkoch.de fallback parser
  chefkoch: ($, url) => {
    const recipe = {
      title: $('h1').first().text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      ingredients: '',
      instructions: '',
      prep_time: '',
      cook_time: '',
      servings: '',
      image_url: $('meta[property="og:image"]').attr('content') || '',
      source_url: url,
      custom_sections: []
    };

    // Try to parse ingredient sections
    const sections = [];
    let currentSectionName = '';
    let currentIngredients = [];
    let mainIngredients = [];
    
    // Chefkoch often has sections in table headers or h3 tags
    $('table.ingredients, [class*="ingredient"]').each((i, table) => {
      $(table).find('tr, li').each((j, row) => {
        const headerCell = $(row).find('th[colspan], h3, h4, strong.ingredient-header, [class*="header"]').first();
        if (headerCell.length > 0) {
          const headerText = headerCell.text().trim();
          if (headerText && headerText.length < 50) {
            // Save previous section
            if (currentIngredients.length > 0) {
              if (currentSectionName) {
                sections.push({ name: currentSectionName, ingredients: currentIngredients.join('\n') });
              } else {
                mainIngredients.push(...currentIngredients);
              }
            }
            currentSectionName = headerText;
            currentIngredients = [];
            return;
          }
        }
        
        // Get ingredient from row
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const amount = $(cells[0]).text().trim();
          const name = $(cells[1]).text().trim();
          if (name) {
            currentIngredients.push(amount ? `${amount} ${name}` : name);
          }
        } else {
          const text = $(row).text().trim();
          if (text && text.length > 1 && text.length < 200) {
            currentIngredients.push(text);
          }
        }
      });
    });
    
    // Save last section
    if (currentIngredients.length > 0) {
      if (currentSectionName) {
        sections.push({ name: currentSectionName, ingredients: currentIngredients.join('\n') });
      } else {
        mainIngredients.push(...currentIngredients);
      }
    }
    
    recipe.ingredients = mainIngredients.join('\n');
    recipe.custom_sections = sections;

    // Instructions
    const instructions = [];
    $('.ds-box p, .instructions p, [class*="instruction"] p').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20) instructions.push(`${i + 1}. ${text}`);
    });
    recipe.instructions = instructions.join('\n');

    return recipe;
  },

  // REWE fallback parser
  rewe: ($, url) => {
    const recipe = {
      title: $('h1').first().text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      ingredients: '',
      instructions: '',
      prep_time: '',
      cook_time: '',
      servings: '',
      image_url: $('meta[property="og:image"]').attr('content') || '',
      source_url: url
    };

    // Ingredients
    const ingredients = [];
    $('[class*="ingredient"] li, [class*="Ingredient"] li').each((i, el) => {
      ingredients.push($(el).text().trim());
    });
    recipe.ingredients = ingredients.join('\n');

    // Instructions
    const instructions = [];
    $('[class*="instruction"] li, [class*="step"] p, [class*="Step"] p').each((i, el) => {
      const text = $(el).text().trim();
      if (text) instructions.push(`${i + 1}. ${text}`);
    });
    recipe.instructions = instructions.join('\n');

    return recipe;
  },

  // Generic fallback
  generic: ($, url) => {
    const recipe = {
      title: $('h1').first().text().trim() || $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      ingredients: '',
      instructions: '',
      prep_time: '',
      cook_time: '',
      servings: '',
      image_url: $('meta[property="og:image"]').attr('content') || '',
      source_url: url
    };

    // Try common ingredient selectors
    const ingredientSelectors = [
      '[class*="ingredient"] li',
      '[class*="Ingredient"] li',
      '.ingredients li',
      '[itemprop="recipeIngredient"]'
    ];

    for (const selector of ingredientSelectors) {
      const items = $(selector);
      if (items.length > 0) {
        const ingredients = [];
        items.each((i, el) => ingredients.push($(el).text().trim()));
        recipe.ingredients = ingredients.join('\n');
        break;
      }
    }

    // Try common instruction selectors
    const instructionSelectors = [
      '[class*="instruction"] li',
      '[class*="Instruction"] li',
      '[class*="step"] p',
      '.instructions li',
      '[itemprop="recipeInstructions"]'
    ];

    for (const selector of instructionSelectors) {
      const items = $(selector);
      if (items.length > 0) {
        const instructions = [];
        items.each((i, el) => {
          const text = $(el).text().trim();
          if (text) instructions.push(`${i + 1}. ${text}`);
        });
        recipe.instructions = instructions.join('\n');
        break;
      }
    }

    return recipe;
  }
};

// Detect site and get appropriate parser
function getSiteParser(url) {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('chefkoch')) return siteParsers.chefkoch;
  if (hostname.includes('rewe')) return siteParsers.rewe;
  return siteParsers.generic;
}

// Extract additional data from HTML (times, custom sections, etc.)
function extractAdditionalDataFromHTML($, url) {
  const data = {
    prep_time: '',
    cook_time: '',
    servings: '',
    custom_sections: []
  };

  // Extract times from common HTML patterns
  const timeSelectors = [
    // Chefkoch specific
    '[class*="recipe-preptime"]',
    '[class*="recipe-cooktime"]',
    '[class*="prepTime"]',
    '[class*="cookTime"]',
    '[class*="arbeitszeit"]',
    '[class*="kochzeit"]',
    '[class*="gesamtzeit"]',
    // Generic
    '[itemprop="prepTime"]',
    '[itemprop="cookTime"]',
    '[itemprop="totalTime"]',
    '.time',
    '[class*="time"]'
  ];

  // Try to find times
  $('[class*="time"], [class*="Time"], [class*="zeit"], [class*="Zeit"]').each((i, el) => {
    const text = $(el).text().trim();
    const parent = $(el).parent().text().trim().toLowerCase();
    
    // Extract number from text
    const numMatch = text.match(/(\d+)/);
    if (numMatch) {
      const num = numMatch[1];
      if (parent.includes('koch') || parent.includes('cook') || parent.includes('back') || parent.includes('gar')) {
        if (!data.cook_time) data.cook_time = num;
      } else if (parent.includes('arbeit') || parent.includes('prep') || parent.includes('vorbereitung')) {
        if (!data.prep_time) data.prep_time = num;
      } else if (parent.includes('gesamt') || parent.includes('total')) {
        if (!data.cook_time) data.cook_time = num;
      }
    }
  });

  // Also check for specific Chefkoch structure
  $('i[class*="icon-"]').each((i, el) => {
    const iconClass = $(el).attr('class') || '';
    const text = $(el).parent().text().trim();
    const numMatch = text.match(/(\d+)/);
    
    if (numMatch) {
      if (iconClass.includes('clock') || iconClass.includes('time')) {
        if (!data.cook_time) data.cook_time = numMatch[1];
      }
    }
  });

  // Extract servings
  $('[class*="serving"], [class*="portion"], [class*="Portion"], [itemprop="recipeYield"]').each((i, el) => {
    const text = $(el).text().trim();
    const numMatch = text.match(/(\d+)/);
    if (numMatch && !data.servings) {
      data.servings = numMatch[1];
    }
  });

  // Extract custom ingredient sections (for Chefkoch and similar sites)
  const sections = [];
  let currentSectionName = '';
  let currentIngredients = [];
  let isFirstSection = true;

  // Look for ingredient tables/lists with headers
  $('table.ingredients, [class*="ingredient-list"], [class*="ingredients"]').each((i, container) => {
    // Check for section headers within ingredient containers
    $(container).find('tr, li, div').each((j, el) => {
      const $el = $(el);
      
      // Check if this is a header row (th with colspan, or h3/h4/strong)
      const headerEl = $el.find('th[colspan], h3, h4, strong').first();
      const headerText = headerEl.length ? headerEl.text().trim() : '';
      
      // Common section header patterns
      const isSectionHeader = headerText && (
        headerText.toLowerCase().startsWith('für ') ||
        headerText.toLowerCase().startsWith('zum ') ||
        headerText.toLowerCase().includes('soße') ||
        headerText.toLowerCase().includes('sauce') ||
        headerText.toLowerCase().includes('teig') ||
        headerText.toLowerCase().includes('füllung') ||
        headerText.toLowerCase().includes('beilage') ||
        headerText.toLowerCase().includes('marinade') ||
        headerText.toLowerCase().includes('topping') ||
        headerText.toLowerCase().includes('garnierung') ||
        headerText.toLowerCase().includes('dressing')
      );

      if (isSectionHeader && headerText.length < 60) {
        // Save previous section if it has ingredients
        if (currentIngredients.length > 0 && currentSectionName) {
          sections.push({ name: currentSectionName, ingredients: currentIngredients.join('\n') });
        }
        currentSectionName = headerText;
        currentIngredients = [];
        isFirstSection = false;
      } else if (!isFirstSection || currentSectionName) {
        // This is an ingredient row in a named section
        const cells = $el.find('td');
        let ingredientText = '';
        
        if (cells.length >= 2) {
          const amount = $(cells[0]).text().trim();
          const name = $(cells[1]).text().trim();
          ingredientText = amount ? `${amount} ${name}` : name;
        } else {
          ingredientText = $el.text().trim();
        }
        
        // Only add valid ingredient text
        if (ingredientText && ingredientText.length > 1 && ingredientText.length < 200 && !isSectionHeader) {
          currentIngredients.push(ingredientText);
        }
      }
    });
  });

  // Save last section
  if (currentIngredients.length > 0 && currentSectionName) {
    sections.push({ name: currentSectionName, ingredients: currentIngredients.join('\n') });
  }

  data.custom_sections = sections;
  return data;
}

// Import recipe from URL endpoint
app.post('/api/import-recipe', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL ist erforderlich' });
  }

  try {
    // Fetch the page
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    let recipe = null;

    // Try JSON-LD schema first (most reliable)
    const schema = parseJsonLd($);
    if (schema) {
      recipe = extractFromSchema(schema);
      recipe.source_url = url;
    }

    // Fallback to site-specific parser if no recipe found
    if (!recipe || !recipe.title) {
      const parser = getSiteParser(url);
      recipe = parser($, url);
    }

    // ALWAYS try to extract additional data from HTML (custom sections, times, etc.)
    const additionalData = extractAdditionalDataFromHTML($, url);
    
    // Merge additional data - only if main recipe doesn't have it
    if (!recipe.cook_time && additionalData.cook_time) {
      recipe.cook_time = additionalData.cook_time;
    }
    if (!recipe.prep_time && additionalData.prep_time) {
      recipe.prep_time = additionalData.prep_time;
    }
    if (!recipe.servings && additionalData.servings) {
      recipe.servings = additionalData.servings;
    }
    // Always use custom_sections from HTML if found
    if (additionalData.custom_sections && additionalData.custom_sections.length > 0) {
      recipe.custom_sections = additionalData.custom_sections;
    }

    // Validate we got something useful
    if (!recipe.title) {
      return res.status(400).json({ 
        error: 'Konnte kein Rezept auf dieser Seite finden. Bitte überprüfe die URL.' 
      });
    }

    res.json({
      success: true,
      recipe: recipe
    });

  } catch (error) {
    console.error('Recipe import error:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(400).json({ error: 'Konnte die Website nicht erreichen' });
    }
    if (error.response && error.response.status === 403) {
      return res.status(400).json({ error: 'Zugriff auf diese Website verweigert' });
    }
    if (error.response && error.response.status === 404) {
      return res.status(400).json({ error: 'Seite nicht gefunden' });
    }

    res.status(500).json({ 
      error: 'Fehler beim Importieren des Rezepts: ' + error.message 
    });
  }
});

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Recipe server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from other devices using your Pi's IP address`);
});
