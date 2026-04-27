package com.example.moneynote.domain.auth;

import com.example.moneynote.common.exception.UnauthorizedException;
import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.auth.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refreshToken";

    private final AuthService authService;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ApiResponse.success(null);
    }

    @PostMapping("/login")
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest request,
                                             HttpServletRequest servletRequest,
                                             HttpServletResponse servletResponse) {
        String ip = getClientIp(servletRequest);
        TokenResponse token = authService.login(request, ip);

        // リフレッシュトークンを HttpOnly Cookie にセット
        String refreshToken = authService.getRefreshToken(request.getUserId());
        addRefreshTokenCookie(servletResponse, refreshToken);

        return ApiResponse.success(token);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(Principal principal, HttpServletResponse response) {
        if (principal != null) {
            authService.logout(principal.getName());
        }
        clearRefreshTokenCookie(response);
        return ApiResponse.success(null);
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        if (refreshToken == null) {
            throw new UnauthorizedException("リフレッシュトークンがありません");
        }
        String accessToken = authService.refreshAccessToken(refreshToken);
        return ApiResponse.success(new TokenResponse(accessToken));
    }

    @PostMapping("/password-reset/request")
    public ApiResponse<Void> passwordResetRequest(
            @Valid @RequestBody PasswordResetRequestDto request) {
        authService.requestPasswordReset(request.getEmail());
        return ApiResponse.success(null);
    }

    @PostMapping("/password-reset/confirm")
    public ApiResponse<Void> passwordResetConfirm(
            @Valid @RequestBody PasswordResetConfirmDto request) {
        authService.confirmPasswordReset(request.getToken(), request.getNewPassword());
        return ApiResponse.success(null);
    }

    // -------------------------------------------------------------------------
    // helpers
    // -------------------------------------------------------------------------

    private void addRefreshTokenCookie(HttpServletResponse response, String token) {
        // セキュリティ: secure フラグは app.cookie.secure で環境別に切り替え（本番=true, 開発=false）
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(Duration.ofMillis(refreshTokenExpiration))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String getClientIp(HttpServletRequest request) {
        // セキュリティ: ForwardedHeaderFilter (HIGHEST_PRECEDENCE) が X-Forwarded-For を処理済みのため getRemoteAddr() で実 IP を取得できる
        return request.getRemoteAddr();
    }
}
