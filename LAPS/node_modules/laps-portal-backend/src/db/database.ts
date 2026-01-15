import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { PasswordRequest, AuditLog, AuditEventType, EncryptedPassword } from '../types/index.js';

// In-Memory Storage
const requests = new Map<string, PasswordRequest>();
const auditLogs = new Map<string, AuditLog>();
const encryptedPasswords = new Map<string, EncryptedPassword>();

// Persistence
const dbDir = path.dirname(config.DATABASE_PATH);
const dataFile = config.DATABASE_PATH.replace('.db', '.json');

function saveToFile(): void {
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const data = {
      requests: Array.from(requests.entries()),
      auditLogs: Array.from(auditLogs.entries()),
      encryptedPasswords: Array.from(encryptedPasswords.entries()),
    };
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  } catch (err) {
    logger.error('Failed to save database', { error: (err as Error).message });
  }
}

function loadFromFile(): void {
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf-8');
      const data = JSON.parse(raw);
      if (data.requests) {
        for (const [k, v] of data.requests) {
          requests.set(k, v as PasswordRequest);
        }
      }
      if (data.auditLogs) {
        for (const [k, v] of data.auditLogs) {
          auditLogs.set(k, v as AuditLog);
        }
      }
      if (data.encryptedPasswords) {
        for (const [k, v] of data.encryptedPasswords) {
          encryptedPasswords.set(k, v as EncryptedPassword);
        }
      }
      logger.info('Database loaded from file', { 
        requests: requests.size, 
        auditLogs: auditLogs.size 
      });
    }
  } catch (err) {
    logger.error('Failed to load database', { error: (err as Error).message });
  }
}

// Dummy db object for compatibility with routes
export const db = {
  prepare: (_sql: string) => ({
    run: (..._args: unknown[]) => ({ changes: 1 }),
    get: (..._args: unknown[]) => undefined,
    all: (..._args: unknown[]) => [],
  }),
  exec: (_sql: string) => {},
};

export function initializeDatabase(): void {
  logger.info('Initializing in-memory database...');
  loadFromFile();
  logger.info('Database initialized successfully');
}

export const requestsRepo = {
  create(request: Omit<PasswordRequest, 'updatedAt'>): PasswordRequest {
    const fullRequest: PasswordRequest = {
      ...request,
      updatedAt: new Date().toISOString(),
    };
    requests.set(request.id, fullRequest);
    saveToFile();
    return fullRequest;
  },

  getById(id: string): PasswordRequest | null {
    return requests.get(id) || null;
  },

  getByUserId(userId: string, limit = 50): PasswordRequest[] {
    const result: PasswordRequest[] = [];
    for (const req of requests.values()) {
      if (req.requesterId === userId) {
        result.push(req);
      }
    }
    return result
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  getPending(limit = 100): PasswordRequest[] {
    const result: PasswordRequest[] = [];
    for (const req of requests.values()) {
      if (req.status === 'pending') {
        result.push(req);
      }
    }
    return result
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, limit);
  },

  getAll(filters: {
    status?: string;
    userId?: string;
    hostname?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  } = {}): { requests: PasswordRequest[]; total: number } {
    let result = Array.from(requests.values());

    if (filters.status) {
      result = result.filter(r => r.status === filters.status);
    }
    if (filters.userId) {
      result = result.filter(r => r.requesterId === filters.userId);
    }
    if (filters.hostname) {
      result = result.filter(r => r.hostname.includes(filters.hostname!));
    }
    if (filters.fromDate) {
      result = result.filter(r => r.createdAt >= filters.fromDate!);
    }
    if (filters.toDate) {
      result = result.filter(r => r.createdAt <= filters.toDate!);
    }

    const total = result.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    result = result
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + pageSize);

    return { requests: result, total };
  },

  updateStatus(
    id: string,
    status: string,
    reviewedBy: string,
    reviewerComment?: string
  ): PasswordRequest | null {
    const req = requests.get(id);
    if (!req) return null;

    req.status = status as PasswordRequest['status'];
    req.reviewedBy = reviewedBy;
    req.reviewedAt = new Date().toISOString();
    req.reviewerComment = reviewerComment || null;
    req.updatedAt = new Date().toISOString();
    
    requests.set(id, req);
    saveToFile();
    return req;
  },

  markPasswordRetrieved(id: string): void {
    const req = requests.get(id);
    if (req) {
      req.passwordRetrievedAt = new Date().toISOString();
      req.updatedAt = new Date().toISOString();
      requests.set(id, req);
      saveToFile();
    }
  },

  markPasswordDisplayed(id: string, expiresAt: string): void {
    const req = requests.get(id);
    if (req) {
      req.passwordDisplayedAt = new Date().toISOString();
      req.passwordDisplayExpiresAt = expiresAt;
      req.updatedAt = new Date().toISOString();
      requests.set(id, req);
      saveToFile();
    }
  },

  expirePendingRequests(olderThanHours = 24): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
    let count = 0;
    for (const req of requests.values()) {
      if (req.status === 'pending' && req.createdAt < cutoff) {
        req.status = 'expired';
        req.updatedAt = new Date().toISOString();
        requests.set(req.id, req);
        count++;
      }
    }
    if (count > 0) saveToFile();
    return count;
  },

  countRecentByUser(userId: string, withinMinutes = 60): number {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
    let count = 0;
    for (const req of requests.values()) {
      if (req.requesterId === userId && req.createdAt > cutoff) {
        count++;
      }
    }
    return count;
  },
};

export const auditRepo = {
  create(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const id = crypto.randomUUID();
    const fullLog: AuditLog = {
      ...log,
      id,
      timestamp: new Date().toISOString(),
    };
    auditLogs.set(id, fullLog);
    saveToFile();
    return fullLog;
  },

  getById(id: string): AuditLog | null {
    return auditLogs.get(id) || null;
  },

  getAll(filters: {
    eventType?: AuditEventType;
    userId?: string;
    hostname?: string;
    fromDate?: string;
    toDate?: string;
    success?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): { logs: AuditLog[]; total: number } {
    let result = Array.from(auditLogs.values());

    if (filters.eventType) {
      result = result.filter(l => l.eventType === filters.eventType);
    }
    if (filters.userId) {
      result = result.filter(l => l.userId === filters.userId);
    }
    if (filters.hostname) {
      result = result.filter(l => l.hostname?.includes(filters.hostname!) ?? false);
    }
    if (filters.fromDate) {
      result = result.filter(l => l.timestamp >= filters.fromDate!);
    }
    if (filters.toDate) {
      result = result.filter(l => l.timestamp <= filters.toDate!);
    }
    if (filters.success !== undefined) {
      result = result.filter(l => l.success === filters.success);
    }

    const total = result.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const offset = (page - 1) * pageSize;

    result = result
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + pageSize);

    return { logs: result, total };
  },

  exportToCsv(filters: { fromDate?: string; toDate?: string } = {}): string {
    let result = Array.from(auditLogs.values());

    if (filters.fromDate) {
      result = result.filter(l => l.timestamp >= filters.fromDate!);
    }
    if (filters.toDate) {
      result = result.filter(l => l.timestamp <= filters.toDate!);
    }

    result = result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const headers = ['ID', 'Timestamp', 'Event Type', 'User ID', 'User Name', 'Hostname', 'Request ID', 'Details', 'Client IP', 'Success', 'Error'];
    const csvRows = result.map(log => [
      log.id,
      log.timestamp,
      log.eventType,
      log.userId,
      log.userName,
      log.hostname || '',
      log.requestId || '',
      `"${String(log.details).replace(/"/g, '""')}"`,
      log.clientIp,
      log.success ? 'Yes' : 'No',
      log.errorMessage || '',
    ].join(','));

    return [headers.join(','), ...csvRows].join('\n');
  },
};

export const encryptedPasswordRepo = {
  store(data: EncryptedPassword): void {
    encryptedPasswords.set(data.requestId, data);
    saveToFile();
  },

  get(requestId: string): EncryptedPassword | null {
    return encryptedPasswords.get(requestId) || null;
  },

  delete(requestId: string): void {
    encryptedPasswords.delete(requestId);
    saveToFile();
  },

  deleteExpired(): number {
    const now = new Date().toISOString();
    let count = 0;
    for (const [key, val] of encryptedPasswords.entries()) {
      if (val.expiresAt < now) {
        encryptedPasswords.delete(key);
        count++;
      }
    }
    if (count > 0) saveToFile();
    return count;
  },
};
