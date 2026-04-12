package com.example.moneynote.domain.report.dto;

import java.math.BigDecimal;

public record MonthDataDto(
        int month,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal netBalance,
        BigDecimal balance
) {}
