package com.example.moneynote.domain.user;

import com.example.moneynote.domain.ledger.LedgerCascadeDeleter;
import com.example.moneynote.domain.ledger.LedgerRepository;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class AccountDeletionBatchService {

    private final PendingDeletionUserRepository pendingDeletionUserRepository;
    private final UserRepository userRepository;
    private final LedgerRepository ledgerRepository;
    private final LedgerCascadeDeleter ledgerCascadeDeleter;
    private final LedgerPermissionRepository ledgerPermissionRepository;
    private final StringRedisTemplate redisTemplate;

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Tokyo")
    @Transactional
    public void processDeletions() {
        List<PendingDeletionUser> pending = pendingDeletionUserRepository.findAll();
        log.info("アカウント削除バッチ開始: {}件", pending.size());
        for (PendingDeletionUser p : pending) {
            deleteUser(p.getUserId());
        }
        log.info("アカウント削除バッチ完了: {}件", pending.size());
    }

    @Transactional
    public void deleteUser(String userId) {
        log.info("アカウント削除バッチ処理: userId={}", userId);
        // 所有帳簿をカスケード削除する
        ledgerRepository.findByOwnerUserId(userId)
                .forEach(l -> ledgerCascadeDeleter.delete(l.getLedgerId()));
        // 他の帳簿への参加権限を削除する
        ledgerPermissionRepository.deleteByUserUserId(userId);
        // Redisのリフレッシュトークンを削除する
        redisTemplate.delete("refresh:" + userId);
        // pending_deletion_users から削除する
        pendingDeletionUserRepository.deleteById(userId);
        // users から物理削除する
        userRepository.deleteById(userId);
    }
}
