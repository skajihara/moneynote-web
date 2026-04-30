package com.example.moneynote.domain.ledger.dto;

import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.ledgerpermission.PermissionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LedgerResponse(
        String ledgerId,
        String ownerUserId,
        String ledgerName,
        BigDecimal initialBalance,
        short startDayOfMonth,
        short startMonthOfYear,
        String themeColor,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        PermissionType myPermissionType
) {
    public static LedgerResponse from(Ledger ledger, PermissionType myPermissionType) {
        return new LedgerResponse(
                ledger.getLedgerId(),
                ledger.getOwner().getUserId(),
                ledger.getLedgerName(),
                ledger.getInitialBalance(),
                ledger.getStartDayOfMonth(),
                ledger.getStartMonthOfYear(),
                ledger.getThemeColor(),
                ledger.isActive(),
                ledger.getCreatedAt(),
                ledger.getUpdatedAt(),
                myPermissionType
        );
    }
}
