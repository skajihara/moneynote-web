package com.example.moneynote.domain.ledgerpermission;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.ledgerpermission.dto.AddMemberRequest;
import com.example.moneynote.domain.ledgerpermission.dto.MemberResponse;
import com.example.moneynote.domain.ledgerpermission.dto.UpdateMemberRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@Tag(name = "帳簿メンバー", description = "帳簿の共有メンバー管理（招待・権限変更・削除）")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/members")
@RequiredArgsConstructor
public class LedgerMemberController {

    private final LedgerMemberService ledgerMemberService;

    @Operation(summary = "メンバー一覧取得", description = "帳簿に参加しているメンバー一覧を返す。OWNER は ledger.ownerUserId から合成されて含まれる。VIEWER 以上の権限が必要。")
    @GetMapping
    public ApiResponse<List<MemberResponse>> getMembers(
            @PathVariable String ledgerId, Principal principal) {
        return ApiResponse.success(ledgerMemberService.getMembers(ledgerId, principal.getName()));
    }

    @Operation(summary = "メンバー招待", description = "ユーザーIDを指定して帳簿にメンバーを追加する。ADMIN 以上の権限が必要。OWNER への昇格は不可。")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MemberResponse> addMember(
            @PathVariable String ledgerId,
            @Valid @RequestBody AddMemberRequest request,
            Principal principal) {
        return ApiResponse.success(ledgerMemberService.addMember(ledgerId, request, principal.getName()));
    }

    @Operation(summary = "メンバー権限変更", description = "メンバーの権限を変更する（VIEWER / EDITOR / ADMIN）。ADMIN 以上の権限が必要。OWNER の権限変更は不可。")
    @PutMapping("/{userId}")
    public ApiResponse<MemberResponse> updateMember(
            @PathVariable String ledgerId,
            @PathVariable String userId,
            @Valid @RequestBody UpdateMemberRequest request,
            Principal principal) {
        return ApiResponse.success(
                ledgerMemberService.updateMember(ledgerId, userId, request, principal.getName()));
    }

    @Operation(summary = "メンバー削除", description = "帳簿からメンバーを削除する。ADMIN 以上の権限が必要。OWNER の削除は不可。")
    @DeleteMapping("/{userId}")
    public ApiResponse<Void> removeMember(
            @PathVariable String ledgerId,
            @PathVariable String userId,
            Principal principal) {
        ledgerMemberService.removeMember(ledgerId, userId, principal.getName());
        return ApiResponse.success(null);
    }
}
