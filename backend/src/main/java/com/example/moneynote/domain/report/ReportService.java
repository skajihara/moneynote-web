package com.example.moneynote.domain.report;

import com.example.moneynote.common.util.LedgerPeriodCalculator;
import com.example.moneynote.common.util.LedgerPeriodCalculator.LocalDateRange;
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
        int startDay = ledger.getStartDayOfMonth();

        // 当月集計
        LocalDateRange targetPeriod = LedgerPeriodCalculator.getMonthPeriod(year, month, startDay);
        List<Transaction> targetTx = fetch(ledgerId, targetPeriod);
        BigDecimal totalIncome  = sumType(targetTx, TransactionType.INCOME);
        BigDecimal totalExpense = sumType(targetTx, TransactionType.EXPENSE);
        BigDecimal netBalance   = totalIncome.subtract(totalExpense);

        // carryOver: 月度開始日より前の残高
        List<Transaction> beforeMonthTx =
                transactionRepository.findByLedgerIdBeforeDate(ledgerId, targetPeriod.from());
        BigDecimal carryOver = calcBalance(ledger, beforeMonthTx);

        // currentBalance: 全期間残高
        List<Transaction> allTx =
                transactionRepository.findByLedgerLedgerIdOrderByTransactionDateDesc(ledgerId);
        BigDecimal currentBalance = calcBalance(ledger, allTx);

        // 前月比（前月 = 当月の1ヶ月前）
        YearMonth prevMonthYM = YearMonth.of(year, month).minusMonths(1);
        LocalDateRange prevMonthPeriod = LedgerPeriodCalculator.getMonthPeriod(
                prevMonthYM.getYear(), prevMonthYM.getMonthValue(), startDay);
        List<Transaction> prevMonthTx = fetch(ledgerId, prevMonthPeriod);
        BigDecimal prevMonthIncome  = sumType(prevMonthTx, TransactionType.INCOME);
        BigDecimal prevMonthExpense = sumType(prevMonthTx, TransactionType.EXPENSE);
        PeriodComparisonDto prevMonthComp = new PeriodComparisonDto(
                totalIncome.subtract(prevMonthIncome),
                totalExpense.subtract(prevMonthExpense),
                changeRate(totalIncome, prevMonthIncome),
                changeRate(totalExpense, prevMonthExpense)
        );

        // 前年同月比
        YearMonth prevYearYM = YearMonth.of(year, month).minusYears(1);
        LocalDateRange prevYearPeriod = LedgerPeriodCalculator.getMonthPeriod(
                prevYearYM.getYear(), prevYearYM.getMonthValue(), startDay);
        List<Transaction> prevYearTx = fetch(ledgerId, prevYearPeriod);
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
        int startDay   = ledger.getStartDayOfMonth();
        int startMonth = ledger.getStartMonthOfYear();

        // 年度全体の期間（startMonthOfYear を基準に 12 ヶ月）
        LocalDateRange annualRange = LedgerPeriodCalculator.getAnnualPeriod(year, startMonth, startDay);
        LocalDate yearStart = annualRange.from();
        LocalDate yearEnd   = annualRange.to();

        // 年度内の全明細を一括取得
        List<Transaction> yearTx =
                transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                        ledgerId, yearStart, yearEnd);

        // 年度開始月より前の繰越残高
        List<Transaction> beforeYearTx =
                transactionRepository.findByLedgerIdBeforeDate(ledgerId, yearStart);
        BigDecimal carryOverToYear = calcBalance(ledger, beforeYearTx);

        // 12 ヶ月分を年度月順にループ（startMonth から始まる）
        List<MonthDataDto> months    = new ArrayList<>(12);
        List<BalanceHistoryDto> hist = new ArrayList<>(12);
        BigDecimal runningBalance = carryOverToYear;
        BigDecimal annualIncome   = BigDecimal.ZERO;
        BigDecimal annualExpense  = BigDecimal.ZERO;

        for (int i = 0; i < 12; i++) {
            YearMonth fiscalYM = YearMonth.of(year, startMonth).plusMonths(i);
            LocalDateRange monthRange = LedgerPeriodCalculator.getMonthPeriod(
                    fiscalYM.getYear(), fiscalYM.getMonthValue(), startDay);

            // 当月の明細をフィルタリング
            LocalDate mFrom = monthRange.from();
            LocalDate mTo   = monthRange.to();
            List<Transaction> mTx = yearTx.stream()
                    .filter(t -> !t.getTransactionDate().isBefore(mFrom)
                            && !t.getTransactionDate().isAfter(mTo))
                    .toList();

            BigDecimal inc = sumType(mTx, TransactionType.INCOME);
            BigDecimal exp = sumType(mTx, TransactionType.EXPENSE);
            BigDecimal net = inc.subtract(exp);
            runningBalance = runningBalance.add(net);
            months.add(new MonthDataDto(fiscalYM.getMonthValue(), inc, exp, net, runningBalance));
            hist.add(new BalanceHistoryDto(fiscalYM.getMonthValue(), runningBalance));
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

    private List<Transaction> fetch(String ledgerId, LocalDateRange range) {
        return transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                ledgerId, range.from(), range.to());
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

    private double changeRate(BigDecimal current, BigDecimal prev) {
        if (prev.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return current.subtract(prev)
                .multiply(BigDecimal.valueOf(100))
                .divide(prev, 2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
