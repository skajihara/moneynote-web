package com.example.moneynote.domain.fixedtransaction.dto;

import com.example.moneynote.domain.fixedtransaction.FixedTransaction;
import com.example.moneynote.domain.transaction.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FixedTransactionResponse(
        String fixedTransactionId,
        String fixedName,
        TransactionType transactionType,
        String categoryId,
        String categoryName,
        String categoryIcon,
        BigDecimal amount,
        int dayOfMonth,
        LocalDate startDate,
        LocalDate endDate,
        boolean isActive,
        boolean isExpired,
        String memo
) {
    public static FixedTransactionResponse from(FixedTransaction f) {
        String catId   = f.getCategory() != null ? f.getCategory().getCategoryId()   : null;
        String catName = f.getCategory() != null ? f.getCategory().getCategoryName() : null;
        String catIcon = f.getCategory() != null ? f.getCategory().getIcon()         : null;
        boolean expired = f.getEndDate() != null && f.getEndDate().isBefore(LocalDate.now());
        return new FixedTransactionResponse(
                f.getFixedTransactionId(),
                f.getFixedName(),
                f.getTransactionType(),
                catId,
                catName,
                catIcon,
                f.getAmount(),
                f.getDayOfMonth(),
                f.getStartDate(),
                f.getEndDate(),
                f.isActive(),
                expired,
                f.getMemo()
        );
    }
}
