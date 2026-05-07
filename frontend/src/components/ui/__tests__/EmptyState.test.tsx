import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('メッセージを表示する', () => {
    render(<EmptyState message="データがありません" />);
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });

  it('icon を指定するとそのテキストを表示する', () => {
    render(<EmptyState message="空です" icon="📭" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('icon を省略するとデフォルトSVGを表示する', () => {
    const { container } = render(<EmptyState message="空です" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('action を指定するとボタンが表示される', () => {
    const handleClick = jest.fn();
    render(<EmptyState message="空です" action={{ label: '追加する', onClick: handleClick }} />);
    const btn = screen.getByRole('button', { name: '追加する' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('action を省略するとボタンが表示されない', () => {
    render(<EmptyState message="空です" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
