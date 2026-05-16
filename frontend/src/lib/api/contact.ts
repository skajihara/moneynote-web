import { apiClient } from './client';

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export const sendContact = (subject: string, body: string) =>
  apiClient<ApiResponse<null>>('/api/v1/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body }),
  });
