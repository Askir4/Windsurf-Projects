import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Settings file path
const settingsPath = path.join(process.cwd(), 'data', 'settings.json');

// Default settings
const defaultSettings = {
  theme: {
    defaultMode: 'light' as 'light' | 'dark',
    colors: {
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      accent: '#f1f5f9',
      accentForeground: '#0f172a',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#0f172a',
      card: '#ffffff',
      cardForeground: '#0f172a',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#3b82f6',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
    },
    darkColors: {
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      secondary: '#1e293b',
      secondaryForeground: '#f8fafc',
      accent: '#1e293b',
      accentForeground: '#f8fafc',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      background: '#0f172a',
      foreground: '#f8fafc',
      card: '#1e293b',
      cardForeground: '#f8fafc',
      border: '#334155',
      input: '#334155',
      ring: '#3b82f6',
      muted: '#1e293b',
      mutedForeground: '#94a3b8',
    },
  },
  branding: {
    appName: 'LAPS Portal',
    logoUrl: '',
  },
};

type Settings = typeof defaultSettings;

function loadSettings(): Settings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (err) {
    logger.error('Failed to load settings', { error: (err as Error).message });
  }
  return defaultSettings;
}

function saveSettings(settings: Settings): void {
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    logger.info('Settings saved successfully');
  } catch (err) {
    logger.error('Failed to save settings', { error: (err as Error).message });
    throw err;
  }
}

const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color');

const settingsSchema = z.object({
  theme: z.object({
    defaultMode: z.enum(['light', 'dark']),
    colors: z.object({
      primary: colorSchema,
      primaryForeground: colorSchema,
      secondary: colorSchema,
      secondaryForeground: colorSchema,
      accent: colorSchema,
      accentForeground: colorSchema,
      destructive: colorSchema,
      destructiveForeground: colorSchema,
      background: colorSchema,
      foreground: colorSchema,
      card: colorSchema,
      cardForeground: colorSchema,
      border: colorSchema,
      input: colorSchema,
      ring: colorSchema,
      muted: colorSchema,
      mutedForeground: colorSchema,
    }),
    darkColors: z.object({
      primary: colorSchema,
      primaryForeground: colorSchema,
      secondary: colorSchema,
      secondaryForeground: colorSchema,
      accent: colorSchema,
      accentForeground: colorSchema,
      destructive: colorSchema,
      destructiveForeground: colorSchema,
      background: colorSchema,
      foreground: colorSchema,
      card: colorSchema,
      cardForeground: colorSchema,
      border: colorSchema,
      input: colorSchema,
      ring: colorSchema,
      muted: colorSchema,
      mutedForeground: colorSchema,
    }),
  }),
  branding: z.object({
    appName: z.string().min(1).max(50),
    logoUrl: z.string().max(500),
  }),
});

// Public: Get settings (no auth required)
router.get('/', (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Error loading settings', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to load settings',
    });
  }
});

// Admin: Update settings
router.put('/', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const validation = settingsSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    saveSettings(validation.data);

    logger.info('Settings updated by admin', { admin: req.user?.username });

    res.json({
      success: true,
      data: validation.data,
    });
  } catch (error) {
    logger.error('Error saving settings', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to save settings',
    });
  }
});

// Admin: Reset settings to default
router.post('/reset', authenticateToken, requireAdmin, (_req: Request, res: Response) => {
  try {
    saveSettings(defaultSettings);
    res.json({
      success: true,
      data: defaultSettings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reset settings',
    });
  }
});

export default router;
