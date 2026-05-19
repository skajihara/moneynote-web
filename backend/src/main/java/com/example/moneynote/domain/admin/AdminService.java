package com.example.moneynote.domain.admin;

import com.example.moneynote.common.exception.AccessDeniedException;
import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.exception.ValidationException;
import com.example.moneynote.domain.admin.dto.AdminChangeRoleRequest;
import com.example.moneynote.domain.admin.dto.AdminCreateUserRequest;
import com.example.moneynote.domain.admin.dto.AdminUserResponse;
import com.example.moneynote.domain.ledger.LedgerCascadeDeleter;
import com.example.moneynote.domain.ledger.LedgerRepository;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import com.example.moneynote.domain.user.PendingDeletionUserRepository;
import com.example.moneynote.domain.user.Role;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final LedgerRepository ledgerRepository;
    private final LedgerCascadeDeleter ledgerCascadeDeleter;
    private final LedgerPermissionRepository ledgerPermissionRepository;
    private final PendingDeletionUserRepository pendingDeletionUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {
        return userRepository.findAllByOrderByCreatedAtAsc()
                .stream()
                .map(AdminUserResponse::from)
                .toList();
    }

    @Transactional
    public AdminUserResponse createUser(AdminCreateUserRequest request) {
        if (userRepository.existsById(request.userId())) {
            throw new ValidationException("このユーザーIDはすでに使用されています");
        }
        Role role = Role.valueOf(request.role());
        User user = User.builder()
                .userId(request.userId())
                .userName(request.userId())
                .email(request.userId() + "@admin.local")
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .isActive(true)
                .build();
        return AdminUserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AdminUserResponse changeRole(String targetUserId, String operatorUserId, AdminChangeRoleRequest request) {
        User user = findUser(targetUserId);
        // SYSTEM_ADMIN 自身のロールを下げることを防ぐ（権限剥奪による自己ロックアウト防止）
        if (targetUserId.equals(operatorUserId)) {
            throw new AccessDeniedException("自身のロールは変更できません");
        }
        user.setRole(Role.valueOf(request.role()));
        return AdminUserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AdminUserResponse activate(String targetUserId, String operatorUserId) {
        if (targetUserId.equals(operatorUserId)) {
            throw new AccessDeniedException("自身のアカウントは操作できません");
        }
        User user = findUser(targetUserId);
        user.setActive(true);
        return AdminUserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AdminUserResponse deactivate(String targetUserId, String operatorUserId) {
        if (targetUserId.equals(operatorUserId)) {
            throw new AccessDeniedException("自身のアカウントは無効化できません");
        }
        User user = findUser(targetUserId);
        if (user.getRole() == Role.SYSTEM_ADMIN) {
            throw new AccessDeniedException("SYSTEM_ADMINアカウントは無効化できません");
        }
        user.setActive(false);
        return AdminUserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(String targetUserId, String operatorUserId) {
        if (targetUserId.equals(operatorUserId)) {
            throw new AccessDeniedException("自身のアカウントは削除できません");
        }
        User user = findUser(targetUserId);
        if (user.getRole() == Role.SYSTEM_ADMIN) {
            throw new AccessDeniedException("SYSTEM_ADMINアカウントは削除できません");
        }

        ledgerRepository.findByOwnerUserId(targetUserId)
                .forEach(l -> ledgerCascadeDeleter.delete(l.getLedgerId()));
        ledgerPermissionRepository.deleteByUserUserId(targetUserId);
        redisTemplate.delete("refresh:" + targetUserId);
        // 退会予定に登録されている場合も削除する（管理者による即時削除）
        pendingDeletionUserRepository.deleteById(targetUserId);
        userRepository.deleteById(targetUserId);
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません"));
    }
}
