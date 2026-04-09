'use client';

import type { DailySummary } from '@/types/transaction';

type Props = {
  year: number;
  month: number;
  dailySummaries: DailySummary[];
  onDateClick: (date: string) => void;
};

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

const fmt = (n: number) =>
  n === 0 ? '' : n.toLocaleString('ja-JP');

const TransactionCalendar = ({ year, month, dailySummaries, onDateClick }: Props) => {
  // dailySummaries を date → DailySummary の Map に変換
  const summaryMap = new Map(dailySummaries.map((d) => [d.date, d]));

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstDay.getDay(); // 0=日

  // カレンダーセルを生成（前月の空セル + 当月の日）
  const cells: Array<{ day: number | null; date: string | null }> = [];
  for (let i = 0; i < startDow; i++) {
    cells.push({ day: null, date: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push({ day: d, date: `${year}-${mm}-${dd}` });
  }
  // 6行になるよう末尾を埋める
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, date: null });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7">
        {DAYS_OF_WEEK.map((dow, i) => (
          <div
            key={dow}
            className={`text-center text-xs font-medium py-2 border-b border-gray-200
              ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}
          >
            {dow}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const isToday =
            cell.date === new Date().toISOString().slice(0, 10);
          const summary = cell.date ? summaryMap.get(cell.date) : undefined;
          const dow = idx % 7;

          return (
            <div
              key={idx}
              className={`min-h-[72px] border-b border-r border-gray-100 p-1 text-xs
                ${cell.day ? 'cursor-pointer hover:bg-gray-50' : ''}
                ${isToday ? 'bg-blue-50' : ''}`}
              onClick={() => cell.date && onDateClick(cell.date)}
            >
              {cell.day && (
                <>
                  <span
                    className={`inline-block w-6 h-6 flex items-center justify-center rounded-full font-medium
                      ${isToday ? 'bg-blue-600 text-white' : ''}
                      ${!isToday && dow === 0 ? 'text-red-500' : ''}
                      ${!isToday && dow === 6 ? 'text-blue-500' : ''}
                      ${!isToday && dow > 0 && dow < 6 ? 'text-gray-700' : ''}`}
                  >
                    {cell.day}
                  </span>
                  {summary && summary.totalExpense > 0 && (
                    <p className="text-red-500 text-[10px] mt-0.5 truncate">
                      -{fmt(summary.totalExpense)}
                    </p>
                  )}
                  {summary && summary.totalIncome > 0 && (
                    <p className="text-blue-500 text-[10px] truncate">
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
