export type BudgetStatusType = 'NORMAL' | 'WARNING' | 'OVER';

export type Budget = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
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
