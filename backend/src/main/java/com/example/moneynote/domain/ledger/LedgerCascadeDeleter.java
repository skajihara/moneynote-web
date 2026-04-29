package com.example.moneynote.domain.ledger;

import com.example.moneynote.domain.aiadvicecache.AiAdviceCacheRepository;
import com.example.moneynote.domain.budget.BudgetRepository;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.fixedtransaction.FixedTransactionRepository;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import com.example.moneynote.domain.transaction.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 帳簿カスケード削除の共有ロジック。
 * LedgerService（単一帳簿削除）と UserService（アカウント削除）の両方から利用する。
 * Service 間の直接呼び出しを避けるためにこのコンポーネントへ切り出している。
 */
@SuppressWarnings("null")
@Component
@RequiredArgsConstructor
public class LedgerCascadeDeleter {

    private final AiAdviceCacheRepository aiAdviceCacheRepository;
    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final FixedTransactionRepository fixedTransactionRepository;
    private final CategoryRepository categoryRepository;
    private final LedgerPermissionRepository ledgerPermissionRepository;
    private final LedgerRepository ledgerRepository;

    /**
     * 帳簿と全関連データを物理削除する。
     * FK制約の順序に従い: ai_cache → budgets → transactions → fixed_transactions
     *                    → categories → ledger_permissions → ledger
     */
    @Transactional
    public void delete(String ledgerId) {
        aiAdviceCacheRepository.deleteByLedgerLedgerId(ledgerId);
        budgetRepository.deleteByLedgerLedgerId(ledgerId);
        transactionRepository.deleteByLedgerLedgerId(ledgerId);
        fixedTransactionRepository.deleteByLedgerLedgerId(ledgerId);
        categoryRepository.deleteByLedgerLedgerId(ledgerId);
        ledgerPermissionRepository.deleteByLedgerLedgerId(ledgerId);
        ledgerRepository.deleteById(ledgerId);
    }
}
