import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireAdmin, getAuditContext } from '../middleware/auth.js';
import { requestCreationLimiter, passwordViewLimiter } from '../middleware/rateLimit.js';
import { requestsRepo, encryptedPasswordRepo, db } from '../db/database.js';
import { config } from '../config/index.js';
import { 
  findComputer, 
  isUserAuthorizedForComputer, 
  getLAPSPassword, 
  validateHostname 
} from '../services/adService.js';
import {
  logRequestCreated,
  logRequestApproved,
  logRequestDenied,
  logPasswordRetrieved,
  logPasswordDisplayed,
  logLAPSNotFound,
  logPermissionDenied,
  logHostnameValidationFailed,
} from '../services/auditService.js';
import { hashJustification, encryptPassword, decryptPassword, generateRequestId } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const router = Router();

const createRequestSchema = z.object({
  hostname: z.string().min(1, 'Hostname is required').max(15, 'Hostname too long'),
  justification: z.string().min(20, 'Justification must be at least 20 characters'),
});

const publicRequestSchema = z.object({
  hostname: z.string().min(1, 'Hostname is required').max(15, 'Hostname too long'),
  requesterName: z.string().min(1, 'Name is required'),
  justification: z.string().min(20, 'Justification must be at least 20 characters'),
});

const reviewRequestSchema = z.object({
  action: z.enum(['approve', 'deny']),
  comment: z.string().optional(),
});

// Public: Create password request (no auth required)
router.post(
  '/public',
  requestCreationLimiter,
  async (req: Request, res: Response) => {
    const context = {
      userId: 'anonymous',
      userName: req.body.requesterName || 'Anonymous',
      clientIp: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    
    try {
      const validation = publicRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: validation.error.errors[0].message,
        });
        return;
      }

      const { hostname, requesterName, justification } = validation.data;
      const normalizedHostname = hostname.toUpperCase().trim();

      // Validate hostname format
      const hostnameValidation = validateHostname(normalizedHostname);
      if (!hostnameValidation.valid) {
        logHostnameValidationFailed(context, normalizedHostname, hostnameValidation.error || 'Invalid format');
        res.status(400).json({
          success: false,
          error: hostnameValidation.error || 'Invalid hostname format',
        });
        return;
      }

      // Check if computer exists in AD (optional - might fail without AD)
      let computerFound = false;
      let lapsAvailable = false;
      
      try {
        const computer = await findComputer(normalizedHostname);
        if (computer) {
          computerFound = true;
          // LAPS availability will be checked during approval
          lapsAvailable = true;
        }
      } catch {
        logger.warn('AD lookup failed, proceeding without validation', { hostname: normalizedHostname });
      }

      const requestId = generateRequestId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h expiry

      const request = requestsRepo.create({
        id: requestId,
        requesterId: 'public:' + requesterName.toLowerCase().replace(/\s+/g, '.'),
        requesterName: requesterName,
        hostname: normalizedHostname,
        justification: justification,
        justificationHash: hashJustification(justification),
        status: 'pending',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        reviewedBy: null,
        reviewedAt: null,
        reviewerComment: null,
        passwordRetrievedAt: null,
        passwordDisplayedAt: null,
        passwordDisplayExpiresAt: null,
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        computerFound,
        lapsAvailable,
      });

      logRequestCreated(context, requestId, normalizedHostname, hashJustification(justification));

      logger.info('Public password request created', {
        requestId,
        hostname: normalizedHostname,
        requesterName,
        computerFound,
        lapsAvailable,
      });

      res.status(201).json({
        success: true,
        data: {
          id: request.id,
          hostname: request.hostname,
          status: request.status,
          createdAt: request.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error creating public request', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to create request',
      });
    }
  }
);

// User: Create password request
router.post(
  '/',
  authenticateToken,
  requestCreationLimiter,
  async (req: Request, res: Response) => {
    const context = getAuditContext(req);
    
    try {
      const validation = createRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: validation.error.errors[0].message,
        });
        return;
      }

      const { hostname, justification } = validation.data;
      const normalizedHostname = hostname.toUpperCase().trim();

      // Validate hostname format
      const hostnameValidation = validateHostname(normalizedHostname);
      if (!hostnameValidation.valid) {
        logHostnameValidationFailed(context, normalizedHostname, hostnameValidation.error!);
        res.status(400).json({
          success: false,
          error: hostnameValidation.error,
        });
        return;
      }

      // Check if user is authorized for this computer
      const isAuthorized = await isUserAuthorizedForComputer(req.user!.username, normalizedHostname);
      if (!isAuthorized) {
        logPermissionDenied(context, 'create_request', normalizedHostname);
        res.status(403).json({
          success: false,
          error: 'You are not authorized to request access for this computer',
        });
        return;
      }

      // Check if computer exists in AD
      const computer = await findComputer(normalizedHostname);
      const computerFound = computer !== null;

      // Check if LAPS is available (without retrieving password)
      let lapsAvailable = false;
      if (computerFound) {
        const lapsPassword = await getLAPSPassword(normalizedHostname);
        lapsAvailable = lapsPassword !== null;
      }

      // Create the request
      const requestId = generateRequestId();
      const now = new Date().toISOString();
      
      const request = requestsRepo.create({
        id: requestId,
        requesterId: req.user!.username,
        requesterName: req.user!.displayName,
        hostname: normalizedHostname,
        justification,
        justificationHash: hashJustification(justification),
        status: 'pending',
        createdAt: now,
        expiresAt: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewerComment: null,
        passwordRetrievedAt: null,
        passwordDisplayedAt: null,
        passwordDisplayExpiresAt: null,
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        computerFound,
        lapsAvailable,
      });

      logRequestCreated(context, requestId, normalizedHostname, request.justificationHash);

      logger.info('Password request created', {
        requestId,
        hostname: normalizedHostname,
        requester: req.user!.username,
        computerFound,
        lapsAvailable,
      });

      res.status(201).json({
        success: true,
        data: {
          id: request.id,
          hostname: request.hostname,
          status: request.status,
          createdAt: request.createdAt,
          computerFound: request.computerFound,
          lapsAvailable: request.lapsAvailable,
        },
      });
    } catch (error) {
      logger.error('Failed to create password request', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to create password request',
      });
    }
  }
);

// User: Get own requests
router.get('/my', authenticateToken, (req: Request, res: Response) => {
  try {
    const requests = requestsRepo.getByUserId(req.user!.username);
    
    // Don't expose justification to frontend list view
    const sanitizedRequests = requests.map(r => ({
      id: r.id,
      hostname: r.hostname,
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      reviewerComment: r.reviewerComment,
      passwordDisplayExpiresAt: r.passwordDisplayExpiresAt,
      computerFound: r.computerFound,
      lapsAvailable: r.lapsAvailable,
    }));

    res.json({ success: true, data: sanitizedRequests });
  } catch (error) {
    logger.error('Failed to fetch user requests', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// User: View approved password
router.get(
  '/:id/password',
  authenticateToken,
  passwordViewLimiter,
  async (req: Request, res: Response) => {
    const context = getAuditContext(req);
    const { id } = req.params;

    try {
      const request = requestsRepo.getById(id);
      
      if (!request) {
        res.status(404).json({ success: false, error: 'Request not found' });
        return;
      }

      // Verify ownership
      if (request.requesterId !== req.user!.username) {
        logPermissionDenied(context, 'view_password', request.hostname, id);
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      // Verify approved status
      if (request.status !== 'approved') {
        res.status(400).json({ 
          success: false, 
          error: 'Password request has not been approved' 
        });
        return;
      }

      // Check if display window has expired
      if (request.passwordDisplayExpiresAt) {
        const expiresAt = new Date(request.passwordDisplayExpiresAt);
        if (new Date() > expiresAt) {
          encryptedPasswordRepo.delete(id);
          res.status(400).json({
            success: false,
            error: 'Password display window has expired. Please create a new request.',
          });
          return;
        }
      }

      // Get encrypted password
      const encryptedData = encryptedPasswordRepo.get(id);
      if (!encryptedData) {
        res.status(400).json({
          success: false,
          error: 'Password not available. It may have expired or was already viewed.',
        });
        return;
      }

      // Check expiry
      if (new Date() > new Date(encryptedData.expiresAt)) {
        encryptedPasswordRepo.delete(id);
        res.status(400).json({
          success: false,
          error: 'Password has expired. Please create a new request.',
        });
        return;
      }

      // Decrypt and return password
      const password = decryptPassword(encryptedData.encryptedPassword, encryptedData.iv);
      
      // Calculate remaining time
      const expiresAt = new Date(encryptedData.expiresAt);
      const remainingMs = expiresAt.getTime() - Date.now();
      const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));

      logPasswordDisplayed(context, id, request.hostname, encryptedData.expiresAt);

      res.json({
        success: true,
        data: {
          password,
          hostname: request.hostname,
          expiresAt: encryptedData.expiresAt,
          remainingMinutes,
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve password', { error: (error as Error).message, requestId: id });
      res.status(500).json({ success: false, error: 'Failed to retrieve password' });
    }
  }
);

// Admin: Get pending requests queue
router.get('/queue', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const requests = requestsRepo.getPending();
    res.json({ success: true, data: requests });
  } catch (error) {
    logger.error('Failed to fetch request queue', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to fetch queue' });
  }
});

// Admin: Get all requests with filters
router.get('/all', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { status, userId, hostname, fromDate, toDate, page, pageSize } = req.query;
    
    const result = requestsRepo.getAll({
      status: status as string,
      userId: userId as string,
      hostname: hostname as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json({
      success: true,
      data: result.requests,
      total: result.total,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
      totalPages: Math.ceil(result.total / (req.query.pageSize ? parseInt(req.query.pageSize as string) : 20)),
    });
  } catch (error) {
    logger.error('Failed to fetch all requests', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// Admin: Get request details
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const request = requestsRepo.getById(req.params.id);
    
    if (!request) {
      res.status(404).json({ success: false, error: 'Request not found' });
      return;
    }

    // Non-admins can only see their own requests
    if (!req.user!.isAdmin && request.requesterId !== req.user!.username) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Hide full justification from non-owners in list view
    const responseData = req.user!.isAdmin || request.requesterId === req.user!.username
      ? request
      : { ...request, justification: '[Hidden]' };

    res.json({ success: true, data: responseData });
  } catch (error) {
    logger.error('Failed to fetch request', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to fetch request' });
  }
});

// Admin: Review request (approve/deny)
router.post(
  '/:id/review',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const context = getAuditContext(req);
    const { id } = req.params;

    try {
      const validation = reviewRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: validation.error.errors[0].message,
        });
        return;
      }

      const { action, comment } = validation.data;
      const request = requestsRepo.getById(id);

      if (!request) {
        res.status(404).json({ success: false, error: 'Request not found' });
        return;
      }

      if (request.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: 'Request has already been reviewed',
        });
        return;
      }

      if (action === 'approve') {
        // Retrieve LAPS password from AD
        const lapsPassword = await getLAPSPassword(request.hostname);
        
        if (!lapsPassword) {
          logLAPSNotFound(context, request.hostname, id);
          res.status(400).json({
            success: false,
            error: 'LAPS password not found for this computer',
          });
          return;
        }

        // Encrypt and store password temporarily
        const { encrypted, iv } = encryptPassword(lapsPassword.password);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + config.PASSWORD_DISPLAY_MINUTES * 60 * 1000);

        encryptedPasswordRepo.store({
          requestId: id,
          encryptedPassword: encrypted,
          iv,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        });

        // Update request status
        requestsRepo.updateStatus(id, 'approved', req.user!.username, comment);
        requestsRepo.markPasswordRetrieved(id);
        
        // Update display expiry
        db.prepare(`
          UPDATE password_requests 
          SET password_display_expires_at = ? 
          WHERE id = ?
        `).run(expiresAt.toISOString(), id);

        logPasswordRetrieved(context, id, request.hostname);
        logRequestApproved(context, id, request.hostname, request.requesterName, comment);

        logger.info('Password request approved', {
          requestId: id,
          hostname: request.hostname,
          approvedBy: req.user!.username,
          expiresAt: expiresAt.toISOString(),
        });

        res.json({
          success: true,
          message: 'Request approved. Password is now available to the user.',
          data: {
            expiresAt: expiresAt.toISOString(),
            displayMinutes: config.PASSWORD_DISPLAY_MINUTES,
          },
        });
      } else {
        // Deny request
        requestsRepo.updateStatus(id, 'denied', req.user!.username, comment);
        logRequestDenied(context, id, request.hostname, request.requesterName, comment);

        logger.info('Password request denied', {
          requestId: id,
          hostname: request.hostname,
          deniedBy: req.user!.username,
        });

        res.json({
          success: true,
          message: 'Request denied.',
        });
      }
    } catch (error) {
      logger.error('Failed to review request', { error: (error as Error).message, requestId: id });
      res.status(500).json({ success: false, error: 'Failed to review request' });
    }
  }
);

export default router;
