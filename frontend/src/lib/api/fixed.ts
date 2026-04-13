import { apiClient } from './client';
import type {
  FixedTransaction,
  CreateFixedTransactionRequest,
  UpdateFixedTransactionRequest,
  GenerateResult,
} from '@/types/fixed';

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export const getFixedTransactions = (ledgerId: string, status?: string) => {
  const query = status ? `?status=${status}` : '';
  return apiClient<ApiResponse<FixedTransaction[]>>(
    `/api/v1/ledgers/${ledgerId}/fixed-transactions${query}`
  );
};

export const createFixedTransaction = (
  ledgerId: string,
  data: CreateFixedTransactionRequest
) =>
  apiClient<ApiResponse<FixedTransaction>>(
    `/api/v1/ledgers/${ledgerId}/fixed-transactions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );

export const updateFixedTransaction = (
  ledgerId: string,
  fixedId: string,
  data: UpdateFixedTransactionRequest
) =>
  apiClient<ApiResponse<FixedTransaction>>(
    `/api/v1/ledgers/${ledgerId}/fixed-transactions/${fixedId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );

export const deleteFixedTransaction = (ledgerId: string, fixedId: string) =>
  apiClient<ApiResponse<null>>(
    `/api/v1/ledgers/${ledgerId}/fixed-transactions/${fixedId}`,
    { method: 'DELETE' }
  );

export const generateFixedTransactions = (ledgerId: string, fixedId: string) =>
  apiClient<ApiResponse<GenerateResult>>(
    `/api/v1/ledgers/${ledgerId}/fixed-transactions/${fixedId}/generate`,
    { method: 'POST' }
  );
