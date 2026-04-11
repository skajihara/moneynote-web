package com.example.moneynote.domain.dashboard.dto;

import java.math.BigDecimal;

public record DashboardSummaryDto(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal netBalance,
        BigDecimal currentBalance,
        BigDecimal carryOver
) {}
