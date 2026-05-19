package com.example.moneynote.domain.user;

import com.example.moneynote.common.exception.ConflictException;
import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.exception.UnauthorizedException;
import com.example.moneynote.common.exception.ValidationException;
import com.example.moneynote.domain.ledger.LedgerCascadeDeleter;
import com.example.moneynote.domain.ledger.LedgerRepository;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import com.example.moneynote.domain.user.dto.ChangePasswordRequest;
import com.example.moneynote.domain.user.dto.UpdateProfileRequest;
import com.example.moneynote.domain.user.dto.UpdateThemeRequest;
import com.example.moneynote.domain.user.dto.UserProfileResponse;
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
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Slf4j
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final LedgerRepository ledgerRepository;
    private final LedgerCascadeDeleter ledgerCascadeDeleter;
    private final LedgerPermissionRepository ledgerPermissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;
    private final PendingDeletionUserRepository pendingDeletionUserRepository;
    private final JavaMailSender mailSender;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String userId) {
        User user = findUser(userId);
        return UserProfileResponse.from(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(String userId, UpdateProfileRequest request) {
        User user = findUser(userId);

        if (!user.getEmail().equals(request.email())
                && userRepository.existsByEmail(request.email())) {
            throw new ConflictException("このメールアドレスはすでに使用されています");
        }

        user.setUserName(request.userName());
        user.setEmail(request.email());
        return UserProfileResponse.from(userRepository.save(user));
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = findUser(userId);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("現在のパスワードが正しくありません");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new ValidationException("新しいパスワードは現在のパスワードと異なる必要があります");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Transactional
    public UserProfileResponse updateTheme(String userId, UpdateThemeRequest request) {
        User user = findUser(userId);
        user.setThemeColor(request.themeColor());
        return UserProfileResponse.from(userRepository.save(user));
    }

    /**
     * アカウント削除依頼を受け付ける。
     * 即時物理削除ではなく、is_active=false + pending_deletion_users 登録 + キャンセルメール送信。
     * 実際の物理削除は AccountDeletionBatchService が毎日0時に実行する。
     */
    @Transactional
    public void deleteAccount(String userId) {
        User user = findUser(userId);

        // is_active=false にしてログイン不可にする
        user.setActive(false);
        userRepository.save(user);

        // pending_deletion_users に登録
        pendingDeletionUserRepository.save(
                PendingDeletionUser.builder().userId(userId).build());

        // Redisのリフレッシュトークンを削除して既存セッションを無効化する
        redisTemplate.delete("refresh:" + userId);

        // キャンセルトークンを Redis に保存（TTL = 当日 23:59:59 まで）
        String cancelToken = UUID.randomUUID().toString();
        ZoneId jst = ZoneId.of("Asia/Tokyo");
        ZonedDateTime midnight = LocalDate.now(jst).plusDays(1).atStartOfDay(jst);
        Duration ttl = Duration.between(ZonedDateTime.now(jst), midnight);
        redisTemplate.opsForValue().set("account_deletion_cancel:" + cancelToken, userId, ttl);

        // セキュリティ: ログに PII（メールアドレス）を出力しない。userId のみ記録する
        log.info("アカウント削除依頼を受け付けました userId={}", userId);
        sendAccountDeletionMail(userId, user.getEmail(), cancelToken);
    }

    private void sendAccountDeletionMail(String userId, String to, String cancelToken) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("【MoneyNote】アカウント削除のご確認");
            message.setText(
                    "アカウント削除の依頼を受け付けました。\n" +
                    "本日深夜0時にアカウントおよび全データが削除されます。\n\n" +
                    "キャンセルする場合は以下のリンクにアクセスしてください（有効期限：本日中）\n\n" +
                    frontendUrl + "/account-deletion/cancel?token=" + cancelToken + "\n\n" +
                    "キャンセルしない場合、この操作は取り消せません。");
            mailSender.send(message);
        } catch (Exception e) {
            // セキュリティ: ログに PII（メールアドレス）を出力しない。userId のみ記録する
            log.error("アカウント削除メールの送信に失敗しました userId={}", userId, e);
        }
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません"));
    }
}
