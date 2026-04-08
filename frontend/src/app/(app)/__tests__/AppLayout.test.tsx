import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppLayout from '../layout';
import * as authApi from '@/lib/api/auth';
import * as ledgerApi from '@/lib/api/ledger';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useLedgerStore } from '@/stores/ledgerStore';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}));

jest.mock('@/lib/api/auth');
jest.mock('@/lib/api/ledger');

const mockLogout = jest.mocked(authApi.logout);
const mockGetLedgers = jest.mocked(ledgerApi.getLedgers);

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
  mockGetLedgers.mockResolvedValue(ledgersResponse);
  useAuthStore.setState({
    userId: 'test_user',
    userName: 'テストユーザー',
    accessToken: 'token-abc',
    isAuthenticated: true,
  });
  useToastStore.setState({ toasts: [] });
  useLedgerStore.setState({ ledgers: [], selectedLedgerId: null });
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
