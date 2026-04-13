package com.example.moneynote.domain.category.dto;

import com.example.moneynote.domain.category.CategoryType;

import java.math.BigDecimal;

public record CategorySummaryDto(
        String categoryId,
        String categoryName,
        CategoryType categoryType,
        String categoryIcon,
        String color,
        BigDecimal amount,
        double percentage
) {}
