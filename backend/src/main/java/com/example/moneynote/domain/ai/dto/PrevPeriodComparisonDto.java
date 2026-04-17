package com.example.moneynote.domain.ai.dto;

import java.math.BigDecimal;

public record PrevPeriodComparisonDto(
        BigDecimal incomeChange,
        BigDecimal expenseChange,
        double incomeChangeRate,
        double expenseChangeRate
) {}
