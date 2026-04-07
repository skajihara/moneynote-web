package com.example.moneynote.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LoginRequest {

    @NotBlank(message = "ユーザーIDは必須です")
    private String userId;

    @NotBlank(message = "パスワードは必須です")
    private String password;
}
