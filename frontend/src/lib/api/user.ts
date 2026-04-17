import { apiClient } from './client';

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export type UserProfile = {
  userId: string;
  userName: string;
  email: string;
  themeColor: string | null;
};

export type UpdateProfileRequest = {
  userName: string;
  email: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type UpdateThemeRequest = {
  themeColor: string | null;
};

export const getProfile = () =>
  apiClient<ApiResponse<UserProfile>>('/api/v1/users/me');

export const updateProfile = (data: UpdateProfileRequest) =>
  apiClient<ApiResponse<UserProfile>>('/api/v1/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const changePassword = (data: ChangePasswordRequest) =>
  apiClient<ApiResponse<null>>('/api/v1/users/me/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateTheme = (data: UpdateThemeRequest) =>
  apiClient<ApiResponse<UserProfile>>('/api/v1/users/me/theme', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteAccount = () =>
  apiClient<ApiResponse<null>>('/api/v1/users/me', { method: 'DELETE' });
