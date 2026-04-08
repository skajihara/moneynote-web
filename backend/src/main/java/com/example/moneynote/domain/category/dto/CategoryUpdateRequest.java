package com.example.moneynote.domain.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CategoryUpdateRequest {

    @NotBlank(message = "カテゴリ名は必須です")
    @Size(min = 1, max = 50, message = "カテゴリ名は1〜50文字で入力してください")
    private String categoryName;

    private String icon;

    private String color;
}
