package com.example.moneynote.domain.contact;

import com.example.moneynote.common.exception.RateLimitException;
import com.example.moneynote.domain.contact.dto.ContactRequest;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class ContactService {

    private static final int MAX_REQUESTS_PER_HOUR = 5;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofHours(1);
    private static final DateTimeFormatter TIMESTAMP_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z");

    private final JavaMailSender mailSender;
    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;

    @Value("${app.mail.admin-address}")
    private String adminAddress;

    public void sendContact(String userId, ContactRequest request) {
        checkRateLimit(userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("ユーザーが見つかりません"));

        sendMail(user, request);

        // セキュリティ: ログに body の内容を出力しない
        log.info("お問い合わせを受け付けました userId={}", userId);
    }

    private void checkRateLimit(String userId) {
        String key = "contact_rate:" + userId;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count == null) {
            count = 1L;
        }
        if (count == 1) {
            redisTemplate.expire(key, RATE_LIMIT_WINDOW);
        }
        if (count > MAX_REQUESTS_PER_HOUR) {
            throw new RateLimitException("お問い合わせの送信回数が上限（1時間に5回）を超えました", 3600);
        }
    }

    private void sendMail(User user, ContactRequest request) {
        String timestamp = ZonedDateTime.now(ZoneId.of("Asia/Tokyo"))
                .format(TIMESTAMP_FORMATTER);

        String body = String.format(
                "お問い合わせを受け付けました。%n%n" +
                "ユーザーID : %s%n" +
                "ユーザー名 : %s%n" +
                "送信日時   : %s%n%n" +
                "──────────────────────%n" +
                "%s%n" +
                "──────────────────────%n%n" +
                "このメールに返信するとユーザーへ直接返信されます。",
                user.getUserId(),
                user.getUserName(),
                timestamp,
                request.getBody()
        );

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(adminAddress);
        message.setSubject("【MoneyNote お問い合わせ】" + request.getSubject());
        message.setReplyTo(user.getEmail());
        message.setText(body);
        mailSender.send(message);
    }
}
