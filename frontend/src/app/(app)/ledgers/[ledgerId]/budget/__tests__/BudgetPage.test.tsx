import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetPanel from '@/components/budget/BudgetPanel';
import BudgetPage from '../page';
import * as budgetApi from '@/lib/api/budget';
import * as ledgerApi from '@/lib/api/ledger';
import { useAuthStore } from '@/stores/authStore';
import type { Budget } from '@/types/budget';
import type { BudgetHeatmapMonth } from '@/types/budget';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useParams: () => ({ ledgerId: 'ldg_test01' }),
}));

jest.mock('@/lib/api/budget');
jest.mock('@/lib/api/ledger');

jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const mockGetBudgets = jest.mocked(budgetApi.getBudgets);
const mockGetBudgetHeatmap = jest.mocked(budgetApi.getBudgetHeatmap);
const mockUpsertBudget = jest.mocked(budgetApi.upsertBudget);
const mockDeleteBudget = jest.mocked(budgetApi.deleteBudget);
const mockGetCategories = jest.mocked(ledgerApi.getCategories);

const emptyHeatmapResponse: { data: BudgetHeatmapMonth[]; error: null; timestamp: string } = {
  data: [],
  error: null,
  timestamp: '',
};

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

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
  budgetId: 'bgt_1',
  categoryId: 'cat_food',
  categoryName: '食費',
  categoryIcon: null,
  categoryDeleted: false,
  budgetAmount: 30000,
  actualAmount: 20000,
  percentage: 66.7,
  status: 'NORMAL',
  remainingAmount: 10000,
  ...overrides,
});

const emptyResponse = { data: [], error: null, timestamp: '' };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBudgets.mockResolvedValue(emptyResponse);
  mockGetBudgetHeatmap.mockResolvedValue(emptyHeatmapResponse);
  mockGetCategories.mockResolvedValue(expCategories);
  mockUpsertBudget.mockResolvedValue({
    data: makeBudget(),
    error: null,
    timestamp: '',
  });
  mockDeleteBudget.mockResolvedValue({ data: null, error: null, timestamp: '' });
});

describe('BudgetPanel', () => {
  it('空の場合にメッセージを表示する', async () => {
    render(<BudgetPanel ledgerId="ldg_1" />);
    expect(
      await screen.findByText('この月の予算がまだ設定されていません')
    ).toBeInTheDocument();
  });

  it('予算一覧が表示される', async () => {
    mockGetBudgets.mockResolvedValue({
      data: [makeBudget()],
      error: null,
      timestamp: '',
    });
    render(<BudgetPanel ledgerId="ldg_1" />);
    // 食費はBudgetRowとヒートマップの両方に表示される可能性があるため getAllByText を使用
    await waitFor(() => {
      expect(screen.getAllByText('食費').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('WARNING ステータスが表示される', async () => {
    mockGetBudgets.mockResolvedValue({
      data: [makeBudget({ status: 'WARNING', percentage: 90 })],
      error: null,
      timestamp: '',
    });
    render(<BudgetPanel ledgerId="ldg_1" />);
    expect(await screen.findByText('注意')).toBeInTheDocument();
  });

  it('OVER ステータスが表示される', async () => {
    mockGetBudgets.mockResolvedValue({
      data: [makeBudget({ status: 'OVER', percentage: 120, remainingAmount: -5000 })],
      error: null,
      timestamp: '',
    });
    render(<BudgetPanel ledgerId="ldg_1" />);
    expect(await screen.findByText('超過')).toBeInTheDocument();
  });

  it('予算追加ボタンでモーダルが開く', async () => {
    render(<BudgetPanel ledgerId="ldg_1" />);
    await screen.findByText('この月の予算がまだ設定されていません');
    await userEvent.click(screen.getByRole('button', { name: '+ 予算を追加' }));
    expect(screen.getByText('予算を追加')).toBeInTheDocument();
  });

  it('モーダルのキャンセルで閉じる', async () => {
    render(<BudgetPanel ledgerId="ldg_1" />);
    await screen.findByText('この月の予算がまだ設定されていません');
    await userEvent.click(screen.getByRole('button', { name: '+ 予算を追加' }));
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    await waitFor(() =>
      expect(screen.queryByText('予算を追加')).not.toBeInTheDocument()
    );
  });

  it('前月ボタンで月が戻る', async () => {
    render(<BudgetPanel ledgerId="ldg_1" />);
    await screen.findByText('この月の予算がまだ設定されていません');
    const today = new Date();
    const expectedYear =
      today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const expectedMonth =
      today.getMonth() === 0 ? 12 : today.getMonth();
    await userEvent.click(screen.getByRole('button', { name: '前月' }));
    expect(
      await screen.findByText(`${expectedYear}年${expectedMonth}月`)
    ).toBeInTheDocument();
  });

  it('ヒートマップセクションが表示される', async () => {
    render(<BudgetPanel ledgerId="ldg_1" />);
    await waitFor(() => {
      expect(screen.getByText('予算達成率ヒートマップ（過去12ヶ月）')).toBeInTheDocument();
    });
  });

  it('余剰・超過グラフセクションが表示される', async () => {
    render(<BudgetPanel ledgerId="ldg_1" />);
    await waitFor(() => {
      expect(screen.getByText('予算余剰・超過（直近6ヶ月）')).toBeInTheDocument();
    });
  });

  it('翌月ボタンで月が進む', async () => {
    render(<BudgetPanel ledgerId="ldg_1" />);
    await screen.findByText('この月の予算がまだ設定されていません');
    const today = new Date();
    const expectedYear =
      today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    const expectedMonth =
      today.getMonth() === 11 ? 1 : today.getMonth() + 2;
    await userEvent.click(screen.getByRole('button', { name: '翌月' }));
    expect(
      await screen.findByText(`${expectedYear}年${expectedMonth}月`)
    ).toBeInTheDocument();
  });

  it('予算追加モーダルでフォーム送信すると upsertBudget が呼ばれる', async () => {
    render(<BudgetPanel ledgerId="ldg_1" />);
    await screen.findByText('この月の予算がまだ設定されていません');
    await userEvent.click(screen.getByRole('button', { name: '+ 予算を追加' }));
    await screen.findByText('予算を追加');
    await userEvent.selectOptions(
      screen.getByRole('combobox'),
      'cat_food'
    );
    await userEvent.type(screen.getByPlaceholderText('0'), '10000');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(mockUpsertBudget).toHaveBeenCalledTimes(1));
  });

  it('予算行クリックで編集ダイアログが開く', async () => {
    mockGetBudgets.mockResolvedValue({ data: [makeBudget()], error: null, timestamp: '' });
    render(<BudgetPanel ledgerId="ldg_1" />);
    await waitFor(() => {
      expect(screen.getAllByText('食費').length).toBeGreaterThan(0);
    });
    const budgetButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('食費')
    );
    await userEvent.click(budgetButtons[0]);
    expect(screen.getByText('予算を編集')).toBeInTheDocument();
  });

  it('編集ダイアログで更新ボタン押下すると upsertBudget が呼ばれる', async () => {
    mockGetBudgets.mockResolvedValue({ data: [makeBudget()], error: null, timestamp: '' });
    render(<BudgetPanel ledgerId="ldg_1" />);
    await waitFor(() => {
      expect(screen.getAllByText('食費').length).toBeGreaterThan(0);
    });
    const budgetButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('食費')
    );
    await userEvent.click(budgetButtons[0]);
    await screen.findByText('予算を編集');
    await userEvent.click(screen.getByRole('button', { name: '更新' }));
    await waitFor(() => expect(mockUpsertBudget).toHaveBeenCalledTimes(1));
  });

  it('編集ダイアログで削除ボタン押下すると deleteBudget が呼ばれる', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockGetBudgets.mockResolvedValue({ data: [makeBudget()], error: null, timestamp: '' });
    render(<BudgetPanel ledgerId="ldg_1" />);
    await waitFor(() => {
      expect(screen.getAllByText('食費').length).toBeGreaterThan(0);
    });
    const budgetButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('食費')
    );
    await userEvent.click(budgetButtons[0]);
    await screen.findByText('予算を編集');
    await userEvent.click(screen.getByRole('button', { name: 'この予算を削除' }));
    await waitFor(() => expect(mockDeleteBudget).toHaveBeenCalledTimes(1));
  });

  it('12月から翌月で1月に変わる', async () => {
    render(<BudgetPanel ledgerId="ldg_1" />);
    await screen.findByText('この月の予算がまだ設定されていません');
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const diff = 12 - currentMonth;
    for (let i = 0; i < diff; i++) {
      await userEvent.click(screen.getByRole('button', { name: '翌月' }));
    }
    if (diff >= 0) {
      await screen.findByText(`${today.getFullYear()}年12月`);
      await userEvent.click(screen.getByRole('button', { name: '翌月' }));
      expect(await screen.findByText(`${today.getFullYear() + 1}年1月`)).toBeInTheDocument();
    }
  });

  it('ヒートマップにデータがある場合にカテゴリ名が表示される', async () => {
    mockGetBudgetHeatmap.mockResolvedValue({
      data: [{
        yearMonth: '2026-05',
        budgets: [{ categoryName: '食費', percentage: 80 }],
      }],
      error: null,
      timestamp: '',
    });
    render(<BudgetPanel ledgerId="ldg_1" />);
    await waitFor(() => {
      expect(screen.getAllByText('食費').length).toBeGreaterThan(0);
    });
  });

  it('categoryDeleted が true の予算行に「削除済み」バッジが表示される', async () => {
    mockGetBudgets.mockResolvedValue({
      data: [makeBudget({ categoryDeleted: true })],
      error: null,
      timestamp: '',
    });
    render(<BudgetPanel ledgerId="ldg_1" />);
    expect(await screen.findByText('カテゴリが削除されました')).toBeInTheDocument();
  });

  it('categoryDeleted が false の予算行に「削除済み」バッジが表示されない', async () => {
    mockGetBudgets.mockResolvedValue({
      data: [makeBudget({ categoryDeleted: false })],
      error: null,
      timestamp: '',
    });
    render(<BudgetPanel ledgerId="ldg_1" />);
    await waitFor(() => {
      expect(screen.getAllByText('食費').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('カテゴリが削除されました')).not.toBeInTheDocument();
  });
});

describe('BudgetPage', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    useAuthStore.setState({ role: 'USER' });
  });

  it('SYSTEM_ADMIN は /admin にリダイレクトされる', async () => {
    useAuthStore.setState({ role: 'SYSTEM_ADMIN' });
    render(<BudgetPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin');
    });
  });
});
