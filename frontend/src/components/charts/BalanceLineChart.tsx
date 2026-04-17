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
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: number) => fmt(value)} />
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
