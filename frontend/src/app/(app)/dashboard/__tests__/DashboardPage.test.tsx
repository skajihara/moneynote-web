import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../page';
import * as dashboardApi from '@/lib/api/dashboard';
import * as aiApi from '@/lib/api/ai';
import { useLedgerStore } from '@/stores/ledgerStore';
import type { DashboardResponse } from '@/types/dashboard';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/lib/api/dashboard');
jest.mock('@/lib/api/ai');

// Recharts ResizeObserver mock
jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

const mockGetDashboard = jest.mocked(dashboardApi.getDashboard);
const mockAnalyzeAi   = jest.mocked(aiApi.analyzeAi);
const mockGetAiScore  = jest.mocked(aiApi.getAiScore);

const emptyDashboard: { data: DashboardResponse; error: null; timestamp: string } = {
  data: {
    summary: { totalIncome: 0, totalExpense: 0, netBalance: 0, currentBalance: 0, carryOver: 0 },
    categoryBreakdown: [],
    categoryIncomeBreakdown: [],
    budgetStatus: [],
    recentTransactions: [],
  },
  error: null,
  timestamp: '',
};

const richDashboard: { data: DashboardResponse; error: null; timestamp: string } = {
  data: {
    summary: {
      totalIncome: 50000,
      totalExpense: 30000,
      netBalance: 20000,
      currentBalance: 120000,
      carryOver: 100000,
    },
    categoryBreakdown: [
      {
        categoryId: 'cat_1',
        categoryName: '食費',
        categoryType: 'EXPENSE',
        categoryIcon: null,
        color: '#FF6384',
        amount: 30000,
        percentage: 100.0,
      },
    ],
    categoryIncomeBreakdown: [
      {
        categoryId: 'cat_2',
        categoryName: '給与',
        categoryType: 'INCOME',
        categoryIcon: null,
        color: '#36A2EB',
        amount: 50000,
        percentage: 100.0,
      },
    ],
    budgetStatus: [
      {
        categoryId: 'cat_1',
        categoryName: '食費',
        categoryIcon: null,
        budgetAmount: 50000,
        actualAmount: 30000,
        percentage: 60.0,
        status: 'NORMAL',
      },
    ],
    recentTransactions: [
      {
        transactionId: 'txn_1',
        transactionDate: '2026-04-10',
        transactionType: 'EXPENSE',
        amount: 30000,
        categoryId: 'cat_1',
        categoryName: '食費',
        categoryType: 'EXPENSE',
        categoryIcon: null,
        memo: null,
        isFixedOrigin: false,
        fixedTransactionId: null,
      },
    ],
  },
  error: null,
  timestamp: '',
};

beforeEach(() => {
  mockGetDashboard.mockReset();
  mockGetDashboard.mockResolvedValue(emptyDashboard);
  mockAnalyzeAi.mockReset();
  mockAnalyzeAi.mockResolvedValue({
    data: {
      adviceType: 'INSIGHT',
      adviceText: '【モック】収支分析結果',
      generatedAt: '2026-04-14T10:00:00',
      fromCache: false,
    },
    error: null,
    timestamp: '',
  });
  mockGetAiScore.mockReset();
  mockGetAiScore.mockResolvedValue({
    data: {
      totalScore: 75,
      grade: 'GOOD',
      breakdown: { balanceScore: 25, budgetScore: 25, savingsScore: 25, stabilityScore: 0 },
      prevMonthScore: 70,
      scoreDiff: 5,
    },
    error: null,
    timestamp: '',
  });
  mockReplace.mockReset();
  mockSearchParams = new URLSearchParams();
  useLedgerStore.setState({ ledgers: [], selectedLedgerId: 'ldg_test01' });
});

describe('DashboardPage', () => {
  it('月セレクターが表示される', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '前月' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '翌月' })).toBeInTheDocument();
    });
  });

  it('読み込み完了後にサマリーカードが表示される', async () => {
    mockGetDashboard.mockResolvedValue(richDashboard);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('収入')).toBeInTheDocument();
      expect(screen.getByText('支出')).toBeInTheDocument();
      expect(screen.getByText('収支')).toBeInTheDocument();
      expect(screen.getByText('残高')).toBeInTheDocument();
    });
  });

  it('カテゴリ別支出セクションが表示される', async () => {
    mockGetDashboard.mockResolvedValue(richDashboard);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('カテゴリ別支出')).toBeInTheDocument();
    });
  });

  it('予算消化率セクションが表示される（NORMAL時）', async () => {
    mockGetDashboard.mockResolvedValue(richDashboard);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('予算消化率')).toBeInTheDocument();
      expect(screen.getByText(/正常/)).toBeInTheDocument();
    });
  });

  it('AIセクションの「今月を分析する」ボタンが表示される', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '今月を分析する' })).toBeInTheDocument();
    });
  });

  it('「今月を分析する」ボタンクリックで AI 結果が表示される', async () => {
    mockGetDashboard.mockResolvedValue(richDashboard);
    render(<DashboardPage />);
    const btn = await screen.findByRole('button', { name: '今月を分析する' });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/【モック】収支分析結果/)).toBeInTheDocument();
    });
  });

  it('スコアカードがコンパクト表示される', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('75点')).toBeInTheDocument();
      expect(screen.getByText(/良好/)).toBeInTheDocument();
    });
  });

  it('最近の明細が表示される', async () => {
    mockGetDashboard.mockResolvedValue(richDashboard);
    render(<DashboardPage />);
    await waitFor(() => {
      // 食費は BudgetProgressList と TransactionList に複数表示される
      expect(screen.getAllByText('食費').length).toBeGreaterThan(0);
    });
  });

  it('前月ボタンクリックで API が再取得される', async () => {
    render(<DashboardPage />);
    const prevBtn = await screen.findByRole('button', { name: '前月' });
    await userEvent.click(prevBtn);
    await waitFor(() => {
      expect(mockGetDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it('前月ボタンクリックで URL クエリパラメータが更新される', async () => {
    render(<DashboardPage />);
    const prevBtn = await screen.findByRole('button', { name: '前月' });
    await userEvent.click(prevBtn);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringMatching(/\?year=\d+&month=\d+/));
    });
  });

  it('URL クエリパラメータ year=2025&month=3 で初期月が復元される', async () => {
    mockSearchParams = new URLSearchParams('year=2025&month=3');
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('2025年3月')).toBeInTheDocument();
    });
  });

  it('表示件数セレクターが表示される', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '表示件数' })).toBeInTheDocument();
    });
  });

  it('表示件数を変更すると API が再取得される', async () => {
    render(<DashboardPage />);
    const select = await screen.findByRole('combobox', { name: '表示件数' });
    await userEvent.selectOptions(select, '20');
    await waitFor(() => {
      expect(mockGetDashboard).toHaveBeenCalledWith('ldg_test01', expect.any(Number), expect.any(Number), 20);
    });
  });
});
