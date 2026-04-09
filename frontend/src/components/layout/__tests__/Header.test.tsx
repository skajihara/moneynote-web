import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../Header';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useAuthStore } from '@/stores/authStore';

const mockPush = jest.fn();
let mockPathname = '/dashboard';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock('@/lib/api/auth', () => ({
  logout: jest.fn().mockResolvedValue({ data: null, error: null, timestamp: '' }),
}));

const ledgersData = [
  {
    ledgerId: 'ldg_aaa',
    ownerUserId: 'user1',
    ledgerName: '家計簿A',
    initialBalance: 0,
    startDayOfMonth: 1,
    startMonthOfYear: 1,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    ledgerId: 'ldg_bbb',
    ownerUserId: 'user1',
    ledgerName: '家計簿B',
    initialBalance: 0,
    startDayOfMonth: 1,
    startMonthOfYear: 1,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

beforeEach(() => {
  mockPush.mockReset();
  mockPathname = '/dashboard';
  useLedgerStore.setState({ ledgers: ledgersData, selectedLedgerId: 'ldg_aaa' });
  useSubPanelStore.setState({ isOpen: true, content: null, contentKey: 0 });
  useAuthStore.setState({
    userId: 'user1',
    userName: 'テストユーザー',
    accessToken: 'token',
    isAuthenticated: true,
  });
});

describe('Header 帳簿セレクター', () => {
  it('選択中の帳簿名が表示される', () => {
    render(<Header />);
    expect(screen.getByText('家計簿A')).toBeInTheDocument();
  });

  it('ドロップダウンに全帳簿が表示される', async () => {
    render(<Header />);
    await userEvent.click(screen.getByText('家計簿A'));
    expect(screen.getByRole('button', { name: '家計簿B' })).toBeInTheDocument();
  });

  it('ダッシュボードでの帳簿切り替えは selectLedger のみ呼び router.push を呼ばない', async () => {
    mockPathname = '/dashboard';
    render(<Header />);
    await userEvent.click(screen.getByText('家計簿A'));
    await userEvent.click(screen.getByRole('button', { name: '家計簿B' }));
    await waitFor(() => {
      expect(useLedgerStore.getState().selectedLedgerId).toBe('ldg_bbb');
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('/ledgers/{id}/* での帳簿切り替えは新しい帳簿のパスへ遷移する', async () => {
    mockPathname = '/ledgers/ldg_aaa/transactions';
    render(<Header />);
    await userEvent.click(screen.getByText('家計簿A'));
    await userEvent.click(screen.getByRole('button', { name: '家計簿B' }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/ledgers/ldg_bbb/transactions');
    });
    expect(useLedgerStore.getState().selectedLedgerId).toBe('ldg_bbb');
  });

  it('/ledgers/{id}/ で帳簿切り替えした場合もパスが更新される', async () => {
    mockPathname = '/ledgers/ldg_aaa/categories';
    render(<Header />);
    await userEvent.click(screen.getByText('家計簿A'));
    await userEvent.click(screen.getByRole('button', { name: '家計簿B' }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/ledgers/ldg_bbb/categories');
    });
  });

  it('帳簿切り替え時にサブパネルが閉じる', async () => {
    mockPathname = '/ledgers/ldg_aaa/transactions';
    render(<Header />);
    await userEvent.click(screen.getByText('家計簿A'));
    await userEvent.click(screen.getByRole('button', { name: '家計簿B' }));
    await waitFor(() => {
      expect(useSubPanelStore.getState().isOpen).toBe(false);
    });
  });
});
