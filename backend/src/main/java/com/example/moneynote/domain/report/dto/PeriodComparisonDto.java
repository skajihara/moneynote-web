package com.example.moneynote.domain.report.dto;

import java.math.BigDecimal;

public record PeriodComparisonDto(
        BigDecimal incomeChange,
        BigDecimal expenseChange,
        double incomeChangeRate,
        double expenseChangeRate
) {}
