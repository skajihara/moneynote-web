package com.example.moneynote.domain.fixedtransaction;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.fixedtransaction.dto.FixedTransactionRequest;
import com.example.moneynote.domain.fixedtransaction.dto.FixedTransactionResponse;
import com.example.moneynote.domain.fixedtransaction.dto.GenerateResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Tag(name = "固定費", description = "固定費（定期的な収支）の管理と明細自動生成")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/fixed-transactions")
@RequiredArgsConstructor
public class FixedTransactionController {

    private final FixedTransactionService fixedTransactionService;

    @Operation(summary = "固定費一覧取得", description = "帳簿の固定費一覧を返す。status（active/inactive）でフィルタリング可能。VIEWER 以上の権限が必要。")
    @GetMapping
    public ApiResponse<List<FixedTransactionResponse>> getFixedTransactions(
            @PathVariable String ledgerId,
            @RequestParam(required = false) String status,
            Principal principal) {
        return ApiResponse.success(
                fixedTransactionService.getFixedTransactions(ledgerId, status, principal.getName()));
    }

    @Operation(summary = "固定費作成", description = "固定費を作成する。endDate は必須（デフォルト 10 年後）。endDate > startDate のバリデーションあり。EDITOR 以上の権限が必要。")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<FixedTransactionResponse> createFixedTransaction(
            @PathVariable String ledgerId,
            @RequestBody @Valid FixedTransactionRequest request,
            Principal principal) {
        return ApiResponse.success(
                fixedTransactionService.createFixedTransaction(ledgerId, request, principal.getName()));
    }

    @Operation(summary = "固定費更新", description = "固定費の内容を更新する。EDITOR 以上の権限が必要。")
    @PutMapping("/{fixedId}")
    public ApiResponse<FixedTransactionResponse> updateFixedTransaction(
            @PathVariable String ledgerId,
            @PathVariable String fixedId,
            @RequestBody @Valid FixedTransactionRequest request,
            Principal principal) {
        return ApiResponse.success(
                fixedTransactionService.updateFixedTransaction(ledgerId, fixedId, request, principal.getName()));
    }

    @Operation(summary = "固定費削除", description = "固定費を削除する。EDITOR 以上の権限が必要。")
    @DeleteMapping("/{fixedId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFixedTransaction(
            @PathVariable String ledgerId,
            @PathVariable String fixedId,
            Principal principal) {
        fixedTransactionService.deleteFixedTransaction(ledgerId, fixedId, principal.getName());
    }

    @Operation(summary = "固定費から明細生成", description = "固定費の繰り返し設定に基づき、未生成の明細を一括生成する。生成した件数と明細 ID リストを返す。EDITOR 以上の権限が必要。")
    @PostMapping("/{fixedId}/generate")
    public ApiResponse<GenerateResult> generateTransactions(
            @PathVariable String ledgerId,
            @PathVariable String fixedId,
            Principal principal) {
        return ApiResponse.success(
                fixedTransactionService.generateTransactions(ledgerId, fixedId, principal.getName()));
    }
}
