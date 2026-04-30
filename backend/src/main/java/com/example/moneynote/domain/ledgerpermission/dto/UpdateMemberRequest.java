package com.example.moneynote.domain.ledgerpermission.dto;

import com.example.moneynote.domain.ledgerpermission.PermissionType;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberRequest(
        @NotNull PermissionType permissionType
) {}
