package com.example.moneynote.domain.ai.dto;

public record ScoreBreakdownDto(
        int balanceScore,
        int budgetScore,
        int savingsScore,
        int stabilityScore
) {}
