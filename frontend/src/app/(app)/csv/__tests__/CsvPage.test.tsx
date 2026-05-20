import { render, screen, waitFor } from '@testing-library/react';
import CsvPage from '../page';
import { useLedgerStore } from '@/stores/ledgerStore';
import { useAuthStore } from '@/stores/authStore';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/components/csv/CsvExport', () => {
  return function MockCsvExport({ ledgerId }: { ledgerId: string }) {
    return <div data-testid="csv-export" data-ledger-id={ledgerId} />;
  };
});

jest.mock('@/components/csv/CsvImport', () => {
  return function MockCsvImport({ ledgerId }: { ledgerId: string }) {
    return <div data-testid="csv-import" data-ledger-id={ledgerId} />;
  };
});

const ledger = {
  ledgerId: 'ldg_1',
  ownerUserId: 'user1',
  ledgerName: 'テスト帳簿',
  initialBalance: 0,
  startDayOfMonth: 1,
  startMonthOfYear: 1,
  themeColor: null,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  mockReplace.mockReset();
  useAuthStore.setState({ role: 'USER' });
  useLedgerStore.setState({ ledgers: [ledger], selectedLedgerId: 'ldg_1' });
});

describe('CsvPage', () => {
  it('帳簿未選択時に案内メッセージが表示される', () => {
    useLedgerStore.setState({ ledgers: [], selectedLedgerId: null });
    render(<CsvPage />);
    expect(screen.getByText('帳簿を選択してください')).toBeInTheDocument();
    expect(screen.queryByTestId('csv-export')).not.toBeInTheDocument();
    expect(screen.queryByTestId('csv-import')).not.toBeInTheDocument();
  });

  it('帳簿選択時にページタイトルが表示される', () => {
    render(<CsvPage />);
    expect(screen.getByRole('heading', { name: 'CSV' })).toBeInTheDocument();
  });

  it('帳簿選択時に CsvExport が ledgerId を渡してレンダリングされる', () => {
    render(<CsvPage />);
    const exportEl = screen.getByTestId('csv-export');
    expect(exportEl).toBeInTheDocument();
    expect(exportEl).toHaveAttribute('data-ledger-id', 'ldg_1');
  });

  it('帳簿選択時に CsvImport が ledgerId を渡してレンダリングされる', () => {
    render(<CsvPage />);
    const importEl = screen.getByTestId('csv-import');
    expect(importEl).toBeInTheDocument();
    expect(importEl).toHaveAttribute('data-ledger-id', 'ldg_1');
  });

  it('SYSTEM_ADMIN は /admin にリダイレクトされる', async () => {
    useAuthStore.setState({ role: 'SYSTEM_ADMIN' });
    render(<CsvPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin');
    });
  });
});
