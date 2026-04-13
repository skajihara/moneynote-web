package com.example.moneynote.domain.budget;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.budget.dto.BudgetRequest;
import com.example.moneynote.domain.budget.dto.BudgetResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    /** GET /api/v1/ledgers/{ledgerId}/budgets */
    @GetMapping
    public ApiResponse<List<BudgetResponse>> getBudgets(
            @PathVariable String ledgerId,
            @RequestParam int year,
            @RequestParam @Min(1) @Max(12) int month,
            Principal principal) {
        return ApiResponse.success(
                budgetService.getBudgets(ledgerId, year, month, principal.getName()));
    }

    /** POST /api/v1/ledgers/{ledgerId}/budgets (upsert) */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BudgetResponse> upsertBudget(
            @PathVariable String ledgerId,
            @RequestBody @Valid BudgetRequest request,
            Principal principal) {
        return ApiResponse.success(
                budgetService.upsertBudget(ledgerId, request, principal.getName()));
    }

    /** DELETE /api/v1/ledgers/{ledgerId}/budgets/{budgetId} */
    @DeleteMapping("/{budgetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBudget(
            @PathVariable String ledgerId,
            @PathVariable String budgetId,
            Principal principal) {
        budgetService.deleteBudget(ledgerId, budgetId, principal.getName());
    }
}
