package com.example.moneynote.domain.dashboard.dto;

import com.example.moneynote.domain.category.CategoryType;

import java.math.BigDecimal;

public record CategoryBreakdownDto(
        String categoryId,
        String categoryName,
        CategoryType categoryType,
        String categoryIcon,
        String color,
        BigDecimal amount,
        double percentage
) {}
