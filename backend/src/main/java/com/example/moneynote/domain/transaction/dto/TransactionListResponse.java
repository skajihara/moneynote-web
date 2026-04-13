package com.example.moneynote.domain.transaction.dto;

import java.util.List;

public record TransactionListResponse(
        TransactionSummary summary,
        List<DailySummary> dailySummaries,
        List<TransactionResponse> transactions
) {}
