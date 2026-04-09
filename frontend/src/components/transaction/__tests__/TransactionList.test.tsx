import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionList from '../TransactionList';
import type { Transaction } from '@/types/transaction';

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  transactionId: 'txn_test01',
  transactionDate: '2026-04-10',
  transactionType: 'EXPENSE',
  amount: 3000,
  categoryId: 'cat_01',
  categoryName: '食費',
  categoryType: 'EXPENSE',
  categoryIcon: null,
  memo: null,
  isFixedOrigin: false,
  fixedTransactionId: null,
  ...overrides,
});

describe('TransactionList', () => {
  it('明細がない場合はメッセージを表示する', () => {
    render(<TransactionList transactions={[]} onEdit={jest.fn()} />);
    expect(screen.getByText('明細がありません')).toBeInTheDocument();
  });

  it('明細のカテゴリ名と金額が表示される', () => {
    render(<TransactionList transactions={[makeTx()]} onEdit={jest.fn()} />);
    expect(screen.getByText('食費')).toBeInTheDocument();
    // JSDOM では全角円記号: -￥3,000 が1要素に入っている（グループヘッダーと明細行で2件）
    const amounts = screen.getAllByText(/3,000/);
    expect(amounts.length).toBeGreaterThanOrEqual(1);
  });

  it('収入明細はプラス表記になる', () => {
    render(
      <TransactionList
        transactions={[makeTx({ transactionType: 'INCOME', categoryName: '給与', amount: 50000 })]}
        onEdit={jest.fn()}
      />
    );
    // グループヘッダーと明細行の両方にプラス表記があるので getAllByText を使う
    const amounts = screen.getAllByText(/\+.*50,000/);
    expect(amounts.length).toBeGreaterThanOrEqual(1);
  });

  it('固定費由来の明細はテキストが青色クラスを持つ', () => {
    render(
      <TransactionList
        transactions={[makeTx({ isFixedOrigin: true, categoryName: '家賃' })]}
        onEdit={jest.fn()}
      />
    );
    const catName = screen.getByText('家賃');
    expect(catName).toHaveClass('text-blue-600');
  });

  it('メモが表示される', () => {
    render(
      <TransactionList
        transactions={[makeTx({ memo: 'ランチ代' })]}
        onEdit={jest.fn()}
      />
    );
    expect(screen.getByText('ランチ代')).toBeInTheDocument();
  });

  it('明細行クリックで onEdit が呼ばれる', async () => {
    const handleEdit = jest.fn();
    const tx = makeTx();
    render(<TransactionList transactions={[tx]} onEdit={handleEdit} />);
    // 行全体が role="button" として clickable
    const row = screen.getByRole('button', { name: /食費/ });
    await userEvent.click(row);
    expect(handleEdit).toHaveBeenCalledWith(tx);
  });

  it('同じ日付の明細がグループ化される', () => {
    const txList = [
      makeTx({ transactionId: 'txn_1', transactionDate: '2026-04-10', amount: 1000 }),
      makeTx({ transactionId: 'txn_2', transactionDate: '2026-04-10', amount: 2000 }),
      makeTx({ transactionId: 'txn_3', transactionDate: '2026-04-11', amount: 3000 }),
    ];
    render(<TransactionList transactions={txList} onEdit={jest.fn()} />);
    // 日付ヘッダーが2件（10日・11日）
    expect(screen.getByText('4月10日')).toBeInTheDocument();
    expect(screen.getByText('4月11日')).toBeInTheDocument();
  });
});
