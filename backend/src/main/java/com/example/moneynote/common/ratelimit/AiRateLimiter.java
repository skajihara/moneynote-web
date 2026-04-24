package com.example.moneynote.common.ratelimit;

import com.example.moneynote.common.exception.RateLimitException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * AI エンドポイント用のユーザー単位レート制限。
 * Redis カウンターで固定ウィンドウを実装する。
 * Fail-Open 設計: Redis が利用不能な場合はレート制限をスルーしてリクエストを通す。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiRateLimiter {

    private final StringRedisTemplate redisTemplate;

    /** /ai/analyze のキャッシュミス時（= 実際の Claude API 呼び出し時）のみ適用: 1分1回・1日10回 */
    public void checkAnalyzeLimit(String userId) {
        checkLimit("ai:analyze:1m:" + userId, 1, Duration.ofMinutes(1), 60);
        checkLimit("ai:analyze:1d:" + userId, 10, Duration.ofDays(1), 86400);
    }

    private void checkLimit(String key, int maxCount, Duration window, int retryAfterSeconds) {
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, window);
            }
            if (count != null && count > maxCount) {
                throw new RateLimitException(
                        "AIリクエストの上限に達しました。しばらくお待ちください",
                        retryAfterSeconds);
            }
        } catch (RateLimitException e) {
            throw e;
        } catch (Exception e) {
            // Fail-Open: Redis が落ちた場合はレート制限をスルーして可用性を優先する
            log.warn("AiRateLimiter: Redis unavailable, skipping rate limit check for key={}", key, e);
        }
    }
}
