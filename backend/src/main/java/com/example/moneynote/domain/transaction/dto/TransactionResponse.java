package com.example.moneynote.domain.transaction.dto;

import com.example.moneynote.domain.category.CategoryType;
import com.example.moneynote.domain.transaction.Transaction;
import com.example.moneynote.domain.transaction.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionResponse(
        String transactionId,
        LocalDate transactionDate,
        TransactionType transactionType,
        BigDecimal amount,
        String categoryId,
        String categoryName,
        CategoryType categoryType,
        String categoryIcon,
        String memo,
        boolean isFixedOrigin,
        String fixedTransactionId
) {
    public static TransactionResponse from(Transaction t) {
        String catId   = t.getCategory() != null ? t.getCategory().getCategoryId()   : null;
        String catName = t.getCategory() != null ? t.getCategory().getCategoryName() : null;
        CategoryType catType = t.getCategory() != null ? t.getCategory().getCategoryType() : null;
        String catIcon = t.getCategory() != null ? t.getCategory().getIcon()         : null;
        String fixedId = t.getFixedTransaction() != null
                ? t.getFixedTransaction().getFixedTransactionId() : null;
        return new TransactionResponse(
                t.getTransactionId(),
                t.getTransactionDate(),
                t.getTransactionType(),
                t.getAmount(),
                catId,
                catName,
                catType,
                catIcon,
                t.getMemo(),
                t.isFixedOrigin(),
                fixedId
        );
    }
}
