package com.example.moneynote.domain.transaction.dto;

import com.example.moneynote.domain.transaction.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionRequest(

        @NotNull(message = "種別は必須です")
        TransactionType transactionType,

        @NotNull(message = "金額は必須です")
        @DecimalMin(value = "0.01", message = "金額は0より大きい値を入力してください")
        BigDecimal amount,

        @NotNull(message = "日付は必須です")
        LocalDate transactionDate,

        @NotBlank(message = "カテゴリIDは必須です")
        String categoryId,

        @Size(max = 500, message = "メモは500文字以内で入力してください")
        String memo
) {}
