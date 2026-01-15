import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../services/adService.js';
import { generateToken, authenticateToken, getAuditContext } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import { logLoginSuccess, logLoginFailed } from '../services/auditService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { User } from '../types/index.js';

const router = Router();

// Demo users for testing without AD
const DEMO_USERS: Record<string, User> = {
  'admin': {
    username: 'admin',
    displayName: 'Admin User',
    email: 'admin@demo.local',
    isAdmin: true,
    groups: ['GG_LAPS_Request_Admins'],
  },
  'user': {
    username: 'user',
    displayName: 'Test User',
    email: 'user@demo.local',
    isAdmin: false,
    groups: [],
  },
};

async function authenticateWithDemoFallback(username: string, password: string): Promise<User | null> {
  // In production: only use AD
  if (config.NODE_ENV === 'production') {
    return authenticateUser(username, password);
  }
  
  // Demo mode first: check if it's a demo user
  const demoUser = DEMO_USERS[username.toLowerCase()];
  if (demoUser && password === username.toLowerCase()) {
    logger.info('Demo user authenticated', { username });
    return demoUser;
  }
  
  // Then try AD as fallback
  try {
    const user = await authenticateUser(username, password);
    if (user) return user;
  } catch {
    logger.warn('AD auth failed');
  }
  
  return null;
}

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid credentials format' 
      });
      return;
    }

    const { username, password } = validation.data;
    const context = {
      userId: username,
      userName: username,
      clientIp: req.clientIp,
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    const user = await authenticateWithDemoFallback(username, password);
    
    if (!user) {
      logLoginFailed(context, 'Invalid credentials');
      res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
      return;
    }

    const token = generateToken(user);
    logLoginSuccess({ ...context, userName: user.displayName });

    logger.info('User logged in successfully', { 
      username: user.username, 
      isAdmin: user.isAdmin 
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      },
    });
  } catch (error) {
    logger.error('Login error', { error: (error as Error).message });
    res.status(500).json({ 
      success: false, 
      error: 'Authentication service unavailable' 
    });
  }
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  res.json({
    success: true,
    data: {
      username: req.user.username,
      displayName: req.user.displayName,
      email: req.user.email,
      isAdmin: req.user.isAdmin,
    },
  });
});

router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  // JWT is stateless - client should discard the token
  // In production, you might want to implement token blacklisting
  logger.info('User logged out', { username: req.user?.username });
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/validate', authenticateToken, (_req: Request, res: Response) => {
  res.json({ success: true, valid: true });
});

export default router;
