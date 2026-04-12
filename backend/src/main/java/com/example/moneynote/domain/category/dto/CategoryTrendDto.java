package com.example.moneynote.domain.category.dto;

import java.math.BigDecimal;

/** 月別推移の1点（month は "2026-01" 形式）*/
public record CategoryTrendDto(
        String month,
        BigDecimal amount
) {}
