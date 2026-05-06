package com.example.moneynote.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AdminChangeRoleRequest(
        @NotBlank(message = "ロールは必須です")
        @Pattern(regexp = "^(USER|SYSTEM_ADMIN)$", message = "ロールは USER または SYSTEM_ADMIN です")
        String role
) {}
