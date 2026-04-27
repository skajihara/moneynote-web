package com.example.moneynote.common.exception;

public class RateLimitException extends RuntimeException {

    private final int retryAfterSeconds;

    /** ログイン失敗ロック用のデフォルト (15分=900秒) */
    public RateLimitException(String message) {
        super(message);
        this.retryAfterSeconds = 900;
    }

    public RateLimitException(String message, int retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
