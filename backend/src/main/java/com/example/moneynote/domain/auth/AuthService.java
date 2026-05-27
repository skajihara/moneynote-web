package com.example.moneynote.domain.auth;

import com.example.moneynote.common.exception.AccessDeniedException;
import com.example.moneynote.common.exception.RateLimitException;
import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.exception.UnauthorizedException;
import com.example.moneynote.common.exception.ValidationException;
import com.example.moneynote.common.security.JwtTokenProvider;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.domain.auth.dto.*;
import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.category.CategoryType;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.ledger.LedgerRepository;
import com.example.moneynote.domain.ledgerpermission.LedgerPermission;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import com.example.moneynote.domain.ledgerpermission.PermissionType;
import com.example.moneynote.domain.user.PendingDeletionUserRepository;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_LOGIN_FAILURES = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    private static final Duration RESET_TOKEN_TTL = Duration.ofMinutes(30);
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);

    private final UserRepository userRepository;
    private final LedgerRepository ledgerRepository;
    private final LedgerPermissionRepository ledgerPermissionRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final StringRedisTemplate redisTemplate;
    private final JavaMailSender mailSender;
    private final PendingDeletionUserRepository pendingDeletionUserRepository;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.mail.from}")
    private String fromAddress;

    // -------------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------------

    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsById(request.getUserId())) {
            throw new ValidationException("このユーザーIDはすでに使用されています");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ValidationException("このメールアドレスはすでに登録されています");
        }

        User user = User.builder()
                .userId(request.getUserId())
                .userName(request.getUserName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();
        userRepository.save(user);

        Ledger ledger = Ledger.builder()
                .ledgerId(IdGenerator.generateUnique("ldg_", ledgerRepository::existsById))
                .owner(user)
                .ledgerName("マイ家計簿")
                .build();
        ledgerRepository.save(ledger);

        ledgerPermissionRepository.save(LedgerPermission.builder()
                .permissionId(IdGenerator.generateUnique("lperm_", ledgerPermissionRepository::existsById))
                .ledger(ledger)
                .user(user)
                .permissionType(PermissionType.ADMIN)
                .build());

        createDefaultCategories(ledger);
    }

    private void createDefaultCategories(Ledger ledger) {
        List<String> expenseNames = List.of(
                "食費", "交通費", "住居費", "光熱費", "通信費",
                "医療費", "娯楽費", "衣服費", "その他支出");
        List<String> incomeNames = List.of("給与", "副収入", "その他収入");

        short order = 0;
        for (String name : expenseNames) {
            categoryRepository.save(Category.builder()
                    .categoryId(IdGenerator.generateUnique("cat_", categoryRepository::existsById))
                    .ledger(ledger)
                    .categoryName(name)
                    .categoryType(CategoryType.EXPENSE)
                    .displayOrder(order++)
                    .build());
        }
        order = 0;
        for (String name : incomeNames) {
            categoryRepository.save(Category.builder()
                    .categoryId(IdGenerator.generateUnique("cat_", categoryRepository::existsById))
                    .ledger(ledger)
                    .categoryName(name)
                    .categoryType(CategoryType.INCOME)
                    .displayOrder(order++)
                    .build());
        }
    }

    // -------------------------------------------------------------------------
    // login
    // -------------------------------------------------------------------------

    public TokenResponse login(LoginRequest request, String ipAddress) {
        String failKey = "login:fail:" + ipAddress;
        checkRateLimit(failKey);

        User user = userRepository.findById(request.getUserId())
                .orElseGet(() -> {
                    incrementFailCount(failKey);
                    throw new UnauthorizedException("ユーザーIDまたはパスワードが正しくありません");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            incrementFailCount(failKey);
            throw new UnauthorizedException("ユーザーIDまたはパスワードが正しくありません");
        }

        // セキュリティ: 無効化されたアカウントはログイン不可
        if (!user.isActive()) {
            throw new AccessDeniedException("アカウントが無効化されています");
        }

        // 成功 → 失敗カウントをリセット
        redisTemplate.delete(failKey);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getUserId(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUserId());

        // リフレッシュトークンを Redis に保存
        redisTemplate.opsForValue().set(
                refreshKey(user.getUserId()), refreshToken, REFRESH_TOKEN_TTL);

        return new TokenResponse(accessToken);
    }

    public String getRefreshToken(String userId) {
        return redisTemplate.opsForValue().get(refreshKey(userId));
    }

    private void checkRateLimit(String failKey) {
        checkRateLimit(failKey, MAX_LOGIN_FAILURES, LOCK_DURATION, 900);
    }

    private void checkRateLimit(String key, int maxCount, Duration window, int retryAfterSeconds) {
        String countStr = redisTemplate.opsForValue().get(key);
        int count = countStr == null ? 0 : Integer.parseInt(countStr);
        if (count >= maxCount) {
            throw new RateLimitException("リクエスト上限に達しました。しばらく後に再試行してください", retryAfterSeconds);
        }
    }

    private void incrementFailCount(String failKey) {
        Long count = redisTemplate.opsForValue().increment(failKey);
        if (count != null && count == 1) {
            redisTemplate.expire(failKey, LOCK_DURATION);
        }
    }

    private void incrementCount(String key, Duration window) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, window);
        }
    }

    // -------------------------------------------------------------------------
    // logout
    // -------------------------------------------------------------------------

    public void logout(String userId) {
        redisTemplate.delete(refreshKey(userId));
    }

    // -------------------------------------------------------------------------
    // refresh
    // -------------------------------------------------------------------------

    public String refreshAccessToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new UnauthorizedException("リフレッシュトークンが無効です");
        }
        // セキュリティ: type=REFRESH のトークンのみリフレッシュに使用できる（アクセストークンの流用を防ぐ）
        if (!"REFRESH".equals(jwtTokenProvider.getTokenType(refreshToken))) {
            throw new UnauthorizedException("リフレッシュトークンが無効です");
        }

        String userId = jwtTokenProvider.getUserId(refreshToken);
        String stored = redisTemplate.opsForValue().get(refreshKey(userId));

        if (!refreshToken.equals(stored)) {
            throw new UnauthorizedException("リフレッシュトークンが一致しません");
        }

        // ロールを最新 DB 値から取得して新しいアクセストークンに埋め込む
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("ユーザーが見つかりません"));
        return jwtTokenProvider.generateAccessToken(userId, user.getRole().name());
    }

    // -------------------------------------------------------------------------
    // password reset
    // -------------------------------------------------------------------------

    public void requestPasswordReset(String email) {
        // メールが存在しない場合も成功レスポンスを返す（ユーザー列挙攻撃対策）
        userRepository.findByEmail(email).ifPresent(user -> {
            // セキュリティ: ユーザー単位で 1 時間 5 回のレート制限（メール爆撃対策）
            String resetRateLimitKey = "pwd_reset:req:" + user.getUserId();
            checkRateLimit(resetRateLimitKey, 5, Duration.ofHours(1), 3600);
            incrementCount(resetRateLimitKey, Duration.ofHours(1));

            String token = UUID.randomUUID().toString();
            redisTemplate.opsForValue().set(resetKey(token), user.getUserId(), RESET_TOKEN_TTL);
            sendPasswordResetMail(user.getUserId(), user.getEmail(), token);
        });
    }

    private void sendPasswordResetMail(String userId, String to, String token) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject("【MoneyNote】パスワードリセットのご案内");
            message.setText(
                    "以下のリンクよりパスワードをリセットしてください（有効期限：30分）\n\n" +
                    frontendUrl + "/password-reset/confirm?token=" + token);
            mailSender.send(message);
        } catch (Exception e) {
            // セキュリティ: ログに PII（メールアドレス）を出力しない。userId のみ記録する
            log.error("パスワードリセットメールの送信に失敗しました userId={}", userId, e);
        }
    }

    @Transactional
    public void confirmPasswordReset(String token, String newPassword) {
        String userId = redisTemplate.opsForValue().get(resetKey(token));
        if (userId == null) {
            throw new ResourceNotFoundException("トークンが無効または期限切れです");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        redisTemplate.delete(resetKey(token));
    }

    // -------------------------------------------------------------------------
    // helpers
    // -------------------------------------------------------------------------

    private String refreshKey(String userId) {
        return "refresh:" + userId;
    }

    private String resetKey(String token) {
        return "password_reset:" + token;
    }

    // -------------------------------------------------------------------------
    // account deletion cancel
    // -------------------------------------------------------------------------

    @Transactional
    public void cancelAccountDeletion(String token) {
        String key = cancelKey(token);
        String userId = redisTemplate.opsForValue().get(key);
        if (userId == null) {
            throw new ResourceNotFoundException("キャンセルリンクが無効または期限切れです");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("キャンセルリンクが無効または期限切れです"));

        user.setActive(true);
        userRepository.save(user);

        pendingDeletionUserRepository.deleteById(userId);
        redisTemplate.delete(key);

        log.info("アカウント削除キャンセル: userId={}", userId);
    }

    private String cancelKey(String token) {
        return "account_deletion_cancel:" + token;
    }
}
