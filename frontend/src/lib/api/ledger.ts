import { apiClient } from './client';

// -------------------------
// 型定義
// -------------------------

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export type Ledger = {
  ledgerId: string;
  ownerUserId: string;
  ledgerName: string;
  initialBalance: number;
  startDayOfMonth: number;
  startMonthOfYear: number;
  themeColor: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  categoryId: string;
  ledgerId: string;
  categoryName: string;
  categoryType: 'INCOME' | 'EXPENSE';
  icon: string | null;
  color: string | null;
  displayOrder: number;
  isDefault: boolean;
  isActive: boolean;
};

export type CreateLedgerRequest = {
  ledgerName: string;
  initialBalance?: number;
  startDayOfMonth?: number;
  startMonthOfYear?: number;
  themeColor?: string | null;
};

export type UpdateLedgerRequest = CreateLedgerRequest;

export type CreateCategoryRequest = {
  categoryName: string;
  categoryType: 'INCOME' | 'EXPENSE';
  icon?: string;
  color?: string;
};

export type UpdateCategoryRequest = {
  categoryName: string;
  icon?: string;
  color?: string;
};

export type CategoryOrderItem = {
  categoryId: string;
  displayOrder: number;
};

// -------------------------
// 帳簿 API
// -------------------------

export const getLedgers = () =>
  apiClient<ApiResponse<Ledger[]>>('/api/v1/ledgers');

export const createLedger = (data: CreateLedgerRequest) =>
  apiClient<ApiResponse<Ledger>>('/api/v1/ledgers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const getLedger = (ledgerId: string) =>
  apiClient<ApiResponse<Ledger>>(`/api/v1/ledgers/${ledgerId}`);

export const updateLedger = (ledgerId: string, data: UpdateLedgerRequest) =>
  apiClient<ApiResponse<Ledger>>(`/api/v1/ledgers/${ledgerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteLedger = (ledgerId: string) =>
  apiClient<ApiResponse<null>>(`/api/v1/ledgers/${ledgerId}`, {
    method: 'DELETE',
  });

// -------------------------
// カテゴリ API
// -------------------------

export const getCategories = (ledgerId: string, type?: 'INCOME' | 'EXPENSE') => {
  const params = type ? `?type=${type}` : '';
  return apiClient<ApiResponse<Category[]>>(
    `/api/v1/ledgers/${ledgerId}/categories${params}`
  );
};

export const createCategory = (ledgerId: string, data: CreateCategoryRequest) =>
  apiClient<ApiResponse<Category>>(`/api/v1/ledgers/${ledgerId}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateCategory = (
  ledgerId: string,
  categoryId: string,
  data: UpdateCategoryRequest
) =>
  apiClient<ApiResponse<Category>>(
    `/api/v1/ledgers/${ledgerId}/categories/${categoryId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );

export const deleteCategory = (ledgerId: string, categoryId: string) =>
  apiClient<ApiResponse<null>>(
    `/api/v1/ledgers/${ledgerId}/categories/${categoryId}`,
    { method: 'DELETE' }
  );

export const updateCategoryOrder = (
  ledgerId: string,
  data: CategoryOrderItem[]
) =>
  apiClient<ApiResponse<null>>(
    `/api/v1/ledgers/${ledgerId}/categories/order`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
