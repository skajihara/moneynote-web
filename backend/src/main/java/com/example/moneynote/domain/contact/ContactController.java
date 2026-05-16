package com.example.moneynote.domain.contact;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.contact.dto.ContactRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "お問い合わせ", description = "問い合わせメール送信")
@RestController
@RequestMapping("/api/v1/contact")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    @Operation(summary = "問い合わせ送信", description = "ログイン済みユーザーから管理者へ問い合わせメールを送信する。1時間に5回まで。")
    @PostMapping
    public ApiResponse<Void> sendContact(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody ContactRequest request) {
        contactService.sendContact(userId, request);
        return ApiResponse.success(null);
    }
}
