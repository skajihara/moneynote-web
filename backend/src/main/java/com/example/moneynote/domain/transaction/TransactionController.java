package com.example.moneynote.domain.transaction;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.transaction.dto.*;
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

@Tag(name = "収支明細", description = "収支明細の取得・作成・更新・削除・検索・残高取得")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @Operation(summary = "月次明細一覧取得", description = "指定した年月の収支明細一覧と月次集計（収入合計・支出合計）を返す。categoryId・type でフィルタリング可能。")
    @GetMapping("/transactions")
    public ApiResponse<TransactionListResponse> getTransactions(
            @PathVariable String ledgerId,
            @RequestParam int year,
            @RequestParam @Min(1) @Max(12) int month,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) TransactionType type,
            Principal principal) {
        return ApiResponse.success(
                transactionService.getTransactions(ledgerId, year, month,
                        categoryId, type, principal.getName()));
    }

    @Operation(summary = "残高取得", description = "帳簿の現在残高（初期残高 + 累積収支）を返す。DB に残高カラムは持たずアプリ側で計算する。")
    @GetMapping("/balance")
    public ApiResponse<BalanceResponse> getBalance(
            @PathVariable String ledgerId,
            Principal principal) {
        return ApiResponse.success(
                transactionService.getBalance(ledgerId, principal.getName()));
    }

    @Operation(summary = "明細作成", description = "新しい収支明細を作成する。EDITOR 以上の権限が必要。")
    @PostMapping("/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TransactionResponse> createTransaction(
            @PathVariable String ledgerId,
            @Valid @RequestBody TransactionRequest request,
            Principal principal) {
        return ApiResponse.success(
                transactionService.createTransaction(ledgerId, request, principal.getName()));
    }

    @Operation(summary = "明細検索", description = "キーワード・カテゴリ・日付範囲で明細を横断検索する。keyword・categoryId に空文字列を指定すると全件対象になる（Hibernate 6 + PostgreSQL の null 型問題回避）。")
    @GetMapping("/transactions/search")
    public ApiResponse<List<TransactionResponse>> searchTransactions(
            @PathVariable String ledgerId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Principal principal) {
        return ApiResponse.success(
                transactionService.searchTransactions(
                        ledgerId, keyword, categoryId, startDate, endDate,
                        principal.getName()));
    }

    @Operation(summary = "明細詳細取得", description = "指定した明細の詳細を返す。VIEWER 以上の権限が必要。")
    @GetMapping("/transactions/{transactionId}")
    public ApiResponse<TransactionResponse> getTransaction(
            @PathVariable String ledgerId,
            @PathVariable String transactionId,
            Principal principal) {
        return ApiResponse.success(
                transactionService.getTransaction(ledgerId, transactionId, principal.getName()));
    }

    @Operation(summary = "明細更新", description = "既存の収支明細を更新する。EDITOR 以上の権限が必要。")
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

    @Operation(summary = "明細削除", description = "収支明細を削除する。EDITOR 以上の権限が必要。")
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
