import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordResetConfirmPage from '../page';
import * as authApi from '@/lib/api/auth';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams('token=valid-token-123'),
}));

jest.mock('@/lib/api/auth');
const mockConfirm = jest.mocked(authApi.confirmPasswordReset);

beforeEach(() => {
  mockPush.mockReset();
  mockConfirm.mockReset();
  useToastStore.setState({ toasts: [] });
});

describe('PasswordResetConfirmPage', () => {
  it('フォームが表示される', () => {
    render(<PasswordResetConfirmPage />);
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード（確認）')).toBeInTheDocument();
  });

  it('バリデーション: パスワードが7文字以下でエラー', async () => {
    render(<PasswordResetConfirmPage />);
    await userEvent.type(screen.getByLabelText('新しいパスワード'), 'Short1');
    await userEvent.click(screen.getByRole('button', { name: 'パスワードを設定する' }));
    await waitFor(() => {
      expect(screen.getByText('パスワードは8文字以上で入力してください')).toBeInTheDocument();
    });
  });

  it('バリデーション: パスワードが一致しないとエラー', async () => {
    render(<PasswordResetConfirmPage />);
    await userEvent.type(screen.getByLabelText('新しいパスワード'), 'Password1');
    await userEvent.type(screen.getByLabelText('新しいパスワード（確認）'), 'Different1');
    await userEvent.click(screen.getByRole('button', { name: 'パスワードを設定する' }));
    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });
  });

  it('成功後 /login にリダイレクトされる', async () => {
    mockConfirm.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });

    render(<PasswordResetConfirmPage />);
    await userEvent.type(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    await userEvent.type(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    await userEvent.click(screen.getByRole('button', { name: 'パスワードを設定する' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
    expect(useToastStore.getState().toasts[0].type).toBe('success');
  });

  it('エラー時にエラートーストが表示される', async () => {
    mockConfirm.mockRejectedValueOnce(
      new ApiClientError({ code: 'E404', message: 'トークンが無効です' })
    );

    render(<PasswordResetConfirmPage />);
    await userEvent.type(screen.getByLabelText('新しいパスワード'), 'NewPass123');
    await userEvent.type(screen.getByLabelText('新しいパスワード（確認）'), 'NewPass123');
    await userEvent.click(screen.getByRole('button', { name: 'パスワードを設定する' }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts[0].message).toBe('トークンが無効です');
    });
  });
});
