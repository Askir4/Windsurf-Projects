import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { User, PasswordRequest, AuditLog, ApiResponse, PaginatedResponse, PasswordData } from '../types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', {
      username,
      password,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Login fehlgeschlagen');
    }
    return response.data.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Benutzer nicht gefunden');
    }
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async validateToken(): Promise<boolean> {
    try {
      const response = await api.get<ApiResponse<{ valid: boolean }>>('/auth/validate');
      return response.data.success;
    } catch {
      return false;
    }
  },
};

export const requestsApi = {
  async create(hostname: string, justification: string): Promise<PasswordRequest> {
    const response = await api.post<ApiResponse<PasswordRequest>>('/requests', {
      hostname,
      justification,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Anfrage konnte nicht erstellt werden');
    }
    return response.data.data;
  },

  async getMyRequests(): Promise<PasswordRequest[]> {
    const response = await api.get<ApiResponse<PasswordRequest[]>>('/requests/my');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Anfragen konnten nicht geladen werden');
    }
    return response.data.data || [];
  },

  async getPassword(requestId: string): Promise<PasswordData> {
    const response = await api.get<ApiResponse<PasswordData>>(`/requests/${requestId}/password`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Passwort konnte nicht abgerufen werden');
    }
    return response.data.data;
  },

  async getQueue(): Promise<PasswordRequest[]> {
    const response = await api.get<ApiResponse<PasswordRequest[]>>('/requests/queue');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Queue konnte nicht geladen werden');
    }
    return response.data.data || [];
  },

  async getAll(filters: {
    status?: string;
    userId?: string;
    hostname?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResponse<PasswordRequest>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    const response = await api.get<PaginatedResponse<PasswordRequest>>(`/requests/all?${params}`);
    return response.data;
  },

  async getById(id: string): Promise<PasswordRequest> {
    const response = await api.get<ApiResponse<PasswordRequest>>(`/requests/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Anfrage nicht gefunden');
    }
    return response.data.data;
  },

  async review(id: string, action: 'approve' | 'deny', comment?: string): Promise<void> {
    const response = await api.post<ApiResponse>(`/requests/${id}/review`, {
      action,
      comment,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Aktion fehlgeschlagen');
    }
  },
};

export const auditApi = {
  async getLogs(filters: {
    eventType?: string;
    userId?: string;
    hostname?: string;
    fromDate?: string;
    toDate?: string;
    success?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    const response = await api.get<PaginatedResponse<AuditLog>>(`/audit?${params}`);
    return response.data;
  },

  async exportCsv(filters: { fromDate?: string; toDate?: string } = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    
    const response = await api.get(`/audit/export?${params}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getEventTypes(): Promise<string[]> {
    const response = await api.get<ApiResponse<string[]>>('/audit/event-types');
    return response.data.data || [];
  },
};

export default api;
