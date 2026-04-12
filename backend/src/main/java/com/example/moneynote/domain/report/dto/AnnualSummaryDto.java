package com.example.moneynote.domain.report.dto;

import java.math.BigDecimal;

public record AnnualSummaryDto(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal netBalance
) {}
