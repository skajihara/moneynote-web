'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLedgerStore } from '@/stores/ledgerStore';
import { getDashboard } from '@/lib/api/dashboard';
import type { DashboardResponse } from '@/types/dashboard';
import type { Transaction } from '@/types/transaction';
import SummaryCards from '@/components/ui/SummaryCards';
import CategoryPieChart from '@/components/charts/CategoryPieChart';
import BudgetProgressList from '@/components/budget/BudgetProgressList';
import TransactionList from '@/components/transaction/TransactionList';

const RECENT_COUNT_OPTIONS = [5, 10, 20, 50];

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedLedgerId } = useLedgerStore();

  const today = new Date();
  const [year, setYear] = useState(
    () => Number(searchParams.get('year')) || today.getFullYear()
  );
  const [month, setMonth] = useState(
    () => Number(searchParams.get('month')) || today.getMonth() + 1
  );
  const [recentCount, setRecentCount] = useState(10);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const updateYearMonth = useCallback(
    (y: number, m: number) => {
      setYear(y);
      setMonth(m);
      router.replace(`?year=${y}&month=${m}`);
    },
    [router]
  );

  const prevMonth = () => {
    if (month === 1) updateYearMonth(year - 1, 12);
    else updateYearMonth(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) updateYearMonth(year + 1, 1);
    else updateYearMonth(year, month + 1);
  };

  const fetchData = useCallback(async () => {
    if (!selectedLedgerId) return;
    setLoading(true);
    try {
      const res = await getDashboard(selectedLedgerId, year, month, recentCount);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [selectedLedgerId, year, month, recentCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // TransactionList の onEdit は dashboard では編集不要（no-op）
  const handleEdit = (_tx: Transaction) => {};

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* 月セレクター */}
      <div className="flex items-center gap-4 justify-center">
        <button
          onClick={prevMonth}
          className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
          aria-label="前月"
        >
          ◀
        </button>
        <span className="text-lg font-semibold text-gray-800 w-32 text-center">
          {year}年{month}月
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
          aria-label="翌月"
        >
          ▶
        </button>
      </div>

      {loading || !data ? (
        <div className="text-center text-gray-400 py-8">読み込み中...</div>
      ) : (
        <>
          {/* サマリーカード（4枚: 収入・支出・収支・残高） */}
          <SummaryCards
            totalIncome={data.summary.totalIncome}
            totalExpense={data.summary.totalExpense}
            netBalance={data.summary.netBalance}
            currentBalance={data.summary.currentBalance}
          />

          {/* カテゴリ別円グラフ */}
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">カテゴリ別支出</h2>
            <CategoryPieChart data={data.categoryBreakdown} />
          </section>

          {/* 予算消化率 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">予算消化率</h2>
            <BudgetProgressList budgetStatus={data.budgetStatus} />
          </section>

          {/* AI サマリー（プレースホルダー） */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-600">
            AI分析は Step 11 で実装予定です
          </section>

          {/* 最近の明細 */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">最近の明細</h2>
              <select
                value={recentCount}
                onChange={(e) => setRecentCount(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
      )}
    </div>
  );
};

const DashboardPage = () => {
  return (
    <Suspense fallback={<div className="text-center text-gray-400 py-8">読み込み中...</div>}>
      <DashboardContent />
    </Suspense>
  );
};

export default DashboardPage;
