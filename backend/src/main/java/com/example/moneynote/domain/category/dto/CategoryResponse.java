package com.example.moneynote.domain.category.dto;

import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryType;

public record CategoryResponse(
        String categoryId,
        String ledgerId,
        String categoryName,
        CategoryType categoryType,
        String icon,
        String color,
        short displayOrder,
        boolean isDefault,
        boolean isActive
) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getCategoryId(),
                category.getLedger().getLedgerId(),
                category.getCategoryName(),
                category.getCategoryType(),
                category.getIcon(),
                category.getColor(),
                category.getDisplayOrder(),
                category.isDefault(),
                category.isActive()
        );
    }
}
