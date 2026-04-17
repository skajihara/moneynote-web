import { apiClient } from './client';
import type { Budget, BudgetHeatmapMonth, CreateBudgetRequest } from '@/types/budget';

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export const getBudgets = (ledgerId: string, year: number, month: number) =>
  apiClient<ApiResponse<Budget[]>>(
    `/api/v1/ledgers/${ledgerId}/budgets?year=${year}&month=${month}`
  );

export const upsertBudget = (ledgerId: string, data: CreateBudgetRequest) =>
  apiClient<ApiResponse<Budget>>(`/api/v1/ledgers/${ledgerId}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteBudget = (ledgerId: string, budgetId: string) =>
  apiClient<ApiResponse<null>>(`/api/v1/ledgers/${ledgerId}/budgets/${budgetId}`, {
    method: 'DELETE',
  });

export const getBudgetHeatmap = (ledgerId: string, months = 12) =>
  apiClient<ApiResponse<BudgetHeatmapMonth[]>>(
    `/api/v1/ledgers/${ledgerId}/budgets/heatmap?months=${months}`
  );
