import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { User } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      clientIp: string;
    }
  }
}

interface JWTPayload {
  username: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  groups: string[];
  iat: number;
  exp: number;
}

export function extractClientInfo(req: Request, _res: Response, next: NextFunction): void {
  // Extract client IP, handling proxies
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    req.clientIp = forwardedFor.split(',')[0].trim();
  } else if (Array.isArray(forwardedFor)) {
    req.clientIp = forwardedFor[0];
  } else {
    req.clientIp = req.socket.remoteAddress || 'unknown';
  }
  next();
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    req.user = {
      username: decoded.username,
      displayName: decoded.displayName,
      email: decoded.email,
      isAdmin: decoded.isAdmin,
      groups: decoded.groups,
    };
    next();
  } catch (err) {
    logger.warn('Invalid JWT token', { error: (err as Error).message });
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (!req.user.isAdmin) {
    logger.warn('Admin access denied', { username: req.user.username });
    res.status(403).json({ success: false, error: 'Admin privileges required' });
    return;
  }

  next();
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      isAdmin: user.isAdmin,
      groups: user.groups,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRY }
  );
}

export function getAuditContext(req: Request) {
  return {
    userId: req.user?.username || 'anonymous',
    userName: req.user?.displayName || 'Anonymous',
    clientIp: req.clientIp || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}
