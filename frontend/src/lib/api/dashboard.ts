import { apiClient } from './client';
import type { DashboardResponse } from '@/types/dashboard';

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export const getDashboard = (
  ledgerId: string,
  year: number,
  month: number,
  recentCount?: number
) => {
  const query = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (recentCount !== undefined) query.set('recentCount', String(recentCount));
  return apiClient<ApiResponse<DashboardResponse>>(
    `/api/v1/ledgers/${ledgerId}/dashboard?${query.toString()}`
  );
};
