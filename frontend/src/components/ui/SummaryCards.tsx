'use client';

type Props = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  currentBalance?: number;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const SummaryCards = ({ totalIncome, totalExpense, netBalance, currentBalance }: Props) => {
  const cols = currentBalance !== undefined ? 'grid-cols-4' : 'grid-cols-3';
  return (
    <div className={`grid ${cols} gap-4`}>
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
      {currentBalance !== undefined && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">残高</p>
          <p className={`text-lg font-semibold ${currentBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
            {fmt(currentBalance)}
          </p>
        </div>
      )}
    </div>
  );
};

export default SummaryCards;
