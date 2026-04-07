import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordResetPage from '../page';
import * as authApi from '@/lib/api/auth';
import { useToastStore } from '@/stores/toastStore';

jest.mock('@/lib/api/auth');
const mockRequestReset = jest.mocked(authApi.requestPasswordReset);

beforeEach(() => {
  mockRequestReset.mockReset();
  useToastStore.setState({ toasts: [] });
});

describe('PasswordResetPage', () => {
  it('フォームが表示される', () => {
    render(<PasswordResetPage />);
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'リセットメールを送信' })).toBeInTheDocument();
  });

  it('バリデーション: 無効なメールアドレスでエラー', async () => {
    render(<PasswordResetPage />);
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'invalid-email');
    await userEvent.click(screen.getByRole('button', { name: 'リセットメールを送信' }));
    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  it('送信成功後に「メールを送信しました」が表示される', async () => {
    mockRequestReset.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });

    render(<PasswordResetPage />);
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'リセットメールを送信' }));

    await waitFor(() => {
      expect(screen.getByText('メールを送信しました')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'ログイン画面に戻る' })).toBeInTheDocument();
  });

  it('API エラーでも成功扱いで「メールを送信しました」が表示される（ユーザー列挙攻撃対策）', async () => {
    mockRequestReset.mockRejectedValueOnce(new Error('not found'));

    render(<PasswordResetPage />);
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'nobody@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'リセットメールを送信' }));

    await waitFor(() => {
      expect(screen.getByText('メールを送信しました')).toBeInTheDocument();
    });
  });
});
