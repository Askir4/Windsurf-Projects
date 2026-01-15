import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { logRateLimitExceeded } from '../services/auditService.js';
import type { Request, Response } from 'express';

export const globalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS * 10, // Higher limit for general API
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Global rate limit exceeded', { 
      ip: req.clientIp, 
      path: req.path 
    });
    res.status(429).json({ 
      success: false, 
      error: 'Too many requests, please try again later' 
    });
  },
});

export const requestCreationLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: 'Too many password requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit per user, not per IP
    return req.user?.username || req.clientIp || 'anonymous';
  },
  handler: (req: Request, res: Response) => {
    const context = {
      userId: req.user?.username || 'anonymous',
      userName: req.user?.displayName || 'Anonymous',
      clientIp: req.clientIp || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    
    logRateLimitExceeded(context, 'password_request_creation');
    
    res.status(429).json({ 
      success: false, 
      error: 'Too many password requests. Please wait before creating new requests.' 
    });
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: { success: false, error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.clientIp || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Login rate limit exceeded', { ip: req.clientIp });
    res.status(429).json({ 
      success: false, 
      error: 'Too many login attempts. Please wait 15 minutes before trying again.' 
    });
  },
});

export const passwordViewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 password views per minute
  message: { success: false, error: 'Too many password view attempts' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.username || req.clientIp || 'anonymous';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Password view rate limit exceeded', { 
      username: req.user?.username,
      ip: req.clientIp 
    });
    res.status(429).json({ 
      success: false, 
      error: 'Too many password view attempts. Please wait before trying again.' 
    });
  },
});
