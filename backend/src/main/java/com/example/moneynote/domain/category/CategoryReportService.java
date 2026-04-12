package com.example.moneynote.domain.category;

import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.category.dto.*;
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

        accessValidator.validate(ledgerId, userId);

        YearMonth ym = YearMonth.of(year, month);
        List<Transaction> transactions = fetchTransactions(ledgerId, ym.atDay(1), ym.atEndOfMonth(), type);
        return buildCategorySummary(transactions);
    }

    @Transactional(readOnly = true)
    public List<CategorySummaryDto> getAnnualCategorySummary(
            String ledgerId, int year, CategoryType type, String userId) {

        accessValidator.validate(ledgerId, userId);

        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end   = LocalDate.of(year, 12, 31);
        List<Transaction> transactions = fetchTransactions(ledgerId, start, end, type);
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
            String ledgerId, String categoryId, int year, int month, String userId) {

        accessValidator.validate(ledgerId, userId);

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("カテゴリが見つかりません"));

        if (!category.getLedger().getLedgerId().equals(ledgerId)) {
            throw new ResourceNotFoundException("カテゴリが見つかりません");
        }

        // 直近12ヶ月の範囲
        YearMonth endYM   = YearMonth.of(year, month);
        YearMonth startYM = endYM.minusMonths(11);

        List<Transaction> trendTx =
                transactionRepository.findByLedgerIdAndDateRangeAndCategoryWithDetails(
                        ledgerId, startYM.atDay(1), endYM.atEndOfMonth(), categoryId);

        // 月別集計（12ヶ月分・全月初期化）
        Map<String, BigDecimal> monthAmounts = new LinkedHashMap<>();
        for (YearMonth m = startYM; !m.isAfter(endYM); m = m.plusMonths(1)) {
            monthAmounts.put(m.toString(), BigDecimal.ZERO);
        }
        for (Transaction t : trendTx) {
            String key = YearMonth.from(t.getTransactionDate()).toString();
            monthAmounts.merge(key, t.getAmount(), BigDecimal::add);
        }

        List<CategoryTrendDto> monthlyTrend = monthAmounts.entrySet().stream()
                .map(e -> new CategoryTrendDto(e.getKey(), e.getValue()))
                .toList();

        // 当月の明細一覧
        List<TransactionResponse> transactions = trendTx.stream()
                .filter(t -> YearMonth.from(t.getTransactionDate()).equals(endYM))
                .map(TransactionResponse::from)
                .toList();

        return new CategoryTransactionsResponse(
                CategoryInfoDto.from(category),
                monthlyTrend,
                transactions
        );
    }
}
