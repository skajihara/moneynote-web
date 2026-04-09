package com.example.moneynote.domain.transaction.dto;

import jakarta.validation.constraints.NotNull;

public record DeleteTransactionRequest(
        @NotNull(message = "scope は必須です")
        DeleteScope scope
) {
    public enum DeleteScope {
        SINGLE,
        ALL
    }
}
