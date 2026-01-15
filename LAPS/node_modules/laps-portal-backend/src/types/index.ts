export type RequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface User {
  username: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  groups: string[];
}

export interface PasswordRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  hostname: string;
  justification: string;
  justificationHash: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewerComment: string | null;
  passwordRetrievedAt: string | null;
  passwordDisplayedAt: string | null;
  passwordDisplayExpiresAt: string | null;
  clientIp: string;
  userAgent: string;
  computerFound: boolean;
  lapsAvailable: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId: string;
  userName: string;
  hostname: string | null;
  requestId: string | null;
  details: string;
  clientIp: string;
  userAgent: string;
  success: boolean;
  errorMessage: string | null;
}

export type AuditEventType = 
  | 'REQUEST_CREATED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_DENIED'
  | 'REQUEST_EXPIRED'
  | 'PASSWORD_RETRIEVED'
  | 'PASSWORD_DISPLAYED'
  | 'PASSWORD_DISPLAY_EXPIRED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'AD_ERROR'
  | 'LAPS_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'HOSTNAME_VALIDATION_FAILED';

export interface ADComputer {
  dn: string;
  cn: string;
  name: string;
  operatingSystem?: string;
  managedBy?: string;
  description?: string;
}

export interface LAPSPassword {
  password: string;
  expirationTime?: Date;
}

export interface EncryptedPassword {
  requestId: string;
  encryptedPassword: string;
  iv: string;
  createdAt: string;
  expiresAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
