package com.example.moneynote.domain.report;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.report.dto.AnnualReportResponse;
import com.example.moneynote.domain.report.dto.BalanceHistoryMonthDto;
import com.example.moneynote.domain.report.dto.MonthlyReportResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/monthly")
    public ApiResponse<MonthlyReportResponse> getMonthlyReport(
            @PathVariable String ledgerId,
            @RequestParam int year,
            @RequestParam @Min(1) @Max(12) int month,
            Principal principal) {
        return ApiResponse.success(
                reportService.getMonthlyReport(ledgerId, year, month, principal.getName()));
    }

    @GetMapping("/annual")
    public ApiResponse<AnnualReportResponse> getAnnualReport(
            @PathVariable String ledgerId,
            @RequestParam int year,
            Principal principal) {
        return ApiResponse.success(
                reportService.getAnnualReport(ledgerId, year, principal.getName()));
    }

    @GetMapping("/balance-history")
    public ApiResponse<List<BalanceHistoryMonthDto>> getBalanceHistory(
            @PathVariable String ledgerId,
            Principal principal) {
        return ApiResponse.success(
                reportService.getBalanceHistory(ledgerId, principal.getName()));
    }
}
