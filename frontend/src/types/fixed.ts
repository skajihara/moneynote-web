import type { TransactionType } from './transaction';

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
  memo?: string | null;
};

export type UpdateFixedTransactionRequest = CreateFixedTransactionRequest;

export type GenerateResult = {
  generatedCount: number;
  skippedCount: number;
};
