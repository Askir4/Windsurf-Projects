import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import { config } from '../config/index.js';

export function hashJustification(justification: string): string {
  return CryptoJS.SHA256(justification).toString().substring(0, 16);
}

export function encryptPassword(password: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(config.ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted: encrypted + ':' + authTag,
    iv: iv.toString('hex'),
  };
}

export function decryptPassword(encryptedData: string, ivHex: string): string {
  const [encrypted, authTag] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(config.ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}
