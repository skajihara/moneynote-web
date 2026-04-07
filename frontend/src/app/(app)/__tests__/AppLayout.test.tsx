import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppLayout from '../layout';
import * as authApi from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/api/auth');
const mockLogout = jest.mocked(authApi.logout);

beforeEach(() => {
  mockPush.mockReset();
  mockLogout.mockReset();
  useAuthStore.setState({
    userId: 'test_user',
    userName: 'テストユーザー',
    accessToken: 'token-abc',
    isAuthenticated: true,
  });
  useToastStore.setState({ toasts: [] });
});

describe('AppLayout ログアウト', () => {
  it('ログアウトボタンが表示される', () => {
    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });

  it('ユーザー名が表示される', () => {
    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
  });

  it('ログアウトボタンクリックで API 呼び出し・store クリア・/login へリダイレクト', async () => {
    mockLogout.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });

    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    await userEvent.click(screen.getByRole('button', { name: 'ログアウト' }));

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
    await userEvent.click(screen.getByRole('button', { name: 'ログアウト' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('ログアウト成功後に成功トーストが表示される', async () => {
    mockLogout.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });

    render(<AppLayout><div>コンテンツ</div></AppLayout>);
    await userEvent.click(screen.getByRole('button', { name: 'ログアウト' }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0].type).toBe('success');
      expect(useToastStore.getState().toasts[0].message).toBe('ログアウトしました');
    });
  });
});
