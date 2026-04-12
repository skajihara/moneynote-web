package com.example.moneynote.domain.report;

import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.report.dto.*;
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
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final LedgerAccessValidator accessValidator;

    // -------------------------------------------------------------------------
    // 月別レポート
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public MonthlyReportResponse getMonthlyReport(
            String ledgerId, int year, int month, String userId) {

        Ledger ledger = accessValidator.validate(ledgerId, userId);
        YearMonth ym = YearMonth.of(year, month);

        // 当月集計
        List<Transaction> targetTx = fetch(ledgerId, ym);
        BigDecimal totalIncome  = sumType(targetTx, TransactionType.INCOME);
        BigDecimal totalExpense = sumType(targetTx, TransactionType.EXPENSE);
        BigDecimal netBalance   = totalIncome.subtract(totalExpense);

        // carryOver: 月初前の残高
        List<Transaction> beforeMonthTx =
                transactionRepository.findByLedgerIdBeforeDate(ledgerId, ym.atDay(1));
        BigDecimal carryOver = calcBalance(ledger, beforeMonthTx);

        // currentBalance: 全期間残高
        List<Transaction> allTx =
                transactionRepository.findByLedgerLedgerIdOrderByTransactionDateDesc(ledgerId);
        BigDecimal currentBalance = calcBalance(ledger, allTx);

        // 前月比
        YearMonth prevMonthYM = ym.minusMonths(1);
        List<Transaction> prevMonthTx = fetch(ledgerId, prevMonthYM);
        BigDecimal prevMonthIncome  = sumType(prevMonthTx, TransactionType.INCOME);
        BigDecimal prevMonthExpense = sumType(prevMonthTx, TransactionType.EXPENSE);
        PeriodComparisonDto prevMonthComp = new PeriodComparisonDto(
                totalIncome.subtract(prevMonthIncome),
                totalExpense.subtract(prevMonthExpense),
                changeRate(totalIncome, prevMonthIncome),
                changeRate(totalExpense, prevMonthExpense)
        );

        // 前年同月比
        YearMonth prevYearYM = ym.minusYears(1);
        List<Transaction> prevYearTx = fetch(ledgerId, prevYearYM);
        BigDecimal prevYearIncome  = sumType(prevYearTx, TransactionType.INCOME);
        BigDecimal prevYearExpense = sumType(prevYearTx, TransactionType.EXPENSE);
        PeriodComparisonDto prevYearComp = new PeriodComparisonDto(
                totalIncome.subtract(prevYearIncome),
                totalExpense.subtract(prevYearExpense),
                changeRate(totalIncome, prevYearIncome),
                changeRate(totalExpense, prevYearExpense)
        );

        return new MonthlyReportResponse(
                year, month,
                totalIncome, totalExpense, netBalance,
                carryOver, currentBalance,
                prevMonthComp, prevYearComp
        );
    }

    // -------------------------------------------------------------------------
    // 年別レポート
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public AnnualReportResponse getAnnualReport(
            String ledgerId, int year, String userId) {

        Ledger ledger = accessValidator.validate(ledgerId, userId);

        // 対象年の全明細
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd   = LocalDate.of(year, 12, 31);
        List<Transaction> yearTx =
                transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                        ledgerId, yearStart, yearEnd);

        // 年初前の繰越残高
        List<Transaction> beforeYearTx =
                transactionRepository.findByLedgerIdBeforeDate(ledgerId, yearStart);
        BigDecimal carryOverToYear = calcBalance(ledger, beforeYearTx);

        // 月別グルーピング
        Map<Integer, List<Transaction>> byMonth = yearTx.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getTransactionDate().getMonthValue()));

        List<MonthDataDto> months    = new ArrayList<>(12);
        List<BalanceHistoryDto> hist = new ArrayList<>(12);
        BigDecimal runningBalance = carryOverToYear;
        BigDecimal annualIncome   = BigDecimal.ZERO;
        BigDecimal annualExpense  = BigDecimal.ZERO;

        for (int m = 1; m <= 12; m++) {
            List<Transaction> mTx = byMonth.getOrDefault(m, List.of());
            BigDecimal inc = sumType(mTx, TransactionType.INCOME);
            BigDecimal exp = sumType(mTx, TransactionType.EXPENSE);
            BigDecimal net = inc.subtract(exp);
            runningBalance = runningBalance.add(net);
            months.add(new MonthDataDto(m, inc, exp, net, runningBalance));
            hist.add(new BalanceHistoryDto(m, runningBalance));
            annualIncome  = annualIncome.add(inc);
            annualExpense = annualExpense.add(exp);
        }

        AnnualSummaryDto annualSummary = new AnnualSummaryDto(
                annualIncome, annualExpense, annualIncome.subtract(annualExpense));

        return new AnnualReportResponse(year, months, annualSummary, hist);
    }

    // -------------------------------------------------------------------------
    // private helpers
    // -------------------------------------------------------------------------

    private List<Transaction> fetch(String ledgerId, YearMonth ym) {
        return transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                ledgerId, ym.atDay(1), ym.atEndOfMonth());
    }

    private BigDecimal sumType(List<Transaction> txList, TransactionType type) {
        return txList.stream()
                .filter(t -> t.getTransactionType() == type)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calcBalance(Ledger ledger, List<Transaction> txList) {
        BigDecimal income  = BigDecimal.ZERO;
        BigDecimal expense = BigDecimal.ZERO;
        for (Transaction t : txList) {
            if (t.getTransactionType() == TransactionType.INCOME) {
                income = income.add(t.getAmount());
            } else {
                expense = expense.add(t.getAmount());
            }
        }
        return ledger.getInitialBalance().add(income).subtract(expense);
    }

    /**
     * 変化率（%）を計算する。前期が 0 の場合は 0.0 を返す。
     */
    private double changeRate(BigDecimal current, BigDecimal prev) {
        if (prev.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return current.subtract(prev)
                .multiply(BigDecimal.valueOf(100))
                .divide(prev, 2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
