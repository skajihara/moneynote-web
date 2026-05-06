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
import { useThemeStore } from '@/stores/themeStore';

type Props = {
  data: BalanceHistoryItem[];
  height?: number;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const AllPeriodLineChart = ({ data, height = 300 }: Props) => {
  const isDark = useThemeStore((s) => s.isDark);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm"
        style={{ height }}
      >
        データがありません
      </div>
    );
  }

  const gridColor = isDark ? '#374151' : '#E5E7EB';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1F2937' : '#ffffff',
    borderColor: isDark ? '#374151' : '#E5E7EB',
    color: isDark ? '#F9FAFB' : '#111827',
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="yearMonth" tick={{ fontSize: 12, fill: tickColor }} />
        <YAxis
          tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
          tick={{ fontSize: 12, fill: tickColor }}
        />
        <Tooltip formatter={(value: number) => fmt(value)} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ color: isDark ? '#D1D5DB' : '#374151' }} />
        <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="income" name="収入" stroke="#36A2EB" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expense" name="支出" stroke="#EF4444" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="balance" name="残高" stroke="#16A34A" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AllPeriodLineChart;
