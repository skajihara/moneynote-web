package com.example.moneynote.domain.ledgerpermission.dto;

import com.example.moneynote.domain.ledgerpermission.LedgerPermission;
import com.example.moneynote.domain.ledgerpermission.PermissionType;

import java.time.LocalDateTime;

public record MemberResponse(
        String permissionId,
        String userId,
        String userName,
        PermissionType permissionType,
        LocalDateTime grantedAt
) {
    public static MemberResponse from(LedgerPermission lp) {
        return new MemberResponse(
                lp.getPermissionId(),
                lp.getUser().getUserId(),
                lp.getUser().getUserName(),
                lp.getPermissionType(),
                lp.getGrantedAt()
        );
    }
}
