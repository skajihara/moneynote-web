package com.example.moneynote.domain.ai.dto;

import java.math.BigDecimal;

public record CategoryBreakdownAiDto(
        String categoryName,
        BigDecimal totalAmount,
        double percentage
) {}
