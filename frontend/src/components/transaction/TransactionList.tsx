'use client';

import type { Transaction } from '@/types/transaction';

type Props = {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
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
  for (const t of transactions) {
    const existing = map.get(t.transactionDate);
    if (existing) {
      existing.push(t);
    } else {
      map.set(t.transactionDate, [t]);
    }
  }
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
}

const TransactionList = ({ transactions, onEdit }: Props) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
        明細がありません
      </div>
    );
  }

  const groups = groupByDate(transactions);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {groups.map(([date, txList]) => {
        const dayIncome  = txList.filter((t) => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const dayExpense = txList.filter((t) => t.transactionType === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        const dayNet = dayIncome - dayExpense;

        return (
          <div key={date}>
            {/* 日付グループヘッダー */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">{formatDate(date)}</span>
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
                onClick={() => onEdit(t)}
                onKeyDown={(e) => e.key === 'Enter' && onEdit(t)}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                {/* カテゴリアイコン */}
                <span className="text-xl w-8 text-center shrink-0">
                  {t.categoryIcon ?? (t.transactionType === 'INCOME' ? '💰' : '💸')}
                </span>

                {/* カテゴリ名・メモ */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${t.isFixedOrigin ? 'text-blue-600' : 'text-gray-800'}`}>
                    {t.categoryName ?? '（カテゴリなし）'}
                  </p>
                  {t.memo && (
                    <p className={`text-xs truncate ${t.isFixedOrigin ? 'text-blue-400' : 'text-gray-400'}`}>
                      {t.memo}
                    </p>
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
