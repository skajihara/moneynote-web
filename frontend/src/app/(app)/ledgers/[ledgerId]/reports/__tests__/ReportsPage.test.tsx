import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from '../page';
import * as reportApi from '@/lib/api/report';
import { useSubPanelStore } from '@/stores/subPanelStore';
import type { MonthlyReport, AnnualReport, CategorySummary } from '@/types/report';

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useParams: () => ({ ledgerId: 'ldg_test01' }),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/ledgers/ldg_test01/reports',
  useSearchParams: () => mockSearchParams,
}));

jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

jest.mock('@/lib/api/report');
const mockGetMonthlyReport = jest.mocked(reportApi.getMonthlyReport);
const mockGetAnnualReport = jest.mocked(reportApi.getAnnualReport);
const mockGetCategorySummary = jest.mocked(reportApi.getCategorySummary);
const mockGetAnnualCategorySummary = jest.mocked(reportApi.getAnnualCategorySummary);

const emptyCategoryResponse: { data: CategorySummary[]; error: null; timestamp: string } = {
  data: [],
  error: null,
  timestamp: '',
};

const categorySummaryResponse: { data: CategorySummary[]; error: null; timestamp: string } = {
  data: [
    {
      categoryId: 'cat_1',
      categoryName: '食費',
      categoryType: 'EXPENSE',
      categoryIcon: null,
      color: '#FF6384',
      amount: 30000,
      percentage: 75.0,
    },
  ],
  error: null,
  timestamp: '',
};

const monthlyResponse: { data: MonthlyReport; error: null; timestamp: string } = {
  data: {
    year: 2026,
    month: 4,
    totalIncome: 200000,
    totalExpense: 80000,
    netBalance: 120000,
    carryOver: 500000,
    currentBalance: 620000,
    prevMonthComparison: {
      incomeChange: 10000,
      expenseChange: -5000,
      incomeChangeRate: 5.0,
      expenseChangeRate: -5.9,
    },
    prevYearComparison: {
      incomeChange: 20000,
      expenseChange: 3000,
      incomeChangeRate: 11.1,
      expenseChangeRate: 3.9,
    },
  },
  error: null,
  timestamp: '',
};

const annualResponse: { data: AnnualReport; error: null; timestamp: string } = {
  data: {
    year: 2026,
    months: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalIncome: 200000,
      totalExpense: 80000,
      netBalance: 120000,
      balance: 500000 + (i + 1) * 120000,
    })),
    annualSummary: {
      totalIncome: 2400000,
      totalExpense: 960000,
      netBalance: 1440000,
    },
    balanceHistory: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      balance: 500000 + (i + 1) * 120000,
    })),
  },
  error: null,
  timestamp: '',
};

beforeEach(() => {
  mockGetMonthlyReport.mockReset();
  mockGetAnnualReport.mockReset();
  mockGetCategorySummary.mockReset();
  mockGetAnnualCategorySummary.mockReset();
  mockGetMonthlyReport.mockResolvedValue(monthlyResponse);
  mockGetAnnualReport.mockResolvedValue(annualResponse);
  mockGetCategorySummary.mockResolvedValue(emptyCategoryResponse);
  mockGetAnnualCategorySummary.mockResolvedValue(emptyCategoryResponse);
  mockReplace.mockReset();
  mockSearchParams = new URLSearchParams();
  useSubPanelStore.setState({ isOpen: false, content: null, contentKey: 0 });
});

describe('ReportsPage', () => {
  it('月別・年別タブが表示される', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '月別' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '年別' })).toBeInTheDocument();
    });
  });

  it('月別タブ: サマリーカードが表示される', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('収入').length).toBeGreaterThan(0);
      expect(screen.getAllByText('支出').length).toBeGreaterThan(0);
      expect(screen.getByText('収支')).toBeInTheDocument();
      expect(screen.getByText('残高')).toBeInTheDocument();
    });
  });

  it('月別タブ: 繰り越しカードが表示される', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('繰り越し')).toBeInTheDocument();
    });
  });

  it('月別タブ: 前月比・前年同月比が表示される', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('前月比')).toBeInTheDocument();
      expect(screen.getByText('前年同月比')).toBeInTheDocument();
    });
  });

  it('月別タブ: カテゴリ別集計セクションが表示される', async () => {
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('カテゴリ別集計')).toBeInTheDocument();
    });
  });

  it('月別タブ: カテゴリデータがある場合リストが表示される', async () => {
    mockGetCategorySummary.mockResolvedValue(categorySummaryResponse);
    render(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('食費')).toBeInTheDocument();
    });
  });

  it('月別タブ: 月セレクターで前月に移動すると再フェッチされる', async () => {
    render(<ReportsPage />);
    const prevBtn = await screen.findByRole('button', { name: '前月' });
    await userEvent.click(prevBtn);
    await waitFor(() => {
      expect(mockGetMonthlyReport).toHaveBeenCalledTimes(2);
      expect(mockGetCategorySummary).toHaveBeenCalledTimes(2);
    });
  });

  it('年別タブに切り替えると年間サマリーとグラフが表示される', async () => {
    render(<ReportsPage />);
    const annualTab = await screen.findByRole('button', { name: '年別' });
    await userEvent.click(annualTab);
    await waitFor(() => {
      expect(mockGetAnnualReport).toHaveBeenCalled();
      expect(mockGetAnnualCategorySummary).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('月別収支')).toBeInTheDocument();
      expect(screen.getByText('残高推移')).toBeInTheDocument();
      expect(screen.getByText('年間カテゴリ別集計')).toBeInTheDocument();
    });
  });

  it('年別タブ: カテゴリ行クリックでサブパネルが開く', async () => {
    mockGetAnnualCategorySummary.mockResolvedValue(categorySummaryResponse);
    render(<ReportsPage />);
    const annualTab = await screen.findByRole('button', { name: '年別' });
    await userEvent.click(annualTab);
    await waitFor(() => screen.getByText('食費'));
    await userEvent.click(screen.getByText('食費'));
    expect(useSubPanelStore.getState().isOpen).toBe(true);
  });

  it('URLクエリパラメータ tab=annual で年別タブが初期選択される', async () => {
    mockSearchParams = new URLSearchParams('tab=annual&year=2025');
    render(<ReportsPage />);
    await waitFor(() => {
      expect(mockGetAnnualReport).toHaveBeenCalledWith('ldg_test01', 2025);
    });
  });
});
