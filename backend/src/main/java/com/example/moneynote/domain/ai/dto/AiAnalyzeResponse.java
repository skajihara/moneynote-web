package com.example.moneynote.domain.ai.dto;

import com.example.moneynote.domain.aiadvicecache.AdviceType;

import java.time.LocalDateTime;

public record AiAnalyzeResponse(
        AdviceType adviceType,
        String adviceText,
        LocalDateTime generatedAt,
        boolean fromCache
) {}
