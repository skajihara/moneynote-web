package com.example.moneynote.domain.ai.dto;

import com.example.moneynote.domain.aiadvicecache.PeriodType;

import java.util.List;

public record AiSummaryResponse(
        PeriodType period,
        PeriodSummaryDto periodSummary,
        List<MonthlyTrendDto> monthlyTrend,
        List<CategoryBreakdownAiDto> categoryBreakdown,
        List<CategoryBreakdownAiDto> prevCategoryBreakdown,
        List<BudgetComparisonDto> budgetComparison,
        PrevPeriodComparisonDto prevPeriodComparison
) {}
