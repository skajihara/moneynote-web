export type BudgetStatusType = 'NORMAL' | 'WARNING' | 'OVER';

export type Budget = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryDeleted: boolean;
  budgetAmount: number;
  actualAmount: number;
  percentage: number;
  status: BudgetStatusType;
  remainingAmount: number;
};

export type CreateBudgetRequest = {
  categoryId: string;
  year: number;
  month: number;
  amount: number;
};

export type BudgetHeatmapItem = {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  actualAmount: number;
  percentage: number;
  status: BudgetStatusType;
};

export type BudgetHeatmapMonth = {
  yearMonth: string;       // "2026-04"
  budgets: BudgetHeatmapItem[];
};
