import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountTab from '../AccountTab';
import * as userApi from '@/lib/api/user';
import * as authApi from '@/lib/api/auth';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { ApiClientError } from '@/lib/api/client';

jest.mock('@/lib/api/user');
jest.mock('@/lib/api/auth');

const mockGetProfile = jest.mocked(userApi.getProfile);
const mockDeleteAccount = jest.mocked(userApi.deleteAccount);
const mockLogout = jest.mocked(authApi.logout);

const mockLogoutAuth = jest.fn();
const mockAuthLogout = jest.fn();

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mockUseAuthStore = jest.mocked(useAuthStore);

const originalLocation = window.location;

beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '' },
  });
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});

beforeEach(() => {
  mockLogoutAuth.mockReset();
  mockAuthLogout.mockReset();
  mockGetProfile.mockReset();
  mockDeleteAccount.mockReset();
  mockLogout.mockReset();
  useToastStore.setState({ toasts: [] });
  window.location.href = '';

  mockUseAuthStore.mockImplementation((selector) =>
    selector({ logout: mockAuthLogout } as ReturnType<typeof useAuthStore>)
  );

  mockGetProfile.mockResolvedValue({
    data: { userId: 'user1', userName: 'テスト', email: 'test@example.com', themeColor: null },
    error: null,
    timestamp: '',
  });
});

describe('AccountTab - プロフィールフォームバリデーション', () => {
  it('ユーザー名が空のとき具体的なエラーメッセージが表示される', async () => {
    render(<AccountTab />);
    // userName フィールドはプロフィール読み込み後に値がセットされる
    await waitFor(() => expect(screen.getByDisplayValue('テスト')).toBeInTheDocument());
    const userNameInput = screen.getByDisplayValue('テスト');
    await userEvent.clear(userNameInput);
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => {
      expect(screen.getByText('ユーザー名を入力してください')).toBeInTheDocument();
    });
  });

  it('現在のパスワードが空のとき具体的なエラーメッセージが表示される', async () => {
    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: '変更' }));
    await waitFor(() => {
      expect(screen.getByText('現在のパスワードを入力してください')).toBeInTheDocument();
    });
  });

  it('ユーザー名フィールドにヒントテキストが表示されている', async () => {
    render(<AccountTab />);
    await waitFor(() => expect(screen.getByDisplayValue('テスト')).toBeInTheDocument());
    expect(screen.getByText('50文字以内で入力してください')).toBeInTheDocument();
  });
});

describe('AccountTab - アカウント削除ダイアログ', () => {
  it('削除ボタンクリックでダイアログが開く', async () => {
    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを削除する' }));
    expect(screen.getByText('本当に削除しますか？')).toBeInTheDocument();
  });

  it('削除確認ダイアログに新しいメッセージが表示される', async () => {
    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを削除する' }));
    expect(
      screen.getByText('本日深夜0時に削除されます。依頼後は当日中にキャンセルメールから取り消せます。')
    ).toBeInTheDocument();
  });

  it('削除確認ダイアログに旧メッセージが表示されない', async () => {
    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを削除する' }));
    expect(screen.queryByText('この操作は取り消せません')).not.toBeInTheDocument();
  });

  it('キャンセルボタンでダイアログが閉じる', async () => {
    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを削除する' }));
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.queryByText('本当に削除しますか？')).not.toBeInTheDocument();
  });

  it('削除成功後にログアウトして /login にリダイレクトされる', async () => {
    mockLogout.mockResolvedValue({ data: null, error: null, timestamp: '' });
    mockDeleteAccount.mockResolvedValue({ data: null, error: null, timestamp: '' });

    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを削除する' }));
    await userEvent.click(screen.getByRole('button', { name: '削除する' }));

    await waitFor(() => {
      expect(mockAuthLogout).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });
  });

  it('削除失敗時にエラートーストが表示される', async () => {
    mockLogout.mockResolvedValue({ data: null, error: null, timestamp: '' });
    mockDeleteAccount.mockRejectedValue(
      new ApiClientError({ code: 'E500', message: 'サーバーエラー' })
    );

    render(<AccountTab />);
    await userEvent.click(screen.getByRole('button', { name: 'アカウントを削除する' }));
    await userEvent.click(screen.getByRole('button', { name: '削除する' }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts[0].message).toBe('サーバーエラー');
    });
  });
});
