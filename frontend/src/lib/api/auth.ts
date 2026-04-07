import { apiClient } from './client';

// -------------------------
// レスポンス型
// -------------------------

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

type TokenResponse = {
  accessToken: string;
};

// -------------------------
// リクエスト型
// -------------------------

export type RegisterRequest = {
  userId: string;
  userName: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  userId: string;
  password: string;
};

// -------------------------
// API 関数
// -------------------------

export const register = (data: RegisterRequest) =>
  apiClient<ApiResponse<null>>('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    skipRefresh: true,
  });

export const login = (data: LoginRequest) =>
  apiClient<ApiResponse<TokenResponse>>('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    skipRefresh: true,
  });

export const logout = () =>
  apiClient<ApiResponse<null>>('/api/v1/auth/logout', {
    method: 'POST',
    skipRefresh: true,
  });

export const refresh = () =>
  apiClient<ApiResponse<TokenResponse>>('/api/v1/auth/refresh', {
    method: 'POST',
    skipRefresh: true,
  });

export const requestPasswordReset = (email: string) =>
  apiClient<ApiResponse<null>>('/api/v1/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    skipRefresh: true,
  });

export const confirmPasswordReset = (token: string, newPassword: string) =>
  apiClient<ApiResponse<null>>('/api/v1/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
    skipRefresh: true,
  });
