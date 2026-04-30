package com.example.moneynote.domain.ledger;

import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.ledger.dto.LedgerRequest;
import com.example.moneynote.domain.ledger.dto.LedgerResponse;
import com.example.moneynote.domain.ledgerpermission.LedgerPermission;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import com.example.moneynote.domain.ledgerpermission.PermissionType;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Lombok @Builder の戻り値に対する IDE の Null 型安全警告を抑制する（実行時は問題なし）
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class LedgerService {

    private final LedgerRepository ledgerRepository;
    private final LedgerPermissionRepository ledgerPermissionRepository;
    private final UserRepository userRepository;
    private final LedgerAccessValidator accessValidator;
    private final LedgerCascadeDeleter ledgerCascadeDeleter;

    /**
     * ログインユーザーがアクセス可能な帳簿一覧を取得する（所有または権限あり）。
     * バッチで権限を取得し N+1 を回避する。
     */
    @Transactional(readOnly = true)
    public List<LedgerResponse> getLedgers(String userId) {
        List<Ledger> ledgers = ledgerRepository.findAccessibleLedgers(userId);
        Map<String, PermissionType> permMap = ledgerPermissionRepository.findByUserUserId(userId)
                .stream()
                .collect(Collectors.toMap(
                        lp -> lp.getLedger().getLedgerId(),
                        LedgerPermission::getPermissionType));
        return ledgers.stream()
                .map(l -> {
                    PermissionType pt = l.getOwner().getUserId().equals(userId)
                            ? PermissionType.OWNER
                            : permMap.getOrDefault(l.getLedgerId(), PermissionType.VIEWER);
                    return LedgerResponse.from(l, pt);
                })
                .toList();
    }

    /**
     * 帳簿詳細を取得する。アクセス権限を検証する。
     */
    @Transactional(readOnly = true)
    public LedgerResponse getLedger(String ledgerId, String userId) {
        Ledger ledger = accessValidator.validate(ledgerId, userId);
        PermissionType pt = accessValidator.resolvePermission(ledger, userId);
        return LedgerResponse.from(ledger, pt);
    }

    /**
     * 帳簿を作成する。
     */
    @Transactional
    public LedgerResponse createLedger(LedgerRequest request, String userId) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません"));

        Ledger ledger = Ledger.builder()
                .ledgerId(IdGenerator.generateUnique("ldg_", ledgerRepository::existsById))
                .owner(owner)
                .ledgerName(request.getLedgerName())
                .initialBalance(
                        request.getInitialBalance() != null
                                ? request.getInitialBalance()
                                : BigDecimal.ZERO)
                .startDayOfMonth(
                        request.getStartDayOfMonth() != null
                                ? request.getStartDayOfMonth().shortValue()
                                : (short) 1)
                .startMonthOfYear(
                        request.getStartMonthOfYear() != null
                                ? request.getStartMonthOfYear().shortValue()
                                : (short) 1)
                .build();
        ledgerRepository.save(ledger);

        // 案B採用: POST /api/v1/ledgers ではカテゴリを自動生成しない。
        // デフォルトカテゴリは register 時（AuthService）のみ生成する。
        // 追加帳簿は用途が異なる場合が多く、設定画面から手動で追加する。

        return LedgerResponse.from(ledger, PermissionType.OWNER);
    }

    /**
     * 帳簿情報を更新する。ADMIN以上の権限を検証する。
     */
    @Transactional
    public LedgerResponse updateLedger(String ledgerId, LedgerRequest request, String userId) {
        Ledger ledger = accessValidator.validateAdminAccess(ledgerId, userId);

        ledger.setLedgerName(request.getLedgerName());
        if (request.getInitialBalance() != null) {
            ledger.setInitialBalance(request.getInitialBalance());
        }
        if (request.getStartDayOfMonth() != null) {
            ledger.setStartDayOfMonth(request.getStartDayOfMonth().shortValue());
        }
        if (request.getStartMonthOfYear() != null) {
            ledger.setStartMonthOfYear(request.getStartMonthOfYear().shortValue());
        }
        ledger.setThemeColor(request.getThemeColor());

        Ledger saved = ledgerRepository.save(ledger);
        PermissionType pt = accessValidator.resolvePermission(saved, userId);
        return LedgerResponse.from(saved, pt);
    }

    /**
     * 帳簿と全関連データを物理削除する。OWNERのみ実行可能。
     */
    @Transactional
    public void deleteLedger(String ledgerId, String userId) {
        accessValidator.validateOwnerAccess(ledgerId, userId);
        ledgerCascadeDeleter.delete(ledgerId);
    }
}
