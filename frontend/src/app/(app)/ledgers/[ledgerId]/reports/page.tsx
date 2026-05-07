'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useLedgerStore } from '@/stores/ledgerStore';
import { getPeriodRange, getCurrentYearMonth } from '@/lib/periodUtils';
import { useSubPanelStore } from '@/stores/subPanelStore';
import {
  getMonthlyReport,
  getAnnualReport,
  getBalanceHistory,
  getCategorySummary,
  getAnnualCategorySummary,
  getAllTimeCategorySummary,
  getCategoryTransactions,
} from '@/lib/api/report';
import type { MonthlyReport, AnnualReport, BalanceHistoryItem, CategorySummary, CategoryTransactions } from '@/types/report';
import type { Transaction } from '@/types/transaction';
import SummaryCards from '@/components/ui/SummaryCards';
import MonthlyBarChart from '@/components/charts/MonthlyBarChart';
import BalanceLineChart from '@/components/charts/BalanceLineChart';
import AllPeriodLineChart from '@/components/charts/AllPeriodLineChart';
import CategoryPieChart from '@/components/charts/CategoryPieChart';
import TransactionList from '@/components/transaction/TransactionList';
import TransactionEditForm from '@/components/transaction/TransactionEditForm';
import BudgetPanel from '@/components/budget/BudgetPanel';
import type { BarItem } from '@/components/charts/MonthlyBarChart';
import type { LineItem } from '@/components/charts/BalanceLineChart';
import type { CategoryBreakdown } from '@/types/dashboard';

type Tab = 'monthly' | 'annual' | 'all';
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
  isIncome: boolean;
};

const ComparisonRow = ({ label, change, rate, isIncome }: ComparisonRowProps) => {
  let color = 'text-gray-600';
  if (change !== 0) {
    const positive = isIncome ? change > 0 : change < 0;
    color = positive ? 'text-green-600' : 'text-red-500';
  }
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
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
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{categoryName}</h2>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{trendLabel}</p>
        <MonthlyBarChart data={barData} height={200} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{txLabel}</p>
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
          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent dark:border-transparent'
      }`}
    >
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">{item.categoryName}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{fmt(item.amount)}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500 w-12 text-right">{item.percentage.toFixed(1)}%</span>
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
    <div className="flex border-b border-gray-200 dark:border-gray-700">
      {(['EXPENSE', 'INCOME'] as CategoryTab[]).map((t) => (
        <button
          key={t}
          onClick={() => onTabChange(t)}
          className={`px-5 py-1.5 text-sm font-medium transition-colors ${
            categoryTab === t
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
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
// レポートコンテンツ（右カラム）
// =========================================================================
const ReportsContent = () => {
  const params = useParams<{ ledgerId: string }>();
  const ledgerId = params.ledgerId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { open: openPanel, close: closePanel } = useSubPanelStore();
  const getSelectedLedger = useLedgerStore((s) => s.getSelectedLedger);
  const startDayOfMonth = getSelectedLedger()?.startDayOfMonth ?? 1;

  const [tab, setTab] = useState<Tab>(() => (searchParams.get('tab') as Tab) ?? 'monthly');
  const [year, setYear] = useState(() => Number(searchParams.get('year')) || getCurrentYearMonth(startDayOfMonth).year);
  const [month, setMonth] = useState(() => Number(searchParams.get('month')) || getCurrentYearMonth(startDayOfMonth).month);
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('EXPENSE');
  const [annualCategoryTab, setAnnualCategoryTab] = useState<CategoryTab>('EXPENSE');

  const [monthlyData, setMonthlyData] = useState<MonthlyReport | null>(null);
  const [annualData, setAnnualData] = useState<AnnualReport | null>(null);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [annualCategorySummaries, setAnnualCategorySummaries] = useState<CategorySummary[]>([]);
  const [allPeriodData, setAllPeriodData] = useState<BalanceHistoryItem[]>([]);
  const [allTimeCategorySummaries, setAllTimeCategorySummaries] = useState<CategorySummary[]>([]);
  const [allTimeCategoryTab, setAllTimeCategoryTab] = useState<CategoryTab>('EXPENSE');
  const [selectedAllTimeCategoryId, setSelectedAllTimeCategoryId] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [annualCategoryLoading, setAnnualCategoryLoading] = useState(false);
  const [allTimeCategoryLoading, setAllTimeCategoryLoading] = useState(false);
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

  const fetchAllPeriod = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await getBalanceHistory(ledgerId);
      setAllPeriodData(res.data);
    } finally {
      setReportLoading(false);
    }
  }, [ledgerId]);

  const fetchAllTimeCategorySummary = useCallback(async () => {
    setAllTimeCategoryLoading(true);
    try {
      const res = await getAllTimeCategorySummary(ledgerId, allTimeCategoryTab);
      setAllTimeCategorySummaries(res.data);
    } finally {
      setAllTimeCategoryLoading(false);
    }
  }, [ledgerId, allTimeCategoryTab]);

  useEffect(() => {
    if (tab === 'monthly') {
      fetchMonthly();
      fetchCategorySummary();
      setSelectedCategoryId(null);
      closePanel();
    } else if (tab === 'annual') {
      fetchAnnual();
      fetchAnnualCategorySummary();
      setSelectedAnnualCategoryId(null);
      closePanel();
    } else {
      fetchAllPeriod();
      fetchAllTimeCategorySummary();
      setSelectedAllTimeCategoryId(null);
      closePanel();
    }
  }, [tab, fetchMonthly, fetchAnnual, fetchCategorySummary, fetchAnnualCategorySummary, fetchAllPeriod, fetchAllTimeCategorySummary, closePanel]);

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

  const handleAllTimeCategoryTabChange = (t: CategoryTab) => {
    setAllTimeCategoryTab(t);
    setSelectedAllTimeCategoryId(null);
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

  const handleAllTimeCategoryClick = (item: CategorySummary) => {
    setSelectedAllTimeCategoryId(item.categoryId);
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
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['monthly', 'annual', 'all'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t === 'monthly' ? '月別' : t === 'annual' ? '年別' : '全期間'}
          </button>
        ))}
      </div>

      {/* ===== 月別タブ ===== */}
      {tab === 'monthly' && (
        <>
          {/* 月セレクター */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors" aria-label="前月">◀</button>
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-100 w-40 text-center">{year}年{month}月</span>
              <button onClick={nextMonth} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors" aria-label="翌月">▶</button>
            </div>
            {(() => {
              const p = getPeriodRange(year, month, startDayOfMonth);
              return (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  （{p.from.getMonth() + 1}/{p.from.getDate()}〜{p.to.getMonth() + 1}/{p.to.getDate()}）
                </span>
              );
            })()}
          </div>

          {reportLoading || !monthlyData ? (
            <div className="text-center text-gray-400 py-8">読み込み中...</div>
          ) : (
            <>
              <SummaryCards
                totalIncome={monthlyData.totalIncome}
                totalExpense={monthlyData.totalExpense}
                netBalance={monthlyData.netBalance}
                currentBalance={monthlyData.currentBalance}
                carryOver={monthlyData.carryOver}
              />

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">前月比</h3>
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

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">前年同月比</h3>
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

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">カテゴリ別集計</h3>
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
          <div className="flex items-center gap-4 justify-center">
            <button onClick={prevYear} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors" aria-label="前年">◀</button>
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-100 w-24 text-center">{year}年</span>
            <button onClick={nextYear} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors" aria-label="翌年">▶</button>
          </div>

          {reportLoading || !annualData ? (
            <div className="text-center text-gray-400 py-8">読み込み中...</div>
          ) : (
            <>
              <SummaryCards
                totalIncome={annualData.annualSummary.totalIncome}
                totalExpense={annualData.annualSummary.totalExpense}
                netBalance={annualData.annualSummary.netBalance}
              />

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">月別収支</h3>
                <MonthlyBarChart data={barData} height={280} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">残高推移</h3>
                <BalanceLineChart data={lineData} height={240} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">年間カテゴリ別集計</h3>
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
      {/* ===== 全期間タブ ===== */}
      {tab === 'all' && (
        <>
          {reportLoading ? (
            <div className="text-center text-gray-400 py-8">読み込み中...</div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">月次残高推移（全期間）</h3>
              <AllPeriodLineChart data={allPeriodData} height={300} />
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">全期間カテゴリ別集計</h3>
            <CategorySection
              summaries={allTimeCategorySummaries}
              loading={allTimeCategoryLoading}
              categoryTab={allTimeCategoryTab}
              selectedCategoryId={selectedAllTimeCategoryId}
              onTabChange={handleAllTimeCategoryTabChange}
              onCategoryClick={handleAllTimeCategoryClick}
            />
          </div>
        </>
      )}
    </div>
  );
};

// =========================================================================
// 2カラムレイアウト（予算 40% | レポート 60%）
// =========================================================================
const BudgetReportContent = () => {
  const params = useParams<{ ledgerId: string }>();
  const ledgerId = params.ledgerId;

  return (
    <div className="flex items-stretch divide-x divide-gray-200 dark:divide-gray-700">
      {/* 左カラム: 予算管理 */}
      <div className="w-2/5 shrink-0 min-w-0 pr-5">
        <BudgetPanel ledgerId={ledgerId} />
      </div>
      {/* 右カラム: レポート */}
      <div className="flex-1 min-w-0 pl-5">
        <ReportsContent />
      </div>
    </div>
  );
};

const BudgetReportPage = () => (
  <Suspense fallback={<div className="text-center text-gray-400 py-8">読み込み中...</div>}>
    <BudgetReportContent />
  </Suspense>
);

export default BudgetReportPage;
