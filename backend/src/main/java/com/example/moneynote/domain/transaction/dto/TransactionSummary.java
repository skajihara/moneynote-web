package com.example.moneynote.domain.transaction.dto;

import java.math.BigDecimal;

public record TransactionSummary(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal netBalance
) {}
