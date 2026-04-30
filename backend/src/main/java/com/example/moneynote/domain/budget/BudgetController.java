package com.example.moneynote.domain.budget;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.budget.dto.BudgetHeatmapMonthDto;
import com.example.moneynote.domain.budget.dto.BudgetRequest;
import com.example.moneynote.domain.budget.dto.BudgetResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Tag(name = "予算", description = "月次予算の設定・取得・削除・達成率ヒートマップ")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    @Operation(summary = "予算一覧取得", description = "指定した年月のカテゴリ別予算と実績を返す。VIEWER 以上の権限が必要。")
    @GetMapping
    public ApiResponse<List<BudgetResponse>> getBudgets(
            @PathVariable String ledgerId,
            @RequestParam int year,
            @RequestParam @Min(1) @Max(12) int month,
            Principal principal) {
        return ApiResponse.success(
                budgetService.getBudgets(ledgerId, year, month, principal.getName()));
    }

    @Operation(summary = "予算作成・更新（upsert）", description = "指定したカテゴリ・年月の予算を作成または更新する（同一キーで upsert）。EDITOR 以上の権限が必要。")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BudgetResponse> upsertBudget(
            @PathVariable String ledgerId,
            @RequestBody @Valid BudgetRequest request,
            Principal principal) {
        return ApiResponse.success(
                budgetService.upsertBudget(ledgerId, request, principal.getName()));
    }

    @Operation(summary = "予算達成率ヒートマップ取得", description = "直近 N ヶ月分の月別予算達成率をヒートマップ用に返す。months は 1〜24 の範囲。VIEWER 以上の権限が必要。")
    @GetMapping("/heatmap")
    public ApiResponse<List<BudgetHeatmapMonthDto>> getBudgetHeatmap(
            @PathVariable String ledgerId,
            @RequestParam(defaultValue = "12") @Min(1) @Max(24) int months,
            Principal principal) {
        return ApiResponse.success(
                budgetService.getBudgetHeatmap(ledgerId, months, principal.getName()));
    }

    @Operation(summary = "予算削除", description = "指定した予算を削除する。EDITOR 以上の権限が必要。")
    @DeleteMapping("/{budgetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBudget(
            @PathVariable String ledgerId,
            @PathVariable String budgetId,
            Principal principal) {
        budgetService.deleteBudget(ledgerId, budgetId, principal.getName());
    }
}
