import { auditRepo } from '../db/database.js';
import { auditLogger, sanitizeForLog } from '../utils/logger.js';
import type { AuditEventType, AuditLog } from '../types/index.js';

interface AuditContext {
  userId: string;
  userName: string;
  clientIp: string;
  userAgent: string;
}

interface AuditDetails {
  hostname?: string;
  requestId?: string;
  details: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

export function createAuditLog(
  eventType: AuditEventType,
  context: AuditContext,
  auditDetails: AuditDetails
): AuditLog {
  const sanitizedDetails = sanitizeForLog(auditDetails.details);
  
  // Log to file for external SIEM integration
  auditLogger.info('Audit event', {
    eventType,
    ...context,
    hostname: auditDetails.hostname,
    requestId: auditDetails.requestId,
    details: sanitizedDetails,
    success: auditDetails.success ?? true,
    errorMessage: auditDetails.errorMessage,
  });

  // Store in database
  return auditRepo.create({
    eventType,
    userId: context.userId,
    userName: context.userName,
    hostname: auditDetails.hostname || null,
    requestId: auditDetails.requestId || null,
    details: JSON.stringify(sanitizedDetails),
    clientIp: context.clientIp,
    userAgent: context.userAgent,
    success: auditDetails.success ?? true,
    errorMessage: auditDetails.errorMessage || null,
  });
}

export function logRequestCreated(
  context: AuditContext,
  requestId: string,
  hostname: string,
  justificationHash: string
): AuditLog {
  return createAuditLog('REQUEST_CREATED', context, {
    hostname,
    requestId,
    details: {
      action: 'Password request created',
      justificationHash,
    },
  });
}

export function logRequestApproved(
  context: AuditContext,
  requestId: string,
  hostname: string,
  requesterName: string,
  comment?: string
): AuditLog {
  return createAuditLog('REQUEST_APPROVED', context, {
    hostname,
    requestId,
    details: {
      action: 'Password request approved',
      requesterName,
      comment: comment || 'No comment',
    },
  });
}

export function logRequestDenied(
  context: AuditContext,
  requestId: string,
  hostname: string,
  requesterName: string,
  comment?: string
): AuditLog {
  return createAuditLog('REQUEST_DENIED', context, {
    hostname,
    requestId,
    details: {
      action: 'Password request denied',
      requesterName,
      comment: comment || 'No comment',
    },
  });
}

export function logPasswordRetrieved(
  context: AuditContext,
  requestId: string,
  hostname: string
): AuditLog {
  return createAuditLog('PASSWORD_RETRIEVED', context, {
    hostname,
    requestId,
    details: {
      action: 'LAPS password retrieved from AD (admin action)',
    },
  });
}

export function logPasswordDisplayed(
  context: AuditContext,
  requestId: string,
  hostname: string,
  displayExpiresAt: string
): AuditLog {
  return createAuditLog('PASSWORD_DISPLAYED', context, {
    hostname,
    requestId,
    details: {
      action: 'Password displayed to user',
      displayExpiresAt,
    },
  });
}

export function logPasswordDisplayExpired(
  context: AuditContext,
  requestId: string,
  hostname: string
): AuditLog {
  return createAuditLog('PASSWORD_DISPLAY_EXPIRED', context, {
    hostname,
    requestId,
    details: {
      action: 'Password display window expired',
    },
  });
}

export function logLoginSuccess(context: AuditContext): AuditLog {
  return createAuditLog('LOGIN_SUCCESS', context, {
    details: {
      action: 'User logged in successfully',
    },
  });
}

export function logLoginFailed(
  context: AuditContext,
  reason: string
): AuditLog {
  return createAuditLog('LOGIN_FAILED', context, {
    details: {
      action: 'Login attempt failed',
      reason,
    },
    success: false,
    errorMessage: reason,
  });
}

export function logADError(
  context: AuditContext,
  operation: string,
  hostname?: string,
  errorMessage?: string
): AuditLog {
  return createAuditLog('AD_ERROR', context, {
    hostname,
    details: {
      action: 'Active Directory operation failed',
      operation,
    },
    success: false,
    errorMessage,
  });
}

export function logLAPSNotFound(
  context: AuditContext,
  hostname: string,
  requestId?: string
): AuditLog {
  return createAuditLog('LAPS_NOT_FOUND', context, {
    hostname,
    requestId,
    details: {
      action: 'LAPS password not found for computer',
    },
    success: false,
    errorMessage: 'LAPS password not configured or not accessible',
  });
}

export function logPermissionDenied(
  context: AuditContext,
  action: string,
  hostname?: string,
  requestId?: string
): AuditLog {
  return createAuditLog('PERMISSION_DENIED', context, {
    hostname,
    requestId,
    details: {
      action: 'Permission denied',
      attemptedAction: action,
    },
    success: false,
    errorMessage: 'User does not have permission for this action',
  });
}

export function logRateLimitExceeded(
  context: AuditContext,
  limitType: string
): AuditLog {
  return createAuditLog('RATE_LIMIT_EXCEEDED', context, {
    details: {
      action: 'Rate limit exceeded',
      limitType,
    },
    success: false,
    errorMessage: 'Too many requests',
  });
}

export function logHostnameValidationFailed(
  context: AuditContext,
  hostname: string,
  reason: string
): AuditLog {
  return createAuditLog('HOSTNAME_VALIDATION_FAILED', context, {
    hostname,
    details: {
      action: 'Hostname validation failed',
      reason,
    },
    success: false,
    errorMessage: reason,
  });
}
