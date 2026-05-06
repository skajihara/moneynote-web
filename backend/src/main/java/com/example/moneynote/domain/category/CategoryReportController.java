package com.example.moneynote.domain.category;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.category.dto.CategorySummaryDto;
import com.example.moneynote.domain.category.dto.CategoryTransactionsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Tag(name = "カテゴリ分析", description = "カテゴリ別集計・明細・月別推移の取得")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/categories")
@RequiredArgsConstructor
public class CategoryReportController {

    private final CategoryReportService categoryReportService;

    @Operation(summary = "月次カテゴリ別集計", description = "指定した年月のカテゴリ別集計（金額降順・0円除外）を返す。type（INCOME/EXPENSE）でフィルタリング可能。")
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

    @Operation(summary = "年間カテゴリ別集計", description = "指定した年のカテゴリ別集計（金額降順・0円除外）を返す。type（INCOME/EXPENSE）でフィルタリング可能。")
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

    @Operation(summary = "全期間カテゴリ別集計", description = "帳簿全期間のカテゴリ別集計（金額降順・0円除外）を返す。type（INCOME/EXPENSE）でフィルタリング可能。")
    @GetMapping("/summary/all-time")
    public ApiResponse<List<CategorySummaryDto>> getAllTimeCategorySummary(
            @PathVariable String ledgerId,
            @RequestParam(required = false) CategoryType type,
            Principal principal) {
        return ApiResponse.success(
                categoryReportService.getAllTimeCategorySummary(
                        ledgerId, type, principal.getName()));
    }

    @Operation(summary = "カテゴリ別明細取得", description = "指定カテゴリの明細一覧と月別推移を返す。month を省略すると year 全体（1〜12月）が対象になる。")
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
