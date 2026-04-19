package com.example.moneynote.domain.user.dto;

import jakarta.validation.constraints.Size;

public record UpdateThemeRequest(
        @Size(max = 30) String themeColor
) {}
