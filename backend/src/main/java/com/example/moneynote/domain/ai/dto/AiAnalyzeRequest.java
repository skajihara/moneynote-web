package com.example.moneynote.domain.ai.dto;

import com.example.moneynote.domain.aiadvicecache.AdviceType;
import com.example.moneynote.domain.aiadvicecache.PeriodType;
import jakarta.validation.constraints.NotNull;

public record AiAnalyzeRequest(
        @NotNull PeriodType period,
        @NotNull AdviceType adviceType
) {}
