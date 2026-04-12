'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CategoryBreakdown } from '@/types/dashboard';

type Props = {
  data: CategoryBreakdown[];
  size?: number;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const DEFAULT_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#C9CBCF', '#7BC8A4', '#E7E9ED', '#F67019',
];

const CategoryPieChart = ({ data, size = 300 }: Props) => {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ height: size }}
      >
        データがありません
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.categoryName,
    value: item.amount,
    percentage: item.percentage,
    color: item.color ?? DEFAULT_COLORS[data.indexOf(item) % DEFAULT_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={size / 3}
          dataKey="value"
          label={false}
          startAngle={90}
          endAngle={-270}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => fmt(value)}
        />
        <Legend
          formatter={(value, entry) => {
            const payload = entry.payload as { percentage: number; value: number } | undefined;
            const pct = payload?.percentage?.toFixed(1) ?? '0.0';
            const amt = fmt(payload?.value ?? 0);
            return `${value}: ${amt} (${pct}%)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;
