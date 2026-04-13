package com.example.moneynote.domain.report.dto;

import java.math.BigDecimal;

public record BalanceHistoryDto(
        int month,
        BigDecimal balance
) {}
