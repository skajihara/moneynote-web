package com.example.moneynote.domain.category.dto;

import com.example.moneynote.domain.category.CategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CategoryRequest {

    @NotBlank(message = "カテゴリ名は必須です")
    @Size(min = 1, max = 50, message = "カテゴリ名は1〜50文字で入力してください")
    private String categoryName;

    @NotNull(message = "カテゴリ種別は必須です")
    private CategoryType categoryType;

    private String icon;

    private String color;
}
