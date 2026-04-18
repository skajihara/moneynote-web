import { apiClient } from './client';
import type {
  TransactionListResponse,
  BalanceInfo,
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  DeleteScope,
} from '@/types/transaction';

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export type { Transaction };

export const getTransactions = (
  ledgerId: string,
  params: { year: number; month: number; startDayOfMonth?: number; categoryId?: string; type?: string }
) => {
  const query = new URLSearchParams({
    year: String(params.year),
    month: String(params.month),
  });
  if (params.startDayOfMonth && params.startDayOfMonth > 1)
    query.set('startDayOfMonth', String(params.startDayOfMonth));
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.type) query.set('type', params.type);
  return apiClient<ApiResponse<TransactionListResponse>>(
    `/api/v1/ledgers/${ledgerId}/transactions?${query.toString()}`
  );
};

export const getBalance = (ledgerId: string) =>
  apiClient<ApiResponse<BalanceInfo>>(
    `/api/v1/ledgers/${ledgerId}/balance`
  );

export const createTransaction = (ledgerId: string, data: CreateTransactionRequest) =>
  apiClient<ApiResponse<Transaction>>(`/api/v1/ledgers/${ledgerId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateTransaction = (
  ledgerId: string,
  transactionId: string,
  data: UpdateTransactionRequest
) =>
  apiClient<ApiResponse<Transaction>>(
    `/api/v1/ledgers/${ledgerId}/transactions/${transactionId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );

export const deleteTransaction = (
  ledgerId: string,
  transactionId: string,
  scope: DeleteScope
) =>
  apiClient<ApiResponse<null>>(
    `/api/v1/ledgers/${ledgerId}/transactions/${transactionId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope }),
    }
  );

export type TransactionSearchParams = {
  keyword?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
};

export const searchTransactions = (
  ledgerId: string,
  params: TransactionSearchParams
) => {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  return apiClient<ApiResponse<Transaction[]>>(
    `/api/v1/ledgers/${ledgerId}/transactions/search?${query.toString()}`
  );
};
