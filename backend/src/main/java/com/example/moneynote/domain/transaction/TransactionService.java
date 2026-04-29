package com.example.moneynote.domain.transaction;

import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.exception.ValidationException;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.util.LedgerPeriodCalculator;
import com.example.moneynote.common.util.LedgerPeriodCalculator.LocalDateRange;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.transaction.dto.BalanceResponse;
import com.example.moneynote.domain.transaction.dto.DailySummary;
import com.example.moneynote.domain.transaction.dto.DeleteTransactionRequest;
import com.example.moneynote.domain.transaction.dto.TransactionListResponse;
import com.example.moneynote.domain.transaction.dto.TransactionRequest;
import com.example.moneynote.domain.transaction.dto.TransactionResponse;
import com.example.moneynote.domain.transaction.dto.TransactionSummary;
import com.example.moneynote.domain.transaction.dto.DeleteTransactionRequest.DeleteScope;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

// Lombok @Builder の戻り値に対する IDE の Null 型安全警告を抑制する（実行時は問題なし）
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final LedgerAccessValidator accessValidator;

    // -------------------------------------------------------------------------
    // 明細一覧・集計
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public TransactionListResponse getTransactions(
            String ledgerId, int year, int month,
            String categoryId, TransactionType type, String userId) {

        Ledger ledger = accessValidator.validate(ledgerId, userId);

        // 帳簿の月度開始日を使って集計期間を算出する
        LocalDateRange period = LedgerPeriodCalculator.getMonthPeriod(
                year, month, ledger.getStartDayOfMonth());
        LocalDate from = period.from();
        LocalDate to   = period.to();

        List<Transaction> transactions = fetchFiltered(ledgerId, from, to, categoryId, type);

        // summary 計算
        BigDecimal totalIncome  = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        for (Transaction t : transactions) {
            if (t.getTransactionType() == TransactionType.INCOME) {
                totalIncome = totalIncome.add(t.getAmount());
            } else {
                totalExpense = totalExpense.add(t.getAmount());
            }
        }
        TransactionSummary summary = new TransactionSummary(
                totalIncome, totalExpense, totalIncome.subtract(totalExpense));

        // dailySummaries: from〜to の全日を初期化し、明細で集計する
        Map<LocalDate, BigDecimal[]> dailyMap = new java.util.LinkedHashMap<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            dailyMap.put(date, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        }
        for (Transaction t : transactions) {
            BigDecimal[] sums = dailyMap.get(t.getTransactionDate());
            if (sums != null) {
                if (t.getTransactionType() == TransactionType.INCOME) {
                    sums[0] = sums[0].add(t.getAmount());
                } else {
                    sums[1] = sums[1].add(t.getAmount());
                }
            }
        }
        List<DailySummary> dailySummaries = dailyMap.entrySet().stream()
                .map(e -> new DailySummary(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();

        List<TransactionResponse> responses = transactions.stream()
                .map(TransactionResponse::from)
                .toList();

        return new TransactionListResponse(summary, dailySummaries, responses);
    }

    private List<Transaction> fetchFiltered(
            String ledgerId, LocalDate from, LocalDate to,
            String categoryId, TransactionType type) {

        if (categoryId != null && type != null) {
            return transactionRepository.findByLedgerIdAndDateRangeAndCategoryAndTypeWithDetails(
                    ledgerId, from, to, categoryId, type);
        } else if (categoryId != null) {
            return transactionRepository.findByLedgerIdAndDateRangeAndCategoryWithDetails(
                    ledgerId, from, to, categoryId);
        } else if (type != null) {
            return transactionRepository.findByLedgerIdAndDateRangeAndTypeWithDetails(
                    ledgerId, from, to, type);
        } else {
            return transactionRepository.findByLedgerIdAndDateRangeWithDetails(ledgerId, from, to);
        }
    }

    // -------------------------------------------------------------------------
    // 残高
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public BalanceResponse getBalance(String ledgerId, String userId) {
        Ledger ledger = accessValidator.validate(ledgerId, userId);

        List<Transaction> allTx = transactionRepository.findByLedgerLedgerIdOrderByTransactionDateDesc(ledgerId);

        BigDecimal totalIncome  = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        for (Transaction t : allTx) {
            if (t.getTransactionType() == TransactionType.INCOME) {
                totalIncome = totalIncome.add(t.getAmount());
            } else {
                totalExpense = totalExpense.add(t.getAmount());
            }
        }

        BigDecimal initialBalance = ledger.getInitialBalance();
        BigDecimal currentBalance = initialBalance.add(totalIncome).subtract(totalExpense);

        // carryOver: 現在の月度開始日より前の残高
        YearMonth currentYM = LedgerPeriodCalculator.getCurrentMonth(ledger.getStartDayOfMonth());
        LocalDateRange currentPeriod = LedgerPeriodCalculator.getMonthPeriod(
                currentYM.getYear(), currentYM.getMonthValue(), ledger.getStartDayOfMonth());
        List<Transaction> prevTx = transactionRepository.findByLedgerIdBeforeDate(
                ledgerId, currentPeriod.from());
        BigDecimal prevIncome  = BigDecimal.ZERO;
        BigDecimal prevExpense = BigDecimal.ZERO;
        for (Transaction t : prevTx) {
            if (t.getTransactionType() == TransactionType.INCOME) {
                prevIncome = prevIncome.add(t.getAmount());
            } else {
                prevExpense = prevExpense.add(t.getAmount());
            }
        }
        BigDecimal carryOver = initialBalance.add(prevIncome).subtract(prevExpense);

        return new BalanceResponse(initialBalance, totalIncome, totalExpense, currentBalance, carryOver);
    }

    // -------------------------------------------------------------------------
    // 明細 CRUD
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public TransactionResponse getTransaction(String ledgerId, String transactionId, String userId) {
        accessValidator.validate(ledgerId, userId);
        Transaction t = findTransaction(ledgerId, transactionId);
        return TransactionResponse.from(t);
    }

    @Transactional
    public TransactionResponse createTransaction(
            String ledgerId, TransactionRequest request, String userId) {

        accessValidator.validate(ledgerId, userId);

        // validate 済みの ledger を再利用してエンティティを生成する
        Ledger ledger = accessValidator.validate(ledgerId, userId);
        Category category = validateCategory(ledgerId, request.categoryId(), request.transactionType());

        Transaction t = Transaction.builder()
                .transactionId(IdGenerator.generateUnique("txn_", transactionRepository::existsById))
                .ledger(ledger)
                .category(category)
                .transactionType(request.transactionType())
                .amount(request.amount())
                .transactionDate(request.transactionDate())
                .memo(request.memo())
                .isFixedOrigin(false)
                .build();

        return TransactionResponse.from(transactionRepository.save(t));
    }

    @Transactional
    public TransactionResponse updateTransaction(
            String ledgerId, String transactionId, TransactionRequest request, String userId) {

        accessValidator.validate(ledgerId, userId);
        Transaction t = findTransaction(ledgerId, transactionId);

        Category category = validateCategory(ledgerId, request.categoryId(), request.transactionType());

        t.setTransactionType(request.transactionType());
        t.setAmount(request.amount());
        t.setTransactionDate(request.transactionDate());
        t.setCategory(category);
        t.setMemo(request.memo());

        return TransactionResponse.from(transactionRepository.save(t));
    }

    @Transactional
    public void deleteTransaction(
            String ledgerId, String transactionId,
            DeleteTransactionRequest request, String userId) {

        accessValidator.validate(ledgerId, userId);
        Transaction t = findTransaction(ledgerId, transactionId);

        // isFixedOrigin=false の場合は scope に関わらず SINGLE として扱う
        if (request.scope() == DeleteScope.ALL && t.isFixedOrigin()
                && t.getFixedTransaction() != null) {
            transactionRepository.deleteByFixedTransactionId(
                    t.getFixedTransaction().getFixedTransactionId());
        } else {
            transactionRepository.delete(t);
        }
    }

    // -------------------------------------------------------------------------
    // 検索
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TransactionResponse> searchTransactions(
            String ledgerId, String keyword, String categoryId,
            String startDate, String endDate, String userId) {

        accessValidator.validate(ledgerId, userId);

        // Hibernate 6 は LocalDate 型パラメータに null を渡すと型解決できないため
        // null の代わりにセンチネル値を渡して BETWEEN で範囲を表現する
        LocalDate from = (startDate != null && !startDate.isBlank())
                ? LocalDate.parse(startDate) : LocalDate.of(1900, 1, 1);
        LocalDate to   = (endDate != null && !endDate.isBlank())
                ? LocalDate.parse(endDate) : LocalDate.of(9999, 12, 31);
        String kw    = (keyword == null || keyword.isBlank()) ? "" : keyword.trim();
        String catId = (categoryId == null || categoryId.isBlank()) ? "" : categoryId;

        return transactionRepository.searchTransactions(ledgerId, kw, catId, from, to)
                .stream().map(TransactionResponse::from).toList();
    }

    // -------------------------------------------------------------------------
    // private helpers
    // -------------------------------------------------------------------------

    private Transaction findTransaction(String ledgerId, String transactionId) {
        return transactionRepository.findById(transactionId)
                .filter(t -> t.getLedger().getLedgerId().equals(ledgerId))
                .orElseThrow(() -> new ResourceNotFoundException("明細が見つかりません"));
    }

    private Category validateCategory(String ledgerId, String categoryId, TransactionType txType) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ValidationException("カテゴリが見つかりません"));

        if (!category.getLedger().getLedgerId().equals(ledgerId)) {
            throw new ValidationException("指定されたカテゴリはこの帳簿に属していません");
        }

        if (!category.isActive()) {
            throw new ValidationException("指定されたカテゴリは削除されています");
        }

        // categoryType と transactionType の一致検証
        boolean typeMatches = switch (txType) {
            case EXPENSE -> category.getCategoryType() == com.example.moneynote.domain.category.CategoryType.EXPENSE;
            case INCOME  -> category.getCategoryType() == com.example.moneynote.domain.category.CategoryType.INCOME;
        };
        if (!typeMatches) {
            throw new ValidationException("カテゴリの種別が明細の種別と一致しません");
        }

        return category;
    }
}
