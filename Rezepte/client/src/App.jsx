import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Plus, Clock, Users, ChefHat, X, Edit2, Trash2, ArrowLeft, 
  FileDown, Sun, Moon, Wine, Sparkles, GlassWater,
  UtensilsCrossed, ListOrdered, Leaf, Link2
} from 'lucide-react';
import './styles.css';
import { UniversalRecipeForm } from './RecipeForms';
import RecipeImport from './RecipeImport';

const API_URL = '';
const DRINK_CATEGORIES = ['Cocktails', 'Mocktails'];

// ===================================
// UTILITY COMPONENTS
// ===================================

function DarkModeToggle({ darkMode, setDarkMode }) {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`dark-toggle ${darkMode ? 'dark' : 'light'}`}
      aria-label="Toggle dark mode"
    >
      <div className="dark-toggle-thumb">
        {darkMode ? (
          <Moon style={{ width: 14, height: 14, color: '#6366f1' }} />
        ) : (
          <Sun style={{ width: 14, height: 14, color: '#f97316' }} />
        )}
      </div>
    </button>
  );
}

function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && <span style={{ marginRight: 6 }}>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ===================================
// PDF EXPORT
// ===================================

async function exportToPDF(recipe) {
  const printWindow = window.open('', '_blank');
  const imageHtml = recipe.image_url 
    ? `<img src="${window.location.origin}${recipe.image_url}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px; margin-bottom: 20px;" />`
    : '';

  const formatList = (text) => {
    if (!text) return '';
    return text.split('\n').filter(i => i.trim()).map(item => `<li>${item}</li>`).join('');
  };

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${recipe.title} - Recipe</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
        h1 { color: #ea580c; margin-bottom: 10px; font-size: 28px; }
        .category { background: #fff7ed; color: #ea580c; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; margin-bottom: 20px; }
        .meta { display: flex; gap: 20px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .meta-item { font-size: 14px; color: #666; }
        .meta-label { font-weight: 600; color: #333; }
        .description { color: #666; margin-bottom: 25px; font-style: italic; }
        .section { margin-bottom: 25px; }
        .section h2 { color: #333; font-size: 18px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #ea580c; }
        ul, ol { padding-left: 24px; }
        li { margin-bottom: 8px; line-height: 1.5; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .spices { background: #fef3c7; padding: 15px; border-radius: 8px; }
        .spices h2 { border-color: #f59e0b; }
        .beverages { background: #fce7f3; padding: 15px; border-radius: 8px; }
        .beverages h2 { border-color: #ec4899; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      ${imageHtml}
      <h1>${recipe.title}</h1>
      ${recipe.category ? `<span class="category">${recipe.category}</span>` : ''}
      ${recipe.description ? `<p class="description">${recipe.description}</p>` : ''}
      <div class="meta">
        ${recipe.prep_time ? `<div class="meta-item"><span class="meta-label">Prep:</span> ${recipe.prep_time} min</div>` : ''}
        ${recipe.cook_time ? `<div class="meta-item"><span class="meta-label">Cook:</span> ${recipe.cook_time} min</div>` : ''}
        ${recipe.servings ? `<div class="meta-item"><span class="meta-label">Servings:</span> ${recipe.servings}</div>` : ''}
      </div>
      <div class="grid">
        <div class="section">
          <h2>Ingredients</h2>
          <ul>${formatList(recipe.ingredients)}</ul>
        </div>
        <div class="section">
          <h2>Instructions</h2>
          <ol>${formatList(recipe.instructions)}</ol>
        </div>
      </div>
      ${recipe.spices ? `<div class="section spices"><h2>Spices</h2><ul>${formatList(recipe.spices)}</ul></div>` : ''}
      ${recipe.beverages ? `<div class="section beverages"><h2>Recommended Beverages</h2><ul>${formatList(recipe.beverages)}</ul></div>` : ''}
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

// ===================================
// MAIN APP COMPONENT
// ===================================

function App() {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formCategory, setFormCategory] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchRecipes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const response = await fetch(`${API_URL}/api/recipes?${params}`);
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchCategories();
  }, [fetchRecipes]);

  useEffect(() => {
    fetchRecipes();
  }, [searchQuery, selectedCategory, fetchRecipes]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await fetch(`${API_URL}/api/recipes/${id}`, { method: 'DELETE' });
        fetchRecipes();
        setSelectedRecipe(null);
      } catch (error) {
        console.error('Error deleting recipe:', error);
      }
    }
  };

  const handleEdit = (recipe) => {
    setEditingRecipe(recipe);
    setFormCategory(recipe.category);
    setIsFormOpen(true);
    setSelectedRecipe(null);
  };

  const handleNewRecipe = (category = null) => {
    setEditingRecipe(null);
    setFormCategory(category);
    setIsFormOpen(true);
  };

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);

  const handleImportRecipe = () => {
    // Recipe was auto-saved, just refresh the list
    fetchRecipes();
    fetchCategories();
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRecipe(null);
    setFormCategory(null);
  };

  const handleSave = () => {
    fetchRecipes();
    fetchCategories();
    closeForm();
  };

  // Render different views based on state
  if (selectedRecipe) {
    return (
      <RecipeDetail 
        recipe={selectedRecipe} 
        onBack={() => setSelectedRecipe(null)} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
      />
    );
  }

  if (isFormOpen && formCategory === null) {
    return (
      <CategorySelector
        categories={categories}
        onSelect={(cat) => setFormCategory(cat)}
        onClose={closeForm}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  if (isFormOpen) {
    return (
      <UniversalRecipeForm
        recipe={editingRecipe}
        category={formCategory}
        categories={categories}
        onClose={closeForm}
        onSave={handleSave}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-logo">
            <div className="header-logo-icon">
              <ChefHat style={{ width: 24, height: 24, color: 'white' }} />
            </div>
            <h1 className="header-title">My Recipe Book</h1>
          </div>
          <div className="header-actions">
            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowImportModal(true)}
              title="Rezept von URL importieren"
            >
              <Link2 style={{ width: 18, height: 18 }} />
              <span>Import</span>
            </button>
            <button className="btn btn-primary" onClick={() => handleNewRecipe()}>
              <Plus style={{ width: 18, height: 18 }} />
              <span>Add Recipe</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* Search & Filter Bar */}
        <div className="search-container">
          <div className="search-wrapper">
            <Search className="search-icon" style={{ width: 20, height: 20 }} />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-with-icon"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input"
            style={{ minWidth: 180, flex: 'none' }}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Content States */}
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Loading recipes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="empty-state">
            <ChefHat className="empty-state-icon" />
            <h3 className="empty-state-title">No recipes found</h3>
            <p className="empty-state-text">Start by adding your first recipe!</p>
            <button className="btn btn-primary" onClick={() => handleNewRecipe()}>
              <Plus style={{ width: 18, height: 18 }} />
              <span>Add Your First Recipe</span>
            </button>
          </div>
        ) : (
          <div className="recipe-grid">
            {recipes.map((recipe, index) => (
              <div key={recipe.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <RecipeCard recipe={recipe} onClick={() => setSelectedRecipe(recipe)} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <RecipeImport
          onImport={handleImportRecipe}
          onClose={() => setShowImportModal(false)}
          darkMode={darkMode}
          categories={categories}
        />
      )}
    </div>
  );
}

// ===================================
// RECIPE CARD COMPONENT
// ===================================

function RecipeCard({ recipe, onClick }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  
  return (
    <div className="card card-interactive" onClick={onClick}>
      {/* Image */}
      <div style={{ 
        aspectRatio: '16/10', 
        background: 'linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-50) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transition: 'transform 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'var(--color-bg-tertiary)'
          }}>
            <ChefHat style={{ width: 48, height: 48, color: 'var(--color-text-muted)', opacity: 0.5 }} />
          </div>
        )}
        {recipe.category && (
          <span className="badge" style={{ position: 'absolute', top: 12, right: 12 }}>
            {recipe.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-5)' }}>
        <h3 style={{ 
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {recipe.title}
        </h3>
        
        <p style={{ 
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-4)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 'var(--line-height-relaxed)'
        }}>
          {recipe.description || 'No description'}
        </p>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
          {totalTime > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Clock style={{ width: 14, height: 14 }} />
              <span>{totalTime} min</span>
            </div>
          )}
          {recipe.servings && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Users style={{ width: 14, height: 14 }} />
              <span>{recipe.servings}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================================
// RECIPE DETAIL COMPONENT
// ===================================

function RecipeDetail({ recipe, onBack, onEdit, onDelete, darkMode, setDarkMode }) {
  const [activeTab, setActiveTab] = useState('recipe');
  
  // Serving calculator state
  const originalServings = parseInt(recipe.servings) || 4;
  const [desiredServings, setDesiredServings] = useState(originalServings);
  const scaleFactor = desiredServings / originalServings;

  // Function to scale ingredient quantities
  const scaleIngredient = (ingredient) => {
    if (scaleFactor === 1) return ingredient;
    
    // Match patterns like "200g", "2 EL", "1/2 TL", "3-4 Stück", "100 ml", "1,5 kg"
    const patterns = [
      // "200g" or "200 g" - number followed by unit
      /^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|cl|oz|EL|TL|Prise|Stück|Scheiben?|Zehen?|Bund|Dose[n]?|Becher|Tasse[n]?|Cup|Handvoll|Pck\.|Pkg\.?|Packung(?:en)?)\b/i,
      // "2 große" - number followed by adjective
      /^(\d+(?:[.,]\d+)?)\s+(große[rns]?|kleine[rns]?|mittlere[rns]?|halbe[rns]?)\s+/i,
      // Just a number at start "2 Eier", "3 Tomaten"
      /^(\d+(?:[.,]\d+)?)\s+/,
      // Fraction like "1/2" or "1/4"
      /^(\d+)\/(\d+)\s*/,
      // Range like "3-4"
      /^(\d+)-(\d+)\s*/,
    ];

    let result = ingredient;
    
    // Try fraction pattern first
    const fractionMatch = ingredient.match(/^(\d+)\/(\d+)\s*(.*)/);
    if (fractionMatch) {
      const num = parseInt(fractionMatch[1]);
      const denom = parseInt(fractionMatch[2]);
      const rest = fractionMatch[3];
      const scaled = (num / denom) * scaleFactor;
      
      // Format nicely
      if (scaled === Math.floor(scaled)) {
        result = `${Math.floor(scaled)} ${rest}`;
      } else if (scaled < 1) {
        // Try to express as fraction
        const commonFractions = [[1,4,'1/4'],[1,3,'1/3'],[1,2,'1/2'],[2,3,'2/3'],[3,4,'3/4']];
        let foundFrac = false;
        for (const [n, d, str] of commonFractions) {
          if (Math.abs(scaled - n/d) < 0.05) {
            result = `${str} ${rest}`;
            foundFrac = true;
            break;
          }
        }
        if (!foundFrac) result = `${scaled.toFixed(2).replace('.', ',')} ${rest}`;
      } else {
        result = `${scaled.toFixed(1).replace('.', ',').replace(',0', '')} ${rest}`;
      }
      return result;
    }

    // Try range pattern "3-4"
    const rangeMatch = ingredient.match(/^(\d+)-(\d+)\s*(.*)/);
    if (rangeMatch) {
      const low = Math.round(parseInt(rangeMatch[1]) * scaleFactor);
      const high = Math.round(parseInt(rangeMatch[2]) * scaleFactor);
      return `${low}-${high} ${rangeMatch[3]}`;
    }

    // Try number with unit or just number
    const numberMatch = ingredient.match(/^(\d+(?:[.,]\d+)?)\s*(.*)/);
    if (numberMatch) {
      const num = parseFloat(numberMatch[1].replace(',', '.'));
      const rest = numberMatch[2];
      const scaled = num * scaleFactor;
      
      // Format the number nicely
      let formattedNum;
      if (scaled === Math.floor(scaled)) {
        formattedNum = Math.floor(scaled).toString();
      } else if (scaled < 10) {
        formattedNum = scaled.toFixed(1).replace('.', ',').replace(',0', '');
      } else {
        formattedNum = Math.round(scaled).toString();
      }
      
      return `${formattedNum} ${rest}`;
    }

    return ingredient;
  };

  const ingredients = recipe.ingredients ? recipe.ingredients.split('\n').filter(i => i.trim()) : [];
  const scaledIngredients = ingredients.map(scaleIngredient);
  const instructions = recipe.instructions ? recipe.instructions.split('\n').filter(i => i.trim()) : [];
  const spices = recipe.spices ? recipe.spices.split('\n').filter(i => i.trim()) : [];
  const beverages = recipe.beverages ? recipe.beverages.split('\n').filter(i => i.trim()) : [];
  
  // Parse custom sections
  let customSections = [];
  try {
    customSections = recipe.custom_sections ? JSON.parse(recipe.custom_sections) : [];
  } catch (e) {
    customSections = [];
  }

  const hasExtras = spices.length > 0 || beverages.length > 0;

  const tabs = [
    { id: 'recipe', label: 'Recipe', icon: <UtensilsCrossed style={{ width: 16, height: 16 }} /> },
    { id: 'steps', label: 'Steps', icon: <ListOrdered style={{ width: 16, height: 16 }} /> },
    ...(hasExtras ? [{ id: 'extras', label: 'Extras', icon: <Leaf style={{ width: 16, height: 16 }} /> }] : [])
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Top Bar */}
      <div style={{ 
        padding: 'var(--space-4) var(--space-6)',
        maxWidth: 'var(--max-width-content)',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft style={{ width: 18, height: 18 }} />
          <span>Back to recipes</span>
        </button>
        <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 var(--space-6) var(--space-8)' }}>
        {/* Hero Image */}
        <div className="recipe-hero">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.title} />
          ) : (
            <div className="recipe-hero-placeholder">
              <ChefHat style={{ width: 64, height: 64 }} />
            </div>
          )}
        </div>

        {/* Recipe Header Card */}
        <div className="section-card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div>
              <h1 style={{ 
                fontSize: 'var(--font-size-3xl)', 
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-2)'
              }}>
                {recipe.title}
              </h1>
              {recipe.category && <span className="badge">{recipe.category}</span>}
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button 
                className="btn btn-icon btn-ghost" 
                onClick={() => exportToPDF(recipe)}
                title="Export as PDF"
              >
                <FileDown style={{ width: 18, height: 18 }} />
              </button>
              <button 
                className="btn btn-icon btn-ghost" 
                onClick={() => onEdit(recipe)}
                title="Edit"
              >
                <Edit2 style={{ width: 18, height: 18 }} />
              </button>
              <button 
                className="btn btn-icon btn-ghost" 
                onClick={() => onDelete(recipe.id)}
                title="Delete"
                style={{ color: 'var(--color-pink-500)' }}
              >
                <Trash2 style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </div>

          {recipe.description && (
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              lineHeight: 'var(--line-height-relaxed)',
              marginBottom: 'var(--space-6)'
            }}>
              {recipe.description}
            </p>
          )}

          {/* Meta Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
            {recipe.prep_time && (
              <div className="meta-item">
                <Clock className="icon" style={{ width: 20, height: 20 }} />
                <div>
                  <div className="label">Prep Time</div>
                  <div className="value">{recipe.prep_time} min</div>
                </div>
              </div>
            )}
            {recipe.cook_time && (
              <div className="meta-item">
                <Clock className="icon" style={{ width: 20, height: 20 }} />
                <div>
                  <div className="label">Cook Time</div>
                  <div className="value">{recipe.cook_time} min</div>
                </div>
              </div>
            )}
            {recipe.servings && (
              <div className="meta-item" style={{ minWidth: '180px' }}>
                <Users className="icon" style={{ width: 20, height: 20 }} />
                <div style={{ flex: 1 }}>
                  <div className="label">Portionen</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => setDesiredServings(Math.max(1, desiredServings - 1))}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'var(--color-primary-500)',
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      −
                    </button>
                    <span style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '700',
                      minWidth: '40px',
                      textAlign: 'center',
                      color: scaleFactor !== 1 ? 'var(--color-primary-500)' : 'inherit'
                    }}>
                      {desiredServings}
                    </span>
                    <button
                      onClick={() => setDesiredServings(desiredServings + 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'var(--color-primary-500)',
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      +
                    </button>
                    {scaleFactor !== 1 && (
                      <button
                        onClick={() => setDesiredServings(originalServings)}
                        style={{
                          marginLeft: '4px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'var(--color-text-muted)',
                          color: 'white',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                        title="Zurücksetzen"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {scaleFactor !== 1 && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: 'var(--color-primary-500)',
                      marginTop: '4px'
                    }}>
                      Original: {originalServings} · Faktor: {scaleFactor.toFixed(2).replace('.00', '')}x
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'recipe' && (
          <div className="section-card animate-fade-in">
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UtensilsCrossed style={{ width: 20, height: 20, color: 'var(--color-primary-500)' }} />
                Zutaten
              </div>
              {scaleFactor !== 1 && (
                <span style={{ 
                  fontSize: '12px', 
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary-100)',
                  color: 'var(--color-primary-600)',
                  fontWeight: '600'
                }}>
                  {scaleFactor > 1 ? '↑' : '↓'} {scaleFactor.toFixed(1).replace('.0', '')}x angepasst
                </span>
              )}
            </div>
            <ul className="ingredient-list">
              {scaledIngredients.map((ingredient, index) => (
                <li key={index}>
                  <span className="bullet"></span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>

            {/* Custom Sections */}
            {customSections.length > 0 && customSections.map((section, sectionIndex) => {
              const sectionIngredients = section.ingredients ? section.ingredients.split('\n').filter(i => i.trim()) : [];
              const scaledSectionIngredients = sectionIngredients.map(scaleIngredient);
              
              return (
                <div key={sectionIndex} style={{ marginTop: 'var(--space-6)' }}>
                  <div className="section-title" style={{ 
                    color: 'var(--color-amber-500)',
                    borderBottom: '2px solid var(--color-amber-200)',
                    paddingBottom: 'var(--space-2)',
                    marginBottom: 'var(--space-3)'
                  }}>
                    📦 {section.name}
                  </div>
                  <ul className="ingredient-list">
                    {scaledSectionIngredients.map((ingredient, index) => (
                      <li key={index}>
                        <span className="bullet" style={{ backgroundColor: 'var(--color-amber-500)' }}></span>
                        <span>{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="section-card animate-fade-in">
            <div className="section-title">
              <ListOrdered style={{ width: 20, height: 20, color: 'var(--color-primary-500)' }} />
              Instructions
            </div>
            <ol className="instruction-list">
              {instructions.map((instruction, index) => (
                <li key={index}>
                  <span className="step-number">{index + 1}</span>
                  <span className="step-text">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {activeTab === 'extras' && hasExtras && (
          <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }} className="animate-fade-in">
            {spices.length > 0 && (
              <div className="section-card accent-amber">
                <div className="section-title" style={{ color: 'var(--color-amber-500)' }}>
                  <Sparkles style={{ width: 20, height: 20 }} />
                  Spices
                </div>
                <ul className="ingredient-list">
                  {spices.map((spice, index) => (
                    <li key={index}>
                      <span className="bullet" style={{ background: 'var(--color-amber-500)' }}></span>
                      <span>{spice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {beverages.length > 0 && (
              <div className="section-card accent-pink">
                <div className="section-title" style={{ color: 'var(--color-pink-500)' }}>
                  <Wine style={{ width: 20, height: 20 }} />
                  Recommended Beverages
                </div>
                <ul className="ingredient-list">
                  {beverages.map((beverage, index) => (
                    <li key={index}>
                      <span className="bullet" style={{ background: 'var(--color-pink-500)' }}></span>
                      <span>{beverage}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================
// CATEGORY SELECTOR COMPONENT
// ===================================

function CategorySelector({ categories, onSelect, onClose, darkMode, setDarkMode }) {
  const regularCategories = categories.filter(c => !DRINK_CATEGORIES.includes(c));
  
  return (
    <div style={{ minHeight: '100vh', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
              What would you like to add?
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
              <button className="btn btn-icon btn-ghost" onClick={onClose}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
          </div>

          {/* Drinks Section */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ 
              fontSize: 'var(--font-size-base)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--color-purple-500)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-4)'
            }}>
              <GlassWater style={{ width: 18, height: 18 }} />
              Drinks
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
              <button
                onClick={() => onSelect('Cocktails')}
                className="card card-interactive"
                style={{ padding: 'var(--space-4)', textAlign: 'left', border: '2px solid var(--color-border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: 28 }}>🍸</span>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>Cocktails</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Alcoholic drinks</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => onSelect('Mocktails')}
                className="card card-interactive"
                style={{ padding: 'var(--space-4)', textAlign: 'left', border: '2px solid var(--color-border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: 28 }}>🥤</span>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>Mocktails</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Non-alcoholic drinks</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Recipes Section */}
          <div>
            <h3 style={{ 
              fontSize: 'var(--font-size-base)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--color-primary-500)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-4)'
            }}>
              <ChefHat style={{ width: 18, height: 18 }} />
              Recipes
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
              {regularCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSelect(cat)}
                  className="card card-interactive"
                  style={{ padding: 'var(--space-3)', textAlign: 'center', border: '2px solid var(--color-border)' }}
                >
                  <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
