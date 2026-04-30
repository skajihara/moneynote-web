package com.example.moneynote.domain.ledgerpermission;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.ledgerpermission.dto.AddMemberRequest;
import com.example.moneynote.domain.ledgerpermission.dto.MemberResponse;
import com.example.moneynote.domain.ledgerpermission.dto.UpdateMemberRequest;
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

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/members")
@RequiredArgsConstructor
public class LedgerMemberController {

    private final LedgerMemberService ledgerMemberService;

    @GetMapping
    public ApiResponse<List<MemberResponse>> getMembers(
            @PathVariable String ledgerId, Principal principal) {
        return ApiResponse.success(ledgerMemberService.getMembers(ledgerId, principal.getName()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MemberResponse> addMember(
            @PathVariable String ledgerId,
            @Valid @RequestBody AddMemberRequest request,
            Principal principal) {
        return ApiResponse.success(ledgerMemberService.addMember(ledgerId, request, principal.getName()));
    }

    @PutMapping("/{userId}")
    public ApiResponse<MemberResponse> updateMember(
            @PathVariable String ledgerId,
            @PathVariable String userId,
            @Valid @RequestBody UpdateMemberRequest request,
            Principal principal) {
        return ApiResponse.success(
                ledgerMemberService.updateMember(ledgerId, userId, request, principal.getName()));
    }

    @DeleteMapping("/{userId}")
    public ApiResponse<Void> removeMember(
            @PathVariable String ledgerId,
            @PathVariable String userId,
            Principal principal) {
        ledgerMemberService.removeMember(ledgerId, userId, principal.getName());
        return ApiResponse.success(null);
    }
}
