package com.example.moneynote.domain.report.dto;

import java.math.BigDecimal;

public record MonthlyReportResponse(
        int year,
        int month,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal netBalance,
        BigDecimal carryOver,
        BigDecimal currentBalance,
        PeriodComparisonDto prevMonthComparison,
        PeriodComparisonDto prevYearComparison
) {}
