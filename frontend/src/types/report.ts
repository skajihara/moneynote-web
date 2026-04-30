import type { Transaction } from './transaction';

export type PeriodComparison = {
  incomeChange: number;
  expenseChange: number;
  incomeChangeRate: number;
  expenseChangeRate: number;
};

export type MonthlyReport = {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  carryOver: number;
  currentBalance: number;
  prevMonthComparison: PeriodComparison;
  prevYearComparison: PeriodComparison;
};

export type MonthData = {
  month: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  balance: number;
};

export type AnnualSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};

export type BalanceHistory = {
  month: number;
  balance: number;
};

export type AnnualReport = {
  year: number;
  months: MonthData[];
  annualSummary: AnnualSummary;
  balanceHistory: BalanceHistory[];
};

export type BalanceHistoryItem = {
  yearMonth: string;
  income: number;
  expense: number;
  balance: number;
};

export type CategorySummary = {
  categoryId: string;
  categoryName: string;
  categoryType: 'INCOME' | 'EXPENSE';
  categoryIcon: string | null;
  color: string | null;
  amount: number;
  percentage: number;
};

export type CategoryInfo = {
  categoryId: string;
  categoryName: string;
  categoryType: 'INCOME' | 'EXPENSE';
  categoryIcon: string | null;
  color: string | null;
};

export type CategoryTrend = {
  month: string; // "2026-01"
  amount: number;
};

export type CategoryTransactions = {
  category: CategoryInfo;
  monthlyTrend: CategoryTrend[];
  transactions: Transaction[];
};
