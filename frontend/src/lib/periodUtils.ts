/**
 * 帳簿の月度開始日・年度開始月を考慮した期間計算ユーティリティ。
 *
 * startDayOfMonth = 1 (デフォルト): カレンダー月そのまま（1日〜末日）
 * startDayOfMonth = 25 の例: "4月" = 3/25〜4/24
 */

export type PeriodRange = {
  from: Date;
  to: Date;
  label: string;
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * year/month と startDayOfMonth から実際の集計期間を計算する。
 */
export function getPeriodRange(year: number, month: number, startDayOfMonth: number): PeriodRange {
  if (startDayOfMonth <= 1) {
    const lastDay = daysInMonth(year, month);
    return {
      from: new Date(year, month - 1, 1),
      to: new Date(year, month - 1, lastDay),
      label: `${year}年${month}月`,
    };
  }

  // 前月の startDayOfMonth 日〜当月の startDayOfMonth - 1 日
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const fromDay = Math.min(startDayOfMonth, daysInMonth(prevYear, prevMonth));
  const toDay = Math.min(startDayOfMonth - 1, daysInMonth(year, month));

  const from = new Date(prevYear, prevMonth - 1, fromDay);
  const to = new Date(year, month - 1, toDay);

  const fromLabel = `${prevMonth}/${fromDay}`;
  const toLabel = `${month}/${toDay}`;

  return {
    from,
    to,
    label: `${year}年${month}月 (${fromLabel}〜${toLabel})`,
  };
}

/**
 * 月セレクターの前月・翌月を計算する。
 */
export function prevYearMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextYearMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/**
 * startDayOfMonth を考慮した「現在の月度」を返す。
 * 今日の日付 < startDayOfMonth の場合は前月を返す。
 */
export function getCurrentYearMonth(startDayOfMonth: number): { year: number; month: number } {
  const today = new Date();
  if (startDayOfMonth > 1 && today.getDate() < startDayOfMonth) {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { year: prev.getFullYear(), month: prev.getMonth() + 1 };
  }
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}
