import { render, screen } from '@testing-library/react';
import CategoryPieChart from '../CategoryPieChart';
import type { CategoryBreakdown } from '@/types/dashboard';

// Recharts uses ResizeObserver which is not available in jsdom
jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

const data: CategoryBreakdown[] = [
  {
    categoryId: 'cat_1',
    categoryName: '食費',
    categoryType: 'EXPENSE',
    categoryIcon: null,
    color: '#FF6384',
    amount: 30000,
    percentage: 75.0,
  },
  {
    categoryId: 'cat_2',
    categoryName: '交通費',
    categoryType: 'EXPENSE',
    categoryIcon: null,
    color: '#36A2EB',
    amount: 10000,
    percentage: 25.0,
  },
];

describe('CategoryPieChart', () => {
  it('データがある場合はチャートが描画される', () => {
    render(<CategoryPieChart data={data} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('データが空の場合は「データがありません」と表示される', () => {
    render(<CategoryPieChart data={[]} />);
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });
});
