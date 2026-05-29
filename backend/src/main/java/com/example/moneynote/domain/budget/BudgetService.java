package com.example.moneynote.domain.budget;

import com.example.moneynote.common.exception.AccessDeniedException;
import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.exception.ValidationException;
import com.example.moneynote.common.util.BudgetStatusCalculator;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.util.LedgerPeriodCalculator;
import com.example.moneynote.common.util.LedgerPeriodCalculator.LocalDateRange;
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
import java.time.LocalDate;
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
        Ledger ledger = accessValidator.validate(ledgerId, userId);

        List<Budget> budgets = budgetRepository.findByLedgerLedgerIdAndYearAndMonth(
                ledgerId, (short) year, (short) month);

        // 帳簿の月度開始日を使って集計期間を算出する
        LocalDateRange period = LedgerPeriodCalculator.getMonthPeriod(
                year, month, ledger.getStartDayOfMonth());
        List<Transaction> transactions = transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                ledgerId, period.from(), period.to());

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
        Ledger ledger = accessValidator.validateAdminAccess(ledgerId, userId);

        Category category = categoryRepository.findById(req.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("カテゴリが見つかりません"));

        if (!category.getLedger().getLedgerId().equals(ledgerId)) {
            throw new ValidationException("指定されたカテゴリはこの帳簿に属していません");
        }
        if (category.getCategoryType() != CategoryType.EXPENSE) {
            throw new ValidationException("予算は支出カテゴリにのみ設定できます");
        }

        Budget budget = budgetRepository
                .findByLedgerLedgerIdAndCategory_CategoryIdAndYearAndMonth(
                        ledgerId, req.categoryId(), (short) req.year(), (short) req.month())
                .orElseGet(() -> Budget.builder()
                        .budgetId(IdGenerator.generateUnique("bgt_", budgetRepository::existsById))
                        .ledger(ledger)
                        .category(category)
                        .year((short) req.year())
                        .month((short) req.month())
                        .build());

        budget.setAmount(req.amount());
        Budget saved = budgetRepository.save(budget);

        // 実績取得
        LocalDateRange period = LedgerPeriodCalculator.getMonthPeriod(
                req.year(), req.month(), ledger.getStartDayOfMonth());
        List<Transaction> transactions = transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                ledgerId, period.from(), period.to());
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
     */
    @Transactional(readOnly = true)
    public List<BudgetHeatmapMonthDto> getBudgetHeatmap(String ledgerId, int months, String userId) {
        Ledger ledger = accessValidator.validate(ledgerId, userId);
        int startDay = ledger.getStartDayOfMonth();

        YearMonth current = LedgerPeriodCalculator.getCurrentMonth(startDay);
        List<BudgetHeatmapMonthDto> result = new ArrayList<>();

        for (int i = 0; i < months; i++) {
            YearMonth ym = current.minusMonths(i);
            List<Budget> budgets = budgetRepository.findByLedgerLedgerIdAndYearAndMonth(
                    ledgerId, (short) ym.getYear(), (short) ym.getMonthValue());

            if (budgets.isEmpty()) {
                result.add(new BudgetHeatmapMonthDto(ym.toString(), List.of()));
                continue;
            }

            // 月度期間の実績を取得する
            LocalDateRange period = LedgerPeriodCalculator.getMonthPeriod(
                    ym.getYear(), ym.getMonthValue(), startDay);
            List<Transaction> txList = transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                    ledgerId, period.from(), period.to());
            Map<String, BigDecimal> actualMap = txList.stream()
                    .filter(t -> t.getCategory() != null
                            && t.getTransactionType() == TransactionType.EXPENSE)
                    .collect(Collectors.groupingBy(
                            t -> t.getCategory().getCategoryId(),
                            Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)));

            List<BudgetHeatmapItemDto> items = budgets.stream().map(b -> {
                BigDecimal actual = actualMap.getOrDefault(
                        b.getCategory().getCategoryId(), BigDecimal.ZERO);
                double pct = BudgetStatusCalculator.calcUsageRate(b.getAmount(), actual);
                String status = BudgetStatusCalculator.calcStatus(pct);
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
        accessValidator.validateAdminAccess(ledgerId, userId);

        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("予算が見つかりません"));

        if (!budget.getLedger().getLedgerId().equals(ledgerId)) {
            throw new AccessDeniedException("この予算へのアクセス権限がありません");
        }

        budgetRepository.delete(budget);
    }

    private BudgetResponse toResponse(Budget budget, BigDecimal actual) {
        BigDecimal budgetAmt = budget.getAmount();
        double pct = BudgetStatusCalculator.calcUsageRate(budgetAmt, actual);
        String status = BudgetStatusCalculator.calcStatus(pct);

        BigDecimal remaining = budgetAmt.subtract(actual);

        return new BudgetResponse(
                budget.getBudgetId(),
                budget.getCategory().getCategoryId(),
                budget.getCategory().getCategoryName(),
                budget.getCategory().getIcon(),
                !budget.getCategory().isActive(),
                budgetAmt,
                actual,
                pct,
                status,
                remaining
        );
    }
}
