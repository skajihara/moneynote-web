import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../page';
import * as authApi from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';

// next/navigation をモック
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// API をモック
jest.mock('@/lib/api/auth');
const mockLogin = jest.mocked(authApi.login);

beforeEach(() => {
  mockPush.mockReset();
  mockLogin.mockReset();
  useAuthStore.setState({ userId: null, userName: null, accessToken: null, isAuthenticated: false });
  useToastStore.setState({ toasts: [] });
});

describe('LoginPage', () => {
  it('フォームが表示される', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('ユーザーID')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('バリデーション: userId が2文字以下でエラーが表示される', async () => {
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('ユーザーID'), 'ab');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByText('ユーザーIDは3文字以上で入力してください')).toBeInTheDocument();
    });
  });

  it('バリデーション: password が7文字以下でエラーが表示される', async () => {
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('パスワード'), 'short1');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByText('パスワードは8文字以上で入力してください')).toBeInTheDocument();
    });
  });

  it('ログイン成功で /dashboard にリダイレクトする', async () => {
    mockLogin.mockResolvedValueOnce({
      data: { accessToken: 'access-token-123' },
      error: null,
      timestamp: '',
    });

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('ユーザーID'), 'valid_user');
    await userEvent.type(screen.getByLabelText('パスワード'), 'Password1');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    expect(useAuthStore.getState().accessToken).toBe('access-token-123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('ログイン失敗でエラートーストが表示される', async () => {
    mockLogin.mockRejectedValueOnce(
      new ApiClientError({ code: 'E401', message: 'ユーザーIDまたはパスワードが違います' })
    );

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('ユーザーID'), 'valid_user');
    await userEvent.type(screen.getByLabelText('パスワード'), 'WrongPass1');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0].type).toBe('error');
      expect(useToastStore.getState().toasts[0].message).toBe('ユーザーIDまたはパスワードが違います');
    });
  });

  it('「パスワードをお忘れの方」リンクが /password-reset を指す', () => {
    render(<LoginPage />);
    const link = screen.getByRole('link', { name: 'パスワードをお忘れの方' });
    expect(link).toHaveAttribute('href', '/password-reset');
  });
});
