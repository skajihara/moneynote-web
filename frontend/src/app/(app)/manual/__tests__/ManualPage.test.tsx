import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManualPage from '../page';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const BASE_URL = 'https://skajihara.github.io/moneynote-web';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/manual',
}));

beforeEach(() => {
  window.open = jest.fn();
  useAuthStore.setState({ role: 'USER', isAuthenticated: true, accessToken: 'token', userId: 'u1', userName: 'user' });
  useThemeStore.setState({ isDark: false });
});

describe('ManualPage', () => {
  it('全セクション（管理者除く）が表示される', () => {
    render(<ManualPage />);
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('明細・入力')).toBeInTheDocument();
    expect(screen.getByText('予算・レポート')).toBeInTheDocument();
    expect(screen.getByText('AI分析')).toBeInTheDocument();
    expect(screen.getByText('検索')).toBeInTheDocument();
    expect(screen.getByText('固定費')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.getByText('お問い合わせ')).toBeInTheDocument();
  });

  it('USER ロールでは管理者画面セクションが表示されない', () => {
    render(<ManualPage />);
    expect(screen.queryByText('管理者画面')).not.toBeInTheDocument();
  });

  it('SYSTEM_ADMIN ロールでは管理者画面セクションが表示される', () => {
    useAuthStore.setState({ role: 'SYSTEM_ADMIN', isAuthenticated: true, accessToken: 'token', userId: 'admin', userName: '管理者' });
    render(<ManualPage />);
    expect(screen.getByText('管理者画面')).toBeInTheDocument();
  });

  it('「開く」ボタンクリックで対応する GitHub Pages URL が開く', async () => {
    render(<ManualPage />);
    const buttons = screen.getAllByRole('button', { name: '開く' });
    await userEvent.click(buttons[0]);
    expect(window.open).toHaveBeenCalledWith(
      `${BASE_URL}/dashboard`,
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('GitHub Pages の URL リンクが表示される', () => {
    render(<ManualPage />);
    expect(screen.getByRole('link', { name: BASE_URL })).toHaveAttribute('href', BASE_URL);
  });
});
