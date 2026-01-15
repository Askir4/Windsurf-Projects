import { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, Save, RotateCcw, Sun, Moon, Palette, Check, 
  ChevronDown, ChevronRight, Paintbrush, Type, Layout, Boxes
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useAuthStore } from '../store/authStore';

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  border: string;
  input: string;
  ring: string;
  muted: string;
  mutedForeground: string;
}

interface SettingsData {
  theme: {
    defaultMode: 'light' | 'dark';
    colors: ThemeColors;
    darkColors: ThemeColors;
  };
  branding: {
    appName: string;
    logoUrl: string;
  };
}

const colorGroups = {
  brand: {
    label: 'Markenfarben',
    icon: Paintbrush,
    keys: ['primary', 'primaryForeground', 'ring'] as const,
  },
  ui: {
    label: 'Oberfläche',
    icon: Layout,
    keys: ['background', 'foreground', 'card', 'cardForeground', 'border', 'input'] as const,
  },
  semantic: {
    label: 'Semantisch',
    icon: Boxes,
    keys: ['secondary', 'secondaryForeground', 'accent', 'accentForeground', 'destructive', 'destructiveForeground'] as const,
  },
  text: {
    label: 'Text',
    icon: Type,
    keys: ['muted', 'mutedForeground'] as const,
  },
};

const colorLabels: Record<keyof ThemeColors, string> = {
  primary: 'Primär',
  primaryForeground: 'Primär Text',
  secondary: 'Sekundär',
  secondaryForeground: 'Sekundär Text',
  accent: 'Akzent',
  accentForeground: 'Akzent Text',
  destructive: 'Fehler',
  destructiveForeground: 'Fehler Text',
  background: 'Hintergrund',
  foreground: 'Vordergrund',
  card: 'Karte',
  cardForeground: 'Karte Text',
  border: 'Rahmen',
  input: 'Eingabe',
  ring: 'Fokus',
  muted: 'Gedämpft',
  mutedForeground: 'Gedämpft Text',
};

const presets = [
  { name: 'Blau', color: '#3b82f6' },
  { name: 'Grün', color: '#22c55e' },
  { name: 'Lila', color: '#a855f7' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Rot', color: '#ef4444' },
  { name: 'Türkis', color: '#14b8a6' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Indigo', color: '#6366f1' },
];

function ColorInput({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div 
          className="w-4 h-4 rounded-full border border-border shrink-0" 
          style={{ backgroundColor: value }}
        />
        <span className="text-sm truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
        />
        <Input
          value={value.toUpperCase()}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
          }}
          className="w-20 h-8 font-mono text-xs px-2"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function Accordion({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="p-4 border-t border-border bg-background">
          {children}
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const { token } = useAuthStore();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeMode, setActiveMode] = useState<'light' | 'dark'>('light');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) setSettings(data.data);
      else throw new Error(data.error);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Laden fehlgeschlagen' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const save = async () => {
    if (!settings || !token) return;
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Speichern fehlgeschlagen');
      setMessage({ type: 'success', text: 'Gespeichert!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Fehler' });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm('Alle Einstellungen zurücksetzen?') || !token) return;
    try {
      setSaving(true);
      const res = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setMessage({ type: 'success', text: 'Zurückgesetzt!' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Fehler beim Zurücksetzen' });
    } finally {
      setSaving(false);
    }
  };

  const updateColor = (key: keyof ThemeColors, value: string) => {
    if (!settings) return;
    const colorsKey = activeMode === 'light' ? 'colors' : 'darkColors';
    setSettings({
      ...settings,
      theme: {
        ...settings.theme,
        [colorsKey]: { ...settings.theme[colorsKey], [key]: value },
      },
    });
  };

  const applyPreset = (color: string) => {
    if (!settings) return;
    const colorsKey = activeMode === 'light' ? 'colors' : 'darkColors';
    setSettings({
      ...settings,
      theme: {
        ...settings.theme,
        [colorsKey]: { ...settings.theme[colorsKey], primary: color, ring: color },
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Einstellungen konnten nicht geladen werden</p>
        <Button onClick={loadSettings}>Erneut versuchen</Button>
      </div>
    );
  }

  const colors = activeMode === 'light' ? settings.theme.colors : settings.theme.darkColors;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Globale Theme-Einstellungen für alle Benutzer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reset} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Speichern
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {message.type === 'success' && <Check className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Default Mode */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sun className="w-4 h-4" />
                Standard-Modus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSettings({ ...settings, theme: { ...settings.theme, defaultMode: 'light' } })}
                  className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    settings.theme.defaultMode === 'light'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  <span className="font-medium">Light</span>
                </button>
                <button
                  onClick={() => setSettings({ ...settings, theme: { ...settings.theme, defaultMode: 'dark' } })}
                  className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    settings.theme.defaultMode === 'dark'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="font-medium">Dark</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Color Editor */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Farbschema
                </CardTitle>
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setActiveMode('light')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      activeMode === 'light' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    <Sun className="w-3 h-3" /> Light
                  </button>
                  <button
                    onClick={() => setActiveMode('dark')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      activeMode === 'dark' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    <Moon className="w-3 h-3" /> Dark
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Presets */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Schnellauswahl
                </label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {presets.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => applyPreset(p.color)}
                      title={p.name}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                        colors.primary === p.color ? 'border-foreground' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: p.color }}
                    />
                  ))}
                </div>
              </div>

              {/* Color Groups */}
              <div className="space-y-3 pt-2">
                {Object.entries(colorGroups).map(([key, group]) => (
                  <Accordion 
                    key={key} 
                    title={group.label} 
                    icon={group.icon}
                    defaultOpen={key === 'brand'}
                  >
                    <div className="divide-y divide-border">
                      {group.keys.map((colorKey) => (
                        <ColorInput
                          key={colorKey}
                          label={colorLabels[colorKey]}
                          value={colors[colorKey]}
                          onChange={(v) => updateColor(colorKey, v)}
                        />
                      ))}
                    </div>
                  </Accordion>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">
                  Vorschau
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="rounded-lg border p-4 space-y-4"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }}
                >
                  <div 
                    className="rounded-lg border p-3"
                    style={{ 
                      backgroundColor: colors.card, 
                      borderColor: colors.border 
                    }}
                  >
                    <h4 
                      className="font-semibold text-sm"
                      style={{ color: colors.cardForeground }}
                    >
                      Karten-Titel
                    </h4>
                    <p 
                      className="text-xs mt-1"
                      style={{ color: colors.mutedForeground }}
                    >
                      Beschreibungstext
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      className="w-full py-2 px-3 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.primaryForeground,
                      }}
                    >
                      Primär Button
                    </button>
                    <button
                      className="w-full py-2 px-3 rounded-md text-xs font-medium border"
                      style={{
                        backgroundColor: colors.secondary,
                        color: colors.secondaryForeground,
                        borderColor: colors.border,
                      }}
                    >
                      Sekundär Button
                    </button>
                    <button
                      className="w-full py-2 px-3 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: colors.destructive,
                        color: colors.destructiveForeground,
                      }}
                    >
                      Fehler Button
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Eingabefeld"
                    className="w-full py-2 px-3 rounded-md text-xs border"
                    style={{
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      borderColor: colors.input,
                    }}
                    readOnly
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
