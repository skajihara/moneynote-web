package com.example.moneynote.domain.dashboard;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.dashboard.dto.DashboardResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

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
