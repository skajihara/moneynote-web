import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../page';
import * as authApi from '@/lib/api/auth';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/api/auth');
const mockRegister = jest.mocked(authApi.register);

beforeEach(() => {
  mockPush.mockReset();
  mockRegister.mockReset();
  useToastStore.setState({ toasts: [] });
});

const fillForm = async (overrides: Record<string, string> = {}) => {
  const defaults = {
    userId: 'new_user1',
    userName: 'テストユーザー',
    email: 'test@example.com',
    password: 'Password1!',
    confirmPassword: 'Password1!',
  };
  const values = { ...defaults, ...overrides };
  await userEvent.type(screen.getByLabelText('ユーザーID'), values.userId);
  await userEvent.type(screen.getByLabelText('ユーザー名'), values.userName);
  await userEvent.type(screen.getByLabelText('メールアドレス'), values.email);
  await userEvent.type(screen.getByLabelText('パスワード'), values.password);
  await userEvent.type(screen.getByLabelText('パスワード（確認）'), values.confirmPassword);
};

describe('RegisterPage', () => {
  it('フォームが表示される', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText('ユーザーID')).toBeInTheDocument();
    expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード（確認）')).toBeInTheDocument();
  });

  it('バリデーション: userId が2文字以下でエラー', async () => {
    render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('ユーザーID'), 'ab');
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));
    await waitFor(() => {
      expect(screen.getByText('ユーザーIDは3文字以上で入力してください')).toBeInTheDocument();
    });
  });

  it('バリデーション: userId に記号が含まれるとエラー', async () => {
    render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('ユーザーID'), 'user-name!');
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));
    await waitFor(() => {
      expect(screen.getByText('ユーザーIDは半角英数字とアンダーバーのみ使用できます')).toBeInTheDocument();
    });
  });

  it('バリデーション: パスワードに数字がないとエラー', async () => {
    render(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('パスワード'), 'OnlyLetters');
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));
    await waitFor(() => {
      expect(screen.getByText('数字を1文字以上含めてください')).toBeInTheDocument();
    });
  });

  it('バリデーション: パスワードと確認が一致しないとエラー', async () => {
    render(<RegisterPage />);
    await fillForm({ confirmPassword: 'Different1!' });
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));
    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });
  });

  it('登録成功で /login にリダイレクトされ成功トーストが表示される', async () => {
    mockRegister.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });

    render(<RegisterPage />);
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
    expect(useToastStore.getState().toasts[0].type).toBe('success');
  });

  it('登録失敗でエラートーストが表示される', async () => {
    mockRegister.mockRejectedValueOnce(
      new ApiClientError({ code: 'E400', message: 'このユーザーIDは既に使用されています' })
    );

    render(<RegisterPage />);
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts[0].message).toBe('このユーザーIDは既に使用されています');
    });
  });
});
