import React, { useState } from 'react';
import { X, Upload, Wine, Sparkles, GlassWater, ChefHat, Flame, Salad, Cake, Soup, Pizza } from 'lucide-react';
import { IngredientSelector, IngredientList } from './IngredientSelector';
import { UNITS } from './ingredientsDatabase';

const API_URL = '';

// ===================================
// DARK MODE TOGGLE (shared)
// ===================================

function DarkModeToggle({ darkMode, setDarkMode }) {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`dark-toggle ${darkMode ? 'dark' : 'light'}`}
      aria-label="Toggle dark mode"
    >
      <div className="dark-toggle-thumb">
        {darkMode ? '🌙' : '☀️'}
      </div>
    </button>
  );
}

// ===================================
// CATEGORY CONFIGURATIONS
// ===================================

const CATEGORY_CONFIG = {
  // Main Dishes
  'Hauptgerichte': {
    icon: <Flame style={{ width: 24, height: 24 }} />,
    emoji: '🍖',
    color: 'var(--color-primary-500)',
    bgGradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 100%)',
    fields: ['prep_time', 'cook_time', 'servings', 'ingredients', 'spices', 'beverages', 'instructions'],
    description: 'Herzhafte Hauptgerichte für jeden Tag'
  },
  // Appetizers
  'Vorspeisen': {
    icon: <Salad style={{ width: 24, height: 24 }} />,
    emoji: '🥗',
    color: '#22c55e',
    bgGradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
    fields: ['prep_time', 'cook_time', 'servings', 'ingredients', 'instructions'],
    description: 'Leichte Vorspeisen und Appetizer'
  },
  // Desserts
  'Desserts': {
    icon: <Cake style={{ width: 24, height: 24 }} />,
    emoji: '🍰',
    color: '#ec4899',
    bgGradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)',
    fields: ['prep_time', 'cook_time', 'servings', 'ingredients', 'instructions'],
    description: 'Süße Nachspeisen und Desserts'
  },
  // Soups
  'Suppen': {
    icon: <Soup style={{ width: 24, height: 24 }} />,
    emoji: '🍲',
    color: '#f59e0b',
    bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
    fields: ['prep_time', 'cook_time', 'servings', 'ingredients', 'spices', 'instructions'],
    description: 'Wärmende Suppen und Eintöpfe'
  },
  // Snacks
  'Snacks': {
    icon: <Pizza style={{ width: 24, height: 24 }} />,
    emoji: '🍕',
    color: '#8b5cf6',
    bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
    fields: ['prep_time', 'servings', 'ingredients', 'instructions'],
    description: 'Kleine Snacks für zwischendurch'
  },
  // Breakfast
  'Frühstück': {
    icon: <ChefHat style={{ width: 24, height: 24 }} />,
    emoji: '🥐',
    color: '#06b6d4',
    bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%)',
    fields: ['prep_time', 'cook_time', 'servings', 'ingredients', 'instructions'],
    description: 'Leckere Frühstücksideen'
  },
  // Cocktails
  'Cocktails': {
    icon: <Wine style={{ width: 24, height: 24 }} />,
    emoji: '🍸',
    color: '#a855f7',
    bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)',
    fields: ['prep_time', 'servings', 'beverages', 'ingredients', 'spices', 'instructions'],
    description: 'Alkoholische Cocktails',
    isDrink: true
  },
  // Mocktails
  'Mocktails': {
    icon: <GlassWater style={{ width: 24, height: 24 }} />,
    emoji: '🥤',
    color: '#22c55e',
    bgGradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
    fields: ['prep_time', 'servings', 'beverages', 'ingredients', 'spices', 'instructions'],
    description: 'Alkoholfreie Cocktails',
    isDrink: true
  },
  // Default
  'default': {
    icon: <ChefHat style={{ width: 24, height: 24 }} />,
    emoji: '🍽️',
    color: 'var(--color-primary-500)',
    bgGradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 100%)',
    fields: ['prep_time', 'cook_time', 'servings', 'ingredients', 'spices', 'beverages', 'instructions'],
    description: 'Allgemeines Rezept'
  }
};

// Helper to convert ingredients array to text format for storage
const ingredientsToText = (ingredients) => {
  return ingredients.map(ing => {
    const unitName = UNITS.find(u => u.id === ing.unit)?.name || ing.unit;
    return `${ing.quantity} ${unitName} ${ing.name}`;
  }).join('\n');
};

// Helper to parse text ingredients back to array (for editing)
const textToIngredients = (text) => {
  if (!text) return [];
  return text.split('\n').filter(line => line.trim()).map((line, index) => ({
    id: `custom-${index}`,
    name: line,
    icon: '📦',
    category: 'custom',
    quantity: '',
    unit: 'pieces'
  }));
};

// ===================================
// UNIVERSAL RECIPE FORM
// ===================================

function UniversalRecipeForm({ recipe, category, categories, onClose, onSave, darkMode, setDarkMode }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['default'];
  
  const [formData, setFormData] = useState({
    title: recipe?.title || '',
    description: recipe?.description || '',
    ingredients: recipe?.ingredients || '',
    spices: recipe?.spices || '',
    beverages: recipe?.beverages || '',
    instructions: recipe?.instructions || '',
    prep_time: recipe?.prep_time || '',
    cook_time: recipe?.cook_time || '',
    servings: recipe?.servings || '',
    category: recipe?.category || category || '',
  });
  
  const [ingredientsList, setIngredientsList] = useState([]);
  const [spicesList, setSpicesList] = useState([]);
  const [beveragesList, setBeveragesList] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(recipe?.image_url || null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddIngredient = (ingredient) => {
    setIngredientsList([...ingredientsList, ingredient]);
  };

  const handleRemoveIngredient = (index) => {
    setIngredientsList(ingredientsList.filter((_, i) => i !== index));
  };

  const handleAddSpice = (spice) => {
    setSpicesList([...spicesList, spice]);
  };

  const handleRemoveSpice = (index) => {
    setSpicesList(spicesList.filter((_, i) => i !== index));
  };

  const handleAddBeverage = (beverage) => {
    setBeveragesList([...beveragesList, beverage]);
  };

  const handleRemoveBeverage = (index) => {
    setBeveragesList(beveragesList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      
      // Add form data
      Object.keys(formData).forEach(key => {
        if (key === 'ingredients' && ingredientsList.length > 0) {
          data.append(key, ingredientsToText(ingredientsList));
        } else if (key === 'spices' && spicesList.length > 0) {
          data.append(key, ingredientsToText(spicesList));
        } else if (key === 'beverages' && beveragesList.length > 0) {
          data.append(key, ingredientsToText(beveragesList));
        } else {
          data.append(key, formData[key]);
        }
      });
      
      if (imageFile) {
        data.append('image', imageFile);
      }

      const url = recipe ? `${API_URL}/api/recipes/${recipe.id}` : `${API_URL}/api/recipes`;
      const method = recipe ? 'PUT' : 'POST';

      await fetch(url, { method, body: data });
      onSave();
    } catch (error) {
      console.error('Error saving recipe:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasField = (field) => config.fields.includes(field);

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="section-card" style={{ background: config.bgGradient }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start', 
            marginBottom: 'var(--space-6)',
            paddingBottom: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ 
                width: 56, 
                height: 56, 
                borderRadius: 'var(--radius-xl)',
                background: config.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.5rem'
              }}>
                {config.emoji}
              </div>
              <div>
                <h2 style={{ 
                  fontSize: 'var(--font-size-2xl)', 
                  fontWeight: 'var(--font-weight-bold)', 
                  color: 'var(--color-text-primary)' 
                }}>
                  {recipe ? 'Rezept bearbeiten' : `Neues ${category || 'Rezept'}`}
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  {config.description}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
              <button className="btn btn-icon btn-ghost" onClick={onClose}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="tabs" style={{ marginBottom: 'var(--space-6)' }}>
            <button 
              className={`tab ${activeSection === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveSection('basic')}
            >
              📝 Grunddaten
            </button>
            <button 
              className={`tab ${activeSection === 'ingredients' ? 'active' : ''}`}
              onClick={() => setActiveSection('ingredients')}
            >
              🥘 Zutaten
            </button>
            {hasField('spices') && (
              <button 
                className={`tab ${activeSection === 'spices' ? 'active' : ''}`}
                onClick={() => setActiveSection('spices')}
              >
                ✨ {config.isDrink ? 'Garnitur' : 'Gewürze'}
              </button>
            )}
            {hasField('beverages') && (
              <button 
                className={`tab ${activeSection === 'beverages' ? 'active' : ''}`}
                onClick={() => setActiveSection('beverages')}
              >
                🍷 {config.isDrink ? 'Spirituosen' : 'Getränke'}
              </button>
            )}
            <button 
              className={`tab ${activeSection === 'instructions' ? 'active' : ''}`}
              onClick={() => setActiveSection('instructions')}
            >
              📋 Zubereitung
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Basic Info Section */}
            {activeSection === 'basic' && (
              <div className="animate-fade-in">
                {/* Image Upload */}
                <div className="form-group">
                  <label className="form-label">Bild</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ 
                      width: 120, 
                      height: 120, 
                      borderRadius: 'var(--radius-xl)', 
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--color-bg-tertiary)',
                      border: '2px dashed var(--color-border)'
                    }}>
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Upload style={{ width: 32, height: 32, color: 'var(--color-text-muted)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="input" />
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                        JPG, PNG oder GIF. Max 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label">Titel *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    placeholder="Name des Rezepts"
                    style={{ fontSize: 'var(--font-size-lg)' }}
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Beschreibung</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows="3"
                    placeholder="Kurze Beschreibung des Rezepts..."
                  />
                </div>

                {/* Time and Servings Grid */}
                <div className="form-group form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-4)' }}>
                  {hasField('prep_time') && (
                    <div>
                      <label className="form-label">⏱️ Vorbereitungszeit</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <input
                          type="number"
                          value={formData.prep_time}
                          onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                          className="input"
                          placeholder="0"
                        />
                        <span style={{ color: 'var(--color-text-muted)' }}>min</span>
                      </div>
                    </div>
                  )}
                  {hasField('cook_time') && (
                    <div>
                      <label className="form-label">🔥 Kochzeit</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <input
                          type="number"
                          value={formData.cook_time}
                          onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
                          className="input"
                          placeholder="0"
                        />
                        <span style={{ color: 'var(--color-text-muted)' }}>min</span>
                      </div>
                    </div>
                  )}
                  {hasField('servings') && (
                    <div>
                      <label className="form-label">👥 Portionen</label>
                      <input
                        type="number"
                        value={formData.servings}
                        onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                        className="input"
                        placeholder="4"
                      />
                    </div>
                  )}
                  {categories && categories.length > 0 && (
                    <div>
                      <label className="form-label">📁 Kategorie</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="input"
                      >
                        <option value="">Auswählen...</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ingredients Section */}
            {activeSection === 'ingredients' && (
              <div className="animate-fade-in">
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h3 style={{ 
                    fontSize: 'var(--font-size-lg)', 
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-2)'
                  }}>
                    🥘 Zutaten hinzufügen
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    Suche nach Zutaten und füge sie mit der gewünschten Menge hinzu.
                  </p>
                </div>
                
                <IngredientSelector 
                  onAddIngredient={handleAddIngredient}
                  darkMode={darkMode}
                />
                
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <h4 style={{ 
                    fontSize: 'var(--font-size-base)', 
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-3)'
                  }}>
                    Hinzugefügte Zutaten ({ingredientsList.length})
                  </h4>
                  <IngredientList 
                    ingredients={ingredientsList}
                    onRemove={handleRemoveIngredient}
                    darkMode={darkMode}
                  />
                </div>

                {/* Manual Input Fallback */}
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <details>
                    <summary style={{ 
                      cursor: 'pointer', 
                      color: 'var(--color-text-muted)',
                      fontSize: 'var(--font-size-sm)'
                    }}>
                      Oder manuell eingeben...
                    </summary>
                    <textarea
                      value={formData.ingredients}
                      onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                      className="input"
                      rows="5"
                      placeholder="Eine Zutat pro Zeile..."
                      style={{ marginTop: 'var(--space-3)' }}
                    />
                  </details>
                </div>
              </div>
            )}

            {/* Spices Section */}
            {activeSection === 'spices' && hasField('spices') && (
              <div className="animate-fade-in">
                <div className="section-card accent-amber" style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <h3 style={{ 
                      fontSize: 'var(--font-size-lg)', 
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-amber-500)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      marginBottom: 'var(--space-2)'
                    }}>
                      <Sparkles style={{ width: 20, height: 20 }} />
                      {config.isDrink ? 'Garnitur' : 'Gewürze & Kräuter'}
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      {config.isDrink ? 'Dekorationen und Garnituren für den Drink.' : 'Gewürze und Kräuter für zusätzlichen Geschmack.'}
                    </p>
                  </div>
                  
                  <IngredientSelector 
                    onAddIngredient={handleAddSpice}
                    darkMode={darkMode}
                  />
                  
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <IngredientList 
                      ingredients={spicesList}
                      onRemove={handleRemoveSpice}
                      darkMode={darkMode}
                    />
                  </div>
                </div>

                {/* Manual Input */}
                <details>
                  <summary style={{ 
                    cursor: 'pointer', 
                    color: 'var(--color-text-muted)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    Oder manuell eingeben...
                  </summary>
                  <textarea
                    value={formData.spices}
                    onChange={(e) => setFormData({ ...formData, spices: e.target.value })}
                    className="input"
                    rows="4"
                    placeholder={config.isDrink ? "Limettenspalte\nMinzblätter\nOrangenschale" : "Salz\nPfeffer\nPaprika"}
                    style={{ marginTop: 'var(--space-3)' }}
                  />
                </details>
              </div>
            )}

            {/* Beverages Section */}
            {activeSection === 'beverages' && hasField('beverages') && (
              <div className="animate-fade-in">
                <div className="section-card accent-pink" style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <h3 style={{ 
                      fontSize: 'var(--font-size-lg)', 
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-pink-500)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      marginBottom: 'var(--space-2)'
                    }}>
                      <Wine style={{ width: 20, height: 20 }} />
                      {config.isDrink ? 'Spirituosen & Liköre' : 'Getränkeempfehlungen'}
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      {config.isDrink ? 'Basis-Spirituosen und Liköre für den Drink.' : 'Getränke, die gut zum Gericht passen.'}
                    </p>
                  </div>
                  
                  <IngredientSelector 
                    onAddIngredient={handleAddBeverage}
                    darkMode={darkMode}
                  />
                  
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <IngredientList 
                      ingredients={beveragesList}
                      onRemove={handleRemoveBeverage}
                      darkMode={darkMode}
                    />
                  </div>
                </div>

                {/* Manual Input */}
                <details>
                  <summary style={{ 
                    cursor: 'pointer', 
                    color: 'var(--color-text-muted)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    Oder manuell eingeben...
                  </summary>
                  <textarea
                    value={formData.beverages}
                    onChange={(e) => setFormData({ ...formData, beverages: e.target.value })}
                    className="input"
                    rows="4"
                    placeholder={config.isDrink ? "50ml Wodka\n25ml Triple Sec\n15ml Limettensaft" : "Rotwein\nWeißwein\nLimonade"}
                    style={{ marginTop: 'var(--space-3)' }}
                  />
                </details>
              </div>
            )}

            {/* Instructions Section */}
            {activeSection === 'instructions' && (
              <div className="animate-fade-in">
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h3 style={{ 
                    fontSize: 'var(--font-size-lg)', 
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-2)'
                  }}>
                    📋 Zubereitungsschritte
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    Schreibe jeden Schritt in eine neue Zeile.
                  </p>
                </div>
                
                <textarea
                  required
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="input"
                  rows="10"
                  placeholder={config.isDrink 
                    ? "Eis ins Glas geben\nSpirituosen hinzufügen\nGut umrühren\nMit Garnitur servieren"
                    : "Zutaten vorbereiten\nÖl in der Pfanne erhitzen\nZutaten anbraten\nMit Gewürzen abschmecken\nServieren"
                  }
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            )}

            {/* Submit Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: 'var(--space-4)', 
              paddingTop: 'var(--space-6)',
              borderTop: '1px solid var(--color-border)',
              marginTop: 'var(--space-6)'
            }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                Abbrechen
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                className="btn btn-primary" 
                style={{ flex: 1, background: config.color }}
              >
                {saving ? 'Speichern...' : (recipe ? 'Aktualisieren' : 'Speichern')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export { UniversalRecipeForm, CATEGORY_CONFIG };
