import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiPage from '../page';
import * as aiApi from '@/lib/api/ai';
import type { AiSummary, AiScore } from '@/types/ai';

jest.mock('next/navigation', () => ({
  useParams: () => ({ ledgerId: 'ldg_test01' }),
}));

jest.mock('@/lib/api/ai');

jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const mockGetAiSummary = jest.mocked(aiApi.getAiSummary);
const mockAnalyzeAi   = jest.mocked(aiApi.analyzeAi);
const mockGetAiScore  = jest.mocked(aiApi.getAiScore);

const baseSummary: AiSummary = {
  period: 'ONE_MONTH',
  periodSummary: {
    totalIncome: 200000,
    totalExpense: 80000,
    netBalance: 120000,
    avgMonthlyIncome: 200000,
    avgMonthlyExpense: 80000,
  },
  monthlyTrend: [
    { yearMonth: '2026-04', totalIncome: 200000, totalExpense: 80000, netBalance: 120000 },
  ],
  categoryBreakdown: [
    { categoryName: '食費', totalAmount: 50000, percentage: 62.5 },
    { categoryName: '交通費', totalAmount: 30000, percentage: 37.5 },
  ],
  prevCategoryBreakdown: [
    { categoryName: '食費', totalAmount: 45000, percentage: 60.0 },
  ],
  budgetComparison: [],
  prevPeriodComparison: {
    incomeChange: 10000,
    expenseChange: -5000,
    incomeChangeRate: 5.3,
    expenseChangeRate: -5.9,
  },
};

const baseScore: AiScore = {
  totalScore: 75,
  grade: 'GOOD',
  breakdown: {
    balanceScore: 25,
    budgetScore: 25,
    savingsScore: 25,
    stabilityScore: 0,
  },
  prevMonthScore: 70,
  scoreDiff: 5,
};

const summaryResponse = {
  data: baseSummary,
  error: null,
  timestamp: '',
};

const scoreResponse = {
  data: baseScore,
  error: null,
  timestamp: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAiSummary.mockResolvedValue(summaryResponse);
  mockGetAiScore.mockResolvedValue(scoreResponse);
  mockAnalyzeAi.mockResolvedValue({
    data: {
      adviceType: 'INSIGHT',
      adviceText: '【モック】直近の収支を分析しました。支出が増加傾向にあります。',
      generatedAt: '2026-04-14T10:00:00',
      fromCache: false,
    },
    error: null,
    timestamp: '',
  });
});

describe('AiPage', () => {
  it('期間セレクターが表示される', async () => {
    render(<AiPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '1ヶ月' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3ヶ月' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '12ヶ月' })).toBeInTheDocument();
    });
  });

  it('スコアカードが表示される', async () => {
    render(<AiPage />);
    await waitFor(() => {
      expect(screen.getByText('家計健全度スコア')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('良好', { exact: false })).toBeInTheDocument();
    });
  });

  it('先月比スコア差分が表示される', async () => {
    render(<AiPage />);
    await waitFor(() => {
      expect(screen.getByText(/先月比.*\+5点/)).toBeInTheDocument();
    });
  });

  it('トレンド分析セクションが表示される', async () => {
    render(<AiPage />);
    await waitFor(() => {
      expect(screen.getByText('トレンド分析')).toBeInTheDocument();
    });
  });

  it('カテゴリ別増減バッジが表示される', async () => {
    render(<AiPage />);
    await waitFor(() => {
      // 食費: prev=45000 cur=50000 → +11% up
      expect(screen.getByText(/食費/)).toBeInTheDocument();
    });
  });

  it('AI アドバイスボタンが3つ表示される', async () => {
    render(<AiPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '🔍 家計を診断する' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '💡 節約アドバイスを見る' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '📈 来月を予測する' })).toBeInTheDocument();
    });
  });

  it('「家計を診断する」ボタンでモックテキストが表示される', async () => {
    render(<AiPage />);
    const btn = await screen.findByRole('button', { name: '🔍 家計を診断する' });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(mockAnalyzeAi).toHaveBeenCalledWith('ldg_test01', 'ONE_MONTH', 'INSIGHT');
      expect(screen.getByText(/【モック】直近の収支を分析しました/)).toBeInTheDocument();
    });
  });

  it('「節約アドバイスを見る」ボタンでモックテキストが表示される', async () => {
    mockAnalyzeAi.mockResolvedValue({
      data: {
        adviceType: 'ADVICE',
        adviceText: '【モック】食費の見直しをお勧めします。',
        generatedAt: '2026-04-14T10:00:00',
        fromCache: false,
      },
      error: null,
      timestamp: '',
    });
    render(<AiPage />);
    const btn = await screen.findByRole('button', { name: '💡 節約アドバイスを見る' });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(mockAnalyzeAi).toHaveBeenCalledWith('ldg_test01', 'ONE_MONTH', 'ADVICE');
      expect(screen.getByText(/【モック】食費の見直しをお勧めします/)).toBeInTheDocument();
    });
  });

  it('「来月を予測する」ボタンでモックテキストが表示される', async () => {
    mockAnalyzeAi.mockResolvedValue({
      data: {
        adviceType: 'FORECAST',
        adviceText: '【モック】来月の支出は今月より約5%増加する見込みです。',
        generatedAt: '2026-04-14T10:00:00',
        fromCache: false,
      },
      error: null,
      timestamp: '',
    });
    render(<AiPage />);
    const btn = await screen.findByRole('button', { name: '📈 来月を予測する' });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(mockAnalyzeAi).toHaveBeenCalledWith('ldg_test01', 'ONE_MONTH', 'FORECAST');
      expect(screen.getByText(/【モック】来月の支出は今月より/)).toBeInTheDocument();
    });
  });

  it('2回目のボタン押下で fromCache=true のメッセージが表示される', async () => {
    render(<AiPage />);
    const btn = await screen.findByRole('button', { name: '🔍 家計を診断する' });

    await userEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/【モック】直近の収支を分析しました/)).toBeInTheDocument();
    });

    mockAnalyzeAi.mockResolvedValue({
      data: {
        adviceType: 'INSIGHT',
        adviceText: '【モック】直近の収支を分析しました。支出が増加傾向にあります。',
        generatedAt: '2026-04-14T10:00:00',
        fromCache: true,
      },
      error: null,
      timestamp: '',
    });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText('キャッシュから取得')).toBeInTheDocument();
    });
  });

  it('期間セレクターで切り替えると getAiSummary が再呼び出しされる', async () => {
    render(<AiPage />);
    await screen.findByText('トレンド分析');
    expect(mockGetAiSummary).toHaveBeenCalledWith('ldg_test01', 'ONE_MONTH');

    await userEvent.click(screen.getByRole('button', { name: '3ヶ月' }));
    await waitFor(() => {
      expect(mockGetAiSummary).toHaveBeenCalledWith('ldg_test01', 'THREE_MONTHS');
    });
  });
});
