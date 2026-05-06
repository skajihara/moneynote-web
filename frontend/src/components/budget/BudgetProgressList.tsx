'use client';

import type { BudgetStatus } from '@/types/dashboard';

type Props = {
  budgetStatus: BudgetStatus[];
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const statusLabel: Record<BudgetStatus['status'], string> = {
  NORMAL: '正常',
  WARNING: '注意',
  OVER: '超過',
};

const BudgetProgressList = ({ budgetStatus }: Props) => {
  if (budgetStatus.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400 text-sm">
        予算が設定されていません
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
      {budgetStatus.map((item) => {
        const pct = Math.min(item.percentage, 100);
        // NORMAL は --theme-color、WARNING は黄色、OVER は赤
        const barStyle =
          item.status === 'NORMAL'
            ? { backgroundColor: 'var(--theme-color)', width: `${pct}%` }
            : item.status === 'WARNING'
            ? { backgroundColor: '#FBBF24', width: `${pct}%` }
            : { backgroundColor: '#EF4444', width: `${pct}%` };

        return (
          <div key={item.categoryId} className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {item.categoryIcon ? `${item.categoryIcon} ` : ''}{item.categoryName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {fmt(item.actualAmount)} / {fmt(item.budgetAmount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all"
                  style={barStyle}
                  aria-label={`${item.categoryName} ${item.percentage.toFixed(1)}%`}
                />
              </div>
              <span
                className={`text-xs font-medium w-14 text-right ${
                  item.status === 'OVER' ? 'text-red-600' :
                  item.status === 'WARNING' ? 'text-yellow-600' : ''
                }`}
                style={item.status === 'NORMAL' ? { color: 'var(--theme-color)' } : {}}
              >
                {item.percentage.toFixed(1)}% ({statusLabel[item.status]})
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BudgetProgressList;
