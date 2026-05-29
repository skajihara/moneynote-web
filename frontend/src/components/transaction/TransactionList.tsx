'use client';

import type { Transaction } from '@/types/transaction';

type Props = {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const formatDate = (dateStr: string) => {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}月${parseInt(d)}日`;
};

/** 日付グループを生成して返す */
function groupByDate(transactions: Transaction[]) {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const existing = map.get(tx.transactionDate);
    if (existing) {
      existing.push(tx);
    } else {
      map.set(tx.transactionDate, [tx]);
    }
  }
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
}

const TransactionList = ({ transactions, onEdit }: Props) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 text-sm">
        明細がありません
      </div>
    );
  }

  const groups = groupByDate(transactions);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {groups.map(([date, txList]) => {
        const dayIncome  = txList.filter((t) => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const dayExpense = txList.filter((t) => t.transactionType === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        const dayNet = dayIncome - dayExpense;

        return (
          <div key={date}>
            {/* 日付グループヘッダー */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{formatDate(date)}</span>
              <span className={`text-sm font-medium ${dayNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {`${dayNet >= 0 ? '+' : ''}${fmt(dayNet)}`}
              </span>
            </div>

            {/* 明細行（行全体をクリックで編集フォームを開く） */}
            {txList.map((t) => (
              <div
                key={t.transactionId}
                role="button"
                tabIndex={0}
                aria-label={`${t.categoryName ?? '（カテゴリなし）'} ${t.amount}円`}
                onClick={() => onEdit?.(t)}
                onKeyDown={(e) => e.key === 'Enter' && onEdit?.(t)}
                title={t.isFixedOrigin ? '固定費から自動生成' : undefined}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                  t.isFixedOrigin ? 'border-l-2 border-l-blue-400' : ''
                }`}
              >
                {/* カテゴリアイコン */}
                <div className="relative w-8 shrink-0 text-center">
                  <span className="text-xl">
                    {t.categoryIcon ?? (t.transactionType === 'INCOME' ? '💰' : '💸')}
                  </span>
                  {t.isFixedOrigin && (
                    <span className="absolute -top-1 -right-1 text-xs leading-none" aria-hidden="true">
                      🔁
                    </span>
                  )}
                </div>

                {/* カテゴリ名・メモ */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-100">
                    {t.categoryName ?? '（カテゴリなし）'}
                  </p>
                  {t.memo && (
                    <p className="text-xs truncate text-gray-400 dark:text-gray-500">{t.memo}</p>
                  )}
                </div>

                {/* 金額 */}
                <span className={`text-sm font-semibold shrink-0 ${
                  t.transactionType === 'INCOME' ? 'text-green-600' : 'text-red-500'
                }`}>
                  {`${t.transactionType === 'INCOME' ? '+' : '-'}${fmt(t.amount)}`}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList;
