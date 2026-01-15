import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Session & Security
  SESSION_SECRET: z.string().default('laps-portal-dev-secret-change-in-production'),
  JWT_SECRET: z.string().default('jwt-secret-change-in-production'),
  JWT_EXPIRY: z.string().default('8h'),
  PASSWORD_DISPLAY_MINUTES: z.coerce.number().default(10),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(3600000), // 1 hour
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(10),
  
  // Active Directory
  AD_URL: z.string().default('ldap://dc01.domain.local'),
  AD_BASE_DN: z.string().default('DC=domain,DC=local'),
  AD_USERNAME: z.string().default('svc_laps_reader@domain.local'),
  AD_PASSWORD: z.string().default(''),
  AD_ADMIN_GROUP: z.string().default('GG_LAPS_Request_Admins'),
  
  // LAPS Attribute Names
  LAPS_PASSWORD_ATTRIBUTE: z.string().default('ms-Mcs-AdmPwd'),
  LAPS_EXPIRY_ATTRIBUTE: z.string().default('ms-Mcs-AdmPwdExpirationTime'),
  
  // Windows LAPS (new) - for future use
  WINDOWS_LAPS_PASSWORD_ATTRIBUTE: z.string().default('msLAPS-Password'),
  WINDOWS_LAPS_ENCRYPTED_PASSWORD_ATTRIBUTE: z.string().default('msLAPS-EncryptedPassword'),
  
  // Database
  DATABASE_PATH: z.string().default('./data/laps.db'),
  
  // Encryption key for temporary password storage
  ENCRYPTION_KEY: z.string().default('32-char-encryption-key-change!!'),
  
  // Frontend URL for CORS
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const env = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  SESSION_SECRET: process.env.SESSION_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY,
  PASSWORD_DISPLAY_MINUTES: process.env.PASSWORD_DISPLAY_MINUTES,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
  AD_URL: process.env.AD_URL,
  AD_BASE_DN: process.env.AD_BASE_DN,
  AD_USERNAME: process.env.AD_USERNAME,
  AD_PASSWORD: process.env.AD_PASSWORD,
  AD_ADMIN_GROUP: process.env.AD_ADMIN_GROUP,
  LAPS_PASSWORD_ATTRIBUTE: process.env.LAPS_PASSWORD_ATTRIBUTE,
  LAPS_EXPIRY_ATTRIBUTE: process.env.LAPS_EXPIRY_ATTRIBUTE,
  WINDOWS_LAPS_PASSWORD_ATTRIBUTE: process.env.WINDOWS_LAPS_PASSWORD_ATTRIBUTE,
  WINDOWS_LAPS_ENCRYPTED_PASSWORD_ATTRIBUTE: process.env.WINDOWS_LAPS_ENCRYPTED_PASSWORD_ATTRIBUTE,
  DATABASE_PATH: process.env.DATABASE_PATH,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL,
};

export const config = configSchema.parse(env);

export type Config = z.infer<typeof configSchema>;
