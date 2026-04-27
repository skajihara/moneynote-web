package com.example.moneynote.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank
        @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$",
            message = "パスワードは8文字以上で、英大文字・英小文字・数字・記号（!@#$%^&*）を各1文字以上含めてください"
        )
        String newPassword
) {}
