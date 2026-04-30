import { render, screen } from '@testing-library/react';
import FixedTransactionsPage from '../page';
import { useLedgerStore } from '@/stores/ledgerStore';

jest.mock('@/components/fixed/FixedTransactionList', () => {
  return function MockFixedTransactionList({ ledgerId }: { ledgerId: string }) {
    return <div data-testid="fixed-transaction-list" data-ledger-id={ledgerId} />;
  };
});

const ledger = {
  ledgerId: 'ldg_1',
  ownerUserId: 'user1',
  ledgerName: 'テスト帳簿',
  initialBalance: 0,
  startDayOfMonth: 1,
  startMonthOfYear: 1,
  themeColor: null,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  useLedgerStore.setState({ ledgers: [ledger], selectedLedgerId: 'ldg_1' });
});

describe('FixedTransactionsPage', () => {
  it('帳簿未選択時に案内メッセージが表示される', () => {
    useLedgerStore.setState({ ledgers: [], selectedLedgerId: null });
    render(<FixedTransactionsPage />);
    expect(screen.getByText('帳簿を選択してください')).toBeInTheDocument();
    expect(screen.queryByTestId('fixed-transaction-list')).not.toBeInTheDocument();
  });

  it('帳簿選択時にページタイトルが表示される', () => {
    render(<FixedTransactionsPage />);
    expect(screen.getByRole('heading', { name: '固定費' })).toBeInTheDocument();
  });

  it('帳簿選択時に FixedTransactionList が ledgerId を渡してレンダリングされる', () => {
    render(<FixedTransactionsPage />);
    const list = screen.getByTestId('fixed-transaction-list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('data-ledger-id', 'ldg_1');
  });
});
