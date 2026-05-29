import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionEditForm from '../TransactionEditForm';
import * as ledgerApi from '@/lib/api/ledger';
import * as transactionApi from '@/lib/api/transaction';
import type { Transaction } from '@/types/transaction';

jest.mock('@/lib/api/ledger');
jest.mock('@/lib/api/transaction');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

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

describe('TransactionEditForm フォーム送信', () => {
  it('新規作成フォームを送信すると createTransaction が呼ばれる', async () => {
    const handleSuccess = jest.fn();
    render(<TransactionEditForm ledgerId="ldg_1" onSuccess={handleSuccess} onCancel={jest.fn()} />);
    await screen.findByText('食費');

    await userEvent.selectOptions(screen.getByRole('combobox'), 'cat_food');
    await userEvent.clear(screen.getByPlaceholderText('0'));
    await userEvent.type(screen.getByPlaceholderText('0'), '1500');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalledTimes(1));
    expect(handleSuccess).toHaveBeenCalledTimes(1);
  });

  it('編集フォームを送信すると updateTransaction が呼ばれる', async () => {
    const handleSuccess = jest.fn();
    render(
      <TransactionEditForm
        ledgerId="ldg_1"
        transaction={makeTx({ categoryId: 'cat_comm', categoryName: '通信費', isFixedOrigin: false })}
        onSuccess={handleSuccess}
        onCancel={jest.fn()}
      />
    );
    await screen.findByText('明細を編集');

    await userEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(mockUpdateTransaction).toHaveBeenCalledTimes(1));
    expect(handleSuccess).toHaveBeenCalledTimes(1);
  });

  it('収入ボタンクリックでカテゴリ一覧が収入カテゴリに切り替わる', async () => {
    render(<TransactionEditForm ledgerId="ldg_1" onSuccess={jest.fn()} onCancel={jest.fn()} />);
    await screen.findByText('食費');
    await userEvent.click(screen.getByRole('button', { name: '収入' }));
    expect(await screen.findByText('給与')).toBeInTheDocument();
  });

  it('固定費由来でない通常明細の削除で deleteTransaction が呼ばれる', async () => {
    const mockDeleteTransaction = jest.mocked(
      (await import('@/lib/api/transaction')).deleteTransaction
    );
    mockDeleteTransaction.mockResolvedValue({ data: null, error: null, timestamp: '' });

    const handleSuccess = jest.fn();
    render(
      <TransactionEditForm
        ledgerId="ldg_1"
        transaction={makeTx({ isFixedOrigin: false })}
        onSuccess={handleSuccess}
        onCancel={jest.fn()}
      />
    );
    await screen.findByRole('button', { name: '削除' });
    await userEvent.click(screen.getByRole('button', { name: '削除' }));

    await waitFor(() => expect(mockDeleteTransaction).toHaveBeenCalledTimes(1));
  });

  it('固定費由来の明細を編集するとスコープダイアログが開く', async () => {
    render(
      <TransactionEditForm
        ledgerId="ldg_1"
        transaction={makeTx({ isFixedOrigin: true, fixedTransactionId: 'fix_1' })}
        onSuccess={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    await screen.findByText('明細を編集');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText(/固定費から自動生成/)).toBeInTheDocument();
  });

  it('金額が999,999,999を超えるとバリデーションエラーが出る', async () => {
    render(<TransactionEditForm ledgerId="ldg_1" onSuccess={jest.fn()} onCancel={jest.fn()} />);
    await screen.findByText('食費');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'cat_food');
    await userEvent.clear(screen.getByPlaceholderText('0'));
    await userEvent.type(screen.getByPlaceholderText('0'), '1000000000');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByText('金額は999,999,999円以下で入力してください')).toBeInTheDocument()
    );
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it('固定費由来の明細を削除するとスコープダイアログが開く', async () => {
    render(
      <TransactionEditForm
        ledgerId="ldg_1"
        transaction={makeTx({ isFixedOrigin: true, fixedTransactionId: 'fix_1' })}
        onSuccess={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    await screen.findByRole('button', { name: '削除' });
    await userEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(await screen.findByText(/固定費から自動生成/)).toBeInTheDocument();
  });
});
