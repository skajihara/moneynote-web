import { render, waitFor } from '@testing-library/react';
import SettingsPage from '../page';
import { useAuthStore } from '@/stores/authStore';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/components/settings/AccountTab', () => ({
  __esModule: true,
  default: () => <div>AccountTab</div>,
}));

jest.mock('@/components/settings/LedgersTab', () => ({
  __esModule: true,
  default: () => <div>LedgersTab</div>,
}));

beforeEach(() => {
  mockReplace.mockReset();
  useAuthStore.setState({ role: 'USER', isAuthenticated: true });
});

describe('SettingsPage', () => {
  it('通常ユーザーは設定ページが表示される', async () => {
    const { getByText } = render(<SettingsPage />);
    await waitFor(() => {
      expect(getByText('AccountTab')).toBeInTheDocument();
    });
  });

  it('SYSTEM_ADMIN は /admin にリダイレクトされる', async () => {
    useAuthStore.setState({ role: 'SYSTEM_ADMIN', isAuthenticated: true });
    render(<SettingsPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin');
    });
  });
});
