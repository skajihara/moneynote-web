package com.example.moneynote.domain.report.dto;

import java.util.List;

public record AnnualReportResponse(
        int year,
        List<MonthDataDto> months,
        AnnualSummaryDto annualSummary,
        List<BalanceHistoryDto> balanceHistory
) {}
