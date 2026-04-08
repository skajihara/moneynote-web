package com.example.moneynote.common.validator;

import com.example.moneynote.common.exception.AccessDeniedException;
import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.ledger.LedgerRepository;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * 帳簿アクセス制御の共通バリデーター。
 * 全 /api/v1/ledgers/{ledgerId}/* エンドポイントで使用する。
 *
 * セキュリティ: ログインユーザーが帳簿の所有者または権限保持者かを
 * 必ずDBで検証し、権限なしの場合は 403 Forbidden をスローする。
 */
@Component
@RequiredArgsConstructor
public class LedgerAccessValidator {

    private final LedgerRepository ledgerRepository;
    private final LedgerPermissionRepository ledgerPermissionRepository;

    /**
     * 帳簿へのアクセスを検証する。
     *
     * @param ledgerId 対象帳簿ID
     * @param userId   ログインユーザーID（Principal.getName() から取得）
     * @return 検証済みの帳簿エンティティ
     * @throws ResourceNotFoundException 帳簿が存在しない場合（404）
     * @throws AccessDeniedException     アクセス権限がない場合（403）
     */
    public Ledger validate(String ledgerId, String userId) {
        // PathVariable から来るため null は想定外だが、型安全のため明示的にチェックする
        Objects.requireNonNull(ledgerId, "ledgerId must not be null");
        Ledger ledger = ledgerRepository.findById(ledgerId)
                .orElseThrow(() -> new ResourceNotFoundException("帳簿が見つかりません"));

        if (!ledger.isActive()) {
            throw new ResourceNotFoundException("帳簿が見つかりません");
        }

        // 所有者は常にアクセス可能
        if (ledger.getOwner().getUserId().equals(userId)) {
            return ledger;
        }

        // ledger_permissions テーブルで権限を確認
        if (ledgerPermissionRepository.existsByLedgerLedgerIdAndUserUserId(ledgerId, userId)) {
            return ledger;
        }

        // セキュリティ: 権限のないユーザーには 403 を返す
        throw new AccessDeniedException("この帳簿へのアクセス権限がありません");
    }
}
