import { render, screen } from '@testing-library/react';
import BalanceLineChart from '../BalanceLineChart';
import type { LineItem } from '../BalanceLineChart';

jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

const data: LineItem[] = [
  { label: '1月', balance: 100000 },
  { label: '2月', balance: -5000 },
];

describe('BalanceLineChart', () => {
  it('データがある場合はチャートが描画される', () => {
    render(<BalanceLineChart data={data} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('データが空の場合は「データがありません」と表示される', () => {
    render(<BalanceLineChart data={[]} />);
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });
});
