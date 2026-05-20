import { render, screen } from '@testing-library/react';
import SideMenu from '../SideMenu';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useAuthStore } from '@/stores/authStore';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

beforeEach(() => {
  useLedgerStore.setState({ ledgers: [], selectedLedgerId: null });
  useAuthStore.setState({ role: null });
});

describe('SideMenu 通常ユーザー', () => {
  it('ダッシュボードのリンクが表示される', () => {
    render(<SideMenu />);
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
  });

  it('設定のリンクが表示される', () => {
    render(<SideMenu />);
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  it('帳簿未選択時に帳簿依存メニューが無効化される', () => {
    render(<SideMenu />);
    expect(screen.getByText('明細・入力')).toHaveClass('cursor-not-allowed');
  });

  it('管理者画面リンクが表示されない', () => {
    render(<SideMenu />);
    expect(screen.queryByText(/管理者画面/)).not.toBeInTheDocument();
  });

  it('マニュアルが表示される', () => {
    render(<SideMenu />);
    expect(screen.getByText('マニュアル')).toBeInTheDocument();
  });

  it('お問い合わせが表示される', () => {
    render(<SideMenu />);
    expect(screen.getByText('お問い合わせ')).toBeInTheDocument();
  });
});

describe('SideMenu 管理者 (SYSTEM_ADMIN)', () => {
  beforeEach(() => {
    useAuthStore.setState({ role: 'SYSTEM_ADMIN' });
  });

  it('ダッシュボードが表示されない', () => {
    render(<SideMenu />);
    expect(screen.queryByText('ダッシュボード')).not.toBeInTheDocument();
  });

  it('設定が表示されない', () => {
    render(<SideMenu />);
    expect(screen.queryByText('設定')).not.toBeInTheDocument();
  });

  it('明細・入力が表示されない', () => {
    render(<SideMenu />);
    expect(screen.queryByText('明細・入力')).not.toBeInTheDocument();
  });

  it('管理者画面リンクが表示される', () => {
    render(<SideMenu />);
    expect(screen.getByText(/管理者画面/)).toBeInTheDocument();
  });

  it('マニュアルが表示される', () => {
    render(<SideMenu />);
    expect(screen.getByText('マニュアル')).toBeInTheDocument();
  });

  it('お問い合わせが表示される', () => {
    render(<SideMenu />);
    expect(screen.getByText('お問い合わせ')).toBeInTheDocument();
  });
});
