import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactPage from '../page';
import * as contactApi from '@/lib/api/contact';
import { ApiClientError } from '@/lib/api/client';
import { useToastStore } from '@/stores/toastStore';

jest.mock('@/lib/api/contact');

const mockSendContact = jest.mocked(contactApi.sendContact);

beforeEach(() => {
  mockSendContact.mockReset();
  useToastStore.setState({ toasts: [] });
});

describe('ContactPage', () => {
  it('ページタイトルが表示される', () => {
    render(<ContactPage />);
    expect(screen.getByText('お問い合わせ')).toBeInTheDocument();
  });

  it('件名・本文・送信ボタンが表示される', () => {
    render(<ContactPage />);
    expect(screen.getByPlaceholderText('例: ログインできない')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('お問い合わせ内容を入力してください')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送信する' })).toBeInTheDocument();
  });

  it('送信成功時にトーストが表示されフォームがリセットされる', async () => {
    mockSendContact.mockResolvedValueOnce({ data: null, error: null, timestamp: '' });

    render(<ContactPage />);

    await userEvent.type(screen.getByPlaceholderText('例: ログインできない'), 'ログインできない');
    await userEvent.type(
      screen.getByPlaceholderText('お問い合わせ内容を入力してください'),
      '詳細な内容'
    );
    await userEvent.click(screen.getByRole('button', { name: '送信する' }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts[0].message).toBe('お問い合わせを送信しました');
      expect(useToastStore.getState().toasts[0].type).toBe('success');
    });

    expect(mockSendContact).toHaveBeenCalledWith('ログインできない', '詳細な内容');

    await waitFor(() => {
      expect(screen.getByPlaceholderText('例: ログインできない')).toHaveValue('');
    });
  });

  it('ApiClientError 失敗時にエラーメッセージがトーストに表示される', async () => {
    mockSendContact.mockRejectedValueOnce(
      new ApiClientError({ code: 'E429', message: '1時間の上限に達しました' })
    );

    render(<ContactPage />);

    await userEvent.type(screen.getByPlaceholderText('例: ログインできない'), '件名');
    await userEvent.type(
      screen.getByPlaceholderText('お問い合わせ内容を入力してください'),
      '本文'
    );
    await userEvent.click(screen.getByRole('button', { name: '送信する' }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts[0].message).toBe('1時間の上限に達しました');
      expect(useToastStore.getState().toasts[0].type).toBe('error');
    });
  });

  it('予期しないエラー時にデフォルトエラーメッセージが表示される', async () => {
    mockSendContact.mockRejectedValueOnce(new Error('network error'));

    render(<ContactPage />);

    await userEvent.type(screen.getByPlaceholderText('例: ログインできない'), '件名');
    await userEvent.type(
      screen.getByPlaceholderText('お問い合わせ内容を入力してください'),
      '本文'
    );
    await userEvent.click(screen.getByRole('button', { name: '送信する' }));

    await waitFor(() => {
      expect(useToastStore.getState().toasts[0].message).toBe('お問い合わせの送信に失敗しました');
    });
  });

  it('件名が空のときバリデーションエラーが表示される', async () => {
    render(<ContactPage />);

    await userEvent.click(screen.getByRole('button', { name: '送信する' }));

    await waitFor(() => {
      expect(screen.getByText('件名を入力してください')).toBeInTheDocument();
    });
    expect(mockSendContact).not.toHaveBeenCalled();
  });

  it('本文が空のときバリデーションエラーが表示される', async () => {
    render(<ContactPage />);

    await userEvent.type(screen.getByPlaceholderText('例: ログインできない'), '件名あり');
    await userEvent.click(screen.getByRole('button', { name: '送信する' }));

    await waitFor(() => {
      expect(screen.getByText('本文を入力してください')).toBeInTheDocument();
    });
    expect(mockSendContact).not.toHaveBeenCalled();
  });

  it('件名が101文字のときバリデーションエラーが表示される', async () => {
    render(<ContactPage />);

    await userEvent.type(
      screen.getByPlaceholderText('例: ログインできない'),
      'a'.repeat(101)
    );
    await userEvent.click(screen.getByRole('button', { name: '送信する' }));

    await waitFor(() => {
      expect(screen.getByText('件名は100文字以内で入力してください')).toBeInTheDocument();
    });
  });

  it('本文の文字数カウンターが表示される', async () => {
    render(<ContactPage />);

    expect(screen.getByText('0 / 2000')).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText('お問い合わせ内容を入力してください'),
      'abc'
    );

    expect(screen.getByText('3 / 2000')).toBeInTheDocument();
  });
});
