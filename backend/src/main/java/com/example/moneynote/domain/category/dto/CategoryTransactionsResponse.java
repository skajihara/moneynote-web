package com.example.moneynote.domain.category.dto;

import com.example.moneynote.domain.transaction.dto.TransactionResponse;

import java.util.List;

public record CategoryTransactionsResponse(
        CategoryInfoDto category,
        List<CategoryTrendDto> monthlyTrend,
        List<TransactionResponse> transactions
) {}
