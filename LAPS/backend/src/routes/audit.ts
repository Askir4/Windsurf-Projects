import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { auditRepo } from '../db/database.js';
import { logger } from '../utils/logger.js';
import type { AuditEventType } from '../types/index.js';

const router = Router();

// Admin: Get audit logs with filters
router.get('/', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { eventType, userId, hostname, fromDate, toDate, success, page, pageSize } = req.query;
    
    const result = auditRepo.getAll({
      eventType: eventType as AuditEventType,
      userId: userId as string,
      hostname: hostname as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      success: success !== undefined ? success === 'true' : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 50,
      totalPages: Math.ceil(result.total / (pageSize ? parseInt(pageSize as string) : 50)),
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// Admin: Export audit logs to CSV
router.get('/export', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    
    const csv = auditRepo.exportToCsv({
      fromDate: fromDate as string,
      toDate: toDate as string,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Failed to export audit logs', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to export audit logs' });
  }
});

// Admin: Get audit event types for filtering
router.get('/event-types', authenticateToken, requireAdmin, (_req: Request, res: Response) => {
  const eventTypes: AuditEventType[] = [
    'REQUEST_CREATED',
    'REQUEST_APPROVED',
    'REQUEST_DENIED',
    'REQUEST_EXPIRED',
    'PASSWORD_RETRIEVED',
    'PASSWORD_DISPLAYED',
    'PASSWORD_DISPLAY_EXPIRED',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'AD_ERROR',
    'LAPS_NOT_FOUND',
    'PERMISSION_DENIED',
    'RATE_LIMIT_EXCEEDED',
    'HOSTNAME_VALIDATION_FAILED',
  ];

  res.json({ success: true, data: eventTypes });
});

export default router;
