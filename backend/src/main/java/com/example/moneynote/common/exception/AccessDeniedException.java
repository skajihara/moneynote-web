package com.example.moneynote.common.exception;

/**
 * 帳簿へのアクセス権限がない場合にスローする例外（403）。
 * Spring Security の AccessDeniedException を継承して統一ハンドラで処理する。
 */
public class AccessDeniedException extends org.springframework.security.access.AccessDeniedException {
    public AccessDeniedException(String message) {
        super(message);
    }
}
