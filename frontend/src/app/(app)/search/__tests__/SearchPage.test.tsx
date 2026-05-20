import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from '../page';
import * as transactionApi from '@/lib/api/transaction';
import * as ledgerApi from '@/lib/api/ledger';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useAuthStore } from '@/stores/authStore';
import type { Transaction } from '@/types/transaction';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/lib/api/transaction');
jest.mock('@/lib/api/ledger');
jest.mock('@/components/transaction/TransactionEditForm', () => {
  return function MockTransactionEditForm() {
    return <div data-testid="transaction-edit-form" />;
  };
});

const mockSearchTransactions = jest.mocked(transactionApi.searchTransactions);
const mockGetCategories = jest.mocked(ledgerApi.getCategories);

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

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  transactionId: 'txn_1',
  transactionDate: '2026-04-10',
  transactionType: 'EXPENSE',
  amount: 3000,
  categoryId: 'cat_1',
  categoryName: '食費',
  categoryType: 'EXPENSE',
  categoryIcon: null,
  memo: 'コンビニ',
  isFixedOrigin: false,
  fixedTransactionId: null,
  ...overrides,
});

const emptySearchResponse = { data: [] as Transaction[], error: null, timestamp: '' };
const categoriesResponse = { data: [], error: null, timestamp: '' };

beforeEach(() => {
  jest.clearAllMocks();
  mockReplace.mockReset();
  mockSearchTransactions.mockResolvedValue(emptySearchResponse);
  mockGetCategories.mockResolvedValue(categoriesResponse);
  useAuthStore.setState({ role: 'USER' });
  useLedgerStore.setState({ ledgers: [ledger], selectedLedgerId: 'ldg_1' });
  useSubPanelStore.setState({ isOpen: false, content: null, contentKey: 0 });
});

describe('SearchPage', () => {
  it('帳簿未選択時に案内メッセージが表示される', () => {
    useLedgerStore.setState({ ledgers: [], selectedLedgerId: null });
    render(<SearchPage />);
    expect(screen.getByText('帳簿を選択してください')).toBeInTheDocument();
  });

  it('帳簿選択時に検索フォームが表示される', async () => {
    render(<SearchPage />);
    // getCategories の非同期完了を待ち act() 警告を回避
    await waitFor(() => expect(screen.getByPlaceholderText('例: コンビニ')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument();
  });

  it('帳簿名がタイトルに表示される', async () => {
    render(<SearchPage />);
    await waitFor(() => expect(screen.getByText('（テスト帳簿）')).toBeInTheDocument());
  });

  it('検索ボタンクリックで searchTransactions が呼ばれる', async () => {
    render(<SearchPage />);
    await userEvent.click(screen.getByRole('button', { name: '検索' }));
    await waitFor(() => {
      expect(mockSearchTransactions).toHaveBeenCalledWith('ldg_1', {});
    });
  });

  it('キーワード入力後 Enter キーで検索が実行される', async () => {
    render(<SearchPage />);
    const input = screen.getByPlaceholderText('例: コンビニ');
    await userEvent.type(input, 'コンビニ{Enter}');
    await waitFor(() => {
      expect(mockSearchTransactions).toHaveBeenCalledWith('ldg_1', { keyword: 'コンビニ' });
    });
  });

  it('検索結果が表示される', async () => {
    mockSearchTransactions.mockResolvedValue({ data: [makeTx()], error: null, timestamp: '' });
    render(<SearchPage />);
    await userEvent.click(screen.getByRole('button', { name: '検索' }));
    await waitFor(() => {
      expect(screen.getByText('食費')).toBeInTheDocument();
    });
  });

  it('件数が表示される', async () => {
    mockSearchTransactions.mockResolvedValue({ data: [makeTx(), makeTx({ transactionId: 'txn_2' })], error: null, timestamp: '' });
    render(<SearchPage />);
    await userEvent.click(screen.getByRole('button', { name: '検索' }));
    await waitFor(() => {
      expect(screen.getByText('2 件')).toBeInTheDocument();
    });
  });

  it('検索結果 0 件のとき空メッセージが表示される', async () => {
    render(<SearchPage />);
    await userEvent.click(screen.getByRole('button', { name: '検索' }));
    await waitFor(() => {
      expect(screen.getByText('該当する明細がありません')).toBeInTheDocument();
    });
  });

  it('明細クリックでサブパネルが開く', async () => {
    mockSearchTransactions.mockResolvedValue({ data: [makeTx()], error: null, timestamp: '' });
    render(<SearchPage />);
    await userEvent.click(screen.getByRole('button', { name: '検索' }));
    await waitFor(() => screen.getByText('食費'));
    await userEvent.click(screen.getByRole('button', { name: /食費/ }));
    expect(useSubPanelStore.getState().isOpen).toBe(true);
  });

  it('フィルター条件が searchTransactions に渡される', async () => {
    render(<SearchPage />);
    const input = screen.getByPlaceholderText('例: コンビニ');
    await userEvent.type(input, 'スーパー');
    const startDate = screen.getAllByDisplayValue('').find(
      (el) => el.getAttribute('type') === 'date'
    );
    if (startDate) await userEvent.type(startDate, '2026-04-01');
    await userEvent.click(screen.getByRole('button', { name: '検索' }));
    await waitFor(() => {
      expect(mockSearchTransactions).toHaveBeenCalledWith('ldg_1', expect.objectContaining({ keyword: 'スーパー' }));
    });
  });

  it('SYSTEM_ADMIN は /admin にリダイレクトされる', async () => {
    useAuthStore.setState({ role: 'SYSTEM_ADMIN' });
    render(<SearchPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin');
    });
  });
});
