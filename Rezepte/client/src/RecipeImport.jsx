import React, { useState, useEffect } from 'react';
import { Link2, Download, X, Loader2, AlertCircle, CheckCircle, ExternalLink, FolderOpen } from 'lucide-react';

// Recipe Import Component - Import recipes from URLs
function RecipeImport({ onImport, onClose, darkMode, categories = [] }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState(categories);

  // Fetch categories if not provided
  useEffect(() => {
    if (categories.length === 0) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => setAvailableCategories(data))
        .catch(() => {});
    }
  }, [categories]);

  const supportedSites = [
    { name: 'Chefkoch', domain: 'chefkoch.de', icon: '👨‍🍳' },
    { name: 'REWE', domain: 'rewe.de', icon: '🛒' },
    { name: 'Lidl Kochen', domain: 'lidl-kochen.de', icon: '🍳' },
    { name: 'Essen & Trinken', domain: 'essen-und-trinken.de', icon: '🍽️' },
    { name: 'Lecker', domain: 'lecker.de', icon: '😋' },
    { name: 'Dr. Oetker', domain: 'oetker.de', icon: '🧁' },
    { name: 'Kitchen Stories', domain: 'kitchenstories.com', icon: '📖' },
    { name: 'Alle mit Schema.org', domain: '', icon: '🌐' },
  ];

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Bitte gib eine URL ein');
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      setError('Ungültige URL. Bitte gib eine vollständige URL ein (z.B. https://...)');
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);

    try {
      const response = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Importieren');
      }

      if (data.success && data.recipe) {
        setPreview(data.recipe);
      } else {
        throw new Error('Kein Rezept gefunden');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    
    if (!selectedCategory) {
      setError('Bitte wähle eine Kategorie aus');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Parse time strings to extract just numbers (e.g., "30 min" -> "30")
      const parseTimeToNumber = (timeStr) => {
        if (!timeStr) return '';
        const match = String(timeStr).match(/(\d+)/);
        return match ? match[1] : timeStr;
      };

      // Create FormData for the recipe
      const formData = new FormData();
      formData.append('title', preview.title || '');
      formData.append('description', preview.description || '');
      formData.append('ingredients', preview.ingredients || '');
      formData.append('instructions', preview.instructions || '');
      formData.append('prep_time', parseTimeToNumber(preview.prep_time));
      formData.append('cook_time', parseTimeToNumber(preview.cook_time));
      formData.append('servings', preview.servings || '');
      formData.append('category', selectedCategory);
      formData.append('spices', '');
      formData.append('beverages', '');
      
      // Add external image URL if available
      if (preview.image_url) {
        formData.append('external_image_url', preview.image_url);
      }
      
      // Add custom sections if available (for ingredients like "Für die Soße")
      if (preview.custom_sections && preview.custom_sections.length > 0) {
        formData.append('custom_sections', JSON.stringify(preview.custom_sections));
      }

      // Save to database
      const response = await fetch('/api/recipes', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern');
      }

      setSuccess(true);
      
      // Notify parent and close after short delay
      setTimeout(() => {
        if (onImport) onImport(preview);
        onClose();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleImport();
    }
  };

  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  };

  const modalStyle = {
    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  };

  const headerStyle = {
    padding: '1.5rem',
    borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const bodyStyle = {
    padding: '1.5rem',
  };

  const inputContainerStyle = {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
  };

  const inputStyle = {
    flex: 1,
    padding: '0.875rem 1rem',
    borderRadius: '10px',
    border: `2px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
    backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
    color: darkMode ? '#f1f5f9' : '#1e293b',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const buttonStyle = {
    padding: '0.875rem 1.5rem',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s',
  };

  const errorStyle = {
    padding: '1rem',
    borderRadius: '10px',
    backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    border: `1px solid ${darkMode ? '#991b1b' : '#fecaca'}`,
    color: darkMode ? '#fca5a5' : '#dc2626',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  };

  const previewStyle = {
    backgroundColor: darkMode ? '#0f172a' : '#f1f5f9',
    borderRadius: '12px',
    padding: '1.5rem',
    marginTop: '1rem',
  };

  const previewTitleStyle = {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: darkMode ? '#f1f5f9' : '#1e293b',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const previewFieldStyle = {
    marginBottom: '0.75rem',
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: darkMode ? '#94a3b8' : '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem',
  };

  const valueStyle = {
    fontSize: '0.95rem',
    color: darkMode ? '#cbd5e1' : '#475569',
    lineHeight: 1.5,
  };

  const siteListStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '1rem',
  };

  const siteTagStyle = {
    padding: '0.375rem 0.75rem',
    borderRadius: '20px',
    backgroundColor: darkMode ? '#334155' : '#e2e8f0',
    color: darkMode ? '#cbd5e1' : '#475569',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  };

  return (
    <div style={containerStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Link2 size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '700',
                color: darkMode ? '#f1f5f9' : '#1e293b',
              }}>
                Rezept importieren
              </h2>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: darkMode ? '#94a3b8' : '#64748b',
              }}>
                Füge eine URL von einer Rezept-Website ein
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem',
              cursor: 'pointer',
              borderRadius: '8px',
              color: darkMode ? '#94a3b8' : '#64748b',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {/* URL Input */}
          <div style={inputContainerStyle}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://www.chefkoch.de/rezepte/..."
              style={inputStyle}
              disabled={loading}
            />
            <button
              onClick={handleImport}
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Lädt...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Import
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div style={errorStyle}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div style={previewStyle}>
              <div style={previewTitleStyle}>
                <CheckCircle size={20} color="#22c55e" />
                {preview.title}
              </div>

              {preview.description && (
                <div style={previewFieldStyle}>
                  <div style={labelStyle}>Beschreibung</div>
                  <div style={valueStyle}>
                    {preview.description.length > 200 
                      ? preview.description.substring(0, 200) + '...' 
                      : preview.description}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                {preview.prep_time && (
                  <div style={previewFieldStyle}>
                    <div style={labelStyle}>Vorbereitungszeit</div>
                    <div style={valueStyle}>{preview.prep_time}</div>
                  </div>
                )}
                {preview.cook_time && (
                  <div style={previewFieldStyle}>
                    <div style={labelStyle}>Kochzeit</div>
                    <div style={valueStyle}>{preview.cook_time}</div>
                  </div>
                )}
                {preview.servings && (
                  <div style={previewFieldStyle}>
                    <div style={labelStyle}>Portionen</div>
                    <div style={valueStyle}>{preview.servings}</div>
                  </div>
                )}
              </div>

              {preview.ingredients && (
                <div style={previewFieldStyle}>
                  <div style={labelStyle}>Zutaten ({preview.ingredients.split('\n').length})</div>
                  <div style={{ 
                    ...valueStyle, 
                    maxHeight: '100px', 
                    overflow: 'auto',
                    fontSize: '0.85rem',
                    whiteSpace: 'pre-line',
                  }}>
                    {preview.ingredients}
                  </div>
                </div>
              )}

              {preview.source_url && (
                <div style={{ marginTop: '0.75rem' }}>
                  <a 
                    href={preview.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: '#3b82f6',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <ExternalLink size={14} />
                    Original ansehen
                  </a>
                </div>
              )}

              {/* Category Selector */}
              {!success && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={labelStyle}>
                    <FolderOpen size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Kategorie auswählen *
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: `2px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                      backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                      color: darkMode ? '#f1f5f9' : '#1e293b',
                      fontSize: '1rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">-- Kategorie wählen --</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div style={{
                  padding: '1rem',
                  marginTop: '1rem',
                  borderRadius: '10px',
                  backgroundColor: darkMode ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
                  border: `1px solid ${darkMode ? '#166534' : '#bbf7d0'}`,
                  color: darkMode ? '#86efac' : '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontWeight: '600',
                }}>
                  <CheckCircle size={24} />
                  Rezept erfolgreich gespeichert!
                </div>
              )}

              {/* Confirm Button */}
              {!success && (
                <button
                  onClick={handleConfirmImport}
                  disabled={saving || !selectedCategory}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    marginTop: '1rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: saving || !selectedCategory ? '#94a3b8' : '#22c55e',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: saving || !selectedCategory ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Speichert...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Rezept speichern
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Supported Sites */}
          {!preview && (
            <div>
              <div style={{
                fontSize: '0.875rem',
                color: darkMode ? '#94a3b8' : '#64748b',
                marginTop: '1.5rem',
              }}>
                Unterstützte Websites:
              </div>
              <div style={siteListStyle}>
                {supportedSites.map((site) => (
                  <span key={site.name} style={siteTagStyle}>
                    {site.icon} {site.name}
                  </span>
                ))}
              </div>
              <p style={{
                fontSize: '0.8rem',
                color: darkMode ? '#64748b' : '#94a3b8',
                marginTop: '1rem',
                lineHeight: 1.6,
              }}>
                💡 Die meisten Rezept-Websites verwenden das schema.org Format, 
                wodurch der Import automatisch funktioniert.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default RecipeImport;
