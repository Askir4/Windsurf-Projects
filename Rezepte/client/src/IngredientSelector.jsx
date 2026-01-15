import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';
import { searchIngredients, getAllIngredients, UNITS } from './ingredientsDatabase';

// ===================================
// INGREDIENT SELECTOR COMPONENT
// ===================================

function IngredientSelector({ onAddIngredient, darkMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pieces');
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  const searchResults = searchQuery ? searchIngredients(searchQuery) : [];
  const allIngredients = getAllIngredients();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target) &&
          resultsRef.current && !resultsRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleIngredientSelect = (ingredient) => {
    setSelectedIngredient(ingredient);
    setSearchQuery('');
    setShowResults(false);
    setShowUnitSelector(true);
  };

  const handleAddIngredient = () => {
    if (selectedIngredient && quantity) {
      const ingredientWithQuantity = {
        ...selectedIngredient,
        quantity: quantity,
        unit: unit
      };
      onAddIngredient(ingredientWithQuantity);
      
      // Reset form
      setSelectedIngredient(null);
      setQuantity('');
      setUnit('pieces');
      setShowUnitSelector(false);
    }
  };

  const handleCancel = () => {
    setSelectedIngredient(null);
    setQuantity('');
    setUnit('pieces');
    setShowUnitSelector(false);
  };

  const renderIngredientItem = (ingredient) => (
    <div
      key={ingredient.id}
      onClick={() => handleIngredientSelect(ingredient)}
      className="ingredient-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        cursor: 'pointer',
        borderRadius: 'var(--radius-lg)',
        transition: 'background-color var(--transition-fast)',
        backgroundColor: darkMode ? 'var(--color-bg-tertiary)' : 'transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = darkMode ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = darkMode ? 'var(--color-bg-tertiary)' : 'transparent';
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>{ingredient.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: 'var(--font-weight-medium)', 
          color: 'var(--color-text-primary)' 
        }}>
          {ingredient.name}
        </div>
        <div style={{ 
          fontSize: 'var(--font-size-xs)', 
          color: 'var(--color-text-muted)',
          textTransform: 'capitalize'
        }}>
          {ingredient.category}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 'var(--space-4)' 
      }}>
        {/* Search Input */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search 
              style={{ 
                position: 'absolute', 
                left: 'var(--space-3)', 
                top: '50%', 
                transform: 'translateY(-50%)',
                width: 18,
                height: 18,
                color: 'var(--color-text-muted)'
              }} 
            />
            <input
              type="text"
              placeholder="Zutat suchen..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="input input-with-icon"
              style={{ 
                paddingRight: 'var(--space-10)',
                backgroundColor: darkMode ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 'var(--space-1)',
                  color: 'var(--color-text-muted)'
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchQuery && (
            <div 
              ref={resultsRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 'var(--space-2)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 50
              }}
            >
              {searchResults.length > 0 ? (
                searchResults.slice(0, 8).map(renderIngredientItem)
              ) : (
                <div style={{ 
                  padding: 'var(--space-4)', 
                  textAlign: 'center',
                  color: 'var(--color-text-muted)'
                }}>
                  Keine Zutaten gefunden
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Ingredient with Quantity */}
        {selectedIngredient && (
          <div className="section-card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: '1.5rem' }}>{selectedIngredient.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 'var(--font-weight-semibold)', 
                  color: 'var(--color-text-primary)' 
                }}>
                  {selectedIngredient.name}
                </div>
                <div style={{ 
                  fontSize: 'var(--font-size-xs)', 
                  color: 'var(--color-text-muted)',
                  textTransform: 'capitalize'
                }}>
                  {selectedIngredient.category}
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="btn btn-icon btn-ghost"
                style={{ padding: 'var(--space-2)' }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Quantity Input */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 'var(--font-size-sm)', 
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-2)'
                }}>
                  Menge
                </label>
                <input
                  type="text"
                  placeholder="z.B. 2, 1/2, 250"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input"
                  style={{ fontSize: 'var(--font-size-base)' }}
                />
              </div>

              {/* Unit Selector */}
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 'var(--font-size-sm)', 
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-2)'
                }}>
                  Einheit
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowUnitSelector(!showUnitSelector)}
                    className="input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span>{UNITS.find(u => u.id === unit)?.icon || '🔢'}</span>
                      <span>{UNITS.find(u => u.id === unit)?.name || unit}</span>
                    </span>
                    <ChevronDown style={{ 
                      width: 16, 
                      height: 16,
                      transform: showUnitSelector ? 'rotate(180deg)' : 'none',
                      transition: 'transform var(--transition-fast)'
                    }} />
                  </button>

                  {/* Unit Dropdown */}
                  {showUnitSelector && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 'var(--space-2)',
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 50
                    }}>
                      {UNITS.map((unitOption) => (
                        <button
                          key={unitOption.id}
                          onClick={() => {
                            setUnit(unitOption.id);
                            setShowUnitSelector(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            width: '100%',
                            padding: 'var(--space-3)',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-md)',
                            transition: 'background-color var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span>{unitOption.icon}</span>
                          <span style={{ color: 'var(--color-text-primary)' }}>{unitOption.name}</span>
                          <span style={{ 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--color-text-muted)',
                            marginLeft: 'auto'
                          }}>
                            {unitOption.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddIngredient}
                disabled={!quantity}
                className="btn btn-primary"
                style={{ 
                  flex: 'none',
                  opacity: quantity ? 1 : 0.5,
                  cursor: quantity ? 'pointer' : 'not-allowed'
                }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                <span>Hinzufügen</span>
              </button>
            </div>
          </div>
        )}

        {/* Popular Ingredients */}
        {!searchQuery && !selectedIngredient && (
          <div>
            <h4 style={{ 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-3)'
            }}>
              Beliebte Zutaten
            </h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: 'var(--space-2)' 
            }}>
              {allIngredients.slice(0, 12).map(renderIngredientItem)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================
// INGREDIENT LIST COMPONENT
// ===================================

function IngredientList({ ingredients, onRemove, darkMode }) {
  if (ingredients.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 'var(--space-8)',
        color: 'var(--color-text-muted)',
        border: '2px dashed var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'var(--color-bg-tertiary)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🥘</div>
        <div>Keine Zutaten hinzugefügt</div>
        <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
          Suche oben nach Zutaten, um sie hinzuzufügen
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {ingredients.map((ingredient, index) => (
        <div
          key={`${ingredient.id}-${index}`}
          className="ingredient-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            transition: 'all var(--transition-fast)'
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>{ingredient.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 'var(--font-weight-medium)', 
              color: 'var(--color-text-primary)' 
            }}>
              {ingredient.name}
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <span>{UNITS.find(u => u.id === ingredient.unit)?.icon || '🔢'}</span>
              <span>{ingredient.quantity} {UNITS.find(u => u.id === ingredient.unit)?.name || ingredient.unit}</span>
            </div>
          </div>
          <button
            onClick={() => onRemove(index)}
            className="btn btn-icon btn-ghost"
            style={{ padding: 'var(--space-2)' }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
      ))}
    </div>
  );
}

export { IngredientSelector, IngredientList };
