import type { TransactionType } from './transaction';

export type IntervalType =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL';

export const INTERVAL_TYPE_LABELS: Record<IntervalType, string> = {
  DAILY: '毎日',
  WEEKLY: '毎週',
  BIWEEKLY: '隔週',
  MONTHLY: '毎月',
  BIMONTHLY: '隔月',
  QUARTERLY: '四半期',
  SEMIANNUAL: '半年',
  ANNUAL: '毎年',
};

export type FixedTransaction = {
  fixedTransactionId: string;
  fixedName: string;
  transactionType: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  amount: number;
  dayOfMonth: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  intervalType: IntervalType;
  isActive: boolean;
  isExpired: boolean;
  memo: string | null;
};

export type CreateFixedTransactionRequest = {
  fixedName: string;
  transactionType: TransactionType;
  categoryId: string;
  amount: number;
  dayOfMonth: number;
  startDate: string;
  endDate?: string | null;
  intervalType: IntervalType;
  memo?: string | null;
};

export type UpdateFixedTransactionRequest = CreateFixedTransactionRequest;

export type GenerateResult = {
  generatedCount: number;
  skippedCount: number;
};
