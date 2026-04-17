package com.example.moneynote.domain.ai.dto;

public record AiScoreResponse(
        int totalScore,
        String grade,          // "EXCELLENT" / "GOOD" / "CAUTION" / "POOR"
        ScoreBreakdownDto breakdown,
        Integer prevMonthScore,
        Integer scoreDiff
) {}
