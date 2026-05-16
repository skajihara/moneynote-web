import type { Transaction } from './transaction';

export type DashboardSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  currentBalance: number;
  carryOver: number;
};

export type CategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  categoryType: 'INCOME' | 'EXPENSE';
  categoryIcon: string | null;
  color: string | null;
  amount: number;
  percentage: number;
};

export type BudgetStatus = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  budgetAmount: number;
  actualAmount: number;
  percentage: number;
  status: 'NORMAL' | 'WARNING' | 'OVER';
};

export type DashboardResponse = {
  summary: DashboardSummary;
  categoryBreakdown: CategoryBreakdown[];
  categoryIncomeBreakdown: CategoryBreakdown[];
  budgetStatus: BudgetStatus[];
  recentTransactions: Transaction[];
};
