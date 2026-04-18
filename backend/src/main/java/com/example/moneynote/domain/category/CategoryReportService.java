package com.example.moneynote.domain.category;

import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.util.LedgerPeriodCalculator;
import com.example.moneynote.common.util.LedgerPeriodCalculator.LocalDateRange;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.category.dto.*;
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
import java.time.YearMonth;
import java.util.*;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class CategoryReportService {

    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerAccessValidator accessValidator;

    // -------------------------------------------------------------------------
    // カテゴリ別集計
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<CategorySummaryDto> getCategorySummary(
            String ledgerId, int year, int month, CategoryType type, String userId) {

        Ledger ledger = accessValidator.validate(ledgerId, userId);
        LocalDateRange period = LedgerPeriodCalculator.getMonthPeriod(
                year, month, ledger.getStartDayOfMonth());
        List<Transaction> transactions = fetchTransactions(ledgerId, period.from(), period.to(), type);
        return buildCategorySummary(transactions);
    }

    @Transactional(readOnly = true)
    public List<CategorySummaryDto> getAnnualCategorySummary(
            String ledgerId, int year, CategoryType type, String userId) {

        Ledger ledger = accessValidator.validate(ledgerId, userId);
        LocalDateRange annual = LedgerPeriodCalculator.getAnnualPeriod(
                year, ledger.getStartMonthOfYear(), ledger.getStartDayOfMonth());
        List<Transaction> transactions = fetchTransactions(ledgerId, annual.from(), annual.to(), type);
        return buildCategorySummary(transactions);
    }

    // -------------------------------------------------------------------------
    // private helpers
    // -------------------------------------------------------------------------

    private List<Transaction> fetchTransactions(
            String ledgerId, LocalDate start, LocalDate end, CategoryType type) {
        if (type != null) {
            TransactionType txType = TransactionType.valueOf(type.name());
            return transactionRepository.findByLedgerIdAndDateRangeAndTypeWithDetails(
                    ledgerId, start, end, txType);
        }
        return transactionRepository.findByLedgerIdAndDateRangeWithDetails(ledgerId, start, end);
    }

    private List<CategorySummaryDto> buildCategorySummary(List<Transaction> transactions) {
        Map<String, BigDecimal> catAmounts = new LinkedHashMap<>();
        Map<String, Transaction> catRep    = new LinkedHashMap<>();
        BigDecimal totalIncome  = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;

        for (Transaction t : transactions) {
            if (t.getCategory() == null) continue;
            String catId = t.getCategory().getCategoryId();
            catAmounts.merge(catId, t.getAmount(), BigDecimal::add);
            catRep.putIfAbsent(catId, t);
            if (t.getTransactionType() == TransactionType.INCOME) {
                totalIncome = totalIncome.add(t.getAmount());
            } else {
                totalExpense = totalExpense.add(t.getAmount());
            }
        }

        final BigDecimal fIncome  = totalIncome;
        final BigDecimal fExpense = totalExpense;

        return catAmounts.entrySet().stream()
                .filter(e -> e.getValue().compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .map(e -> {
                    Transaction rep = catRep.get(e.getKey());
                    BigDecimal typeTotal = rep.getCategory().getCategoryType() == CategoryType.INCOME
                            ? fIncome : fExpense;
                    double pct = typeTotal.compareTo(BigDecimal.ZERO) == 0 ? 0.0
                            : e.getValue().multiply(BigDecimal.valueOf(100))
                                    .divide(typeTotal, 2, RoundingMode.HALF_UP)
                                    .doubleValue();
                    return new CategorySummaryDto(
                            rep.getCategory().getCategoryId(),
                            rep.getCategory().getCategoryName(),
                            rep.getCategory().getCategoryType(),
                            rep.getCategory().getIcon(),
                            rep.getCategory().getColor(),
                            e.getValue(),
                            pct
                    );
                })
                .toList();
    }

    // -------------------------------------------------------------------------
    // カテゴリ別明細＋月別推移
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public CategoryTransactionsResponse getCategoryTransactions(
            String ledgerId, String categoryId, int year, Integer month, String userId) {

        Ledger ledger = accessValidator.validate(ledgerId, userId);
        int startDay = ledger.getStartDayOfMonth();

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("カテゴリが見つかりません"));

        if (!category.getLedger().getLedgerId().equals(ledgerId)) {
            throw new ResourceNotFoundException("カテゴリが見つかりません");
        }

        final boolean isAnnual = (month == null);

        // 取得範囲
        YearMonth startYM;
        YearMonth endYM;
        if (isAnnual) {
            startYM = YearMonth.of(year, ledger.getStartMonthOfYear());
            endYM   = startYM.plusMonths(11);
        } else {
            endYM   = YearMonth.of(year, month);
            startYM = endYM.minusMonths(11);
        }

        LocalDateRange startRange = LedgerPeriodCalculator.getMonthPeriod(
                startYM.getYear(), startYM.getMonthValue(), startDay);
        LocalDateRange endRange = LedgerPeriodCalculator.getMonthPeriod(
                endYM.getYear(), endYM.getMonthValue(), startDay);

        List<Transaction> trendTx =
                transactionRepository.findByLedgerIdAndDateRangeAndCategoryWithDetails(
                        ledgerId, startRange.from(), endRange.to(), categoryId);

        // 月別集計（全月初期化）
        Map<String, BigDecimal> monthAmounts = new LinkedHashMap<>();
        for (YearMonth ym = startYM; !ym.isAfter(endYM); ym = ym.plusMonths(1)) {
            monthAmounts.put(ym.toString(), BigDecimal.ZERO);
        }
        for (Transaction t : trendTx) {
            // 取引日がどの月度に属するか判定する（月度開始日を考慮）
            String key = resolveMonthKey(t.getTransactionDate(), startYM, endYM, startDay);
            if (key != null) {
                monthAmounts.merge(key, t.getAmount(), BigDecimal::add);
            }
        }

        List<CategoryTrendDto> monthlyTrend = monthAmounts.entrySet().stream()
                .map(e -> new CategoryTrendDto(e.getKey(), e.getValue()))
                .toList();

        // 年間モードは全明細、月次モードは当月のみ
        final YearMonth fEndYM = endYM;
        final int fStartDay = startDay;
        List<TransactionResponse> transactions = trendTx.stream()
                .filter(t -> {
                    if (isAnnual) return true;
                    LocalDateRange p = LedgerPeriodCalculator.getMonthPeriod(
                            fEndYM.getYear(), fEndYM.getMonthValue(), fStartDay);
                    return !t.getTransactionDate().isBefore(p.from())
                            && !t.getTransactionDate().isAfter(p.to());
                })
                .map(TransactionResponse::from)
                .toList();

        return new CategoryTransactionsResponse(
                CategoryInfoDto.from(category),
                monthlyTrend,
                transactions
        );
    }

    /**
     * 取引日がどの月度（年月）に属するかを月度開始日を考慮して解決する。
     */
    private String resolveMonthKey(LocalDate date, YearMonth startYM, YearMonth endYM, int startDay) {
        for (YearMonth ym = startYM; !ym.isAfter(endYM); ym = ym.plusMonths(1)) {
            LocalDateRange p = LedgerPeriodCalculator.getMonthPeriod(
                    ym.getYear(), ym.getMonthValue(), startDay);
            if (!date.isBefore(p.from()) && !date.isAfter(p.to())) {
                return ym.toString();
            }
        }
        return null;
    }
}
