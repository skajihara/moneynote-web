package com.example.moneynote.domain.budget;

import com.example.moneynote.common.exception.AccessDeniedException;
import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.exception.ValidationException;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.budget.dto.BudgetHeatmapItemDto;
import com.example.moneynote.domain.budget.dto.BudgetHeatmapMonthDto;
import com.example.moneynote.domain.budget.dto.BudgetRequest;
import com.example.moneynote.domain.budget.dto.BudgetResponse;
import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.category.CategoryType;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.transaction.Transaction;
import com.example.moneynote.domain.transaction.TransactionRepository;
import com.example.moneynote.domain.transaction.TransactionType;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerAccessValidator accessValidator;

    @Transactional(readOnly = true)
    public List<BudgetResponse> getBudgets(String ledgerId, int year, int month, String userId) {
        accessValidator.validate(ledgerId, userId);

        List<Budget> budgets = budgetRepository.findByLedgerLedgerIdAndYearAndMonth(
                ledgerId, (short) year, (short) month);

        // 当月の実績を取得
        YearMonth ym = YearMonth.of(year, month);
        List<Transaction> transactions = transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                ledgerId, ym.atDay(1), ym.atEndOfMonth());

        // カテゴリ別の実績金額をマップ化
        Map<String, BigDecimal> actualMap = transactions.stream()
                .filter(t -> t.getCategory() != null && t.getTransactionType() == TransactionType.EXPENSE)
                .collect(Collectors.groupingBy(
                        t -> t.getCategory().getCategoryId(),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)));

        return budgets.stream()
                .map(b -> toResponse(b, actualMap.getOrDefault(b.getCategory().getCategoryId(), BigDecimal.ZERO)))
                .toList();
    }

    @Transactional
    public BudgetResponse upsertBudget(String ledgerId, BudgetRequest req, String userId) {
        Ledger ledger = accessValidator.validate(ledgerId, userId);

        Category category = categoryRepository.findById(req.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("カテゴリが見つかりません"));

        // 対象帳簿のカテゴリであること
        if (!category.getLedger().getLedgerId().equals(ledgerId)) {
            throw new ValidationException("指定されたカテゴリはこの帳簿に属していません");
        }
        // EXPENSE カテゴリのみ対象
        if (category.getCategoryType() != CategoryType.EXPENSE) {
            throw new ValidationException("予算は支出カテゴリにのみ設定できます");
        }

        Budget budget = budgetRepository
                .findByLedgerLedgerIdAndCategory_CategoryIdAndYearAndMonth(
                        ledgerId, req.categoryId(), (short) req.year(), (short) req.month())
                .orElseGet(() -> Budget.builder()
                        .budgetId(IdGenerator.budgetId())
                        .ledger(ledger)
                        .category(category)
                        .year((short) req.year())
                        .month((short) req.month())
                        .build());

        budget.setAmount(req.amount());
        Budget saved = budgetRepository.save(budget);

        // 実績取得
        YearMonth ym = YearMonth.of(req.year(), req.month());
        List<Transaction> transactions = transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                ledgerId, ym.atDay(1), ym.atEndOfMonth());
        BigDecimal actual = transactions.stream()
                .filter(t -> t.getCategory() != null
                        && t.getCategory().getCategoryId().equals(req.categoryId())
                        && t.getTransactionType() == TransactionType.EXPENSE)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return toResponse(saved, actual);
    }

    /**
     * GET /budgets/heatmap - 過去 N ヶ月分の月別予算達成状況を一括取得する
     * 新しい月が先頭になるよう降順で返す
     */
    @Transactional(readOnly = true)
    public List<BudgetHeatmapMonthDto> getBudgetHeatmap(String ledgerId, int months, String userId) {
        accessValidator.validate(ledgerId, userId);

        YearMonth current = YearMonth.now();
        List<BudgetHeatmapMonthDto> result = new ArrayList<>();

        for (int i = 0; i < months; i++) {
            YearMonth ym = current.minusMonths(i); // 新しい月が先頭
            List<Budget> budgets = budgetRepository.findByLedgerLedgerIdAndYearAndMonth(
                    ledgerId, (short) ym.getYear(), (short) ym.getMonthValue());

            if (budgets.isEmpty()) {
                result.add(new BudgetHeatmapMonthDto(ym.toString(), List.of()));
                continue;
            }

            // 当月の実績
            List<Transaction> txList = transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                    ledgerId, ym.atDay(1), ym.atEndOfMonth());
            Map<String, BigDecimal> actualMap = txList.stream()
                    .filter(t -> t.getCategory() != null
                            && t.getTransactionType() == TransactionType.EXPENSE)
                    .collect(Collectors.groupingBy(
                            t -> t.getCategory().getCategoryId(),
                            Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)));

            List<BudgetHeatmapItemDto> items = budgets.stream().map(b -> {
                BigDecimal actual = actualMap.getOrDefault(
                        b.getCategory().getCategoryId(), BigDecimal.ZERO);
                double pct = b.getAmount().compareTo(BigDecimal.ZERO) == 0 ? 0.0
                        : actual.multiply(BigDecimal.valueOf(100))
                                .divide(b.getAmount(), 2, RoundingMode.HALF_UP)
                                .doubleValue();
                String status = pct >= 100.0 ? "OVER" : pct >= 80.0 ? "WARNING" : "NORMAL";
                return new BudgetHeatmapItemDto(
                        b.getCategory().getCategoryId(),
                        b.getCategory().getCategoryName(),
                        b.getAmount(), actual, pct, status);
            }).toList();

            result.add(new BudgetHeatmapMonthDto(ym.toString(), items));
        }
        return result;
    }

    @Transactional
    public void deleteBudget(String ledgerId, String budgetId, String userId) {
        accessValidator.validate(ledgerId, userId);

        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("予算が見つかりません"));

        if (!budget.getLedger().getLedgerId().equals(ledgerId)) {
            throw new AccessDeniedException("この予算へのアクセス権限がありません");
        }

        budgetRepository.delete(budget);
    }

    private BudgetResponse toResponse(Budget budget, BigDecimal actual) {
        BigDecimal budgetAmt = budget.getAmount();
        double pct = budgetAmt.compareTo(BigDecimal.ZERO) == 0 ? 0.0
                : actual.multiply(BigDecimal.valueOf(100))
                        .divide(budgetAmt, 2, RoundingMode.HALF_UP)
                        .doubleValue();

        String status;
        if (pct >= 100.0) {
            status = "OVER";
        } else if (pct >= 80.0) {
            status = "WARNING";
        } else {
            status = "NORMAL";
        }

        BigDecimal remaining = budgetAmt.subtract(actual);

        return new BudgetResponse(
                budget.getBudgetId(),
                budget.getCategory().getCategoryId(),
                budget.getCategory().getCategoryName(),
                budget.getCategory().getIcon(),
                budgetAmt,
                actual,
                pct,
                status,
                remaining
        );
    }
}
