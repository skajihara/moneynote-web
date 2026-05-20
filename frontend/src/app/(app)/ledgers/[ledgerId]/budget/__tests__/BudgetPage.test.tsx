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
