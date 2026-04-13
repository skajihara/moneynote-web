'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSubPanelStore } from '@/stores/subPanelStore';
import { getTransactions } from '@/lib/api/transaction';
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

  const today = new Date();
  const [year, setYear] = useState(() => Number(searchParams.get('year')) || today.getFullYear());
  const [month, setMonth] = useState(() => Number(searchParams.get('month')) || today.getMonth() + 1);
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTransactions(ledgerId, { year, month });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [ledgerId, year, month]);

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

  const prevMonth = () => {
    if (month === 1) updateYearMonth(year - 1, 12);
    else updateYearMonth(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) updateYearMonth(year + 1, 1);
    else updateYearMonth(year, month + 1);
  };

  return (
    <div className="relative h-full">
      <div className="flex flex-col gap-4 pb-20">
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
              onDateClick={(date) => openAddForm(date)}
            />

            {/* 明細一覧 */}
            <TransactionList
              transactions={data.transactions}
              onEdit={openEditForm}
            />
          </>
        )}
      </div>

      {/* FAB: 追加ボタン */}
      <button
        onClick={() => openAddForm()}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg
          flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors z-40"
        aria-label="明細を追加"
      >
        ＋
      </button>
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
