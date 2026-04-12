import { apiClient } from './client';
import type {
  MonthlyReport,
  AnnualReport,
  CategorySummary,
  CategoryTransactions,
} from '@/types/report';

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export const getMonthlyReport = (ledgerId: string, year: number, month: number) =>
  apiClient<ApiResponse<MonthlyReport>>(
    `/api/v1/ledgers/${ledgerId}/reports/monthly?year=${year}&month=${month}`
  );

export const getAnnualReport = (ledgerId: string, year: number) =>
  apiClient<ApiResponse<AnnualReport>>(
    `/api/v1/ledgers/${ledgerId}/reports/annual?year=${year}`
  );

export const getCategorySummary = (
  ledgerId: string,
  year: number,
  month: number,
  type?: 'INCOME' | 'EXPENSE'
) => {
  const query = new URLSearchParams({ year: String(year), month: String(month) });
  if (type) query.set('type', type);
  return apiClient<ApiResponse<CategorySummary[]>>(
    `/api/v1/ledgers/${ledgerId}/categories/summary?${query.toString()}`
  );
};

export const getAnnualCategorySummary = (
  ledgerId: string,
  year: number,
  type?: 'INCOME' | 'EXPENSE'
) => {
  const query = new URLSearchParams({ year: String(year) });
  if (type) query.set('type', type);
  return apiClient<ApiResponse<CategorySummary[]>>(
    `/api/v1/ledgers/${ledgerId}/categories/summary/annual?${query.toString()}`
  );
};

export const getCategoryTransactions = (
  ledgerId: string,
  categoryId: string,
  year: number,
  month: number
) =>
  apiClient<ApiResponse<CategoryTransactions>>(
    `/api/v1/ledgers/${ledgerId}/categories/${categoryId}/transactions?year=${year}&month=${month}`
  );
