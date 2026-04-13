import { render, screen } from '@testing-library/react';
import MonthlyBarChart from '../MonthlyBarChart';
import type { BarItem } from '../MonthlyBarChart';

jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

const data: BarItem[] = [
  { label: '1月', income: 50000, expense: 30000 },
  { label: '2月', income: 60000, expense: 40000 },
];

describe('MonthlyBarChart', () => {
  it('データがある場合はチャートが描画される', () => {
    render(<MonthlyBarChart data={data} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('データが空の場合は「データがありません」と表示される', () => {
    render(<MonthlyBarChart data={[]} />);
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });
});
