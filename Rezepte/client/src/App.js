import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Clock, Users, ChefHat, X, Edit2, Trash2, ArrowLeft, Upload, FileDown, Sun, Moon, Wine, Sparkles, GlassWater, Citrus } from 'lucide-react';

const API_URL = '';

const DRINK_CATEGORIES = ['Cocktails', 'Mocktails'];

// Dark Mode Toggle Component
function DarkModeToggle({ darkMode, setDarkMode }) {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`relative w-16 h-8 rounded-full p-1 transition-all duration-500 ease-in-out ${
        darkMode 
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
          : 'bg-gradient-to-r from-yellow-400 to-orange-400'
      }`}
      aria-label="Toggle dark mode"
    >
      <div
        className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transform transition-all duration-500 ease-in-out flex items-center justify-center ${
          darkMode ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {darkMode ? (
          <Moon className="w-4 h-4 text-indigo-600" />
        ) : (
          <Sun className="w-4 h-4 text-orange-500" />
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <span className={`text-xs transition-opacity duration-300 ${darkMode ? 'opacity-100' : 'opacity-0'}`}>
          <Sun className="w-3 h-3 text-yellow-200" />
        </span>
        <span className={`text-xs transition-opacity duration-300 ${darkMode ? 'opacity-0' : 'opacity-100'}`}>
          <Moon className="w-3 h-3 text-gray-600" />
        </span>
      </div>
    </button>
  );
}

// PDF Export Function
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

  if (selectedRecipe) {
    return <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} onEdit={handleEdit} onDelete={handleDelete} darkMode={darkMode} setDarkMode={setDarkMode} />;
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
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
      <header className={`shadow-sm border-b transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-100'}`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-xl">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>My Recipe Book</h1>
            </div>
            <div className="flex items-center gap-4">
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
              <button
                onClick={() => handleNewRecipe()}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Recipe
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors duration-300 ${
                darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200'
              }`}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[150px] transition-colors duration-300 ${
              darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200'
            }`}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading recipes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>No recipes found</h3>
            <p className={`mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Start by adding your first recipe!</p>
            <button
              onClick={() => handleNewRecipe()}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Your First Recipe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onClick={() => setSelectedRecipe(recipe)} darkMode={darkMode} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RecipeCard({ recipe, onClick, darkMode }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden border group ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}
    >
      <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 relative overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : ''}`}>
            <ChefHat className={`w-16 h-16 ${darkMode ? 'text-gray-500' : 'text-orange-300'}`} />
          </div>
        )}
        {recipe.category && (
          <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-orange-600 text-xs font-medium px-3 py-1 rounded-full">
            {recipe.category}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className={`font-semibold text-lg mb-2 line-clamp-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{recipe.title}</h3>
        <p className={`text-sm mb-4 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{recipe.description || 'No description'}</p>
        <div className={`flex items-center gap-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {(recipe.prep_time || recipe.cook_time) && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} servings</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecipeDetail({ recipe, onBack, onEdit, onDelete, darkMode, setDarkMode }) {
  const ingredients = recipe.ingredients ? recipe.ingredients.split('\n').filter(i => i.trim()) : [];
  const instructions = recipe.instructions ? recipe.instructions.split('\n').filter(i => i.trim()) : [];
  const spices = recipe.spices ? recipe.spices.split('\n').filter(i => i.trim()) : [];
  const beverages = recipe.beverages ? recipe.beverages.split('\n').filter(i => i.trim()) : [];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to recipes
          </button>
          <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
        </div>

        <div className={`rounded-2xl shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 relative">
            {recipe.image_url ? (
              <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : ''}`}>
                <ChefHat className={`w-24 h-24 ${darkMode ? 'text-gray-500' : 'text-orange-300'}`} />
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{recipe.title}</h1>
                {recipe.category && (
                  <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${darkMode ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                    {recipe.category}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToPDF(recipe)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-green-400 hover:bg-green-900/30' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                  title="Export as PDF"
                >
                  <FileDown className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onEdit(recipe)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-orange-400 hover:bg-orange-900/30' : 'text-gray-500 hover:text-orange-500 hover:bg-orange-50'}`}
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDelete(recipe.id)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {recipe.description && (
              <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{recipe.description}</p>
            )}

            <div className={`flex flex-wrap gap-6 mb-8 pb-8 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              {recipe.prep_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Prep Time</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : ''}`}>{recipe.prep_time} min</p>
                  </div>
                </div>
              )}
              {recipe.cook_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Cook Time</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : ''}`}>{recipe.cook_time} min</p>
                  </div>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Servings</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : ''}`}>{recipe.servings}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Ingredients</h2>
                <ul className="space-y-2">
                  {ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Instructions</h2>
                <ol className="space-y-4">
                  {instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-4">
                      <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className={`pt-0.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {(spices.length > 0 || beverages.length > 0) && (
              <div className="grid md:grid-cols-2 gap-8">
                {spices.length > 0 && (
                  <div className={`p-5 rounded-xl ${darkMode ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'}`}>
                    <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                      <Sparkles className="w-5 h-5" />
                      Spices
                    </h2>
                    <ul className="space-y-2">
                      {spices.map((spice, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className={darkMode ? 'text-amber-200' : 'text-amber-800'}>{spice}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {beverages.length > 0 && (
                  <div className={`p-5 rounded-xl ${darkMode ? 'bg-pink-900/20 border border-pink-800/30' : 'bg-pink-50 border border-pink-100'}`}>
                    <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-pink-400' : 'text-pink-700'}`}>
                      <Wine className="w-5 h-5" />
                      Recommended Beverages
                    </h2>
                    <ul className="space-y-2">
                      {beverages.map((beverage, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className={darkMode ? 'text-pink-200' : 'text-pink-800'}>{beverage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Category Selector Component
function CategorySelector({ categories, onSelect, onClose, darkMode, setDarkMode }) {
  const regularCategories = categories.filter(c => !DRINK_CATEGORIES.includes(c));
  
  return (
    <div className={`min-h-screen py-8 transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
      <div className="max-w-2xl mx-auto px-4">
        <div className={`rounded-2xl shadow-sm p-8 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              What would you like to add?
            </h2>
            <div className="flex items-center gap-4">
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
              <button onClick={onClose} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Drinks Section */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                <GlassWater className="w-5 h-5" />
                Drinks
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onSelect('Cocktails')}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                    darkMode 
                      ? 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-700 hover:border-purple-500' 
                      : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍸</span>
                    <div>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Cocktails</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Alcoholic drinks</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => onSelect('Mocktails')}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                    darkMode 
                      ? 'bg-gradient-to-br from-green-900/40 to-teal-900/40 border-green-700 hover:border-green-500' 
                      : 'bg-gradient-to-br from-green-50 to-teal-50 border-green-200 hover:border-green-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🥤</span>
                    <div>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Mocktails</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Non-alcoholic drinks</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recipes Section */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                <ChefHat className="w-5 h-5" />
                Recipes
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {regularCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={`p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 hover:border-orange-500' 
                        : 'bg-orange-50 border-orange-100 hover:border-orange-400'
                    }`}
                  >
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{cat}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Drink Form Component (for Cocktails/Mocktails)
function DrinkForm({ recipe, category, onClose, onSave, darkMode, setDarkMode }) {
  const [formData, setFormData] = useState({
    title: recipe?.title || '',
    description: recipe?.description || '',
    ingredients: recipe?.ingredients || '',
    instructions: recipe?.instructions || '',
    prep_time: recipe?.prep_time || '',
    servings: recipe?.servings || '',
    category: category,
    spices: recipe?.spices || '', // used for garnish
    beverages: recipe?.beverages || '', // used for base spirits/mixers
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(recipe?.image_url || null);
  const [saving, setSaving] = useState(false);

  const isCocktail = category === 'Cocktails';

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

  const inputClass = `w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors duration-300 ${
    isCocktail 
      ? `focus:ring-purple-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-purple-200 bg-white'}`
      : `focus:ring-green-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-green-200 bg-white'}`
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`;

  const accentColor = isCocktail ? 'purple' : 'green';
  const bgGradient = isCocktail 
    ? (darkMode ? 'from-purple-900/20 to-pink-900/20' : 'from-purple-50 to-pink-50')
    : (darkMode ? 'from-green-900/20 to-teal-900/20' : 'from-green-50 to-teal-50');

  return (
    <div className={`min-h-screen py-8 transition-colors duration-300 ${darkMode ? 'bg-gray-900' : `bg-gradient-to-br ${bgGradient}`}`}>
      <div className="max-w-3xl mx-auto px-4">
        <div className={`rounded-2xl shadow-sm p-8 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{isCocktail ? '🍸' : '🥤'}</span>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {recipe ? `Edit ${category.slice(0, -1)}` : `New ${category.slice(0, -1)}`}
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {isCocktail ? 'Create an alcoholic drink recipe' : 'Create a non-alcoholic drink recipe'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
              <button onClick={onClose} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className={labelClass}>Drink Image</label>
              <div className="flex items-center gap-4">
                <div className={`w-32 h-32 rounded-xl overflow-hidden flex items-center justify-center ${
                  darkMode ? 'bg-gray-700' : isCocktail ? 'bg-purple-100' : 'bg-green-100'
                }`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <GlassWater className={`w-8 h-8 ${darkMode ? 'text-gray-500' : isCocktail ? 'text-purple-400' : 'text-green-400'}`} />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={`text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium ${
                    darkMode 
                      ? `text-gray-400 file:bg-${accentColor}-900/50 file:text-${accentColor}-400` 
                      : `text-gray-500 file:bg-${accentColor}-50 file:text-${accentColor}-600 hover:file:bg-${accentColor}-100`
                  }`}
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className={labelClass}>Name *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={inputClass}
                placeholder={isCocktail ? "e.g., Mojito, Margarita" : "e.g., Virgin Mojito, Shirley Temple"}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={inputClass}
                rows="2"
                placeholder="Brief description of this drink"
              />
            </div>

            {/* Time and Servings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Prep Time (min)</label>
                <input
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                  className={inputClass}
                  placeholder="5"
                />
              </div>
              <div>
                <label className={labelClass}>Servings</label>
                <input
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                  className={inputClass}
                  placeholder="1"
                />
              </div>
            </div>

            {/* Base Spirits/Mixers */}
            <div className={`p-4 rounded-xl ${darkMode ? `bg-${accentColor}-900/20 border border-${accentColor}-800/30` : `bg-${accentColor}-50 border border-${accentColor}-100`}`}>
              <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? `text-${accentColor}-400` : `text-${accentColor}-700`}`}>
                <Wine className="w-4 h-4" />
                {isCocktail ? 'Base Spirits & Liqueurs (one per line)' : 'Base Drinks & Juices (one per line)'}
              </label>
              <textarea
                value={formData.beverages}
                onChange={(e) => setFormData({ ...formData, beverages: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-${accentColor}-500 ${
                  darkMode ? `bg-gray-800 border-${accentColor}-800/50 text-white` : `bg-white border-${accentColor}-200`
                }`}
                rows="3"
                placeholder={isCocktail ? "50ml White Rum\n15ml Triple Sec\n30ml Lime Juice" : "100ml Orange Juice\n50ml Cranberry Juice\n30ml Grenadine"}
              />
            </div>

            {/* Ingredients/Mixers */}
            <div>
              <label className={labelClass}>Ingredients & Mixers * (one per line)</label>
              <textarea
                required
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                className={inputClass}
                rows="4"
                placeholder="Fresh mint leaves&#10;2 tsp sugar&#10;Soda water&#10;Ice cubes"
              />
            </div>

            {/* Garnish */}
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'}`}>
              <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                <Citrus className="w-4 h-4" />
                Garnish (one per line)
              </label>
              <textarea
                value={formData.spices}
                onChange={(e) => setFormData({ ...formData, spices: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode ? 'bg-gray-800 border-amber-800/50 text-amber-100' : 'bg-white border-amber-200'
                }`}
                rows="2"
                placeholder="Lime wedge&#10;Mint sprig&#10;Orange peel"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className={labelClass}>Instructions * (one step per line)</label>
              <textarea
                required
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className={inputClass}
                rows="5"
                placeholder="Muddle mint and sugar&#10;Add ice and spirits&#10;Top with soda&#10;Stir gently&#10;Garnish and serve"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-6 py-3 border rounded-xl transition-colors font-medium ${
                  darkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 px-6 py-3 text-white rounded-xl transition-colors font-medium disabled:opacity-50 ${
                  isCocktail 
                    ? 'bg-purple-500 hover:bg-purple-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
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

  const inputClass = `w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors duration-300 ${
    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200 bg-white'
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div className={`min-h-screen py-8 transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
      <div className="max-w-3xl mx-auto px-4">
        <div className={`rounded-2xl shadow-sm p-8 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {recipe ? 'Edit Recipe' : 'Add New Recipe'}
            </h2>
            <div className="flex items-center gap-4">
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
              <button onClick={onClose} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={labelClass}>Recipe Image</label>
              <div className="flex items-center gap-4">
                <div className={`w-32 h-32 rounded-xl overflow-hidden flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={`text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium ${
                    darkMode 
                      ? 'text-gray-400 file:bg-orange-900/50 file:text-orange-400 hover:file:bg-orange-900/70' 
                      : 'text-gray-500 file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={inputClass}
                placeholder="Recipe name"
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={inputClass}
                rows="2"
                placeholder="Brief description of the recipe"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Prep Time (min)</label>
                <input
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cook Time (min)</label>
                <input
                  type="number"
                  value={formData.cook_time}
                  onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Servings</label>
                <input
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Ingredients * (one per line)</label>
              <textarea
                required
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                className={inputClass}
                rows="5"
                placeholder="2 cups flour&#10;1 tsp salt&#10;1 cup milk"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'}`}>
                <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  <Sparkles className="w-4 h-4" />
                  Spices (one per line)
                </label>
                <textarea
                  value={formData.spices}
                  onChange={(e) => setFormData({ ...formData, spices: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-800 border-amber-800/50 text-amber-100 placeholder-amber-800' : 'bg-white border-amber-200'
                  }`}
                  rows="4"
                  placeholder="Salt&#10;Pepper&#10;Paprika"
                />
              </div>

              <div className={`p-4 rounded-xl ${darkMode ? 'bg-pink-900/20 border border-pink-800/30' : 'bg-pink-50 border border-pink-100'}`}>
                <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-pink-400' : 'text-pink-700'}`}>
                  <Wine className="w-4 h-4" />
                  Beverages (one per line)
                </label>
                <textarea
                  value={formData.beverages}
                  onChange={(e) => setFormData({ ...formData, beverages: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    darkMode ? 'bg-gray-800 border-pink-800/50 text-pink-100 placeholder-pink-800' : 'bg-white border-pink-200'
                  }`}
                  rows="4"
                  placeholder="Red wine&#10;Sparkling water&#10;Lemonade"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Instructions * (one step per line)</label>
              <textarea
                required
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className={inputClass}
                rows="5"
                placeholder="Mix dry ingredients&#10;Add wet ingredients&#10;Bake at 350°F for 30 minutes"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-6 py-3 border rounded-xl transition-colors font-medium ${
                  darkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
              >
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
