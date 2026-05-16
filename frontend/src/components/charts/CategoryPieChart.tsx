'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CategoryBreakdown } from '@/types/dashboard';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

type Props = {
  data: CategoryBreakdown[];
  size?: number;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

const FALLBACK_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#C9CBCF', '#7BC8A4', '#E7E9ED', '#F67019',
];

const CategoryPieChart = ({ data, size = 300 }: Props) => {
  const themeColor = useAuthStore((s) => s.themeColor);
  const isDark = useThemeStore((s) => s.isDark);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm"
        style={{ height: size }}
      >
        データがありません
      </div>
    );
  }

  // テーマカラーを先頭に置き、残りは固定パレットを使う
  const defaultColors = [themeColor, ...FALLBACK_COLORS];

  const chartData = data.map((item) => ({
    name: item.categoryName,
    value: item.amount,
    percentage: item.percentage,
    color: item.color ?? defaultColors[data.indexOf(item) % defaultColors.length],
  }));

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F2937' : '#ffffff',
    borderColor: isDark ? '#374151' : '#E5E7EB',
    color: isDark ? '#F9FAFB' : '#111827',
  };

  const tooltipItemStyle = {
    color: isDark ? '#F9FAFB' : '#111827',
  };

  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={chartData}
          cx="35%"
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
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconSize={10}
          wrapperStyle={{
            fontSize: '16px',
            maxWidth: '55%',
            overflowWrap: 'break-word',
            lineHeight: '1.6',
            color: isDark ? '#D1D5DB' : '#374151',
          }}
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
