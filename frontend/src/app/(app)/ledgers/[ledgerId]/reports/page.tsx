'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSubPanelStore } from '@/stores/subPanelStore';
import {
  getMonthlyReport,
  getAnnualReport,
  getCategorySummary,
  getAnnualCategorySummary,
  getCategoryTransactions,
} from '@/lib/api/report';
import type { MonthlyReport, AnnualReport, CategorySummary, CategoryTransactions } from '@/types/report';
import type { Transaction } from '@/types/transaction';
import SummaryCards from '@/components/ui/SummaryCards';
import MonthlyBarChart from '@/components/charts/MonthlyBarChart';
import BalanceLineChart from '@/components/charts/BalanceLineChart';
import CategoryPieChart from '@/components/charts/CategoryPieChart';
import TransactionList from '@/components/transaction/TransactionList';
import TransactionEditForm from '@/components/transaction/TransactionEditForm';
import type { BarItem } from '@/components/charts/MonthlyBarChart';
import type { LineItem } from '@/components/charts/BalanceLineChart';
import type { CategoryBreakdown } from '@/types/dashboard';

type Tab = 'monthly' | 'annual';
type CategoryTab = 'EXPENSE' | 'INCOME';

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const fmtRate = (rate: number) => `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`;
const fmtDiff = (n: number) => `${n >= 0 ? '+' : ''}${fmt(n)}`;

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

const DEFAULT_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#C9CBCF', '#7BC8A4',
];

// =========================================================================
// 前月比・前年比の行
// =========================================================================
type ComparisonRowProps = {
  label: string;
  change: number;
  rate: number;
  isIncome: boolean; // 収入行かどうかでカラーを反転
};

const ComparisonRow = ({ label, change, rate, isIncome }: ComparisonRowProps) => {
  // 収入: 増加→緑、減少→赤
  // 支出: 増加→赤、減少→緑
  let color = 'text-gray-600';
  if (change !== 0) {
    const positive = isIncome ? change > 0 : change < 0;
    color = positive ? 'text-green-600' : 'text-red-500';
  }
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-medium ${color}`}>
        {fmtDiff(change)} ({fmtRate(rate)})
      </span>
    </div>
  );
};

// =========================================================================
// カテゴリ詳細サブパネル
// =========================================================================
type CategoryDetailProps = {
  ledgerId: string;
  categoryId: string;
  categoryName: string;
  year: number;
  month?: number;
};

const CategoryDetailPanel = ({
  ledgerId, categoryId, categoryName, year, month,
}: CategoryDetailProps) => {
  const { open: openPanel, close: closePanel } = useSubPanelStore();
  const [detail, setDetail] = useState<CategoryTransactions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(() => {
    setLoading(true);
    getCategoryTransactions(ledgerId, categoryId, year, month)
      .then((res) => setDetail(res.data))
      .finally(() => setLoading(false));
  }, [ledgerId, categoryId, year, month]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const openEdit = (tx: Transaction) => {
    openPanel(
      <TransactionEditForm
        ledgerId={ledgerId}
        transaction={tx}
        onSuccess={() => { closePanel(); fetchDetail(); }}
        onCancel={closePanel}
      />
    );
  };

  if (loading || !detail) {
    return <div className="text-center text-gray-400 py-8">読み込み中...</div>;
  }

  const barData: BarItem[] = detail.monthlyTrend.map((t) => ({
    label: t.month.slice(5),
    income: detail.category.categoryType === 'INCOME' ? t.amount : 0,
    expense: detail.category.categoryType === 'EXPENSE' ? t.amount : 0,
  }));

  const txLabel = month != null ? `${year}年${month}月の明細` : `${year}年の明細`;
  const trendLabel = month != null ? '月別推移（過去12ヶ月）' : '月別推移（年間）';

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-800">{categoryName}</h2>
      <div>
        <p className="text-xs text-gray-500 mb-2">{trendLabel}</p>
        <MonthlyBarChart data={barData} height={200} />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-2">{txLabel}</p>
        <TransactionList transactions={detail.transactions} onEdit={openEdit} />
      </div>
    </div>
  );
};

// =========================================================================
// カテゴリ行
// =========================================================================
type CategoryRowProps = {
  item: CategorySummary;
  index: number;
  selected: boolean;
  onClick: () => void;
};

const CategoryRow = ({ item, index, selected, onClick }: CategoryRowProps) => {
  const color = item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
        selected
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="flex-1 text-sm text-gray-800">{item.categoryName}</span>
      <span className="text-sm font-medium text-gray-700">{fmt(item.amount)}</span>
      <span className="text-xs text-gray-400 w-12 text-right">{item.percentage.toFixed(1)}%</span>
    </button>
  );
};

// =========================================================================
// カテゴリ集計セクション（月別・年間共用）
// =========================================================================
type CategorySectionProps = {
  summaries: CategorySummary[];
  loading: boolean;
  categoryTab: CategoryTab;
  selectedCategoryId: string | null;
  onTabChange: (t: CategoryTab) => void;
  onCategoryClick: (item: CategorySummary) => void;
};

const CategorySection = ({
  summaries, loading, categoryTab, selectedCategoryId, onTabChange, onCategoryClick,
}: CategorySectionProps) => (
  <div className="flex flex-col gap-3">
    <div className="flex border-b border-gray-200">
      {(['EXPENSE', 'INCOME'] as CategoryTab[]).map((t) => (
        <button
          key={t}
          onClick={() => onTabChange(t)}
          className={`px-5 py-1.5 text-sm font-medium transition-colors ${
            categoryTab === t
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t === 'EXPENSE' ? '支出' : '収入'}
        </button>
      ))}
    </div>

    {loading ? (
      <div className="text-center text-gray-400 py-6">読み込み中...</div>
    ) : (
      <>
        <CategoryPieChart data={summaries as unknown as CategoryBreakdown[]} size={220} />
        <div className="bg-white rounded-lg border border-gray-200 p-2">
          {summaries.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">データがありません</p>
          ) : (
            summaries.map((item, idx) => (
              <CategoryRow
                key={item.categoryId}
                item={item}
                index={idx}
                selected={item.categoryId === selectedCategoryId}
                onClick={() => onCategoryClick(item)}
              />
            ))
          )}
        </div>
      </>
    )}
  </div>
);

// =========================================================================
// メインページコンテンツ
// =========================================================================
const ReportsContent = () => {
  const params = useParams<{ ledgerId: string }>();
  const ledgerId = params.ledgerId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { open: openPanel, close: closePanel } = useSubPanelStore();

  const today = new Date();
  const [tab, setTab] = useState<Tab>(() => (searchParams.get('tab') as Tab) ?? 'monthly');
  const [year, setYear] = useState(() => Number(searchParams.get('year')) || today.getFullYear());
  const [month, setMonth] = useState(() => Number(searchParams.get('month')) || today.getMonth() + 1);
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('EXPENSE');
  const [annualCategoryTab, setAnnualCategoryTab] = useState<CategoryTab>('EXPENSE');

  const [monthlyData, setMonthlyData] = useState<MonthlyReport | null>(null);
  const [annualData, setAnnualData] = useState<AnnualReport | null>(null);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [annualCategorySummaries, setAnnualCategorySummaries] = useState<CategorySummary[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [annualCategoryLoading, setAnnualCategoryLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAnnualCategoryId, setSelectedAnnualCategoryId] = useState<string | null>(null);

  const pushParams = useCallback((t: Tab, y: number, m: number) => {
    const q = new URLSearchParams({ tab: t, year: String(y), month: String(m) });
    router.replace(`?${q.toString()}`);
  }, [router]);

  const fetchMonthly = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await getMonthlyReport(ledgerId, year, month);
      setMonthlyData(res.data);
    } finally {
      setReportLoading(false);
    }
  }, [ledgerId, year, month]);

  const fetchAnnual = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await getAnnualReport(ledgerId, year);
      setAnnualData(res.data);
    } finally {
      setReportLoading(false);
    }
  }, [ledgerId, year]);

  const fetchCategorySummary = useCallback(async () => {
    setCategoryLoading(true);
    try {
      const res = await getCategorySummary(ledgerId, year, month, categoryTab);
      setCategorySummaries(res.data);
    } finally {
      setCategoryLoading(false);
    }
  }, [ledgerId, year, month, categoryTab]);

  const fetchAnnualCategorySummary = useCallback(async () => {
    setAnnualCategoryLoading(true);
    try {
      const res = await getAnnualCategorySummary(ledgerId, year, annualCategoryTab);
      setAnnualCategorySummaries(res.data);
    } finally {
      setAnnualCategoryLoading(false);
    }
  }, [ledgerId, year, annualCategoryTab]);

  useEffect(() => {
    if (tab === 'monthly') {
      fetchMonthly();
      fetchCategorySummary();
      setSelectedCategoryId(null);
      closePanel();
    } else {
      fetchAnnual();
      fetchAnnualCategorySummary();
      setSelectedAnnualCategoryId(null);
      closePanel();
    }
  }, [tab, fetchMonthly, fetchAnnual, fetchCategorySummary, fetchAnnualCategorySummary, closePanel]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    pushParams(t, year, month);
  };

  const prevMonth = () => {
    const [ny, nm] = month === 1 ? [year - 1, 12] : [year, month - 1];
    setYear(ny); setMonth(nm); pushParams(tab, ny, nm);
  };
  const nextMonth = () => {
    const [ny, nm] = month === 12 ? [year + 1, 1] : [year, month + 1];
    setYear(ny); setMonth(nm); pushParams(tab, ny, nm);
  };
  const prevYear = () => { const ny = year - 1; setYear(ny); pushParams(tab, ny, month); };
  const nextYear = () => { const ny = year + 1; setYear(ny); pushParams(tab, ny, month); };

  const handleCategoryTabChange = (t: CategoryTab) => {
    setCategoryTab(t);
    setSelectedCategoryId(null);
    closePanel();
  };

  const handleAnnualCategoryTabChange = (t: CategoryTab) => {
    setAnnualCategoryTab(t);
    setSelectedAnnualCategoryId(null);
    closePanel();
  };

  const handleCategoryClick = (item: CategorySummary) => {
    setSelectedCategoryId(item.categoryId);
    openPanel(
      <CategoryDetailPanel
        ledgerId={ledgerId}
        categoryId={item.categoryId}
        categoryName={item.categoryName}
        year={year}
        month={month}
      />
    );
  };

  const handleAnnualCategoryClick = (item: CategorySummary) => {
    setSelectedAnnualCategoryId(item.categoryId);
    openPanel(
      <CategoryDetailPanel
        ledgerId={ledgerId}
        categoryId={item.categoryId}
        categoryName={item.categoryName}
        year={year}
      />
    );
  };

  const barData: BarItem[] = annualData?.months.map((m) => ({
    label: MONTH_NAMES[m.month - 1],
    income: m.totalIncome,
    expense: m.totalExpense,
  })) ?? [];

  const lineData: LineItem[] = annualData?.balanceHistory.map((b) => ({
    label: MONTH_NAMES[b.month - 1],
    balance: b.balance,
  })) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* タブ */}
      <div className="flex border-b border-gray-200">
        {(['monthly', 'annual'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'monthly' ? '月別' : '年別'}
          </button>
        ))}
      </div>

      {/* ===== 月別タブ ===== */}
      {tab === 'monthly' && (
        <>
          {/* 月セレクター */}
          <div className="flex items-center gap-4 justify-center">
            <button onClick={prevMonth} className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors" aria-label="前月">◀</button>
            <span className="text-lg font-semibold text-gray-800 w-32 text-center">{year}年{month}月</span>
            <button onClick={nextMonth} className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors" aria-label="翌月">▶</button>
          </div>

          {reportLoading || !monthlyData ? (
            <div className="text-center text-gray-400 py-8">読み込み中...</div>
          ) : (
            <>
              {/* 収支サマリー */}
              <SummaryCards
                totalIncome={monthlyData.totalIncome}
                totalExpense={monthlyData.totalExpense}
                netBalance={monthlyData.netBalance}
                currentBalance={monthlyData.currentBalance}
                carryOver={monthlyData.carryOver}
              />

              {/* 前月比 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">前月比</h3>
                <ComparisonRow
                  label="収入"
                  change={monthlyData.prevMonthComparison.incomeChange}
                  rate={monthlyData.prevMonthComparison.incomeChangeRate}
                  isIncome={true}
                />
                <ComparisonRow
                  label="支出"
                  change={monthlyData.prevMonthComparison.expenseChange}
                  rate={monthlyData.prevMonthComparison.expenseChangeRate}
                  isIncome={false}
                />
              </div>

              {/* 前年同月比 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">前年同月比</h3>
                <ComparisonRow
                  label="収入"
                  change={monthlyData.prevYearComparison.incomeChange}
                  rate={monthlyData.prevYearComparison.incomeChangeRate}
                  isIncome={true}
                />
                <ComparisonRow
                  label="支出"
                  change={monthlyData.prevYearComparison.expenseChange}
                  rate={monthlyData.prevYearComparison.expenseChangeRate}
                  isIncome={false}
                />
              </div>

              {/* カテゴリ別集計 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">カテゴリ別集計</h3>
                <CategorySection
                  summaries={categorySummaries}
                  loading={categoryLoading}
                  categoryTab={categoryTab}
                  selectedCategoryId={selectedCategoryId}
                  onTabChange={handleCategoryTabChange}
                  onCategoryClick={handleCategoryClick}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* ===== 年別タブ ===== */}
      {tab === 'annual' && (
        <>
          {/* 年セレクター */}
          <div className="flex items-center gap-4 justify-center">
            <button onClick={prevYear} className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors" aria-label="前年">◀</button>
            <span className="text-lg font-semibold text-gray-800 w-24 text-center">{year}年</span>
            <button onClick={nextYear} className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors" aria-label="翌年">▶</button>
          </div>

          {reportLoading || !annualData ? (
            <div className="text-center text-gray-400 py-8">読み込み中...</div>
          ) : (
            <>
              {/* 年間サマリー */}
              <SummaryCards
                totalIncome={annualData.annualSummary.totalIncome}
                totalExpense={annualData.annualSummary.totalExpense}
                netBalance={annualData.annualSummary.netBalance}
              />

              {/* 月別収支棒グラフ */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">月別収支</h3>
                <MonthlyBarChart data={barData} height={280} />
              </div>

              {/* 残高推移折れ線グラフ */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">残高推移</h3>
                <BalanceLineChart data={lineData} height={240} />
              </div>

              {/* 年間カテゴリ別集計 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">年間カテゴリ別集計</h3>
                <CategorySection
                  summaries={annualCategorySummaries}
                  loading={annualCategoryLoading}
                  categoryTab={annualCategoryTab}
                  selectedCategoryId={selectedAnnualCategoryId}
                  onTabChange={handleAnnualCategoryTabChange}
                  onCategoryClick={handleAnnualCategoryClick}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

const ReportsPage = () => (
  <Suspense fallback={<div className="text-center text-gray-400 py-8">読み込み中...</div>}>
    <ReportsContent />
  </Suspense>
);

export default ReportsPage;
