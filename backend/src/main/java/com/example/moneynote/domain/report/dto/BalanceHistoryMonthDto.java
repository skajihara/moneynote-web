package com.example.moneynote.domain.report.dto;

import java.math.BigDecimal;

public record BalanceHistoryMonthDto(
        String yearMonth,
        BigDecimal income,
        BigDecimal expense,
        BigDecimal balance
) {}
