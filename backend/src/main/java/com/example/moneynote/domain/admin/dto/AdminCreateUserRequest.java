package com.example.moneynote.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminCreateUserRequest(
        @NotBlank(message = "ユーザーIDは必須です")
        @Size(min = 3, max = 20, message = "ユーザーIDは3〜20文字です")
        @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "ユーザーIDは半角英数字とアンダースコアのみ使用可能です")
        String userId,

        @NotBlank(message = "パスワードは必須です")
        @Size(min = 8, max = 100, message = "パスワードは8文字以上です")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).+$",
                message = "パスワードは大文字・小文字・数字・記号(!@#$%^&*)をそれぞれ含む必要があります"
        )
        String password,

        @NotBlank(message = "ロールは必須です")
        @Pattern(regexp = "^(USER|SYSTEM_ADMIN)$", message = "ロールは USER または SYSTEM_ADMIN です")
        String role
) {}
