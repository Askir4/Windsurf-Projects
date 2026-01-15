export type RequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface User {
  username: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
}

export interface PasswordRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  hostname: string;
  justification?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt?: string;
  reviewedAt: string | null;
  reviewedBy?: string | null;
  reviewerComment: string | null;
  passwordDisplayExpiresAt: string | null;
  computerFound: boolean;
  lapsAvailable: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  eventType: string;
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

export interface PasswordData {
  password: string;
  hostname: string;
  expiresAt: string;
  remainingMinutes: number;
}
