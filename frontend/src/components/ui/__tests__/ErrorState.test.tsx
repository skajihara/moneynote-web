import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from '../ErrorState';

describe('ErrorState', () => {
  it('デフォルトメッセージを表示する', () => {
    render(<ErrorState />);
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
  });

  it('カスタムメッセージを表示する', () => {
    render(<ErrorState message="通信エラーが発生しました" />);
    expect(screen.getByText('通信エラーが発生しました')).toBeInTheDocument();
  });

  it('onRetry を指定すると再試行ボタンが表示される', () => {
    const handleRetry = jest.fn();
    render(<ErrorState onRetry={handleRetry} />);
    const btn = screen.getByRole('button', { name: '再試行' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('onRetry を省略すると再試行ボタンが表示されない', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
