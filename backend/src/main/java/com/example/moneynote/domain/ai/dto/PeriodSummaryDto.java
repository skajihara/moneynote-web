package com.example.moneynote.domain.ai.dto;

import java.math.BigDecimal;

public record PeriodSummaryDto(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal netBalance,
        BigDecimal avgMonthlyIncome,
        BigDecimal avgMonthlyExpense
) {}
