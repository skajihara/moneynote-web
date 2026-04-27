package com.example.moneynote.domain.ledger;

import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.aiadvicecache.AiAdviceCacheRepository;
import com.example.moneynote.domain.budget.BudgetRepository;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.fixedtransaction.FixedTransactionRepository;
import com.example.moneynote.domain.ledger.dto.LedgerRequest;
import com.example.moneynote.domain.ledger.dto.LedgerResponse;
import com.example.moneynote.domain.ledgerpermission.LedgerPermission;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import com.example.moneynote.domain.ledgerpermission.PermissionType;
import com.example.moneynote.domain.transaction.TransactionRepository;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

// Lombok @Builder の戻り値に対する IDE の Null 型安全警告を抑制する（実行時は問題なし）
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class LedgerService {

    private final LedgerRepository ledgerRepository;
    private final LedgerPermissionRepository ledgerPermissionRepository;
    private final UserRepository userRepository;
    private final LedgerAccessValidator accessValidator;
    private final AiAdviceCacheRepository aiAdviceCacheRepository;
    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final FixedTransactionRepository fixedTransactionRepository;
    private final CategoryRepository categoryRepository;

    /**
     * ログインユーザーがアクセス可能な帳簿一覧を取得する（所有または権限あり）。
     */
    @Transactional(readOnly = true)
    public List<LedgerResponse> getLedgers(String userId) {
        return ledgerRepository.findAccessibleLedgers(userId)
                .stream()
                .map(LedgerResponse::from)
                .toList();
    }

    /**
     * 帳簿詳細を取得する。アクセス権限を検証する。
     */
    @Transactional(readOnly = true)
    public LedgerResponse getLedger(String ledgerId, String userId) {
        Ledger ledger = accessValidator.validate(ledgerId, userId);
        return LedgerResponse.from(ledger);
    }

    /**
     * 帳簿を作成する。
     */
    @Transactional
    public LedgerResponse createLedger(LedgerRequest request, String userId) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません"));

        Ledger ledger = Ledger.builder()
                .ledgerId(IdGenerator.ledgerId())
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

        // 作成者に ADMIN 権限を付与する
        ledgerPermissionRepository.save(LedgerPermission.builder()
                .permissionId(IdGenerator.ledgerPermissionId())
                .ledger(ledger)
                .user(owner)
                .permissionType(PermissionType.ADMIN)
                .build());

        // 案B採用: POST /api/v1/ledgers ではカテゴリを自動生成しない。
        // デフォルトカテゴリは register 時（AuthService）のみ生成する。
        // 追加帳簿は用途が異なる場合が多く、設定画面から手動で追加する。

        return LedgerResponse.from(ledger);
    }

    /**
     * 帳簿情報を更新する。アクセス権限を検証する。
     */
    @Transactional
    public LedgerResponse updateLedger(String ledgerId, LedgerRequest request, String userId) {
        Ledger ledger = accessValidator.validate(ledgerId, userId);

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

        return LedgerResponse.from(ledgerRepository.save(ledger));
    }

    /**
     * 帳簿と全関連データを物理削除する。
     * FK制約の順序に従い: ai_cache → budgets → transactions → fixed_transactions
     *                    → categories → ledger_permissions → ledger
     */
    @Transactional
    public void deleteLedger(String ledgerId, String userId) {
        accessValidator.validate(ledgerId, userId);
        cascadeDeleteLedger(ledgerId);
    }

    /**
     * 帳簿に紐づく全データをFK順に削除してから帳簿本体を削除する。
     * UserService.deleteAccount からも呼び出せるようパッケージスコープで公開する。
     */
    public void cascadeDeleteLedger(String ledgerId) {
        aiAdviceCacheRepository.deleteByLedgerLedgerId(ledgerId);
        budgetRepository.deleteByLedgerLedgerId(ledgerId);
        transactionRepository.deleteByLedgerLedgerId(ledgerId);
        fixedTransactionRepository.deleteByLedgerLedgerId(ledgerId);
        categoryRepository.deleteByLedgerLedgerId(ledgerId);
        ledgerPermissionRepository.deleteByLedgerLedgerId(ledgerId);
        ledgerRepository.deleteById(ledgerId);
    }
}
