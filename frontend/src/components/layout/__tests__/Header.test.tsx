import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../Header';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useAuthStore } from '@/stores/authStore';
import type { PermissionType } from '@/lib/api/ledger';

const mockPush = jest.fn();
let mockPathname = '/dashboard';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock('@/lib/api/auth', () => ({
  logout: jest.fn().mockResolvedValue({ data: null, error: null, timestamp: '' }),
}));

const makeLedger = (ledgerId: string, name: string, permission: PermissionType = 'OWNER') => ({
  ledgerId,
  ownerUserId: 'user1',
  ledgerName: name,
  initialBalance: 0,
  startDayOfMonth: 1,
  startMonthOfYear: 1,
  themeColor: null,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  myPermissionType: permission,
});

const ledgersData = [
  makeLedger('ldg_aaa', '家計簿A', 'OWNER'),
  makeLedger('ldg_bbb', '家計簿B', 'VIEWER'),
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

describe('Header ログアウト', () => {
  it('ログアウト時に ledgerStore がリセットされる', async () => {
    useLedgerStore.setState({ ledgers: ledgersData, selectedLedgerId: 'ldg_aaa' });
    render(<Header />);
    await userEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
    await waitFor(() => {
      expect(useLedgerStore.getState().ledgers).toHaveLength(0);
      expect(useLedgerStore.getState().selectedLedgerId).toBeNull();
    });
  });

  it('ログアウト時に /login へ遷移する', async () => {
    render(<Header />);
    await userEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});

describe('Header メンバー管理ボタン', () => {
  it('ADMIN 以上の場合 👥 ボタンが表示される', () => {
    useLedgerStore.setState({ ledgers: ledgersData, selectedLedgerId: 'ldg_aaa' });
    render(<Header />);
    expect(screen.getByRole('button', { name: 'メンバー管理' })).toBeInTheDocument();
  });

  it('👥 ボタンに title="メンバー管理" が設定されている', () => {
    render(<Header />);
    const btn = screen.getByRole('button', { name: 'メンバー管理' });
    expect(btn).toHaveAttribute('title', 'メンバー管理');
  });

  it('VIEWER の場合 👥 ボタンが表示されない', () => {
    useLedgerStore.setState({ ledgers: ledgersData, selectedLedgerId: 'ldg_bbb' });
    render(<Header />);
    expect(screen.queryByRole('button', { name: 'メンバー管理' })).not.toBeInTheDocument();
  });

  it('帳簿未選択の場合 👥 ボタンが表示されない', () => {
    useLedgerStore.setState({ ledgers: ledgersData, selectedLedgerId: null });
    render(<Header />);
    expect(screen.queryByRole('button', { name: 'メンバー管理' })).not.toBeInTheDocument();
  });

  it('メンバー管理ボタンクリックで SubPanel が開く', async () => {
    useSubPanelStore.setState({ isOpen: false, content: null, contentKey: 0 });
    useLedgerStore.setState({ ledgers: ledgersData, selectedLedgerId: 'ldg_aaa' });
    render(<Header />);
    await userEvent.click(screen.getByRole('button', { name: 'メンバー管理' }));
    await waitFor(() => {
      expect(useSubPanelStore.getState().isOpen).toBe(true);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
