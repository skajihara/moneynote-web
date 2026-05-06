package com.example.moneynote.domain.admin.dto;

import com.example.moneynote.domain.user.User;

import java.time.LocalDateTime;

public record AdminUserResponse(
        String userId,
        String role,
        boolean isActive,
        LocalDateTime createdAt
) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getUserId(),
                user.getRole().name(),
                user.isActive(),
                user.getCreatedAt()
        );
    }
}
