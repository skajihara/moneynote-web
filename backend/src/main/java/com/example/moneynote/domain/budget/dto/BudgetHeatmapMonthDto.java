package com.example.moneynote.domain.budget.dto;

import java.util.List;

/**
 * ヒートマップ1ヶ月分のデータ
 * yearMonth: "2026-04" 形式（新しい月が先頭）
 */
public record BudgetHeatmapMonthDto(
        String yearMonth,
        List<BudgetHeatmapItemDto> budgets
) {}
