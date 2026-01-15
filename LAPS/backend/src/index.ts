import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initializeDatabase, requestsRepo, encryptedPasswordRepo } from './db/database.js';
import { checkADConnection } from './services/adService.js';
import { extractClientInfo } from './middleware/auth.js';
import { globalRateLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import auditRoutes from './routes/audit.js';
import settingsRoutes from './routes/settings.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Extract client info (IP, user agent)
app.use(extractClientInfo);

// Global rate limiting
app.use(globalRateLimiter);

// Request logging
app.use((req, _res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.clientIp,
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req, res) => {
  const adConnected = await checkADConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: true,
      activeDirectory: adConnected,
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Cleanup tasks
function setupCleanupTasks(): void {
  // Clean up expired passwords every minute
  setInterval(() => {
    try {
      const deleted = encryptedPasswordRepo.deleteExpired();
      if (deleted > 0) {
        logger.info('Cleaned up expired passwords', { count: deleted });
      }
    } catch (error) {
      logger.error('Password cleanup failed', { error: (error as Error).message });
    }
  }, 60 * 1000);

  // Expire old pending requests every hour
  setInterval(() => {
    try {
      const expired = requestsRepo.expirePendingRequests(24);
      if (expired > 0) {
        logger.info('Expired old pending requests', { count: expired });
      }
    } catch (error) {
      logger.error('Request expiry failed', { error: (error as Error).message });
    }
  }, 60 * 60 * 1000);
}

// Start server
async function start(): Promise<void> {
  try {
    // Initialize database
    initializeDatabase();
    
    // Check AD connection
    const adConnected = await checkADConnection();
    if (!adConnected) {
      logger.warn('Active Directory connection failed - some features may not work');
    } else {
      logger.info('Active Directory connection successful');
    }

    // Setup cleanup tasks
    setupCleanupTasks();

    // Start listening
    app.listen(config.PORT, () => {
      logger.info(`LAPS Portal API running on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Frontend URL: ${config.FRONTEND_URL}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

start();
