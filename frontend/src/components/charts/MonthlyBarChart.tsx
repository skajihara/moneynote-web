'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useThemeStore } from '@/stores/themeStore';

export type BarItem = {
  label: string;
  income: number;
  expense: number;
};

type Props = {
  data: BarItem[];
  height?: number;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const MonthlyBarChart = ({ data, height = 280 }: Props) => {
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
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="label" tick={{ fontSize: 16, fill: tickColor }} />
        <YAxis
          tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
          tick={{ fontSize: 16, fill: tickColor }}
        />
        <Tooltip formatter={(value: number) => fmt(value)} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ color: isDark ? '#D1D5DB' : '#374151' }} />
        <Bar dataKey="income" name="収入" fill="#16A34A" radius={[2, 2, 0, 0]} />
        <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyBarChart;
