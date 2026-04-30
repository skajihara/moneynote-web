'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import { getTransactions } from '@/lib/api/transaction';
import { getPeriodRange, prevYearMonth, nextYearMonth, getCurrentYearMonth } from '@/lib/periodUtils';
import type { TransactionListResponse, Transaction } from '@/types/transaction';
import SummaryCards from '@/components/ui/SummaryCards';
import TransactionCalendar from '@/components/transaction/TransactionCalendar';
import TransactionList from '@/components/transaction/TransactionList';
import TransactionEditForm from '@/components/transaction/TransactionEditForm';

const TransactionsContent = () => {
  const params = useParams<{ ledgerId: string }>();
  const ledgerId = params.ledgerId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { open: openPanel, close: closePanel } = useSubPanelStore();
  const getSelectedLedger = useLedgerStore((s) => s.getSelectedLedger);
  const canEdit = useLedgerStore((s) => s.canEdit)();

  const startDayOfMonth = getSelectedLedger()?.startDayOfMonth ?? 1;
  const [year, setYear] = useState(() => Number(searchParams.get('year')) || getCurrentYearMonth(startDayOfMonth).year);
  const [month, setMonth] = useState(() => Number(searchParams.get('month')) || getCurrentYearMonth(startDayOfMonth).month);
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const period = getPeriodRange(year, month, startDayOfMonth);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTransactions(ledgerId, { year, month });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [ledgerId, year, month, startDayOfMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSuccess = () => {
    closePanel();
    fetchData();
  };

  const openAddForm = (initialDate?: string) => {
    openPanel(
      <TransactionEditForm
        ledgerId={ledgerId}
        initialDate={initialDate}
        onSuccess={handleSuccess}
        onCancel={closePanel}
      />
    );
  };

  const openEditForm = (transaction: Transaction) => {
    openPanel(
      <TransactionEditForm
        ledgerId={ledgerId}
        transaction={transaction}
        onSuccess={handleSuccess}
        onCancel={closePanel}
      />
    );
  };

  const updateYearMonth = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
    router.replace(`?year=${y}&month=${m}`);
  }, [router]);

  const handlePrev = () => {
    const { year: y, month: m } = prevYearMonth(year, month);
    updateYearMonth(y, m);
  };

  const handleNext = () => {
    const { year: y, month: m } = nextYearMonth(year, month);
    updateYearMonth(y, m);
  };

  return (
    <div className="relative h-full">
      <div className="flex flex-col gap-4 pb-20">
        {/* 月セレクター */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrev}
              className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label="前月"
            >
              ◀
            </button>
            <span className="text-lg font-semibold text-gray-800 w-40 text-center">
              {year}年{month}月
            </span>
            <button
              onClick={handleNext}
              className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label="翌月"
            >
              ▶
            </button>
          </div>
          <span className="text-xs text-gray-400">
            （{period.from.getMonth() + 1}/{period.from.getDate()}〜{period.to.getMonth() + 1}/{period.to.getDate()}）
          </span>
        </div>

        {loading || !data ? (
          <div className="text-center text-gray-400 py-8">読み込み中...</div>
        ) : (
          <>
            {/* サマリーカード */}
            <SummaryCards
              totalIncome={data.summary.totalIncome}
              totalExpense={data.summary.totalExpense}
              netBalance={data.summary.netBalance}
            />

            {/* カレンダー */}
            <TransactionCalendar
              year={year}
              month={month}
              dailySummaries={data.dailySummaries}
              onDateClick={canEdit ? (date) => openAddForm(date) : undefined}
              startDayOfMonth={startDayOfMonth}
            />

            {/* 明細一覧 */}
            <TransactionList
              transactions={data.transactions}
              onEdit={canEdit ? openEditForm : undefined}
            />
          </>
        )}
      </div>

      {/* FAB: 追加ボタン（VIEWER は非表示） */}
      {canEdit && (
        <button
          onClick={() => openAddForm()}
          className="fixed bottom-8 right-8 w-14 h-14 text-white rounded-full shadow-lg
            flex items-center justify-center text-2xl z-40 btn-theme"
          aria-label="明細を追加"
        >
          ＋
        </button>
      )}
    </div>
  );
};

const TransactionsPage = () => {
  return (
    <Suspense fallback={<div className="text-center text-gray-400 py-8">読み込み中...</div>}>
      <TransactionsContent />
    </Suspense>
  );
};

export default TransactionsPage;
