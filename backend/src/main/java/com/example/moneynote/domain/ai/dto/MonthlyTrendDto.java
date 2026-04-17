package com.example.moneynote.domain.ai.dto;

import java.math.BigDecimal;

public record MonthlyTrendDto(
        String yearMonth,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal netBalance
) {}
