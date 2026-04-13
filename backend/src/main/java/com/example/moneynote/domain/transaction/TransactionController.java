package com.example.moneynote.domain.transaction;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.transaction.dto.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    // -----------------------------------------------------------------------
    // GET /api/v1/ledgers/{ledgerId}/transactions  明細一覧・集計
    // -----------------------------------------------------------------------

    @GetMapping("/transactions")
    public ApiResponse<TransactionListResponse> getTransactions(
            @PathVariable String ledgerId,
            @RequestParam int year,
            @RequestParam @Min(1) @Max(12) int month,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) TransactionType type,
            Principal principal) {
        return ApiResponse.success(
                transactionService.getTransactions(ledgerId, year, month, categoryId, type,
                        principal.getName()));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/ledgers/{ledgerId}/balance  残高
    // -----------------------------------------------------------------------

    @GetMapping("/balance")
    public ApiResponse<BalanceResponse> getBalance(
            @PathVariable String ledgerId,
            Principal principal) {
        return ApiResponse.success(
                transactionService.getBalance(ledgerId, principal.getName()));
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/ledgers/{ledgerId}/transactions  明細作成
    // -----------------------------------------------------------------------

    @PostMapping("/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TransactionResponse> createTransaction(
            @PathVariable String ledgerId,
            @Valid @RequestBody TransactionRequest request,
            Principal principal) {
        return ApiResponse.success(
                transactionService.createTransaction(ledgerId, request, principal.getName()));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/ledgers/{ledgerId}/transactions/{transactionId}  明細詳細
    // -----------------------------------------------------------------------

    @GetMapping("/transactions/{transactionId}")
    public ApiResponse<TransactionResponse> getTransaction(
            @PathVariable String ledgerId,
            @PathVariable String transactionId,
            Principal principal) {
        return ApiResponse.success(
                transactionService.getTransaction(ledgerId, transactionId, principal.getName()));
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/ledgers/{ledgerId}/transactions/{transactionId}  明細更新
    // -----------------------------------------------------------------------

    @PutMapping("/transactions/{transactionId}")
    public ApiResponse<TransactionResponse> updateTransaction(
            @PathVariable String ledgerId,
            @PathVariable String transactionId,
            @Valid @RequestBody TransactionRequest request,
            Principal principal) {
        return ApiResponse.success(
                transactionService.updateTransaction(ledgerId, transactionId, request,
                        principal.getName()));
    }

    // -----------------------------------------------------------------------
    // DELETE /api/v1/ledgers/{ledgerId}/transactions/{transactionId}  明細削除
    // -----------------------------------------------------------------------

    @DeleteMapping("/transactions/{transactionId}")
    public ApiResponse<Void> deleteTransaction(
            @PathVariable String ledgerId,
            @PathVariable String transactionId,
            @Valid @RequestBody DeleteTransactionRequest request,
            Principal principal) {
        transactionService.deleteTransaction(ledgerId, transactionId, request,
                principal.getName());
        return ApiResponse.success(null);
    }
}
