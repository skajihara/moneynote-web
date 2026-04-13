package com.example.moneynote.domain.fixedtransaction.dto;

import com.example.moneynote.domain.transaction.TransactionType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FixedTransactionRequest(
        @NotBlank @Size(min = 1, max = 100) String fixedName,
        @NotNull TransactionType transactionType,
        @NotBlank String categoryId,
        @NotNull @Positive BigDecimal amount,
        @NotNull @Min(1) @Max(28) int dayOfMonth,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @Size(max = 500) String memo
) {}
