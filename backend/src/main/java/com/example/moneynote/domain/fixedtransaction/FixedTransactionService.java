package com.example.moneynote.domain.fixedtransaction;

import com.example.moneynote.common.exception.AccessDeniedException;
import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.exception.ValidationException;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.fixedtransaction.dto.FixedTransactionRequest;
import com.example.moneynote.domain.fixedtransaction.dto.FixedTransactionResponse;
import com.example.moneynote.domain.fixedtransaction.dto.GenerateResult;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.transaction.Transaction;
import com.example.moneynote.domain.transaction.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class FixedTransactionService {

    private final FixedTransactionRepository fixedTransactionRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final LedgerAccessValidator accessValidator;

    // -------------------------------------------------------------------------
    // 一覧取得
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<FixedTransactionResponse> getFixedTransactions(
            String ledgerId, String statusFilter, String userId) {

        accessValidator.validate(ledgerId, userId);

        LocalDate today = LocalDate.now();
        List<FixedTransaction> list;
        if ("ACTIVE".equals(statusFilter)) {
            list = fixedTransactionRepository.findActiveByLedgerId(ledgerId, today);
        } else if ("EXPIRED".equals(statusFilter)) {
            list = fixedTransactionRepository.findExpiredByLedgerId(ledgerId, today);
        } else {
            list = fixedTransactionRepository.findByLedgerLedgerIdOrderByFixedNameAsc(ledgerId);
        }

        return list.stream().map(FixedTransactionResponse::from).toList();
    }

    // -------------------------------------------------------------------------
    // 登録
    // -------------------------------------------------------------------------

    @Transactional
    public FixedTransactionResponse createFixedTransaction(
            String ledgerId, FixedTransactionRequest req, String userId) {

        Ledger ledger = accessValidator.validate(ledgerId, userId);
        validateEndDate(req);
        Category category = validateCategory(ledgerId, req);

        FixedTransaction fixed = FixedTransaction.builder()
                .fixedTransactionId(IdGenerator.generateUnique("fix_", fixedTransactionRepository::existsById))
                .ledger(ledger)
                .category(category)
                .fixedName(req.fixedName())
                .transactionType(req.transactionType())
                .amount(req.amount())
                .dayOfMonth((short) req.dayOfMonth())
                .startDate(req.startDate())
                .endDate(req.endDate())
                .memo(req.memo())
                .isActive(true)
                .build();

        FixedTransaction saved = fixedTransactionRepository.save(fixed);
        generateTransactionsInternal(saved, new java.util.HashSet<>());
        return FixedTransactionResponse.from(saved);
    }

    // -------------------------------------------------------------------------
    // 更新
    // -------------------------------------------------------------------------

    @Transactional
    public FixedTransactionResponse updateFixedTransaction(
            String ledgerId, String fixedId, FixedTransactionRequest req, String userId) {

        accessValidator.validate(ledgerId, userId);
        validateEndDate(req);
        FixedTransaction fixed = findAndValidateOwnership(ledgerId, fixedId);
        Category category = validateCategory(ledgerId, req);

        fixed.setFixedName(req.fixedName());
        fixed.setTransactionType(req.transactionType());
        fixed.setCategory(category);
        fixed.setAmount(req.amount());
        fixed.setDayOfMonth((short) req.dayOfMonth());
        fixed.setStartDate(req.startDate());
        fixed.setEndDate(req.endDate());
        fixed.setMemo(req.memo());

        // 既存の固定費由来明細を全削除して再生成
        transactionRepository.deleteByFixedTransactionId(fixedId);
        FixedTransaction saved = fixedTransactionRepository.save(fixed);
        generateTransactionsInternal(saved, new java.util.HashSet<>());
        return FixedTransactionResponse.from(saved);
    }

    // -------------------------------------------------------------------------
    // 削除
    // -------------------------------------------------------------------------

    @Transactional
    public void deleteFixedTransaction(String ledgerId, String fixedId, String userId) {
        accessValidator.validate(ledgerId, userId);
        FixedTransaction fixed = findAndValidateOwnership(ledgerId, fixedId);

        transactionRepository.deleteByFixedTransactionId(fixedId);
        fixedTransactionRepository.delete(fixed);
    }

    // -------------------------------------------------------------------------
    // 明細一括生成
    // -------------------------------------------------------------------------

    @Transactional
    public GenerateResult generateTransactions(String ledgerId, String fixedId, String userId) {
        accessValidator.validate(ledgerId, userId);
        FixedTransaction fixed = findAndValidateOwnership(ledgerId, fixedId);

        // 既存の生成済み月を収集
        Set<YearMonth> existingMonths = transactionRepository.findByFixedTransactionId(fixedId)
                .stream()
                .map(t -> YearMonth.from(t.getTransactionDate()))
                .collect(Collectors.toSet());

        return generateTransactionsInternal(fixed, existingMonths);
    }

    // -------------------------------------------------------------------------
    // private helpers
    // -------------------------------------------------------------------------

    private GenerateResult generateTransactionsInternal(
            FixedTransaction fixed, Set<YearMonth> existingMonths) {

        LocalDate endLimit = fixed.getEndDate();

        LocalDate cursor = fixed.getStartDate().withDayOfMonth(1);
        LocalDate end    = endLimit.withDayOfMonth(1);

        int generated = 0;
        int skipped   = 0;
        List<Transaction> toSave = new ArrayList<>();

        while (!cursor.isAfter(end)) {
            YearMonth ym = YearMonth.from(cursor);

            if (existingMonths.contains(ym)) {
                skipped++;
            } else {
                int day = Math.min(fixed.getDayOfMonth(), ym.lengthOfMonth());
                LocalDate txDate = LocalDate.of(ym.getYear(), ym.getMonthValue(), day);

                Transaction tx = Transaction.builder()
                        .transactionId(IdGenerator.generateUnique("txn_", transactionRepository::existsById))
                        .ledger(fixed.getLedger())
                        .category(fixed.getCategory())
                        .fixedTransaction(fixed)
                        .transactionType(fixed.getTransactionType())
                        .amount(fixed.getAmount())
                        .transactionDate(txDate)
                        .memo(fixed.getMemo())
                        .isFixedOrigin(true)
                        .build();
                toSave.add(tx);
                generated++;
            }

            cursor = cursor.plusMonths(1);
        }

        if (!toSave.isEmpty()) {
            transactionRepository.saveAll(toSave);
        }

        return new GenerateResult(generated, skipped);
    }

    private FixedTransaction findAndValidateOwnership(String ledgerId, String fixedId) {
        FixedTransaction fixed = fixedTransactionRepository.findById(fixedId)
                .orElseThrow(() -> new ResourceNotFoundException("固定費が見つかりません"));
        if (!fixed.getLedger().getLedgerId().equals(ledgerId)) {
            throw new AccessDeniedException("この固定費へのアクセス権限がありません");
        }
        return fixed;
    }

    private void validateEndDate(FixedTransactionRequest req) {
        if (!req.endDate().isAfter(req.startDate())) {
            throw new ValidationException("終了日は開始日より後の日付を設定してください");
        }
    }

    private Category validateCategory(String ledgerId, FixedTransactionRequest req) {
        Category category = categoryRepository.findById(req.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("カテゴリが見つかりません"));

        if (!category.getLedger().getLedgerId().equals(ledgerId)) {
            throw new ValidationException("指定されたカテゴリはこの帳簿に属していません");
        }
        if (category.getCategoryType().name().equals(req.transactionType().name()) == false) {
            throw new ValidationException("カテゴリの種別と取引種別が一致しません");
        }
        return category;
    }
}
