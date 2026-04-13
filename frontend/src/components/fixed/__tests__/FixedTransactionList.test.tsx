import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FixedTransactionList from '../FixedTransactionList';
import * as fixedApi from '@/lib/api/fixed';
import * as ledgerApi from '@/lib/api/ledger';
import type { FixedTransaction } from '@/types/fixed';

jest.mock('@/lib/api/fixed');
jest.mock('@/lib/api/ledger');

const mockGetFixed = jest.mocked(fixedApi.getFixedTransactions);
const mockDeleteFixed = jest.mocked(fixedApi.deleteFixedTransaction);
const mockGenerateFixed = jest.mocked(fixedApi.generateFixedTransactions);
const mockGetCategories = jest.mocked(ledgerApi.getCategories);

const makeFixed = (overrides: Partial<FixedTransaction> = {}): FixedTransaction => ({
  fixedTransactionId: 'fix_1',
  fixedName: '家賃',
  transactionType: 'EXPENSE',
  categoryId: 'cat_1',
  categoryName: '住居費',
  categoryIcon: null,
  amount: 80000,
  dayOfMonth: 25,
  startDate: '2026-01-01',
  endDate: null,
  isActive: true,
  isExpired: false,
  ...overrides,
});

const expCategories = {
  data: [
    {
      categoryId: 'cat_1',
      categoryName: '住居費',
      categoryType: 'EXPENSE' as const,
      icon: null,
      color: null,
      displayOrder: 1,
      isDefault: false,
      isActive: true,
      ledgerId: 'ldg_1',
    },
  ],
  error: null,
  timestamp: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetFixed.mockResolvedValue({ data: [], error: null, timestamp: '' });
  mockGetCategories.mockResolvedValue(expCategories);
  mockDeleteFixed.mockResolvedValue({ data: null, error: null, timestamp: '' });
  mockGenerateFixed.mockResolvedValue({
    data: { generatedCount: 3, skippedCount: 0 },
    error: null,
    timestamp: '',
  });
});

describe('FixedTransactionList', () => {
  it('空の場合にメッセージを表示する', async () => {
    render(<FixedTransactionList ledgerId="ldg_1" />);
    expect(
      await screen.findByText('固定費が登録されていません')
    ).toBeInTheDocument();
  });

  it('固定費一覧が表示される', async () => {
    mockGetFixed.mockResolvedValue({
      data: [makeFixed()],
      error: null,
      timestamp: '',
    });
    render(<FixedTransactionList ledgerId="ldg_1" />);
    expect(await screen.findByText('家賃')).toBeInTheDocument();
    expect(screen.getByText('毎月25日')).toBeInTheDocument();
  });

  it('期限切れバッジが表示される', async () => {
    mockGetFixed.mockResolvedValue({
      data: [makeFixed({ isExpired: true, endDate: '2025-12-31' })],
      error: null,
      timestamp: '',
    });
    render(<FixedTransactionList ledgerId="ldg_1" />);
    expect(await screen.findByText('期限切れ')).toBeInTheDocument();
  });

  it('追加ボタンでフォームが表示される', async () => {
    render(<FixedTransactionList ledgerId="ldg_1" />);
    await screen.findByText('固定費が登録されていません');
    await userEvent.click(screen.getByRole('button', { name: '+ 追加' }));
    expect(await screen.findByText('固定費を追加')).toBeInTheDocument();
  });

  it('行クリックで編集ダイアログが表示される', async () => {
    mockGetFixed.mockResolvedValue({
      data: [makeFixed()],
      error: null,
      timestamp: '',
    });
    render(<FixedTransactionList ledgerId="ldg_1" />);
    await screen.findByText('家賃');
    await userEvent.click(screen.getByRole('button', { name: /家賃/ }));
    expect(await screen.findByText('固定費を編集')).toBeInTheDocument();
  });
});
