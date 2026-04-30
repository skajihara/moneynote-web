package com.example.moneynote.domain.dashboard;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.dashboard.dto.DashboardResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Tag(name = "ダッシュボード", description = "ダッシュボード（残高・月次収支・最近の明細）の取得")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "ダッシュボード取得", description = "現在残高・当月収支サマリー・最近の明細（recentCount 件）を一括取得する。VIEWER 以上の権限が必要。")
    @GetMapping("/dashboard")
    public ApiResponse<DashboardResponse> getDashboard(
            @PathVariable String ledgerId,
            @RequestParam int year,
            @RequestParam @Min(1) @Max(12) int month,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int recentCount,
            Principal principal) {
        return ApiResponse.success(
                dashboardService.getDashboard(ledgerId, year, month, recentCount,
                        principal.getName()));
    }
}
