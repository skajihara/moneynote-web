package com.example.moneynote.domain.budget.dto;

import java.math.BigDecimal;

public record BudgetHeatmapItemDto(
        String categoryId,
        String categoryName,
        BigDecimal budgetAmount,
        BigDecimal actualAmount,
        double percentage,
        String status   // "NORMAL" / "WARNING" / "OVER"
) {}
