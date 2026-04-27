package com.example.moneynote.domain.dashboard;

import com.example.moneynote.common.util.LedgerPeriodCalculator;
import com.example.moneynote.common.util.LedgerPeriodCalculator.LocalDateRange;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.budget.Budget;
import com.example.moneynote.domain.budget.BudgetRepository;
import com.example.moneynote.domain.dashboard.dto.BudgetStatusDto;
import com.example.moneynote.domain.dashboard.dto.CategoryBreakdownDto;
import com.example.moneynote.domain.dashboard.dto.DashboardResponse;
import com.example.moneynote.domain.dashboard.dto.DashboardSummaryDto;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.transaction.Transaction;
import com.example.moneynote.domain.transaction.TransactionRepository;
import com.example.moneynote.domain.transaction.TransactionType;
import com.example.moneynote.domain.transaction.dto.TransactionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final LedgerAccessValidator accessValidator;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(
            String ledgerId, int year, int month, int recentCount, String userId) {

        Ledger ledger = accessValidator.validate(ledgerId, userId);

        // 帳簿の月度開始日を使って集計期間を算出する
        LocalDateRange period = LedgerPeriodCalculator.getMonthPeriod(
                year, month, ledger.getStartDayOfMonth());
        LocalDate from = period.from();
        LocalDate to   = period.to();

        // 当月の全明細（カテゴリ付きで取得）
        List<Transaction> monthlyTx =
                transactionRepository.findByLedgerIdAndDateRangeWithDetails(ledgerId, from, to);

        // =========================================================
        // summary: totalIncome / totalExpense / netBalance
        // =========================================================
        BigDecimal totalIncome  = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        for (Transaction t : monthlyTx) {
            if (t.getTransactionType() == TransactionType.INCOME) {
                totalIncome = totalIncome.add(t.getAmount());
            } else {
                totalExpense = totalExpense.add(t.getAmount());
            }
        }
        BigDecimal netBalance = totalIncome.subtract(totalExpense);

        // currentBalance: 初期残高 + 全期間収支
        List<Transaction> allTx =
                transactionRepository.findByLedgerLedgerIdOrderByTransactionDateDesc(ledgerId);
        BigDecimal allIncome  = BigDecimal.ZERO;
        BigDecimal allExpense = BigDecimal.ZERO;
        for (Transaction t : allTx) {
            if (t.getTransactionType() == TransactionType.INCOME) {
                allIncome = allIncome.add(t.getAmount());
            } else {
                allExpense = allExpense.add(t.getAmount());
            }
        }
        BigDecimal initialBalance = ledger.getInitialBalance();
        BigDecimal currentBalance = initialBalance.add(allIncome).subtract(allExpense);

        // carryOver: 月度開始日より前の残高
        List<Transaction> prevTx = transactionRepository.findByLedgerIdBeforeDate(ledgerId, from);
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

        DashboardSummaryDto summary = new DashboardSummaryDto(
                totalIncome, totalExpense, netBalance, currentBalance, carryOver);

        // =========================================================
        // categoryBreakdown: EXPENSE のみ・金額降順・0円除外
        // =========================================================
        Map<String, BigDecimal> categoryAmountMap = new LinkedHashMap<>();
        Map<String, Transaction> categoryRepMap = new LinkedHashMap<>();

        for (Transaction t : monthlyTx) {
            if (t.getTransactionType() != TransactionType.EXPENSE || t.getCategory() == null) {
                continue;
            }
            String catId = t.getCategory().getCategoryId();
            categoryAmountMap.merge(catId, t.getAmount(), BigDecimal::add);
            categoryRepMap.putIfAbsent(catId, t);
        }

        List<CategoryBreakdownDto> categoryBreakdown = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : categoryAmountMap.entrySet()) {
            BigDecimal amount = entry.getValue();
            if (amount.compareTo(BigDecimal.ZERO) == 0) continue;

            Transaction rep = categoryRepMap.get(entry.getKey());
            double percentage = totalExpense.compareTo(BigDecimal.ZERO) == 0
                    ? 0.0
                    : amount.multiply(BigDecimal.valueOf(100))
                             .divide(totalExpense, 2, RoundingMode.HALF_UP)
                             .doubleValue();

            categoryBreakdown.add(new CategoryBreakdownDto(
                    rep.getCategory().getCategoryId(),
                    rep.getCategory().getCategoryName(),
                    rep.getCategory().getCategoryType(),
                    rep.getCategory().getIcon(),
                    rep.getCategory().getColor(),
                    amount,
                    percentage
            ));
        }
        categoryBreakdown.sort(Comparator.comparing(CategoryBreakdownDto::amount).reversed());

        // =========================================================
        // budgetStatus: 予算設定済みカテゴリのみ
        // =========================================================
        List<Budget> budgets = budgetRepository.findByLedgerLedgerIdAndYearAndMonth(
                ledgerId, (short) year, (short) month);

        Map<String, BigDecimal> expenseByCat = new LinkedHashMap<>();
        for (Transaction t : monthlyTx) {
            if (t.getTransactionType() == TransactionType.EXPENSE && t.getCategory() != null) {
                expenseByCat.merge(t.getCategory().getCategoryId(), t.getAmount(), BigDecimal::add);
            }
        }

        List<BudgetStatusDto> budgetStatus = new ArrayList<>();
        for (Budget b : budgets) {
            BigDecimal actual = expenseByCat.getOrDefault(
                    b.getCategory().getCategoryId(), BigDecimal.ZERO);
            double pct = b.getAmount().compareTo(BigDecimal.ZERO) == 0
                    ? 0.0
                    : actual.multiply(BigDecimal.valueOf(100))
                             .divide(b.getAmount(), 2, RoundingMode.HALF_UP)
                             .doubleValue();

            String status;
            if (pct >= 100.0) {
                status = "OVER";
            } else if (pct >= 80.0) {
                status = "WARNING";
            } else {
                status = "NORMAL";
            }

            budgetStatus.add(new BudgetStatusDto(
                    b.getCategory().getCategoryId(),
                    b.getCategory().getCategoryName(),
                    b.getCategory().getIcon(),
                    b.getAmount(),
                    actual,
                    pct,
                    status
            ));
        }

        // =========================================================
        // recentTransactions: 最新 recentCount 件
        // =========================================================
        int limit = Math.min(recentCount, 50);
        List<TransactionResponse> recentTransactions = monthlyTx.stream()
                .limit(limit)
                .map(TransactionResponse::from)
                .toList();

        return new DashboardResponse(summary, categoryBreakdown, budgetStatus, recentTransactions);
    }
}
