import { apiClient } from './client';
import type { AiSummary, AiAnalysisResult, AiScore, PeriodType, AdviceType } from '@/types/ai';

type ApiResponse<T> = {
  data: T;
  error: null;
  timestamp: string;
};

export const getAiSummary = (ledgerId: string, period: PeriodType) =>
  apiClient<ApiResponse<AiSummary>>(
    `/api/v1/ledgers/${ledgerId}/ai/summary?period=${period}`
  );

export const analyzeAi = (
  ledgerId: string,
  period: PeriodType,
  adviceType: AdviceType
) =>
  apiClient<ApiResponse<AiAnalysisResult>>(
    `/api/v1/ledgers/${ledgerId}/ai/analyze`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, adviceType }),
    }
  );

export const getAiScore = (ledgerId: string) =>
  apiClient<ApiResponse<AiScore>>(
    `/api/v1/ledgers/${ledgerId}/ai/score`
  );
