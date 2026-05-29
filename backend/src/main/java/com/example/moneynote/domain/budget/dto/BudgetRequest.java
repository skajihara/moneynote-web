package com.example.moneynote.domain.budget.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record BudgetRequest(
        @NotBlank String categoryId,
        @NotNull @Min(2000) @Max(2100) int year,
        @NotNull @Min(1) @Max(12) int month,
        @NotNull @Positive @DecimalMax(value = "999999999", message = "金額は999,999,999円以下で入力してください") BigDecimal amount
) {}
