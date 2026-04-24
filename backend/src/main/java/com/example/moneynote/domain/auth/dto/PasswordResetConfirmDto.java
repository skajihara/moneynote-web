package com.example.moneynote.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PasswordResetConfirmDto {

    @NotBlank(message = "トークンは必須です")
    private String token;

    @NotBlank(message = "新しいパスワードは必須です")
    // セキュリティ: ChangePasswordRequest と同一ポリシーに統一（パスワードリセット経由の迂回を防ぐ）
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$",
        message = "パスワードは8文字以上で、英大文字・英小文字・数字・記号（!@#$%^&*）を各1文字以上含めてください"
    )
    private String newPassword;
}
