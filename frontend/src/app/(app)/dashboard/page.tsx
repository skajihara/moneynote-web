'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLedgerStore } from '@/stores/ledgerStore';
import { getDashboard } from '@/lib/api/dashboard';
import { getPeriodRange, prevYearMonth, nextYearMonth, getCurrentYearMonth } from '@/lib/periodUtils';
import { analyzeAi, getAiScore } from '@/lib/api/ai';
import { useToastStore } from '@/stores/toastStore';
import { ApiClientError } from '@/lib/api/client';
import type { DashboardResponse } from '@/types/dashboard';
import type { Transaction } from '@/types/transaction';
import type { AiAnalysisResult, AiScore } from '@/types/ai';
import { useUserOnly } from '@/hooks/useUserOnly';
import SummaryCards from '@/components/ui/SummaryCards';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorState from '@/components/ui/ErrorState';
import CategoryPieChart from '@/components/charts/CategoryPieChart';
import BudgetProgressList from '@/components/budget/BudgetProgressList';
import TransactionList from '@/components/transaction/TransactionList';

const RECENT_COUNT_OPTIONS = [5, 10, 20, 50];

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedLedgerId, getSelectedLedger } = useLedgerStore();
  const startDayOfMonth = getSelectedLedger()?.startDayOfMonth ?? 1;

  const [year, setYear] = useState(
    () => Number(searchParams.get('year')) || getCurrentYearMonth(startDayOfMonth).year
  );
  const [month, setMonth] = useState(
    () => Number(searchParams.get('month')) || getCurrentYearMonth(startDayOfMonth).month
  );
  const [recentCount, setRecentCount] = useState(10);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiScore, setAiScore] = useState<AiScore | null>(null);
  const { add: addToast } = useToastStore();

  const updateYearMonth = useCallback(
    (y: number, m: number) => {
      setYear(y);
      setMonth(m);
      router.replace(`?year=${y}&month=${m}`);
    },
    [router]
  );

  const period = getPeriodRange(year, month, startDayOfMonth);

  const prevMonth = () => {
    const { year: y, month: m } = prevYearMonth(year, month);
    updateYearMonth(y, m);
  };

  const nextMonth = () => {
    const { year: y, month: m } = nextYearMonth(year, month);
    updateYearMonth(y, m);
  };

  const fetchData = useCallback(async () => {
    if (!selectedLedgerId) return;
    setLoading(true);
    setIsError(false);
    try {
      const res = await getDashboard(selectedLedgerId, year, month, recentCount);
      setData(res.data);
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
    // スコアは独立取得（失敗しても継続）
    getAiScore(selectedLedgerId).then((r) => setAiScore(r.data)).catch(() => {});
  }, [selectedLedgerId, year, month, recentCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAiAnalyze = async () => {
    if (!selectedLedgerId) return;
    setAiLoading(true);
    try {
      const res = await analyzeAi(selectedLedgerId, 'ONE_MONTH', 'INSIGHT');
      setAiResult(res.data);
    } catch (e) {
      addToast('error', e instanceof ApiClientError ? e.error.message : 'AI分析に失敗しました');
    } finally {
      setAiLoading(false);
    }
  };

  // TransactionList の onEdit は dashboard では編集不要（no-op）
  const handleEdit = (_tx: Transaction) => {};

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* 月セレクター */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="前月"
          >
            ◀
          </button>
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100 w-40 text-center">
            {year}年{month}月
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="翌月"
          >
            ▶
          </button>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          （{period.from.getMonth() + 1}/{period.from.getDate()}〜{period.to.getMonth() + 1}/{period.to.getDate()}）
        </span>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState onRetry={fetchData} />
      ) : data ? (
        <>
          {/* サマリーカード（4枚: 収入・支出・収支・残高） */}
          <SummaryCards
            totalIncome={data.summary.totalIncome}
            totalExpense={data.summary.totalExpense}
            netBalance={data.summary.netBalance}
            currentBalance={data.summary.currentBalance}
          />

          {/* カテゴリ別円グラフ（支出・収入を横並び） */}
          <div className="grid grid-cols-2 gap-4">
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">カテゴリ別支出</h2>
              <CategoryPieChart data={data.categoryBreakdown} />
            </section>
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">カテゴリ別収入</h2>
              <CategoryPieChart data={data.categoryIncomeBreakdown} />
            </section>
          </div>

          {/* 予算消化率 */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">予算消化率</h2>
            <BudgetProgressList budgetStatus={data.budgetStatus} />
          </section>

          {/* AI サマリー */}
          <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-blue-700">AI分析</h2>
              {selectedLedgerId && (
                <Link
                  href={`/ledgers/${selectedLedgerId}/ai`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  詳細を見る →
                </Link>
              )}
            </div>
            {/* スコアコンパクト表示 */}
            {aiScore && (() => {
              const GRADE: Record<string, { emoji: string; label: string }> = {
                EXCELLENT: { emoji: '🟢', label: '優秀' },
                GOOD:      { emoji: '🟡', label: '良好' },
                CAUTION:   { emoji: '🟠', label: '要注意' },
                POOR:      { emoji: '🔴', label: '改善が必要' },
              };
              const g = GRADE[aiScore.grade] ?? { emoji: '●', label: aiScore.grade };
              return (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-md px-3 py-2 border border-blue-100 dark:border-blue-800">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{aiScore.totalScore}点</span>
                  <span className="text-xs">{g.emoji} {g.label}</span>
                  {aiScore.scoreDiff !== null && (
                    <span className={`text-xs ml-auto ${aiScore.scoreDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      先月比 {aiScore.scoreDiff >= 0 ? '+' : ''}{aiScore.scoreDiff}点
                    </span>
                  )}
                </div>
              );
            })()}
            <button
              onClick={handleAiAnalyze}
              disabled={aiLoading || !selectedLedgerId}
              className="w-full rounded-md px-4 py-2 text-sm font-medium btn-theme disabled:opacity-50"
              aria-label="今月を分析する"
            >
              {aiLoading ? '分析中...' : '今月を分析する'}
            </button>
            {aiResult && (
              <div className="space-y-1">
                {aiResult.fromCache && (
                  <p className="text-xs text-blue-400 dark:text-blue-300">キャッシュから取得</p>
                )}
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  {aiResult.adviceText}
                </p>
              </div>
            )}
          </section>

          {/* 最近の明細 */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">最近の明細</h2>
              <select
                value={recentCount}
                onChange={(e) => setRecentCount(Number(e.target.value))}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-gray-600 dark:text-gray-300 focus:outline-none dark:bg-gray-700 focus:ring-1 focus:ring-blue-500"
                aria-label="表示件数"
              >
                {RECENT_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}件
                  </option>
                ))}
              </select>
            </div>
            <TransactionList
              transactions={data.recentTransactions}
              onEdit={handleEdit}
            />
          </section>
        </>
      ) : null}
    </div>
  );
};

const DashboardPage = () => {
  const isAdmin = useUserOnly();
  if (isAdmin) return null;
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardContent />
    </Suspense>
  );
};

export default DashboardPage;
