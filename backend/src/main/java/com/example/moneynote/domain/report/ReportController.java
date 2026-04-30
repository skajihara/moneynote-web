package com.example.moneynote.domain.report;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.report.dto.AnnualReportResponse;
import com.example.moneynote.domain.report.dto.BalanceHistoryMonthDto;
import com.example.moneynote.domain.report.dto.MonthlyReportResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Tag(name = "分析レポート", description = "月次・年間レポートおよび残高推移の取得")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @Operation(summary = "月次レポート取得", description = "指定した年月の収支合計・カテゴリ別集計・収支推移グラフ用データを返す。VIEWER 以上の権限が必要。")
    @GetMapping("/monthly")
    public ApiResponse<MonthlyReportResponse> getMonthlyReport(
            @PathVariable String ledgerId,
            @RequestParam int year,
            @RequestParam @Min(1) @Max(12) int month,
            Principal principal) {
        return ApiResponse.success(
                reportService.getMonthlyReport(ledgerId, year, month, principal.getName()));
    }

    @Operation(summary = "年間レポート取得", description = "指定した年の月別収支推移・年間合計を返す。VIEWER 以上の権限が必要。")
    @GetMapping("/annual")
    public ApiResponse<AnnualReportResponse> getAnnualReport(
            @PathVariable String ledgerId,
            @RequestParam int year,
            Principal principal) {
        return ApiResponse.success(
                reportService.getAnnualReport(ledgerId, year, principal.getName()));
    }

    @Operation(summary = "残高推移取得", description = "帳簿全期間の月別残高推移を返す。グラフ描画用。VIEWER 以上の権限が必要。")
    @GetMapping("/balance-history")
    public ApiResponse<List<BalanceHistoryMonthDto>> getBalanceHistory(
            @PathVariable String ledgerId,
            Principal principal) {
        return ApiResponse.success(
                reportService.getBalanceHistory(ledgerId, principal.getName()));
    }
}
