import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionCalendar from '../TransactionCalendar';
import type { DailySummary } from '@/types/transaction';

const makeSummaries = (overrides: Partial<DailySummary>[] = []): DailySummary[] => {
  // 2026年4月 (30日) の全日分
  return Array.from({ length: 30 }, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    const base: DailySummary = { date: `2026-04-${d}`, totalIncome: 0, totalExpense: 0 };
    return { ...base, ...overrides[i] };
  });
};

describe('TransactionCalendar', () => {
  it('曜日ヘッダーが表示される', () => {
    render(
      <TransactionCalendar
        year={2026} month={4}
        dailySummaries={makeSummaries()}
        onDateClick={jest.fn()}
      />
    );
    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getByText('月')).toBeInTheDocument();
    expect(screen.getByText('土')).toBeInTheDocument();
  });

  it('月の日数分の日付が表示される', () => {
    render(
      <TransactionCalendar
        year={2026} month={4}
        dailySummaries={makeSummaries()}
        onDateClick={jest.fn()}
      />
    );
    // 1〜30 の数字が表示される
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('支出がある日に支出金額が表示される', () => {
    const summaries = makeSummaries();
    summaries[9] = { date: '2026-04-10', totalIncome: 0, totalExpense: 5000 };
    render(
      <TransactionCalendar
        year={2026} month={4}
        dailySummaries={summaries}
        onDateClick={jest.fn()}
      />
    );
    expect(screen.getByText('-5,000')).toBeInTheDocument();
  });

  it('収入がある日に収入金額が表示される', () => {
    const summaries = makeSummaries();
    summaries[14] = { date: '2026-04-15', totalIncome: 50000, totalExpense: 0 };
    render(
      <TransactionCalendar
        year={2026} month={4}
        dailySummaries={summaries}
        onDateClick={jest.fn()}
      />
    );
    expect(screen.getByText('+50,000')).toBeInTheDocument();
  });

  it('日付をクリックすると onDateClick が呼ばれる', async () => {
    const handleClick = jest.fn();
    render(
      <TransactionCalendar
        year={2026} month={4}
        dailySummaries={makeSummaries()}
        onDateClick={handleClick}
      />
    );
    // 日付 "1" のセルをクリック
    const cells = screen.getAllByText('1');
    await userEvent.click(cells[0].closest('div')!);
    expect(handleClick).toHaveBeenCalledWith('2026-04-01');
  });
});
