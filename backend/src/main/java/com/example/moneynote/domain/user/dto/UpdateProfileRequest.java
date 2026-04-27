package com.example.moneynote.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(min = 1, max = 50) String userName,
        @NotBlank @Email @Size(max = 255) String email
) {}
