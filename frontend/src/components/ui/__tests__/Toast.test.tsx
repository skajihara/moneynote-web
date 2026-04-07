import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toasts } from '../Toast';
import { useToastStore } from '@/stores/toastStore';

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('Toasts コンポーネント', () => {
  it('toastStore にトーストがある場合に表示される', () => {
    act(() => {
      useToastStore.getState().add('success', '保存しました');
    });

    render(<Toasts />);
    expect(screen.getByText('保存しました')).toBeInTheDocument();
  });

  it('エラートーストは赤背景クラスを持つ', () => {
    act(() => {
      useToastStore.getState().add('error', 'エラーが発生しました');
    });

    render(<Toasts />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-500');
  });

  it('成功トーストは緑背景クラスを持つ', () => {
    act(() => {
      useToastStore.getState().add('success', '成功');
    });

    render(<Toasts />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-green-500');
  });

  it('警告トーストは黄背景クラスを持つ', () => {
    act(() => {
      useToastStore.getState().add('warning', '警告');
    });

    render(<Toasts />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-yellow-500');
  });

  it('3秒後に自動で消える', async () => {
    jest.useFakeTimers();
    try {
      act(() => {
        useToastStore.getState().add('success', '自動消滅');
      });

      render(<Toasts />);
      expect(screen.getByText('自動消滅')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('自動消滅')).not.toBeInTheDocument();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('閉じるボタンで手動で消える', async () => {
    act(() => {
      useToastStore.getState().add('success', '手動消滅');
    });

    render(<Toasts />);

    const closeButton = screen.getByRole('button', { name: '閉じる' });
    await userEvent.click(closeButton);

    expect(screen.queryByText('手動消滅')).not.toBeInTheDocument();
  });
});
