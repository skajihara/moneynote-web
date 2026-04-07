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
    @Pattern(
        regexp = "^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$",
        message = "パスワードは8文字以上で、英字と数字を各1文字以上含めてください"
    )
    private String newPassword;
}
