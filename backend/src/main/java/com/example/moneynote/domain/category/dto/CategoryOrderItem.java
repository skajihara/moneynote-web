package com.example.moneynote.domain.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CategoryOrderItem {

    @NotBlank(message = "カテゴリIDは必須です")
    private String categoryId;

    @NotNull(message = "表示順は必須です")
    private Integer displayOrder;
}
