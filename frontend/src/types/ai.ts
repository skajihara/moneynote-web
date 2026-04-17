export type PeriodType = 'ONE_MONTH' | 'THREE_MONTHS' | 'TWELVE_MONTHS';
export type AdviceType = 'INSIGHT' | 'ADVICE' | 'FORECAST';
export type ScoreGrade = 'EXCELLENT' | 'GOOD' | 'CAUTION' | 'POOR';

export type PeriodSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
};

export type MonthlyTrend = {
  yearMonth: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};

export type CategoryBreakdownAi = {
  categoryName: string;
  totalAmount: number;
  percentage: number;
};

export type BudgetComparison = {
  categoryName: string;
  budgetAmount: number;
  actualAmount: number;
  percentage: number;
  status: 'NORMAL' | 'WARNING' | 'OVER';
};

export type PrevPeriodComparison = {
  incomeChange: number;
  expenseChange: number;
  incomeChangeRate: number;
  expenseChangeRate: number;
};

export type AiSummary = {
  period: PeriodType;
  periodSummary: PeriodSummary;
  monthlyTrend: MonthlyTrend[];
  categoryBreakdown: CategoryBreakdownAi[];
  prevCategoryBreakdown: CategoryBreakdownAi[];
  budgetComparison: BudgetComparison[];
  prevPeriodComparison: PrevPeriodComparison;
};

export type AiAnalysisResult = {
  adviceType: AdviceType;
  adviceText: string;
  generatedAt: string;
  fromCache: boolean;
};

export type ScoreBreakdown = {
  balanceScore: number;
  budgetScore: number;
  savingsScore: number;
  stabilityScore: number;
};

export type AiScore = {
  totalScore: number;
  grade: ScoreGrade;
  breakdown: ScoreBreakdown;
  prevMonthScore: number | null;
  scoreDiff: number | null;
};
