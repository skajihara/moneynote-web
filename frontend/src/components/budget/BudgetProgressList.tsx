'use client';

import type { BudgetStatus } from '@/types/dashboard';

type Props = {
  budgetStatus: BudgetStatus[];
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const statusColor: Record<BudgetStatus['status'], string> = {
  NORMAL: 'bg-green-500',
  WARNING: 'bg-yellow-400',
  OVER: 'bg-red-500',
};

const statusLabel: Record<BudgetStatus['status'], string> = {
  NORMAL: '正常',
  WARNING: '注意',
  OVER: '超過',
};

const BudgetProgressList = ({ budgetStatus }: Props) => {
  if (budgetStatus.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
        予算が設定されていません
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
      {budgetStatus.map((item) => {
        const pct = Math.min(item.percentage, 100);
        const barColor = statusColor[item.status];
        return (
          <div key={item.categoryId} className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                {item.categoryIcon ? `${item.categoryIcon} ` : ''}{item.categoryName}
              </span>
              <span className="text-xs text-gray-500">
                {fmt(item.actualAmount)} / {fmt(item.budgetAmount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                  aria-label={`${item.categoryName} ${item.percentage.toFixed(1)}%`}
                />
              </div>
              <span
                className={`text-xs font-medium w-14 text-right ${
                  item.status === 'OVER' ? 'text-red-600' :
                  item.status === 'WARNING' ? 'text-yellow-600' : 'text-green-600'
                }`}
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
