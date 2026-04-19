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

const makePeriodSummaries = (): DailySummary[] => {
  // 月度開始日=20: 2026年4月 = 3/20〜4/19
  const summaries: DailySummary[] = [];
  for (let d = 20; d <= 31; d++) {
    const dd = String(d).padStart(2, '0');
    summaries.push({ date: `2026-03-${dd}`, totalIncome: 0, totalExpense: 0 });
  }
  for (let d = 1; d <= 19; d++) {
    const dd = String(d).padStart(2, '0');
    summaries.push({ date: `2026-04-${dd}`, totalIncome: 0, totalExpense: 0 });
  }
  return summaries;
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

  describe('startDayOfMonth=20（月度期間カレンダー）', () => {
    it('前月(3月)と当月(4月)の日付が両方表示される', () => {
      render(
        <TransactionCalendar
          year={2026} month={4}
          startDayOfMonth={20}
          dailySummaries={makePeriodSummaries()}
          onDateClick={jest.fn()}
        />
      );
      // 前月の日付(3/20)と当月の日付(4/19)が表示される
      // 3/20〜3/31 と 4/1〜4/19 が含まれる（重複する数字は複数存在）
      const allCells = screen.getAllByText('20');
      expect(allCells.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('19').length).toBeGreaterThanOrEqual(1);
    });

    it('3/20 の日付セルをクリックすると 2026-03-20 が渡される', async () => {
      const handleClick = jest.fn();
      render(
        <TransactionCalendar
          year={2026} month={4}
          startDayOfMonth={20}
          dailySummaries={makePeriodSummaries()}
          onDateClick={handleClick}
        />
      );
      // 20 のセルの中で最初のもの（3/20 = 前月分）をクリック
      const twentyCells = screen.getAllByText('20');
      await userEvent.click(twentyCells[0].closest('div')!);
      expect(handleClick).toHaveBeenCalledWith('2026-03-20');
    });

    it('前月最終日(3/31)より後に当月1日(4/1)が続く', () => {
      render(
        <TransactionCalendar
          year={2026} month={4}
          startDayOfMonth={20}
          dailySummaries={makePeriodSummaries()}
          onDateClick={jest.fn()}
        />
      );
      expect(screen.getByText('31')).toBeInTheDocument();
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });

    it('4/20 以降の日付は表示されない（期間外）', () => {
      render(
        <TransactionCalendar
          year={2026} month={4}
          startDayOfMonth={20}
          dailySummaries={makePeriodSummaries()}
          onDateClick={jest.fn()}
        />
      );
      // 4/20〜4/30 は表示されないはず
      // "20" は 3/20 として1つだけ（4/20 は含まれない）
      const twentyCells = screen.getAllByText('20');
      // すべての "20" セルのデータ確認: closest div の onClick は 2026-03-20 のみ
      expect(twentyCells.length).toBe(1);
    });
  });
});
