export type TransactionType = 'INCOME' | 'EXPENSE';
export type CategoryType = 'INCOME' | 'EXPENSE';

export type Transaction = {
  transactionId: string;
  transactionDate: string; // YYYY-MM-DD
  transactionType: TransactionType;
  amount: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryType: CategoryType | null;
  categoryIcon: string | null;
  memo: string | null;
  isFixedOrigin: boolean;
  fixedTransactionId: string | null;
};

export type TransactionSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};

export type DailySummary = {
  date: string; // YYYY-MM-DD
  totalIncome: number;
  totalExpense: number;
};

export type TransactionListResponse = {
  summary: TransactionSummary;
  dailySummaries: DailySummary[];
  transactions: Transaction[];
};

export type BalanceInfo = {
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  carryOver: number;
};

export type CreateTransactionRequest = {
  transactionType: TransactionType;
  amount: number;
  transactionDate: string;
  categoryId: string;
  memo?: string;
};

export type UpdateTransactionRequest = CreateTransactionRequest;

export type DeleteScope = 'SINGLE' | 'ALL';

export type DeleteTransactionRequest = {
  scope: DeleteScope;
};
