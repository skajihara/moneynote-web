'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { BalanceHistoryItem } from '@/types/report';

type Props = {
  data: BalanceHistoryItem[];
  height?: number;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const AllPeriodLineChart = ({ data, height = 300 }: Props) => {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ height }}
      >
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="yearMonth" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: number) => fmt(value)} />
        <Legend />
        <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="income"
          name="収入"
          stroke="#36A2EB"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="expense"
          name="支出"
          stroke="#EF4444"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="balance"
          name="残高"
          stroke="#16A34A"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AllPeriodLineChart;
