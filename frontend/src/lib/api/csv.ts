import { useAuthStore } from '@/stores/authStore';
import { ApiClientError } from './client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export type CsvExportParams = {
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
  includeFixed?: boolean;
};

export type CsvImportResponse = {
  importedCount: number;
  skippedCount: number;
  newCategoriesCreated: string[];
  errorRows: { rowNumber: number; reason: string }[];
};

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export const exportCsv = async (ledgerId: string, params: CsvExportParams = {}): Promise<Blob> => {
  const query = new URLSearchParams();
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.categoryIds) {
    params.categoryIds.forEach((id) => query.append('categoryIds', id));
  }
  if (params.includeFixed === false) query.set('includeFixed', 'false');

  const qs = query.toString();
  const url = `${BASE_URL}/api/v1/ledgers/${ledgerId}/transactions/export${qs ? `?${qs}` : ''}`;

  const token = useAuthStore.getState().accessToken;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!res.ok) {
    let body: { error?: { code: string; message: string } } = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiClientError(body.error ?? { code: `E${res.status}`, message: res.statusText });
  }

  return res.blob();
};

export const importCsv = async (
  ledgerId: string,
  file: File
): Promise<ApiResponse<CsvImportResponse>> => {
  const url = `${BASE_URL}/api/v1/ledgers/${ledgerId}/transactions/import`;

  const formData = new FormData();
  formData.append('file', file);

  const token = useAuthStore.getState().accessToken;
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    let body: { error?: { code: string; message: string } } = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiClientError(body.error ?? { code: `E${res.status}`, message: res.statusText });
  }

  return res.json() as Promise<ApiResponse<CsvImportResponse>>;
};
