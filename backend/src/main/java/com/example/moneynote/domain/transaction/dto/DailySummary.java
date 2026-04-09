package com.example.moneynote.domain.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailySummary(
        LocalDate date,
        BigDecimal totalIncome,
        BigDecimal totalExpense
) {}
