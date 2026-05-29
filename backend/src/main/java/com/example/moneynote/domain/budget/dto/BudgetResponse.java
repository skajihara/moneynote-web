package com.example.moneynote.domain.budget.dto;

import java.math.BigDecimal;

public record BudgetResponse(
        String budgetId,
        String categoryId,
        String categoryName,
        String categoryIcon,
        boolean categoryDeleted,
        BigDecimal budgetAmount,
        BigDecimal actualAmount,
        double percentage,
        String status,          // "NORMAL" / "WARNING" / "OVER"
        BigDecimal remainingAmount
) {}
