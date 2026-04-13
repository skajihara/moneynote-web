package com.example.moneynote.domain.category.dto;

import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryType;

public record CategoryInfoDto(
        String categoryId,
        String categoryName,
        CategoryType categoryType,
        String categoryIcon,
        String color
) {
    public static CategoryInfoDto from(Category category) {
        return new CategoryInfoDto(
                category.getCategoryId(),
                category.getCategoryName(),
                category.getCategoryType(),
                category.getIcon(),
                category.getColor()
        );
    }
}
