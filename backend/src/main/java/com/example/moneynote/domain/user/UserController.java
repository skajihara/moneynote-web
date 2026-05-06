package com.example.moneynote.domain.user;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.user.dto.ChangePasswordRequest;
import com.example.moneynote.domain.user.dto.UpdateProfileRequest;
import com.example.moneynote.domain.user.dto.UpdateThemeRequest;
import com.example.moneynote.domain.user.dto.UserProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Tag(name = "ユーザー", description = "プロフィール取得・更新・パスワード変更・テーマカラー設定・アカウント削除")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "プロフィール取得", description = "ログインユーザーのプロフィール情報（ユーザーID・表示名・メール・テーマカラー）を返す。")
    @GetMapping("/me")
    public ApiResponse<UserProfileResponse> getProfile(Principal principal) {
        return ApiResponse.success(userService.getProfile(principal.getName()));
    }

    @Operation(summary = "プロフィール更新", description = "表示名・メールアドレスを更新する。")
    @PutMapping("/me")
    public ApiResponse<UserProfileResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Principal principal) {
        return ApiResponse.success(userService.updateProfile(principal.getName(), request));
    }

    @Operation(summary = "パスワード変更", description = "現在のパスワードと新しいパスワードを指定してパスワードを変更する。")
    @PutMapping("/me/password")
    public ApiResponse<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Principal principal) {
        userService.changePassword(principal.getName(), request);
        return ApiResponse.success(null);
    }

    @Operation(summary = "テーマカラー更新", description = "アプリのテーマカラーを更新する。カラーコード（#RRGGBB）を指定する。")
    @PutMapping("/me/theme")
    public ApiResponse<UserProfileResponse> updateTheme(
            @Valid @RequestBody UpdateThemeRequest request,
            Principal principal) {
        return ApiResponse.success(userService.updateTheme(principal.getName(), request));
    }

    @Operation(summary = "アカウント削除", description = "ログインユーザーのアカウントを削除する。所有している帳簿も全て削除される。この操作は取り消せない。")
    @DeleteMapping("/me")
    public ApiResponse<Void> deleteAccount(Principal principal) {
        userService.deleteAccount(principal.getName());
        return ApiResponse.success(null);
    }
}
