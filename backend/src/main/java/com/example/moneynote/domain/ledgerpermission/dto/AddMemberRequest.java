package com.example.moneynote.domain.ledgerpermission.dto;

import com.example.moneynote.domain.ledgerpermission.PermissionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AddMemberRequest(
        @NotBlank String userId,
        @NotNull PermissionType permissionType
) {}
