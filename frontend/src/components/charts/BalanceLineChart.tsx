'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { useThemeStore } from '@/stores/themeStore';

export type LineItem = {
  label: string;
  balance: number;
};

type Props = {
  data: LineItem[];
  height?: number;
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

// マイナスの残高は赤色ドット
const CustomDot = (props: {
  cx?: number;
  cy?: number;
  payload?: LineItem;
  r?: number;
}) => {
  const { cx, cy, payload, r = 4 } = props;
  if (cx == null || cy == null || payload == null) return null;
  const fill = payload.balance < 0 ? '#EF4444' : '#16A34A';
  return <Dot cx={cx} cy={cy} r={r} fill={fill} stroke="white" strokeWidth={1} />;
};

const BalanceLineChart = ({ data, height = 240 }: Props) => {
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
        <XAxis dataKey="label" tick={{ fontSize: 16, fill: tickColor }} />
        <YAxis
          tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
          tick={{ fontSize: 16, fill: tickColor }}
        />
        <Tooltip formatter={(value: number) => fmt(value)} contentStyle={tooltipStyle} />
        <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="balance"
          name="残高"
          stroke="#16A34A"
          strokeWidth={2}
          dot={<CustomDot />}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default BalanceLineChart;
