import { apiClient } from './client';

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export type AdminUser = {
  userId: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type AdminCreateUserRequest = {
  userId: string;
  password: string;
  role: string;
};

export type AdminChangeRoleRequest = {
  role: string;
};

export const listAdminUsers = () =>
  apiClient<ApiResponse<AdminUser[]>>('/api/v1/admin/users');

export const createAdminUser = (data: AdminCreateUserRequest) =>
  apiClient<ApiResponse<AdminUser>>('/api/v1/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const changeUserRole = (userId: string, data: AdminChangeRoleRequest) =>
  apiClient<ApiResponse<AdminUser>>(`/api/v1/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const activateUser = (userId: string) =>
  apiClient<ApiResponse<AdminUser>>(`/api/v1/admin/users/${userId}/activate`, {
    method: 'PUT',
  });

export const deactivateUser = (userId: string) =>
  apiClient<ApiResponse<AdminUser>>(`/api/v1/admin/users/${userId}/deactivate`, {
    method: 'PUT',
  });

export const deleteAdminUser = (userId: string) =>
  apiClient<undefined>(`/api/v1/admin/users/${userId}`, { method: 'DELETE' });
