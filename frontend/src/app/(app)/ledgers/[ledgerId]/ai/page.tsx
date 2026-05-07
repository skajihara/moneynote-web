'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLedgerStore } from '@/stores/ledgerStore';
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getAiSummary, analyzeAi, getAiScore } from '@/lib/api/ai';
import { useToastStore } from '@/stores/toastStore';
import { useThemeStore } from '@/stores/themeStore';
import { ApiClientError } from '@/lib/api/client';
import type { AiSummary, AiAnalysisResult, AiScore, PeriodType, AdviceType } from '@/types/ai';

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'ONE_MONTH',     label: '1ヶ月' },
  { value: 'THREE_MONTHS',  label: '3ヶ月' },
  { value: 'TWELVE_MONTHS', label: '12ヶ月' },
];

const ADVICE_BUTTONS: { adviceType: AdviceType; label: string; description: string }[] = [
  {
    adviceType: 'INSIGHT',
    label: '🔍 家計を診断する',
    description: '直近の収支データをもとに、家計の傾向や気になるポイントをAIが分析します。',
  },
  {
    adviceType: 'ADVICE',
    label: '💡 節約アドバイスを見る',
    description: '支出パターンと予算の達成状況をもとに、具体的な節約方法をAIが提案します。',
  },
  {
    adviceType: 'FORECAST',
    label: '📈 来月を予測する',
    description: '過去の収支トレンドをもとに、来月の支出をAIが予測します。',
  },
];

const PERIOD_LABEL: Record<PeriodType, string> = {
  ONE_MONTH:     '1ヶ月',
  THREE_MONTHS:  '3ヶ月',
  TWELVE_MONTHS: '12ヶ月',
};

const fmt = (n: number) =>
  n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

// =========================================================================
// スコアカード
// =========================================================================
const GRADE_CONFIG = {
  EXCELLENT: { emoji: '🟢', label: '優秀',     bg: 'bg-green-50 dark:bg-green-900/20',  border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400' },
  GOOD:      { emoji: '🟡', label: '良好',     bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-400' },
  CAUTION:   { emoji: '🟠', label: '要注意',   bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400' },
  POOR:      { emoji: '🔴', label: '改善が必要', bg: 'bg-red-50 dark:bg-red-900/20',   border: 'border-red-200 dark:border-red-800',   text: 'text-red-700 dark:text-red-400' },
};

const ScoreBar = ({ score, max = 25 }: { score: number; max?: number }) => {
  const pct = Math.min(100, (score / max) * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
};

type ScoreDescription = { summary: string; formula: string };

const SCORE_DESCRIPTIONS: Record<string, ScoreDescription> = {
  '収支バランス': {
    summary: '今月の収入に対して支出が適切かを評価します。',
    formula: '収支 ≥ 0 → 25点　収支 < 0 → 赤字幅に比例して減点（赤字率100%で0点）',
  },
  '予算達成率': {
    summary: '設定した予算に対するカテゴリ別消化率の平均で評価します。',
    formula: '平均消化率 ≤ 80% → 25点　≥ 120% → 0点　その間は比例',
  },
  '貯蓄率': {
    summary: '収入のうち何%を貯蓄できているかを評価します。',
    formula: '貯蓄率 = (収入 − 支出) ÷ 収入 × 100　貯蓄率 ≥ 20% → 25点　0%で0点',
  },
  '支出安定度': {
    summary: '過去3ヶ月の支出の変動の小ささを評価します。',
    formula: '変動係数 CV = 標準偏差 ÷ 平均　CV ≤ 0 → 25点　CV ≥ 0.5 → 0点　その間は比例',
  },
};

const ScoreCard = ({ score }: { score: AiScore }) => {
  const cfg = GRADE_CONFIG[score.grade];
  return (
    <section className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">家計健全度スコア</h2>
        {score.scoreDiff !== null && (
          <span className={`text-xs font-medium ${score.scoreDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            先月比 {score.scoreDiff >= 0 ? '+' : ''}{score.scoreDiff}点 {score.scoreDiff >= 0 ? '↑' : '↓'}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        収支バランス・予算達成率・貯蓄率・支出安定度の4項目から家計の健全度を100点満点で評価します。
      </p>
      <div className="flex items-end gap-3 mb-4">
        <span className="text-5xl font-bold text-gray-800 dark:text-gray-100">{score.totalScore}</span>
        <div className="mb-1">
          <span className="text-base">{cfg.emoji}</span>
          <span className={`ml-1 text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
        </div>
      </div>
      <div className="space-y-3">
        {[
          { label: '収支バランス', val: score.breakdown.balanceScore },
          { label: '予算達成率',   val: score.breakdown.budgetScore },
          { label: '貯蓄率',       val: score.breakdown.savingsScore },
          { label: '支出安定度',   val: score.breakdown.stabilityScore },
        ].map(({ label, val }) => (
          <div key={label}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-20 shrink-0">{label}</span>
              <ScoreBar score={val} />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{val}/25</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500 leading-relaxed pl-0.5">
              {SCORE_DESCRIPTIONS[label].summary}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono leading-relaxed pl-0.5">
              {SCORE_DESCRIPTIONS[label].formula}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

// =========================================================================
// トレンド分析
// =========================================================================

// 線形回帰で翌月を予測
const predictNext = (values: number[]): number | null => {
  const n = values.length;
  if (n < 2) return null;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((s, y, i) => s + i * y, 0);
  const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return values[n - 1];
  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return Math.round(m * n + b);
};

type TrendPoint = {
  label: string;
  netBalance?: number;
  predicted?: number;
};

const CHART_DESCRIPTIONS: Record<PeriodType, string> = {
  ONE_MONTH:     '今月と先月の収入・支出を比較します。赤いバッジは支出が増えたカテゴリ、緑は減ったカテゴリです。',
  THREE_MONTHS:  '直近3ヶ月の収支バランス（収入−支出）の推移と、線形回帰による来月の予測値（点線）を表示します。',
  TWELVE_MONTHS: '直近12ヶ月の収支バランスの長期推移と、線形回帰による来月の予測値（点線）を表示します。季節変動の把握に役立ててください。',
};

const TrendAnalysis = ({ summary }: { summary: AiSummary }) => {
  const period = summary.period;
  const isDark = useThemeStore((s) => s.isDark);
  const gridColor = isDark ? '#374151' : '#E5E7EB';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1F2937' : '#ffffff',
    borderColor: isDark ? '#374151' : '#E5E7EB',
    color: isDark ? '#F9FAFB' : '#111827',
  };

  // カテゴリ別増減バッジ（全期間共通）
  const currentMap = new Map(summary.categoryBreakdown.map((c) => [c.categoryName, c.totalAmount]));
  const prevMap = new Map(summary.prevCategoryBreakdown.map((c) => [c.categoryName, c.totalAmount]));
  const allNames = Array.from(new Set([...currentMap.keys(), ...prevMap.keys()]));

  const categoryChanges = allNames.map((name) => {
    const cur = currentMap.get(name) ?? 0;
    const prev = prevMap.get(name) ?? 0;
    const changeRate = prev === 0
      ? (cur > 0 ? 100 : 0)
      : ((cur - prev) / prev) * 100;
    return { name, cur, prev, changeRate };
  }).sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));

  // 1ヶ月: 今月 vs 先月 収入・支出 比較棒グラフ
  const ps = summary.periodSummary;
  const ppc = summary.prevPeriodComparison;
  const prevIncome = Math.max(0, ps.totalIncome - ppc.incomeChange);
  const prevExpense = Math.max(0, ps.totalExpense - ppc.expenseChange);
  const comparisonData = [
    { name: '先月', income: prevIncome, expense: prevExpense },
    { name: '今月', income: ps.totalIncome, expense: ps.totalExpense },
  ];

  // 3・12ヶ月: 収支折れ線＋予測点線
  const trend = summary.monthlyTrend;
  const netBalances = trend.map((t) => t.netBalance);
  const predicted = predictNext(netBalances);

  const lineData: TrendPoint[] = trend.map((t, i) => ({
    label: t.yearMonth.slice(5),
    netBalance: t.netBalance,
    predicted: i === trend.length - 1 && predicted !== null ? t.netBalance : undefined,
  }));
  if (predicted !== null && trend.length > 0) {
    const lastYM = trend[trend.length - 1].yearMonth;
    const [, m] = lastYM.split('-').map(Number);
    const nextM = m === 12 ? 1 : m + 1;
    lineData.push({
      label: String(nextM).padStart(2, '0') + '(予測)',
      predicted,
    });
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-4">
      <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">トレンド分析</h2>
      <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500 leading-relaxed">{CHART_DESCRIPTIONS[period]}</p>

      {/* カテゴリ別増減バッジ */}
      {categoryChanges.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            {period === 'ONE_MONTH' ? '今月 vs 先月 カテゴリ別支出変化' : '当期 vs 前期 カテゴリ別支出変化'}
          </p>
          <div className="flex flex-wrap gap-2">
            {categoryChanges.map(({ name, changeRate }) => {
              const up = changeRate > 0;
              const zero = changeRate === 0;
              return (
                <span
                  key={name}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                    zero
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      : up
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  }`}
                >
                  {name} {zero ? '→' : up ? '↑' : '↓'}{Math.abs(changeRate).toFixed(0)}%
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* グラフ */}
      {period === 'ONE_MONTH' ? (
        /* 今月 vs 先月 比較棒グラフ */
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">収入・支出 今月 vs 先月</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={comparisonData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 16, fill: tickColor }} />
              <YAxis
                tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
                tick={{ fontSize: 16, fill: tickColor }}
                width={40}
              />
              <Tooltip formatter={(value: number) => fmt(value)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 16, color: isDark ? '#D1D5DB' : '#374151' }} />
              <Bar dataKey="income" name="収入" fill="#16A34A" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* 収支傾向ライン＋予測 */
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">月次収支（収入−支出）と来月予測（点線）</p>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 16, fill: tickColor }} />
              <YAxis
                tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
                tick={{ fontSize: 16, fill: tickColor }}
                width={40}
              />
              <Tooltip formatter={(value: number) => fmt(value)} contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="netBalance"
                name="収支"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name="予測"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3, strokeDasharray: '' }}
                connectNulls={true}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

// =========================================================================
// AI アドバイスカード
// =========================================================================
type AdviceCardProps = {
  ledgerId: string;
  period: PeriodType;
  adviceType: AdviceType;
  label: string;
  description: string;
};

const AdviceCard = ({ ledgerId, period, adviceType, label, description }: AdviceCardProps) => {
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { add: addToast } = useToastStore();

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await analyzeAi(ledgerId, period, adviceType);
      setResult(res.data);
    } catch (e) {
      addToast('error', e instanceof ApiClientError ? e.error.message : 'AI分析に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-md px-4 py-2 text-sm font-medium btn-theme disabled:opacity-50"
        aria-label={label}
      >
        {loading
          ? <span className="inline-flex items-center gap-2"><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />分析中...</span>
          : label}
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        送信データ: 直近{PERIOD_LABEL[period]}の収支・カテゴリ・予算データ
      </p>

      {result && (
        <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-gray-700">
          {result.fromCache && (
            <p className="text-xs text-gray-400 dark:text-gray-500">キャッシュから取得</p>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {result.adviceText}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            生成日時: {new Date(result.generatedAt).toLocaleString('ja-JP')}
          </p>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// メインコンテンツ
// =========================================================================
const AiContent = () => {
  const params = useParams<{ ledgerId: string }>();
  const ledgerId = params.ledgerId;
  const getSelectedLedger = useLedgerStore((s) => s.getSelectedLedger);
  const ledger = getSelectedLedger();

  const [period, setPeriod] = useState<PeriodType>('ONE_MONTH');
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [score, setScore] = useState<AiScore | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, scoreRes] = await Promise.all([
        getAiSummary(ledgerId, period),
        getAiScore(ledgerId),
      ]);
      setSummary(summaryRes.data);
      setScore(scoreRes.data);
    } finally {
      setLoading(false);
    }
  }, [ledgerId, period]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* スコアカード（常時表示・最上部） */}
      {score && <ScoreCard score={score} />}

      {/* 期間セレクター */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">期間:</span>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              period === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            aria-label={opt.label}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading || !summary ? (
        <div className="text-center text-gray-400 py-8">読み込み中...</div>
      ) : (
        <>
          {/* トレンド分析 */}
          <TrendAnalysis summary={summary} />

          {/* AI アドバイス */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">AIアドバイス</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              ボタンを押すと AI が分析します。結果は24時間キャッシュされます。
            </p>
            {ADVICE_BUTTONS.map((btn) => (
              <AdviceCard
                key={btn.adviceType}
                ledgerId={ledgerId}
                period={period}
                adviceType={btn.adviceType}
                label={btn.label}
                description={btn.description}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
};

const AiPage = () => (
  <Suspense fallback={<div className="text-center text-gray-400 py-8">読み込み中...</div>}>
    <AiContent />
  </Suspense>
);

export default AiPage;
