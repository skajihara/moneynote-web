package com.example.moneynote.common.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse<T> {

    private final T data;
    private final ErrorDetail error;
    private final String timestamp;

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(data, null, Instant.now().toString());
    }

    public static <T> ApiResponse<T> failure(String code, String message) {
        return new ApiResponse<>(null, new ErrorDetail(code, message), Instant.now().toString());
    }

    @Getter
    @AllArgsConstructor
    public static class ErrorDetail {
        private final String code;
        private final String message;
    }
}
