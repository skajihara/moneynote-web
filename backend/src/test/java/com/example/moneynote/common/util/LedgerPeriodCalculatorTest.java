package com.example.moneynote.common.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;

class LedgerPeriodCalculatorTest {

    // =========================================================================
    // getMonthPeriod
    // =========================================================================

    @Test
    void getMonthPeriod_startDay1_returnsCalendarMonth() {
        var range = LedgerPeriodCalculator.getMonthPeriod(2026, 4, 1);
        assertThat(range.from()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(range.to()).isEqualTo(LocalDate.of(2026, 4, 30));
    }

    @Test
    void getMonthPeriod_startDay20_april() {
        // "4月" = 3/20〜4/19
        var range = LedgerPeriodCalculator.getMonthPeriod(2026, 4, 20);
        assertThat(range.from()).isEqualTo(LocalDate.of(2026, 3, 20));
        assertThat(range.to()).isEqualTo(LocalDate.of(2026, 4, 19));
    }

    @Test
    void getMonthPeriod_startDay20_january() {
        // "1月" = 前年12/20〜1/19
        var range = LedgerPeriodCalculator.getMonthPeriod(2026, 1, 20);
        assertThat(range.from()).isEqualTo(LocalDate.of(2025, 12, 20));
        assertThat(range.to()).isEqualTo(LocalDate.of(2026, 1, 19));
    }

    @Test
    void getMonthPeriod_startDay28_february() {
        // "2月" = 1/28〜2/27 (平年)
        var range = LedgerPeriodCalculator.getMonthPeriod(2026, 2, 28);
        assertThat(range.from()).isEqualTo(LocalDate.of(2026, 1, 28));
        assertThat(range.to()).isEqualTo(LocalDate.of(2026, 2, 27));
    }

    @Test
    void getMonthPeriod_startDay28_march_clampsToFebEnd() {
        // "3月" = 2/28〜3/27 (平年: 2月は28日まで)
        var range = LedgerPeriodCalculator.getMonthPeriod(2026, 3, 28);
        assertThat(range.from()).isEqualTo(LocalDate.of(2026, 2, 28));
        assertThat(range.to()).isEqualTo(LocalDate.of(2026, 3, 27));
    }

    @Test
    void getMonthPeriod_startDay28_march_leapYear() {
        // うるう年: "3月" = 2/28〜3/27 (2028年2月は29日まで → from = 2/28 clamp)
        var range = LedgerPeriodCalculator.getMonthPeriod(2028, 3, 28);
        assertThat(range.from()).isEqualTo(LocalDate.of(2028, 2, 28));
        assertThat(range.to()).isEqualTo(LocalDate.of(2028, 3, 27));
    }

    // =========================================================================
    // getAnnualPeriod
    // =========================================================================

    @Test
    void getAnnualPeriod_startMonth1_startDay1() {
        // カレンダー年そのまま: 1/1〜12/31
        var range = LedgerPeriodCalculator.getAnnualPeriod(2026, 1, 1);
        assertThat(range.from()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(range.to()).isEqualTo(LocalDate.of(2026, 12, 31));
    }

    @Test
    void getAnnualPeriod_startMonth4_startDay1() {
        // 4月始まり: 2026/4/1〜2027/3/31
        var range = LedgerPeriodCalculator.getAnnualPeriod(2026, 4, 1);
        assertThat(range.from()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(range.to()).isEqualTo(LocalDate.of(2027, 3, 31));
    }

    @Test
    void getAnnualPeriod_startMonth4_startDay20() {
        // 4月始まり・開始日20: 2026/3/20〜2027/3/19
        var range = LedgerPeriodCalculator.getAnnualPeriod(2026, 4, 20);
        assertThat(range.from()).isEqualTo(LocalDate.of(2026, 3, 20));
        assertThat(range.to()).isEqualTo(LocalDate.of(2027, 3, 19));
    }

    @Test
    void getAnnualPeriod_startMonth1_startDay20() {
        // 1月始まり・開始日20: 前年12/20〜当年12/19
        var range = LedgerPeriodCalculator.getAnnualPeriod(2026, 1, 20);
        assertThat(range.from()).isEqualTo(LocalDate.of(2025, 12, 20));
        assertThat(range.to()).isEqualTo(LocalDate.of(2026, 12, 19));
    }

    // =========================================================================
    // getCurrentMonth
    // =========================================================================

    @Test
    void getCurrentMonth_startDay1_returnsCurrentCalendarMonth() {
        YearMonth result = LedgerPeriodCalculator.getCurrentMonth(1);
        assertThat(result).isEqualTo(YearMonth.now());
    }
}
