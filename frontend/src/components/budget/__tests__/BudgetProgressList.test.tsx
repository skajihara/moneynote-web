import { render, screen } from '@testing-library/react';
import BudgetProgressList from '../BudgetProgressList';
import type { BudgetStatus } from '@/types/dashboard';

const budgetStatusData: BudgetStatus[] = [
  {
    categoryId: 'cat_1',
    categoryName: '食費',
    categoryIcon: null,
    budgetAmount: 50000,
    actualAmount: 10000,
    percentage: 20.0,
    status: 'NORMAL',
  },
  {
    categoryId: 'cat_2',
    categoryName: '交通費',
    categoryIcon: '🚃',
    budgetAmount: 20000,
    actualAmount: 17000,
    percentage: 85.0,
    status: 'WARNING',
  },
  {
    categoryId: 'cat_3',
    categoryName: '娯楽',
    categoryIcon: null,
    budgetAmount: 10000,
    actualAmount: 12000,
    percentage: 120.0,
    status: 'OVER',
  },
];

describe('BudgetProgressList', () => {
  it('予算データがない場合は「予算が設定されていません」と表示される', () => {
    render(<BudgetProgressList budgetStatus={[]} />);
    expect(screen.getByText('予算が設定されていません')).toBeInTheDocument();
  });

  it('各カテゴリ名が表示される', () => {
    render(<BudgetProgressList budgetStatus={budgetStatusData} />);
    expect(screen.getByText(/食費/)).toBeInTheDocument();
    expect(screen.getByText(/交通費/)).toBeInTheDocument();
    expect(screen.getByText(/娯楽/)).toBeInTheDocument();
  });

  it('NORMAL ステータスは「正常」と表示される', () => {
    render(<BudgetProgressList budgetStatus={[budgetStatusData[0]]} />);
    expect(screen.getByText(/正常/)).toBeInTheDocument();
  });

  it('WARNING ステータスは「注意」と表示される', () => {
    render(<BudgetProgressList budgetStatus={[budgetStatusData[1]]} />);
    expect(screen.getByText(/注意/)).toBeInTheDocument();
  });

  it('OVER ステータスは「超過」と表示される', () => {
    render(<BudgetProgressList budgetStatus={[budgetStatusData[2]]} />);
    expect(screen.getByText(/超過/)).toBeInTheDocument();
  });

  it('アイコン付きカテゴリはアイコンが表示される', () => {
    render(<BudgetProgressList budgetStatus={[budgetStatusData[1]]} />);
    expect(screen.getByText(/🚃/)).toBeInTheDocument();
  });
});
