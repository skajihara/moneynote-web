package com.example.moneynote.domain.category;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.category.dto.CategorySummaryDto;
import com.example.moneynote.domain.category.dto.CategoryTransactionsResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/categories")
@RequiredArgsConstructor
public class CategoryReportController {

    private final CategoryReportService categoryReportService;

    /**
     * GET /api/v1/ledgers/{ledgerId}/categories/summary
     * カテゴリ別集計（金額降順・0円除外）。
     */
    @GetMapping("/summary")
    public ApiResponse<List<CategorySummaryDto>> getCategorySummary(
            @PathVariable String ledgerId,
            @RequestParam int year,
            @RequestParam @Min(1) @Max(12) int month,
            @RequestParam(required = false) CategoryType type,
            Principal principal) {
        return ApiResponse.success(
                categoryReportService.getCategorySummary(
                        ledgerId, year, month, type, principal.getName()));
    }

    /**
     * GET /api/v1/ledgers/{ledgerId}/categories/summary/annual
     * 年間カテゴリ別集計（金額降順・0円除外）。
     */
    @GetMapping("/summary/annual")
    public ApiResponse<List<CategorySummaryDto>> getAnnualCategorySummary(
            @PathVariable String ledgerId,
            @RequestParam int year,
            @RequestParam(required = false) CategoryType type,
            Principal principal) {
        return ApiResponse.success(
                categoryReportService.getAnnualCategorySummary(
                        ledgerId, year, type, principal.getName()));
    }

    /**
     * GET /api/v1/ledgers/{ledgerId}/categories/summary/all-time
     * 全期間カテゴリ別集計（金額降順・0円除外）。
     */
    @GetMapping("/summary/all-time")
    public ApiResponse<List<CategorySummaryDto>> getAllTimeCategorySummary(
            @PathVariable String ledgerId,
            @RequestParam(required = false) CategoryType type,
            Principal principal) {
        return ApiResponse.success(
                categoryReportService.getAllTimeCategorySummary(
                        ledgerId, type, principal.getName()));
    }

    /**
     * GET /api/v1/ledgers/{ledgerId}/categories/{categoryId}/transactions
     * カテゴリ別明細 + 月別推移。
     * month を省略した場合は year 全体（1〜12月）を対象とする。
     */
    @GetMapping("/{categoryId}/transactions")
    public ApiResponse<CategoryTransactionsResponse> getCategoryTransactions(
            @PathVariable String ledgerId,
            @PathVariable String categoryId,
            @RequestParam int year,
            @RequestParam(required = false) @Min(1) @Max(12) Integer month,
            Principal principal) {
        return ApiResponse.success(
                categoryReportService.getCategoryTransactions(
                        ledgerId, categoryId, year, month, principal.getName()));
    }
}
