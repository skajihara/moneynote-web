'use client';

type Props = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const SummaryCards = ({ totalIncome, totalExpense, netBalance }: Props) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">収入</p>
        <p className="text-lg font-semibold text-blue-600">{fmt(totalIncome)}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">支出</p>
        <p className="text-lg font-semibold text-red-600">{fmt(totalExpense)}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">収支</p>
        <p className={`text-lg font-semibold ${netBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
          {fmt(netBalance)}
        </p>
      </div>
    </div>
  );
};

export default SummaryCards;
