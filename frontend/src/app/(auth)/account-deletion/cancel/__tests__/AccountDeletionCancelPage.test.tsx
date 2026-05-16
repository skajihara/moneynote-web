import { render, screen, waitFor } from '@testing-library/react';
import AccountDeletionCancelPage from '../page';
import * as authApi from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('token=valid-cancel-token'),
}));

jest.mock('@/lib/api/auth');
const mockCancel = jest.mocked(authApi.cancelAccountDeletion);

beforeEach(() => {
  mockCancel.mockReset();
});

describe('AccountDeletionCancelPage', () => {
  it('成功時に「キャンセルしました」メッセージが表示される', async () => {
    mockCancel.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });

    render(<AccountDeletionCancelPage />);

    await waitFor(() => {
      expect(
        screen.getByText('アカウント削除をキャンセルしました。ログインしてご利用ください。')
      ).toBeInTheDocument();
    });
    expect(mockCancel).toHaveBeenCalledWith('valid-cancel-token');
  });

  it('失敗時にエラーメッセージが表示される（ApiClientError）', async () => {
    mockCancel.mockRejectedValueOnce(
      new ApiClientError({ code: 'E404', message: 'キャンセルリンクが無効または期限切れです' })
    );

    render(<AccountDeletionCancelPage />);

    await waitFor(() => {
      expect(
        screen.getByText('キャンセルリンクが無効または期限切れです')
      ).toBeInTheDocument();
    });
  });

  it('失敗時にデフォルトエラーメッセージが表示される（予期しないエラー）', async () => {
    mockCancel.mockRejectedValueOnce(new Error('network error'));

    render(<AccountDeletionCancelPage />);

    await waitFor(() => {
      expect(
        screen.getByText('キャンセルリンクが無効または期限切れです。')
      ).toBeInTheDocument();
    });
  });

  it('ページタイトルが表示される', async () => {
    mockCancel.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });
    render(<AccountDeletionCancelPage />);
    expect(screen.getByText('アカウント削除のキャンセル')).toBeInTheDocument();
  });
});
