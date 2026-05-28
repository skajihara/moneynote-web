package com.example.moneynote.common.ratelimit;

import com.example.moneynote.common.exception.RateLimitException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

/**
 * AI エンドポイント用のユーザー単位レート制限。
 * Redis Sorted Set でスライディングウィンドウを実装し、ウィンドウ境界でのバースト攻撃を防ぐ。
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
            long now = System.currentTimeMillis();
            long windowStart = now - window.toMillis();
            // Remove entries outside the sliding window
            redisTemplate.opsForZSet().removeRangeByScore(key, 0, windowStart);
            // Count requests currently in the window
            Long count = redisTemplate.opsForZSet().zCard(key);
            if (count != null && count >= maxCount) {
                throw new RateLimitException(
                        "AIリクエストの上限に達しました。しばらくお待ちください",
                        retryAfterSeconds);
            }
            // Record current request; suffix prevents collision when multiple requests arrive at the same millisecond
            String member = now + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            redisTemplate.opsForZSet().add(key, member, now);
            // TTL prevents memory leak if the key is no longer actively used
            redisTemplate.expire(key, window.plusSeconds(60));
        } catch (RateLimitException e) {
            throw e;
        } catch (Exception e) {
            // Fail-Open: Redis が落ちた場合はレート制限をスルーして可用性を優先する
            log.warn("AiRateLimiter: Redis unavailable, skipping rate limit check for key={}", key, e);
        }
    }
}
