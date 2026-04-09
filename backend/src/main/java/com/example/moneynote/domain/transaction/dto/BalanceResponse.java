package com.example.moneynote.domain.transaction.dto;

import java.math.BigDecimal;

public record BalanceResponse(
        BigDecimal initialBalance,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal currentBalance,
        BigDecimal carryOver
) {}
