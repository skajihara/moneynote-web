package com.example.moneynote.domain.user.dto;

import com.example.moneynote.domain.user.User;

public record UserProfileResponse(
        String userId,
        String userName,
        String email,
        String themeColor,
        String role
) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getUserId(),
                user.getUserName(),
                user.getEmail(),
                user.getThemeColor(),
                user.getRole().name()
        );
    }
}
