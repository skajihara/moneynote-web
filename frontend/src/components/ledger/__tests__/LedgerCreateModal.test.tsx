import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LedgerCreateModal from '../LedgerCreateModal';
import { useLedgerStore } from '@/stores/ledgerStore';
import { ApiClientError } from '@/lib/api/client';
import { useToastStore } from '@/stores/toastStore';

jest.mock('@/stores/ledgerStore');

const mockUseLedgerStore = jest.mocked(useLedgerStore);
const mockCreateLedger = jest.fn();

const setupStore = () => {
  const fakeStore = { createLedger: mockCreateLedger } as unknown as ReturnType<typeof useLedgerStore>;
  mockUseLedgerStore.mockImplementation((selector?: (s: ReturnType<typeof useLedgerStore>) => unknown) => {
    if (typeof selector === 'function') return selector(fakeStore);
    return fakeStore;
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  mockCreateLedger.mockResolvedValue({ ledgerId: 'ldg_1', ledgerName: 'テスト帳簿' });
  setupStore();
});

describe('LedgerCreateModal', () => {
  it('モーダルが表示される', () => {
    render(<LedgerCreateModal onCreated={jest.fn()} />);
    expect(screen.getByRole('heading', { name: '帳簿を作成する' })).toBeInTheDocument();
  });

  it('帳簿名が空のままではバリデーションエラーになる', async () => {
    render(<LedgerCreateModal onCreated={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '帳簿を作成する' }));
    await waitFor(() => {
      expect(screen.getByText('帳簿名を入力してください')).toBeInTheDocument();
    });
    expect(mockCreateLedger).not.toHaveBeenCalled();
  });

  it('帳簿名を入力してフォーム送信すると createLedger が呼ばれる', async () => {
    const handleCreated = jest.fn();
    render(<LedgerCreateModal onCreated={handleCreated} />);
    await userEvent.type(screen.getByPlaceholderText('例: 家計簿'), 'マイ家計簿');
    await userEvent.click(screen.getByRole('button', { name: '帳簿を作成する' }));
    await waitFor(() => {
      expect(mockCreateLedger).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerName: 'マイ家計簿' })
      );
    });
    expect(handleCreated).toHaveBeenCalledTimes(1);
  });

  it('初期残高を入力して送信すると initialBalance が含まれる', async () => {
    render(<LedgerCreateModal onCreated={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('例: 家計簿'), 'テスト帳簿');
    await userEvent.type(screen.getByPlaceholderText('0'), '50000');
    await userEvent.click(screen.getByRole('button', { name: '帳簿を作成する' }));
    await waitFor(() => {
      expect(mockCreateLedger).toHaveBeenCalledWith(
        expect.objectContaining({ initialBalance: 50000 })
      );
    });
  });

  it('createLedger が ApiClientError をスローするとエラートーストが表示される', async () => {
    mockCreateLedger.mockRejectedValueOnce(
      new ApiClientError({ code: 'E400', message: '帳簿名が重複しています' })
    );
    render(<LedgerCreateModal onCreated={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('例: 家計簿'), '重複帳簿');
    await userEvent.click(screen.getByRole('button', { name: '帳簿を作成する' }));
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.type === 'error')).toBe(true);
    });
  });
});
