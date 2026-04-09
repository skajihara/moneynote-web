import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionEditForm from '../TransactionEditForm';
import * as ledgerApi from '@/lib/api/ledger';
import * as transactionApi from '@/lib/api/transaction';
import type { Transaction } from '@/types/transaction';

jest.mock('@/lib/api/ledger');
jest.mock('@/lib/api/transaction');

const mockGetCategories = jest.mocked(ledgerApi.getCategories);
const mockCreateTransaction = jest.mocked(transactionApi.createTransaction);
const mockUpdateTransaction = jest.mocked(transactionApi.updateTransaction);

const expenseCategories = {
  data: [
    { categoryId: 'cat_food', categoryName: '食費', categoryType: 'EXPENSE' as const, icon: null, displayOrder: 1, isActive: true, ledgerId: 'ldg_1', createdAt: '', updatedAt: '' },
    { categoryId: 'cat_comm', categoryName: '通信費', categoryType: 'EXPENSE' as const, icon: null, displayOrder: 2, isActive: true, ledgerId: 'ldg_1', createdAt: '', updatedAt: '' },
  ],
  error: null,
  timestamp: '',
};

const incomeCategories = {
  data: [
    { categoryId: 'cat_salary', categoryName: '給与', categoryType: 'INCOME' as const, icon: null, displayOrder: 1, isActive: true, ledgerId: 'ldg_1', createdAt: '', updatedAt: '' },
  ],
  error: null,
  timestamp: '',
};

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  transactionId: 'txn_1',
  transactionDate: '2026-04-10',
  transactionType: 'EXPENSE',
  amount: 3000,
  categoryId: 'cat_comm',
  categoryName: '通信費',
  categoryType: 'EXPENSE',
  categoryIcon: null,
  memo: 'テストメモ',
  isFixedOrigin: false,
  fixedTransactionId: null,
  ...overrides,
});

beforeEach(() => {
  mockGetCategories.mockReset();
  mockCreateTransaction.mockReset();
  mockUpdateTransaction.mockReset();
  mockGetCategories.mockImplementation((_, type) => {
    if (type === 'INCOME') return Promise.resolve(incomeCategories);
    return Promise.resolve(expenseCategories);
  });
  mockCreateTransaction.mockResolvedValue({ data: {} as Transaction, error: null, timestamp: '' });
  mockUpdateTransaction.mockResolvedValue({ data: {} as Transaction, error: null, timestamp: '' });
});

describe('TransactionEditForm 新規追加', () => {
  it('フォームが表示される', async () => {
    render(<TransactionEditForm ledgerId="ldg_1" onSuccess={jest.fn()} onCancel={jest.fn()} />);
    expect(await screen.findByText('明細を追加')).toBeInTheDocument();
  });

  it('カテゴリ一覧が表示される', async () => {
    render(<TransactionEditForm ledgerId="ldg_1" onSuccess={jest.fn()} onCancel={jest.fn()} />);
    expect(await screen.findByText('食費')).toBeInTheDocument();
  });

  it('新規作成時はカテゴリが「選択してください」のまま（空）になる', async () => {
    render(<TransactionEditForm ledgerId="ldg_1" onSuccess={jest.fn()} onCancel={jest.fn()} />);
    // カテゴリ一覧が描画されるまで待つ
    await screen.findByText('食費');
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  it('× ボタンクリックで onCancel が呼ばれる', async () => {
    const handleCancel = jest.fn();
    render(<TransactionEditForm ledgerId="ldg_1" onSuccess={jest.fn()} onCancel={handleCancel} />);
    await screen.findByText('明細を追加');
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});

describe('TransactionEditForm 編集', () => {
  it('編集フォームのタイトルが「明細を編集」になる', async () => {
    render(
      <TransactionEditForm
        ledgerId="ldg_1"
        transaction={makeTx()}
        onSuccess={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(await screen.findByText('明細を編集')).toBeInTheDocument();
  });

  it('編集時にカテゴリが正しく選択された状態で表示される', async () => {
    render(
      <TransactionEditForm
        ledgerId="ldg_1"
        transaction={makeTx({ categoryId: 'cat_comm', categoryName: '通信費' })}
        onSuccess={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    // カテゴリ一覧が読み込まれた後に select の value が cat_comm になっているか確認
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('cat_comm');
    });
  });

  it('削除ボタンが表示される', async () => {
    render(
      <TransactionEditForm
        ledgerId="ldg_1"
        transaction={makeTx()}
        onSuccess={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(await screen.findByRole('button', { name: '削除' })).toBeInTheDocument();
  });
});
