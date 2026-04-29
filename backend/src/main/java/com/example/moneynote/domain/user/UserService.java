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
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
     * アカウントと全関連データを削除する。
     * FK制約の順序に従い: ai_cache → budgets → transactions → fixed_transactions
     *                    → categories → ledger_permissions → ledgers → user
     */
    @Transactional
    public void deleteAccount(String userId) {
        findUser(userId);

        // 所有帳簿をカスケード削除する
        ledgerRepository.findByOwnerUserId(userId)
                .forEach(l -> ledgerCascadeDeleter.delete(l.getLedgerId()));

        // 他の帳簿への参加権限も削除する
        ledgerPermissionRepository.deleteByUserUserId(userId);

        // Redisのリフレッシュトークンを削除する
        redisTemplate.delete("refresh:" + userId);

        userRepository.deleteById(userId);
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません"));
    }
}
