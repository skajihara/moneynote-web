package com.example.moneynote.domain.fixedtransaction.dto;

import com.example.moneynote.domain.fixedtransaction.IntervalType;
import com.example.moneynote.domain.transaction.TransactionType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FixedTransactionRequest(
        @NotBlank @Size(min = 1, max = 100) String fixedName,
        @NotNull TransactionType transactionType,
        @NotBlank String categoryId,
        @NotNull @Positive @DecimalMax(value = "999999999", message = "金額は999,999,999円以下で入力してください") BigDecimal amount,
        @NotNull @Min(1) @Max(28) int dayOfMonth,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        IntervalType intervalType,
        @Size(max = 500) String memo
) {}
