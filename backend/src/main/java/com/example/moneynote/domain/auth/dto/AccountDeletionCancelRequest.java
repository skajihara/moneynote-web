package com.example.moneynote.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AccountDeletionCancelRequest {

    @NotBlank(message = "トークンは必須です")
    private String token;
}
