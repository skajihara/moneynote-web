import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppLayout from '../layout';
import * as authApi from '@/lib/api/auth';
import * as ledgerApi from '@/lib/api/ledger';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useSubPanelStore } from '@/stores/subPanelStore';

const mockPush = jest.fn();
let mockPathname = '/dashboard';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock('@/lib/api/auth');
jest.mock('@/lib/api/ledger');

const mockRefresh = jest.mocked(authApi.refresh);
const mockLogout = jest.mocked(authApi.logout);
const mockGetLedgers = jest.mocked(ledgerApi.getLedgers);

const refreshResponse = { data: { accessToken: 'refreshed-token' }, error: null, timestamp: '' };
const emptyLedgersResponse = { data: [], error: null, timestamp: '' };
const ledgersResponse = {
  data: [
    {
      ledgerId: 'ldg_test01',
      ownerUserId: 'test_user',
      ledgerName: 'テスト帳簿',
      initialBalance: 0,
      startDayOfMonth: 1,
      startMonthOfYear: 1,
      themeColor: null,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
  ],
  error: null,
  timestamp: '',
};

beforeEach(() => {
  mockPush.mockReset();
  mockLogout.mockReset();
  mockRefresh.mockReset();
  mockGetLedgers.mockReset();
  mockPathname = '/dashboard';
  mockRefresh.mockResolvedValue(refreshResponse);
  mockGetLedgers.mockResolvedValue(ledgersResponse);
  useAuthStore.setState({
    userId: 'test_user',
    userName: 'テストユーザー',
    accessToken: 'token-abc',
    isAuthenticated: true,
  });
  useToastStore.setState({ toasts: [] });
  useLedgerStore.setState({ ledgers: [], selectedLedgerId: null });
  useSubPanelStore.setState({ isOpen: false, content: null, contentKey: 0 });
});

describe('AppLayout 初期化（リロード時のトークンリフレッシュ）', () => {
  it('マウント時にトークンリフレッシュ API を呼び出す', async () => {
    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('リフレッシュ成功後にアクセストークンがストアにセットされ children が表示される', async () => {
    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('refreshed-token');
      expect(screen.getByText('コンテンツ')).toBeInTheDocument();
    });
  });

  it('リフレッシュ失敗時はログアウトして /login へリダイレクトする', async () => {
    mockRefresh.mockRejectedValueOnce(new Error('Unauthorized'));

    render(<AppLayout><div>コンテンツ</div></AppLayout>);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
  });

  it('リフレッシュ成功後に帳簿一覧を取得する', async () => {
    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    await waitFor(() => {
      expect(mockGetLedgers).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AppLayout ログアウト', () => {
  it('ログアウトボタンが表示される', async () => {
    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    expect(await screen.findByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });

  it('ユーザー名が表示される', async () => {
    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    expect(await screen.findByText('テストユーザー')).toBeInTheDocument();
  });

  it('ログアウトボタンクリックで API 呼び出し・store クリア・/login へリダイレクト', async () => {
    mockLogout.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });

    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    const logoutBtn = await screen.findByRole('button', { name: 'ログアウト' });
    await userEvent.click(logoutBtn);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.userId).toBeNull();
  });

  it('ログアウト API が失敗してもクライアント側はクリアされ /login へリダイレクトする', async () => {
    mockLogout.mockRejectedValueOnce(new Error('network error'));

    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    const logoutBtn = await screen.findByRole('button', { name: 'ログアウト' });
    await userEvent.click(logoutBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('ログアウト成功後に成功トーストが表示される', async () => {
    mockLogout.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });

    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    const logoutBtn = await screen.findByRole('button', { name: 'ログアウト' });
    await userEvent.click(logoutBtn);

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0].type).toBe('success');
      expect(useToastStore.getState().toasts[0].message).toBe('ログアウトしました');
    });
  });
});

describe('AppLayout 帳簿作成モーダル', () => {
  it('帳簿が0件の場合にモーダルが表示される', async () => {
    mockGetLedgers.mockResolvedValueOnce(emptyLedgersResponse);

    render(<AppLayout><div>コンテンツ</div></AppLayout>);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '帳簿を作成する' })).toBeInTheDocument();
    });
  });

  it('帳簿が1件以上の場合はモーダルが表示されない', async () => {
    render(<AppLayout><div>コンテンツ</div></AppLayout>);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '帳簿を作成する' })).not.toBeInTheDocument();
    });
  });
});

describe('AppLayout 帳簿セレクター', () => {
  it('ヘッダーに帳簿名が表示される', async () => {
    render(<AppLayout><div>コンテンツ</div></AppLayout>);

    await waitFor(() => {
      expect(screen.getByText('テスト帳簿')).toBeInTheDocument();
    });
  });
});

describe('AppLayout パス変更でサブパネルを閉じる', () => {
  it('pathname が変わると isOpen が false になる', async () => {
    // まずサブパネルを開いた状態にする
    act(() => {
      useSubPanelStore.getState().open(<div>パネルコンテンツ</div>);
    });
    expect(useSubPanelStore.getState().isOpen).toBe(true);

    const { rerender } = render(<AppLayout><div>コンテンツ</div></AppLayout>);

    // pathname を変更して再レンダー
    mockPathname = '/settings';
    rerender(<AppLayout><div>コンテンツ</div></AppLayout>);

    await waitFor(() => {
      expect(useSubPanelStore.getState().isOpen).toBe(false);
    });
  });
});
