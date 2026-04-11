package com.example.moneynote.domain.dashboard.dto;

import com.example.moneynote.domain.transaction.dto.TransactionResponse;

import java.util.List;

public record DashboardResponse(
        DashboardSummaryDto summary,
        List<CategoryBreakdownDto> categoryBreakdown,
        List<BudgetStatusDto> budgetStatus,
        List<TransactionResponse> recentTransactions
) {}
