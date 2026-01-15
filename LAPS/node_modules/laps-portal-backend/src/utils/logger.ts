import winston from 'winston';
import path from 'path';
import { config } from '../config/index.js';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  }),
];

if (config.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'audit.log'),
      level: 'info',
      format: logFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 30,
    })
  );
}

export const logger = winston.createLogger({
  level: 'debug',
  defaultMeta: { service: 'laps-portal' },
  transports,
});

export const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'laps-portal-audit' },
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'audit.json'),
      format: logFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 90,
    }),
    new winston.transports.Console({
      format: consoleFormat,
      level: 'info',
    }),
  ],
});

export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'pwd', 'secret', 'token', 'key', 'credential'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
