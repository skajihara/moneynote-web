package com.example.moneynote.domain.ai.dto;

import java.math.BigDecimal;

public record BudgetComparisonDto(
        String categoryName,
        BigDecimal budgetAmount,
        BigDecimal actualAmount,
        double percentage,
        String status
) {}
