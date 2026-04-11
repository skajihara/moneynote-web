import { render, screen } from '@testing-library/react';
import SummaryCards from '../SummaryCards';

describe('SummaryCards', () => {
  it('収入・支出・収支を表示する', () => {
    render(<SummaryCards totalIncome={50000} totalExpense={30000} netBalance={20000} />);
    expect(screen.getByText('収入')).toBeInTheDocument();
    expect(screen.getByText('支出')).toBeInTheDocument();
    expect(screen.getByText('収支')).toBeInTheDocument();
  });

  it('金額が通貨形式で表示される', () => {
    render(<SummaryCards totalIncome={50000} totalExpense={30000} netBalance={20000} />);
    // JSDOM では toLocaleString('ja-JP', {style:'currency'}) が全角円記号を使う
    expect(screen.getByText(/50,000/)).toBeInTheDocument();
    expect(screen.getByText(/30,000/)).toBeInTheDocument();
    expect(screen.getByText(/20,000/)).toBeInTheDocument();
  });

  it('収支がマイナスの場合は赤色クラスが付く', () => {
    render(<SummaryCards totalIncome={10000} totalExpense={50000} netBalance={-40000} />);
    const netEl = screen.getByText(/40,000/);
    expect(netEl).toHaveClass('text-red-600');
  });

  it('収支がゼロ以上の場合は赤色クラスがつかない', () => {
    render(<SummaryCards totalIncome={50000} totalExpense={30000} netBalance={20000} />);
    // 収支カードの金額だけ特定するため getByText を使い複数ヒット時は getAllByText で絞る
    const cards = screen.getAllByText(/20,000/);
    expect(cards[0]).not.toHaveClass('text-red-600');
  });

  it('currentBalance を渡すと残高カードが4枚目に追加される', () => {
    render(
      <SummaryCards
        totalIncome={50000}
        totalExpense={30000}
        netBalance={20000}
        currentBalance={120000}
      />
    );
    expect(screen.getByText('残高')).toBeInTheDocument();
    expect(screen.getByText(/120,000/)).toBeInTheDocument();
  });

  it('currentBalance がない場合は残高カードが表示されない', () => {
    render(<SummaryCards totalIncome={50000} totalExpense={30000} netBalance={20000} />);
    expect(screen.queryByText('残高')).not.toBeInTheDocument();
  });
});
