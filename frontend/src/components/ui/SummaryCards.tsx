'use client';

type Props = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  currentBalance?: number;
  carryOver?: number;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const SummaryCards = ({ totalIncome, totalExpense, netBalance, currentBalance, carryOver }: Props) => {
  const extraCount = (currentBalance !== undefined ? 1 : 0) + (carryOver !== undefined ? 1 : 0);
  const totalCols = 3 + extraCount;
  const colsClass =
    totalCols === 3 ? 'grid-cols-3' :
    totalCols === 4 ? 'grid-cols-4' :
    'grid-cols-5';

  return (
    <div className={`grid ${colsClass} gap-4`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">収入</p>
        <p className="text-lg font-semibold text-green-600">{fmt(totalIncome)}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">支出</p>
        <p className="text-lg font-semibold text-red-500">{fmt(totalExpense)}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">収支</p>
        <p className={`text-lg font-semibold ${netBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {fmt(netBalance)}
        </p>
      </div>
      {carryOver !== undefined && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">繰り越し</p>
          <p className="text-lg font-semibold text-gray-800">{fmt(carryOver)}</p>
        </div>
      )}
      {currentBalance !== undefined && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">残高</p>
          <p className={`text-lg font-semibold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {fmt(currentBalance)}
          </p>
        </div>
      )}
    </div>
  );
};

export default SummaryCards;
