package com.example.moneynote.domain.dashboard.dto;

import java.math.BigDecimal;

public record BudgetStatusDto(
        String categoryId,
        String categoryName,
        String categoryIcon,
        BigDecimal budgetAmount,
        BigDecimal actualAmount,
        double percentage,
        String status  // "NORMAL" / "WARNING" / "OVER"
) {}
