package com.example.moneynote.domain.contact.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ContactRequest {

    @NotBlank(message = "件名は必須です")
    @Size(max = 100, message = "件名は100文字以内で入力してください")
    private String subject;

    @NotBlank(message = "本文は必須です")
    @Size(max = 2000, message = "本文は2000文字以内で入力してください")
    private String body;
}
