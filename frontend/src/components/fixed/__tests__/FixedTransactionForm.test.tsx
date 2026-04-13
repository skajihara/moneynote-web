import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FixedTransactionForm from '../FixedTransactionForm';
import * as fixedApi from '@/lib/api/fixed';
import * as ledgerApi from '@/lib/api/ledger';
import type { FixedTransaction } from '@/types/fixed';

jest.mock('@/lib/api/fixed');
jest.mock('@/lib/api/ledger');

const mockCreateFixed = jest.mocked(fixedApi.createFixedTransaction);
const mockUpdateFixed = jest.mocked(fixedApi.updateFixedTransaction);
const mockGetCategories = jest.mocked(ledgerApi.getCategories);

const expCategories = {
  data: [
    {
      categoryId: 'cat_food',
      categoryName: '食費',
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

const makeFixed = (overrides: Partial<FixedTransaction> = {}): FixedTransaction => ({
  fixedTransactionId: 'fix_1',
  fixedName: '電気代',
  transactionType: 'EXPENSE',
  categoryId: 'cat_food',
  categoryName: '食費',
  categoryIcon: null,
  amount: 5000,
  dayOfMonth: 10,
  startDate: '2026-01-01',
  endDate: null,
  isActive: true,
  isExpired: false,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCategories.mockResolvedValue(expCategories);
  mockCreateFixed.mockResolvedValue({
    data: makeFixed(),
    error: null,
    timestamp: '',
  });
  mockUpdateFixed.mockResolvedValue({
    data: makeFixed(),
    error: null,
    timestamp: '',
  });
});

describe('FixedTransactionForm', () => {
  it('新規作成フォームが表示される', async () => {
    render(
      <FixedTransactionForm
        ledgerId="ldg_1"
        onSaved={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(await screen.findByText('食費')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('家賃、電気代...')).toBeInTheDocument();
  });

  it('キャンセルボタンで onCancel が呼ばれる', async () => {
    const handleCancel = jest.fn();
    render(
      <FixedTransactionForm
        ledgerId="ldg_1"
        onSaved={jest.fn()}
        onCancel={handleCancel}
      />
    );
    await screen.findByText('食費');
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('編集時に既存の値が表示される', async () => {
    render(
      <FixedTransactionForm
        ledgerId="ldg_1"
        editing={makeFixed()}
        onSaved={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    await screen.findByText('食費');
    const nameInput = screen.getByPlaceholderText('家賃、電気代...') as HTMLInputElement;
    expect(nameInput.value).toBe('電気代');
  });

  it('名称未入力でバリデーションエラーが出る', async () => {
    render(
      <FixedTransactionForm
        ledgerId="ldg_1"
        onSaved={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    await screen.findByText('食費');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByText('名称を入力してください')).toBeInTheDocument()
    );
  });
});
