package com.example.moneynote.domain.ledger;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.ledger.dto.LedgerRequest;
import com.example.moneynote.domain.ledger.dto.LedgerResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Tag(name = "帳簿", description = "帳簿の作成・取得・更新・削除")
@RestController
@RequestMapping("/api/v1/ledgers")
@RequiredArgsConstructor
public class LedgerController {

    private final LedgerService ledgerService;

    @Operation(summary = "帳簿一覧取得", description = "ログインユーザーが参加しているすべての帳簿（OWNER・ADMIN・EDITOR・VIEWER）を返す。レスポンスの myPermissionType で自分の権限を確認できる。")
    @GetMapping
    public ApiResponse<List<LedgerResponse>> getLedgers(Principal principal) {
        return ApiResponse.success(ledgerService.getLedgers(principal.getName()));
    }

    @Operation(summary = "帳簿作成", description = "新しい帳簿を作成する。作成者が OWNER になる。")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<LedgerResponse> createLedger(
            @Valid @RequestBody LedgerRequest request,
            Principal principal) {
        return ApiResponse.success(ledgerService.createLedger(request, principal.getName()));
    }

    @Operation(summary = "帳簿詳細取得", description = "指定した帳簿の詳細を取得する。VIEWER 以上の権限が必要。")
    @GetMapping("/{ledgerId}")
    public ApiResponse<LedgerResponse> getLedger(
            @PathVariable String ledgerId,
            Principal principal) {
        return ApiResponse.success(ledgerService.getLedger(ledgerId, principal.getName()));
    }

    @Operation(summary = "帳簿更新", description = "帳簿名・初期残高・テーマカラー等を更新する。OWNER 権限が必要。")
    @PutMapping("/{ledgerId}")
    public ApiResponse<LedgerResponse> updateLedger(
            @PathVariable String ledgerId,
            @Valid @RequestBody LedgerRequest request,
            Principal principal) {
        return ApiResponse.success(ledgerService.updateLedger(ledgerId, request, principal.getName()));
    }

    @Operation(summary = "帳簿削除", description = "帳簿を物理削除する。関連する明細・カテゴリ・予算・固定費・権限も全て削除される（カスケード順序あり）。OWNER 権限が必要。")
    @DeleteMapping("/{ledgerId}")
    public ApiResponse<Void> deleteLedger(
            @PathVariable String ledgerId,
            Principal principal) {
        ledgerService.deleteLedger(ledgerId, principal.getName());
        return ApiResponse.success(null);
    }
}
