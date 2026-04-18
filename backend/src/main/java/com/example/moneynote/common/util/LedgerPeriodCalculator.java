package com.example.moneynote.common.util;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * 帳簿の月度開始日・年度開始月を考慮した期間計算ユーティリティ。
 *
 * startDayOfMonth=1 (デフォルト): カレンダー月そのまま（1日〜末日）
 * startDayOfMonth=20 の例:
 *   "4月" = 3/20〜4/19
 *   "5月" = 4/20〜5/19
 *
 * startMonthOfYear=4 の例:
 *   "2026年度" = 2026/4/1〜2027/3/31
 */
public final class LedgerPeriodCalculator {

    private LedgerPeriodCalculator() {}

    public record LocalDateRange(LocalDate from, LocalDate to) {}

    /**
     * 指定年月と月度開始日から実際の集計期間を計算する。
     *
     * @param year            年
     * @param month           月（1〜12）
     * @param startDayOfMonth 月度開始日（1〜28）
     * @return 実際の from/to 日付範囲
     */
    public static LocalDateRange getMonthPeriod(int year, int month, int startDayOfMonth) {
        if (startDayOfMonth <= 1) {
            YearMonth ym = YearMonth.of(year, month);
            return new LocalDateRange(ym.atDay(1), ym.atEndOfMonth());
        }

        // from: 前月の startDayOfMonth 日（前月末日を超えない）
        YearMonth prevYm = YearMonth.of(year, month).minusMonths(1);
        int fromDay = Math.min(startDayOfMonth, prevYm.lengthOfMonth());
        LocalDate from = prevYm.atDay(fromDay);

        // to: 当月の startDayOfMonth - 1 日（当月末日を超えない）
        YearMonth curYm = YearMonth.of(year, month);
        int toDay = Math.min(startDayOfMonth - 1, curYm.lengthOfMonth());
        LocalDate to = curYm.atDay(toDay);

        return new LocalDateRange(from, to);
    }

    /**
     * 指定年度の開始日・終了日を返す。
     * 年度は startMonthOfYear から始まる 12 ヶ月分。
     *
     * @param year             年度の基準年
     * @param startMonthOfYear 年度開始月（1〜12）
     * @param startDayOfMonth  月度開始日（1〜28）
     * @return 年度全体の from/to 日付範囲
     */
    public static LocalDateRange getAnnualPeriod(int year, int startMonthOfYear, int startDayOfMonth) {
        // 年度の最初の月
        LocalDateRange firstMonth = getMonthPeriod(year, startMonthOfYear, startDayOfMonth);
        // 年度の最後の月（開始月から11ヶ月後）
        YearMonth lastYM = YearMonth.of(year, startMonthOfYear).plusMonths(11);
        LocalDateRange lastMonth = getMonthPeriod(lastYM.getYear(), lastYM.getMonthValue(), startDayOfMonth);
        return new LocalDateRange(firstMonth.from(), lastMonth.to());
    }

    /**
     * 今日の日付から「現在の月度」の年月を返す。
     *
     * 例: 今日=2026-04-15, startDayOfMonth=20 → 2026年3月（3/20〜4/19 の期間）
     * 例: 今日=2026-04-25, startDayOfMonth=20 → 2026年4月（4/20〜5/19 の期間）
     *
     * @param startDayOfMonth 月度開始日（1〜28）
     * @return 現在の月度を表す YearMonth
     */
    public static YearMonth getCurrentMonth(int startDayOfMonth) {
        LocalDate today = LocalDate.now();
        if (startDayOfMonth <= 1 || today.getDayOfMonth() >= startDayOfMonth) {
            return YearMonth.from(today);
        }
        // 今日の日 < startDayOfMonth → 現在の月度は前の暦月
        return YearMonth.from(today).minusMonths(1);
    }
}
