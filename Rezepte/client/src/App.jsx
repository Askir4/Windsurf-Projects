import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Plus, Clock, Users, ChefHat, X, Edit2, Trash2, ArrowLeft, 
  Upload, FileDown, Sun, Moon, Wine, Sparkles, GlassWater, Citrus,
  UtensilsCrossed, ListOrdered, Leaf
} from 'lucide-react';
import './styles.css';

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

  if (isFormOpen && DRINK_CATEGORIES.includes(formCategory)) {
    return (
      <DrinkForm
        recipe={editingRecipe}
        category={formCategory}
        onClose={closeForm}
        onSave={handleSave}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  if (isFormOpen) {
    return (
      <RecipeForm
        recipe={editingRecipe}
        categories={categories.filter(c => !DRINK_CATEGORIES.includes(c))}
        preselectedCategory={formCategory}
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
  
  const ingredients = recipe.ingredients ? recipe.ingredients.split('\n').filter(i => i.trim()) : [];
  const instructions = recipe.instructions ? recipe.instructions.split('\n').filter(i => i.trim()) : [];
  const spices = recipe.spices ? recipe.spices.split('\n').filter(i => i.trim()) : [];
  const beverages = recipe.beverages ? recipe.beverages.split('\n').filter(i => i.trim()) : [];

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
              <div className="meta-item">
                <Users className="icon" style={{ width: 20, height: 20 }} />
                <div>
                  <div className="label">Servings</div>
                  <div className="value">{recipe.servings}</div>
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
            <div className="section-title">
              <UtensilsCrossed style={{ width: 20, height: 20, color: 'var(--color-primary-500)' }} />
              Ingredients
            </div>
            <ul className="ingredient-list">
              {ingredients.map((ingredient, index) => (
                <li key={index}>
                  <span className="bullet"></span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
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

// ===================================
// DRINK FORM COMPONENT
// ===================================

function DrinkForm({ recipe, category, onClose, onSave, darkMode, setDarkMode }) {
  const [formData, setFormData] = useState({
    title: recipe?.title || '',
    description: recipe?.description || '',
    ingredients: recipe?.ingredients || '',
    instructions: recipe?.instructions || '',
    prep_time: recipe?.prep_time || '',
    servings: recipe?.servings || '',
    category: category,
    spices: recipe?.spices || '',
    beverages: recipe?.beverages || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(recipe?.image_url || null);
  const [saving, setSaving] = useState(false);

  const isCocktail = category === 'Cocktails';
  const accentColor = isCocktail ? 'var(--color-purple-500)' : 'var(--color-green-500)';

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });
      if (imageFile) {
        data.append('image', imageFile);
      }

      const url = recipe ? `${API_URL}/api/recipes/${recipe.id}` : `${API_URL}/api/recipes`;
      const method = recipe ? 'PUT' : 'POST';

      await fetch(url, { method, body: data });
      onSave();
    } catch (error) {
      console.error('Error saving drink:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="section-card">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 32 }}>{isCocktail ? '🍸' : '🥤'}</span>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                  {recipe ? `Edit ${category.slice(0, -1)}` : `New ${category.slice(0, -1)}`}
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  {isCocktail ? 'Create an alcoholic drink recipe' : 'Create a non-alcoholic drink recipe'}
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

          <form onSubmit={handleSubmit}>
            {/* Image Upload */}
            <div className="form-group">
              <label className="form-label">Drink Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ 
                  width: 100, 
                  height: 100, 
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
                    <GlassWater style={{ width: 32, height: 32, color: 'var(--color-text-muted)' }} />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="input" style={{ flex: 1 }} />
              </div>
            </div>

            {/* Name */}
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder={isCocktail ? "e.g., Mojito, Margarita" : "e.g., Virgin Mojito, Shirley Temple"}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows="2"
                placeholder="Brief description of this drink"
              />
            </div>

            {/* Time and Servings */}
            <div className="form-group form-row form-row-2">
              <div>
                <label className="form-label">Prep Time (min)</label>
                <input
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                  className="input"
                  placeholder="5"
                />
              </div>
              <div>
                <label className="form-label">Servings</label>
                <input
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                  className="input"
                  placeholder="1"
                />
              </div>
            </div>

            {/* Base Spirits/Mixers */}
            <div className="form-group">
              <div className="section-card" style={{ borderColor: accentColor, background: `${accentColor}10` }}>
                <label className="form-label" style={{ color: accentColor, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Wine style={{ width: 16, height: 16 }} />
                  {isCocktail ? 'Base Spirits & Liqueurs' : 'Base Drinks & Juices'} (one per line)
                </label>
                <textarea
                  value={formData.beverages}
                  onChange={(e) => setFormData({ ...formData, beverages: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder={isCocktail ? "50ml White Rum\n15ml Triple Sec\n30ml Lime Juice" : "100ml Orange Juice\n50ml Cranberry Juice\n30ml Grenadine"}
                />
              </div>
            </div>

            {/* Ingredients */}
            <div className="form-group">
              <label className="form-label">Ingredients & Mixers * (one per line)</label>
              <textarea
                required
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                className="input"
                rows="4"
                placeholder="Fresh mint leaves&#10;2 tsp sugar&#10;Soda water&#10;Ice cubes"
              />
            </div>

            {/* Garnish */}
            <div className="form-group">
              <div className="section-card accent-amber">
                <label className="form-label" style={{ color: 'var(--color-amber-500)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Citrus style={{ width: 16, height: 16 }} />
                  Garnish (one per line)
                </label>
                <textarea
                  value={formData.spices}
                  onChange={(e) => setFormData({ ...formData, spices: e.target.value })}
                  className="input"
                  rows="2"
                  placeholder="Lime wedge&#10;Mint sprig&#10;Orange peel"
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="form-group">
              <label className="form-label">Instructions * (one step per line)</label>
              <textarea
                required
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="input"
                rows="5"
                placeholder="Muddle mint and sugar&#10;Add ice and spirits&#10;Top with soda&#10;Stir gently&#10;Garnish and serve"
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                className="btn" 
                style={{ flex: 1, background: accentColor, color: 'white' }}
              >
                {saving ? 'Saving...' : (recipe ? 'Update Drink' : 'Save Drink')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ===================================
// RECIPE FORM COMPONENT
// ===================================

function RecipeForm({ recipe, categories, preselectedCategory, onClose, onSave, darkMode, setDarkMode }) {
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
    category: recipe?.category || preselectedCategory || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(recipe?.image_url || null);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
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

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="section-card">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
              {recipe ? 'Edit Recipe' : 'Add New Recipe'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
              <button className="btn btn-icon btn-ghost" onClick={onClose}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Image Upload */}
            <div className="form-group">
              <label className="form-label">Recipe Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ 
                  width: 100, 
                  height: 100, 
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
                <input type="file" accept="image/*" onChange={handleImageChange} className="input" style={{ flex: 1 }} />
              </div>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="Recipe name"
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows="2"
                placeholder="Brief description of the recipe"
              />
            </div>

            {/* Time, Servings, Category Grid */}
            <div className="form-group form-row form-row-4">
              <div>
                <label className="form-label">Prep Time</label>
                <input
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                  className="input"
                  placeholder="min"
                />
              </div>
              <div>
                <label className="form-label">Cook Time</label>
                <input
                  type="number"
                  value={formData.cook_time}
                  onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
                  className="input"
                  placeholder="min"
                />
              </div>
              <div>
                <label className="form-label">Servings</label>
                <input
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input"
                >
                  <option value="">Select...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ingredients */}
            <div className="form-group">
              <label className="form-label">Ingredients * (one per line)</label>
              <textarea
                required
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                className="input"
                rows="5"
                placeholder="2 cups flour&#10;1 tsp salt&#10;1 cup milk"
              />
            </div>

            {/* Spices & Beverages */}
            <div className="form-group form-row form-row-2">
              <div className="section-card accent-amber">
                <label className="form-label" style={{ color: 'var(--color-amber-500)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Sparkles style={{ width: 16, height: 16 }} />
                  Spices (one per line)
                </label>
                <textarea
                  value={formData.spices}
                  onChange={(e) => setFormData({ ...formData, spices: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Salt&#10;Pepper&#10;Paprika"
                />
              </div>
              <div className="section-card accent-pink">
                <label className="form-label" style={{ color: 'var(--color-pink-500)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Wine style={{ width: 16, height: 16 }} />
                  Beverages (one per line)
                </label>
                <textarea
                  value={formData.beverages}
                  onChange={(e) => setFormData({ ...formData, beverages: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Red wine&#10;Sparkling water&#10;Lemonade"
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="form-group">
              <label className="form-label">Instructions * (one step per line)</label>
              <textarea
                required
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="input"
                rows="5"
                placeholder="Mix dry ingredients&#10;Add wet ingredients&#10;Bake at 350°F for 30 minutes"
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                {saving ? 'Saving...' : (recipe ? 'Update Recipe' : 'Save Recipe')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
