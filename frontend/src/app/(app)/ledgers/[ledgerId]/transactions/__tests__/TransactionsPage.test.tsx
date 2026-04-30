import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionsPage from '../page';
import * as transactionApi from '@/lib/api/transaction';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import type { TransactionListResponse } from '@/types/transaction';

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useParams: () => ({ ledgerId: 'ldg_test01' }),
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  usePathname: () => '/ledgers/ldg_test01/transactions',
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/lib/api/transaction');
const mockGetTransactions = jest.mocked(transactionApi.getTransactions);

const emptyResponse: { data: TransactionListResponse; error: null; timestamp: string } = {
  data: {
    summary: { totalIncome: 0, totalExpense: 0, netBalance: 0 },
    dailySummaries: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-04-${String(i + 1).padStart(2, '0')}`,
      totalIncome: 0,
      totalExpense: 0,
    })),
    transactions: [],
  },
  error: null,
  timestamp: '',
};

const responseWithData: { data: TransactionListResponse; error: null; timestamp: string } = {
  data: {
    summary: { totalIncome: 50000, totalExpense: 30000, netBalance: 20000 },
    dailySummaries: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-04-${String(i + 1).padStart(2, '0')}`,
      totalIncome: i === 9 ? 50000 : 0,
      totalExpense: i === 9 ? 30000 : 0,
    })),
    transactions: [
      {
        transactionId: 'txn_1',
        transactionDate: '2026-04-10',
        transactionType: 'EXPENSE',
        amount: 30000,
        categoryId: 'cat_1',
        categoryName: '食費',
        categoryType: 'EXPENSE',
        categoryIcon: null,
        memo: null,
        isFixedOrigin: false,
        fixedTransactionId: null,
      },
    ],
  },
  error: null,
  timestamp: '',
};

beforeEach(() => {
  mockGetTransactions.mockReset();
  mockGetTransactions.mockResolvedValue(emptyResponse);
  mockReplace.mockReset();
  mockSearchParams = new URLSearchParams();
  useSubPanelStore.setState({ isOpen: false, content: null, contentKey: 0 });
  useLedgerStore.setState({
    ledgers: [{
      ledgerId: 'ldg_test01',
      ownerUserId: 'user1',
      ledgerName: 'テスト帳簿',
      initialBalance: 0,
      startDayOfMonth: 1,
      startMonthOfYear: 1,
      themeColor: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00',
      updatedAt: '2026-01-01T00:00:00',
      myPermissionType: 'OWNER',
    }],
    selectedLedgerId: 'ldg_test01',
  });
});

describe('TransactionsPage', () => {
  it('月セレクターが表示される', async () => {
    render(<TransactionsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '前月' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '翌月' })).toBeInTheDocument();
    });
  });

  it('読み込み完了後にサマリーカードが表示される', async () => {
    mockGetTransactions.mockResolvedValue(responseWithData);
    render(<TransactionsPage />);
    await waitFor(() => {
      expect(screen.getByText('収入')).toBeInTheDocument();
      expect(screen.getByText('支出')).toBeInTheDocument();
      expect(screen.getByText('収支')).toBeInTheDocument();
    });
  });

  it('明細一覧が表示される', async () => {
    mockGetTransactions.mockResolvedValue(responseWithData);
    render(<TransactionsPage />);
    await waitFor(() => {
      expect(screen.getByText('食費')).toBeInTheDocument();
    });
  });

  it('＋追加ボタンクリックでサブパネルが開く', async () => {
    render(<TransactionsPage />);
    await waitFor(() => screen.getByRole('button', { name: '明細を追加' }));
    await userEvent.click(screen.getByRole('button', { name: '明細を追加' }));
    expect(useSubPanelStore.getState().isOpen).toBe(true);
  });

  it('前月ボタンクリックで月が変わる', async () => {
    render(<TransactionsPage />);
    // 現在月を確認してから前月に移動
    const prevBtn = await screen.findByRole('button', { name: '前月' });
    await userEvent.click(prevBtn);
    // API が再度呼ばれることを確認
    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalledTimes(2);
    });
  });

  it('前月ボタンクリックで URL クエリパラメータが更新される', async () => {
    render(<TransactionsPage />);
    const prevBtn = await screen.findByRole('button', { name: '前月' });
    await userEvent.click(prevBtn);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringMatching(/\?year=\d+&month=\d+/));
    });
  });

  it('URL クエリパラメータ year=2025&month=3 で初期月が復元される', async () => {
    mockSearchParams = new URLSearchParams('year=2025&month=3');
    render(<TransactionsPage />);
    await waitFor(() => {
      expect(screen.getByText('2025年3月')).toBeInTheDocument();
    });
  });
});
