'use client';

import type { DailySummary } from '@/types/transaction';

type Props = {
  year: number;
  month: number;
  dailySummaries: DailySummary[];
  onDateClick?: (date: string) => void;
  startDayOfMonth?: number;
};

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

const fmt = (n: number) =>
  n === 0 ? '' : n.toLocaleString('ja-JP');

type Cell = { day: number; date: string } | { day: null; date: null };

function buildCells(year: number, month: number, startDayOfMonth: number): Cell[] {
  const cells: Cell[] = [];

  if (startDayOfMonth <= 1) {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDow = firstDay.getDay();

    for (let i = 0; i < startDow; i++) cells.push({ day: null, date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ day: d, date: `${year}-${mm}-${dd}` });
    }
  } else {
    // 月度期間: prevMonth/startDay 〜 month/(startDay-1)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthDays = new Date(prevYear, prevMonth, 0).getDate();
    const curMonthDays = new Date(year, month, 0).getDate();
    const fromDay = Math.min(startDayOfMonth, prevMonthDays);
    const toDay = Math.min(startDayOfMonth - 1, curMonthDays);

    const fromDate = new Date(prevYear, prevMonth - 1, fromDay);
    const startDow = fromDate.getDay();

    for (let i = 0; i < startDow; i++) cells.push({ day: null, date: null });

    // 前月分: fromDay〜prevMonthDays
    for (let d = fromDay; d <= prevMonthDays; d++) {
      const yy = String(prevYear);
      const mm = String(prevMonth).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ day: d, date: `${yy}-${mm}-${dd}` });
    }

    // 当月分: 1〜toDay
    for (let d = 1; d <= toDay; d++) {
      const mm = String(month).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ day: d, date: `${year}-${mm}-${dd}` });
    }
  }

  while (cells.length % 7 !== 0) cells.push({ day: null, date: null });

  return cells;
}

const TransactionCalendar = ({ year, month, dailySummaries, onDateClick, startDayOfMonth = 1 }: Props) => {
  const summaryMap = new Map(dailySummaries.map((d) => [d.date, d]));
  const cells = buildCells(year, month, startDayOfMonth);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7">
        {DAYS_OF_WEEK.map((dow, i) => (
          <div
            key={dow}
            className={`text-center text-xs font-medium py-2 border-b border-gray-200 dark:border-gray-700
              ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {dow}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const isToday = cell.date === today;
          const summary = cell.date ? summaryMap.get(cell.date) : undefined;
          const dow = idx % 7;

          return (
            <div
              key={idx}
              className={`min-h-[72px] border-b border-r border-gray-100 dark:border-gray-700 p-1 text-xs
                ${cell.day ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''}
                ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              onClick={() => cell.date && onDateClick?.(cell.date)}
            >
              {cell.day && (
                <>
                  <span
                    className={`inline-block w-6 h-6 flex items-center justify-center rounded-full font-medium
                      ${isToday ? 'bg-blue-600 text-white' : ''}
                      ${!isToday && dow === 0 ? 'text-red-500' : ''}
                      ${!isToday && dow === 6 ? 'text-blue-500' : ''}
                      ${!isToday && dow > 0 && dow < 6 ? 'text-gray-700 dark:text-gray-300' : ''}`}
                  >
                    {cell.day}
                  </span>
                  {summary && summary.totalExpense > 0 && (
                    <p className="text-red-500 text-xs mt-0.5 truncate">
                      -{fmt(summary.totalExpense)}
                    </p>
                  )}
                  {summary && summary.totalIncome > 0 && (
                    <p className="text-green-600 text-xs truncate">
                      +{fmt(summary.totalIncome)}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionCalendar;
