package com.example.moneynote.domain.ai;

import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.ai.dto.*;
import com.example.moneynote.domain.aiadvicecache.AdviceType;
import com.example.moneynote.domain.aiadvicecache.AiAdviceCache;
import com.example.moneynote.domain.aiadvicecache.AiAdviceCacheRepository;
import com.example.moneynote.domain.aiadvicecache.PeriodType;
import com.example.moneynote.domain.budget.Budget;
import com.example.moneynote.domain.budget.BudgetRepository;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.transaction.Transaction;
import com.example.moneynote.domain.transaction.TransactionRepository;
import com.example.moneynote.domain.transaction.TransactionType;
import com.example.moneynote.common.exception.ExternalApiException;
import com.example.moneynote.domain.ai.dto.AiScoreResponse;
import com.example.moneynote.domain.ai.dto.ScoreBreakdownDto;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class AiService {

    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final AiAdviceCacheRepository aiAdviceCacheRepository;
    private final LedgerAccessValidator accessValidator;
    private final ChatClient.Builder chatClientBuilder;

    @Value("${ai.mock:false}")
    private boolean mockMode;

    // =========================================================================
    // GET /ai/summary - Claude API を呼ばずに集計データのみ返す
    // =========================================================================

    @Transactional(readOnly = true)
    public AiSummaryResponse getSummary(String ledgerId, PeriodType period, String userId) {
        accessValidator.validate(ledgerId, userId);

        int months = monthCount(period);
        YearMonth currentYM = YearMonth.now();
        YearMonth startYM = currentYM.minusMonths(months - 1);

        LocalDate from = startYM.atDay(1);
        LocalDate to   = currentYM.atEndOfMonth();

        List<Transaction> txList =
                transactionRepository.findByLedgerIdAndDateRangeWithDetails(ledgerId, from, to);

        // ---------- monthlyTrend ----------
        List<MonthlyTrendDto> monthlyTrend = buildMonthlyTrend(txList, startYM, months);

        // ---------- periodSummary ----------
        BigDecimal totalIncome  = sumType(txList, TransactionType.INCOME);
        BigDecimal totalExpense = sumType(txList, TransactionType.EXPENSE);
        BigDecimal netBalance   = totalIncome.subtract(totalExpense);
        BigDecimal monthCount   = BigDecimal.valueOf(months);
        BigDecimal avgIncome    = months == 0 ? BigDecimal.ZERO
                : totalIncome.divide(monthCount, 0, RoundingMode.HALF_UP);
        BigDecimal avgExpense   = months == 0 ? BigDecimal.ZERO
                : totalExpense.divide(monthCount, 0, RoundingMode.HALF_UP);
        PeriodSummaryDto periodSummary =
                new PeriodSummaryDto(totalIncome, totalExpense, netBalance, avgIncome, avgExpense);

        // ---------- categoryBreakdown ----------
        List<CategoryBreakdownAiDto> categoryBreakdown =
                buildCategoryBreakdown(txList, totalExpense);

        // ---------- budgetComparison (current month only) ----------
        List<BudgetComparisonDto> budgetComparison =
                buildBudgetComparison(ledgerId, txList, currentYM);

        // ---------- prevPeriodComparison ----------
        YearMonth prevStartYM = startYM.minusMonths(months);
        YearMonth prevEndYM   = startYM.minusMonths(1);
        LocalDate prevFrom = prevStartYM.atDay(1);
        LocalDate prevTo   = prevEndYM.atEndOfMonth();
        List<Transaction> prevTxList =
                transactionRepository.findByLedgerIdAndDateRangeWithDetails(ledgerId, prevFrom, prevTo);
        BigDecimal prevIncome  = sumType(prevTxList, TransactionType.INCOME);
        BigDecimal prevExpense = sumType(prevTxList, TransactionType.EXPENSE);
        PrevPeriodComparisonDto prevPeriodComparison = new PrevPeriodComparisonDto(
                totalIncome.subtract(prevIncome),
                totalExpense.subtract(prevExpense),
                changeRate(totalIncome, prevIncome),
                changeRate(totalExpense, prevExpense)
        );

        List<CategoryBreakdownAiDto> prevCategoryBreakdown =
                buildCategoryBreakdown(prevTxList, prevExpense);

        return new AiSummaryResponse(
                period, periodSummary, monthlyTrend, categoryBreakdown,
                prevCategoryBreakdown, budgetComparison, prevPeriodComparison);
    }

    // =========================================================================
    // GET /ai/score - 家計健全度スコア計算
    // =========================================================================

    @Transactional(readOnly = true)
    public AiScoreResponse getScore(String ledgerId, String userId) {
        accessValidator.validate(ledgerId, userId);

        YearMonth currentYM = YearMonth.now();
        YearMonth prevYM    = currentYM.minusMonths(1);

        // 当月トランザクション
        List<Transaction> currentTxList =
                transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                        ledgerId, currentYM.atDay(1), currentYM.atEndOfMonth());

        // 直近3ヶ月（安定度計算用）: currentYM-2 〜 currentYM
        YearMonth startYM3 = currentYM.minusMonths(2);
        List<Transaction> threeMoTxList =
                transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                        ledgerId, startYM3.atDay(1), currentYM.atEndOfMonth());

        // 当月予算
        List<Budget> currentBudgets = budgetRepository.findByLedgerLedgerIdAndYearAndMonth(
                ledgerId, (short) currentYM.getYear(), (short) currentYM.getMonthValue());

        int currentScore = calculateScore(currentTxList, threeMoTxList, currentBudgets, currentYM);
        ScoreBreakdownDto breakdown = buildBreakdown(currentTxList, threeMoTxList, currentBudgets, currentYM);

        // 先月スコア
        List<Transaction> prevTxList =
                transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                        ledgerId, prevYM.atDay(1), prevYM.atEndOfMonth());
        YearMonth prevStart3 = prevYM.minusMonths(2);
        List<Transaction> prevThreeMoTxList =
                transactionRepository.findByLedgerIdAndDateRangeWithDetails(
                        ledgerId, prevStart3.atDay(1), prevYM.atEndOfMonth());
        List<Budget> prevBudgets = budgetRepository.findByLedgerLedgerIdAndYearAndMonth(
                ledgerId, (short) prevYM.getYear(), (short) prevYM.getMonthValue());
        int prevScore = calculateScore(prevTxList, prevThreeMoTxList, prevBudgets, prevYM);

        String grade = scoreToGrade(currentScore);
        return new AiScoreResponse(currentScore, grade, breakdown, prevScore, currentScore - prevScore);
    }

    private int calculateScore(List<Transaction> monthTx, List<Transaction> threeMoTx,
                               List<Budget> budgets, YearMonth ym) {
        ScoreBreakdownDto bd = buildBreakdown(monthTx, threeMoTx, budgets, ym);
        return bd.balanceScore() + bd.budgetScore() + bd.savingsScore() + bd.stabilityScore();
    }

    private ScoreBreakdownDto buildBreakdown(List<Transaction> monthTx, List<Transaction> threeMoTx,
                                             List<Budget> budgets, YearMonth ym) {
        BigDecimal totalIncome  = sumType(monthTx, TransactionType.INCOME);
        BigDecimal totalExpense = sumType(monthTx, TransactionType.EXPENSE);
        BigDecimal netBalance   = totalIncome.subtract(totalExpense);

        // 1) 収支バランス (0〜25)
        int balanceScore;
        if (totalIncome.compareTo(BigDecimal.ZERO) == 0) {
            balanceScore = netBalance.compareTo(BigDecimal.ZERO) >= 0 ? 25 : 0;
        } else if (netBalance.compareTo(BigDecimal.ZERO) >= 0) {
            balanceScore = 25;
        } else {
            // netBalance < 0 → 比例減点
            double ratio = netBalance.divide(totalIncome, 4, RoundingMode.HALF_UP).doubleValue();
            balanceScore = (int) Math.max(0, 25 * (1.0 + ratio));
        }

        // 2) 予算達成率 (0〜25)
        int budgetScore;
        if (budgets.isEmpty()) {
            budgetScore = 25;
        } else {
            // 当月のカテゴリ別実績
            LocalDate from = ym.atDay(1);
            LocalDate to   = ym.atEndOfMonth();
            Map<String, BigDecimal> expByCat = new LinkedHashMap<>();
            for (Transaction t : monthTx) {
                if (t.getTransactionType() == TransactionType.EXPENSE
                        && t.getCategory() != null
                        && !t.getTransactionDate().isBefore(from)
                        && !t.getTransactionDate().isAfter(to)) {
                    expByCat.merge(t.getCategory().getCategoryId(), t.getAmount(), BigDecimal::add);
                }
            }
            double avgPct = budgets.stream().mapToDouble(b -> {
                BigDecimal actual = expByCat.getOrDefault(b.getCategory().getCategoryId(), BigDecimal.ZERO);
                if (b.getAmount().compareTo(BigDecimal.ZERO) == 0) return 0.0;
                return actual.multiply(BigDecimal.valueOf(100))
                             .divide(b.getAmount(), 2, RoundingMode.HALF_UP)
                             .doubleValue();
            }).average().orElse(0.0);
            // 80%以下 → 25点、120%以上 → 0点
            budgetScore = (int) Math.max(0, Math.min(25, 25 * (120.0 - avgPct) / 40.0));
        }

        // 3) 貯蓄率 (0〜25): (収支/収入)*100 が20%以上で満点
        //    収入も支出もない（データなし）場合は中間点12を返す
        int savingsScore;
        if (totalIncome.compareTo(BigDecimal.ZERO) == 0) {
            // 支出もない場合はデータ不足として中間点、支出だけある場合は0点
            savingsScore = totalExpense.compareTo(BigDecimal.ZERO) == 0 ? 12 : 0;
        } else {
            double savingsRate = netBalance.multiply(BigDecimal.valueOf(100))
                    .divide(totalIncome, 4, RoundingMode.HALF_UP).doubleValue();
            savingsScore = savingsRate >= 20.0 ? 25
                    : savingsRate <= 0.0 ? 0
                    : (int) (savingsRate / 20.0 * 25);
        }

        // 4) 支出安定度 (0〜25): 3ヶ月の月別支出の変動係数
        //    データのある月が2ヶ月未満の場合はデータ不足として中間点12を返す
        int stabilityScore;
        List<BigDecimal> monthlyExpenses = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            YearMonth m = ym.minusMonths(2 - i);
            LocalDate mFrom = m.atDay(1);
            LocalDate mTo   = m.atEndOfMonth();
            BigDecimal exp = threeMoTx.stream()
                    .filter(t -> t.getTransactionType() == TransactionType.EXPENSE
                            && !t.getTransactionDate().isBefore(mFrom)
                            && !t.getTransactionDate().isAfter(mTo))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            monthlyExpenses.add(exp);
        }
        long nonZeroMonths = monthlyExpenses.stream()
                .filter(e -> e.compareTo(BigDecimal.ZERO) > 0).count();
        double mean = monthlyExpenses.stream()
                .mapToDouble(BigDecimal::doubleValue).average().orElse(0.0);
        if (mean == 0.0 || nonZeroMonths < 2) {
            // データなし or 1ヶ月分しかデータがない場合は中間点
            stabilityScore = nonZeroMonths == 0 ? 25 : 12;
        } else {
            double variance = monthlyExpenses.stream()
                    .mapToDouble(e -> Math.pow(e.doubleValue() - mean, 2))
                    .average().orElse(0.0);
            double cv = Math.sqrt(variance) / mean;
            stabilityScore = (int) Math.max(0, Math.min(25, 25 * (0.5 - cv) / 0.5));
        }

        return new ScoreBreakdownDto(balanceScore, budgetScore, savingsScore, stabilityScore);
    }

    private String scoreToGrade(int score) {
        if (score >= 80) return "EXCELLENT";
        if (score >= 60) return "GOOD";
        if (score >= 40) return "CAUTION";
        return "POOR";
    }

    // =========================================================================
    // POST /ai/analyze - Claude API 呼び出し（キャッシュあり）
    // =========================================================================

    @Transactional
    public AiAnalyzeResponse analyze(
            String ledgerId, PeriodType period, AdviceType adviceType, String userId) {

        accessValidator.validate(ledgerId, userId);

        // ---------- キャッシュ確認 ----------
        Optional<AiAdviceCache> cached = aiAdviceCacheRepository
                .findByLedgerLedgerIdAndPeriodTypeAndAdviceTypeAndExpiresAtAfter(
                        ledgerId, period, adviceType, LocalDateTime.now());
        if (cached.isPresent()) {
            AiAdviceCache c = cached.get();
            return new AiAnalyzeResponse(c.getAdviceType(), c.getAdviceText(),
                    c.getGeneratedAt(), true);
        }

        // ---------- 集計データ取得 ----------
        AiSummaryResponse summary = getSummary(ledgerId, period, userId);

        // ---------- テキスト生成 ----------
        String adviceText = generateAdvice(summary, adviceType);

        // ---------- キャッシュ保存 ----------
        LocalDateTime now      = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusHours(24);
        Ledger ledger = accessValidator.validate(ledgerId, userId);

        AiAdviceCache cache = AiAdviceCache.builder()
                .cacheId(IdGenerator.aiAdviceCacheId())
                .ledger(ledger)
                .periodType(period)
                .adviceType(adviceType)
                .adviceText(adviceText)
                .generatedAt(now)
                .expiresAt(expiresAt)
                .build();
        aiAdviceCacheRepository.save(cache);

        return new AiAnalyzeResponse(adviceType, adviceText, now, false);
    }

    // =========================================================================
    // private helpers
    // =========================================================================

    private int monthCount(PeriodType period) {
        return switch (period) {
            case ONE_MONTH     -> 1;
            case THREE_MONTHS  -> 3;
            case TWELVE_MONTHS -> 12;
        };
    }

    private List<MonthlyTrendDto> buildMonthlyTrend(
            List<Transaction> txList, YearMonth startYM, int months) {

        Map<YearMonth, List<Transaction>> byYM = txList.stream()
                .collect(Collectors.groupingBy(
                        t -> YearMonth.from(t.getTransactionDate())));

        List<MonthlyTrendDto> result = new ArrayList<>();
        for (int i = 0; i < months; i++) {
            YearMonth ym = startYM.plusMonths(i);
            List<Transaction> txs = byYM.getOrDefault(ym, List.of());
            BigDecimal inc = sumType(txs, TransactionType.INCOME);
            BigDecimal exp = sumType(txs, TransactionType.EXPENSE);
            result.add(new MonthlyTrendDto(
                    ym.toString(), inc, exp, inc.subtract(exp)));
        }
        return result;
    }

    private List<CategoryBreakdownAiDto> buildCategoryBreakdown(
            List<Transaction> txList, BigDecimal totalExpense) {

        Map<String, BigDecimal> amountByName = new LinkedHashMap<>();
        for (Transaction t : txList) {
            if (t.getTransactionType() != TransactionType.EXPENSE || t.getCategory() == null) continue;
            amountByName.merge(t.getCategory().getCategoryName(), t.getAmount(), BigDecimal::add);
        }

        return amountByName.entrySet().stream()
                .map(e -> {
                    double pct = totalExpense.compareTo(BigDecimal.ZERO) == 0 ? 0.0
                            : e.getValue().multiply(BigDecimal.valueOf(100))
                                          .divide(totalExpense, 2, RoundingMode.HALF_UP)
                                          .doubleValue();
                    return new CategoryBreakdownAiDto(e.getKey(), e.getValue(), pct);
                })
                .sorted(Comparator.comparing(CategoryBreakdownAiDto::totalAmount).reversed())
                .toList();
    }

    private List<BudgetComparisonDto> buildBudgetComparison(
            String ledgerId, List<Transaction> allTxList, YearMonth currentYM) {

        List<Budget> budgets = budgetRepository.findByLedgerLedgerIdAndYearAndMonth(
                ledgerId, (short) currentYM.getYear(), (short) currentYM.getMonthValue());
        if (budgets.isEmpty()) return List.of();

        // 当月の支出を categoryId でまとめる
        LocalDate from = currentYM.atDay(1);
        LocalDate to   = currentYM.atEndOfMonth();
        Map<String, BigDecimal> expByCat = new LinkedHashMap<>();
        for (Transaction t : allTxList) {
            if (t.getTransactionType() == TransactionType.EXPENSE
                    && t.getCategory() != null
                    && !t.getTransactionDate().isBefore(from)
                    && !t.getTransactionDate().isAfter(to)) {
                expByCat.merge(t.getCategory().getCategoryId(), t.getAmount(), BigDecimal::add);
            }
        }

        return budgets.stream().map(b -> {
            BigDecimal actual = expByCat.getOrDefault(
                    b.getCategory().getCategoryId(), BigDecimal.ZERO);
            double pct = b.getAmount().compareTo(BigDecimal.ZERO) == 0 ? 0.0
                    : actual.multiply(BigDecimal.valueOf(100))
                             .divide(b.getAmount(), 2, RoundingMode.HALF_UP)
                             .doubleValue();
            String status = pct >= 100.0 ? "OVER" : pct >= 80.0 ? "WARNING" : "NORMAL";
            return new BudgetComparisonDto(
                    b.getCategory().getCategoryName(),
                    b.getAmount(), actual, pct, status);
        }).toList();
    }

    private BigDecimal sumType(List<Transaction> txList, TransactionType type) {
        return txList.stream()
                .filter(t -> t.getTransactionType() == type)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private double changeRate(BigDecimal current, BigDecimal prev) {
        if (prev.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return current.subtract(prev)
                .multiply(BigDecimal.valueOf(100))
                .divide(prev, 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String generateAdvice(AiSummaryResponse summary, AdviceType adviceType) {
        if (mockMode) {
            return switch (adviceType) {
                case INSIGHT  -> "【モック】直近の収支を分析しました。支出が増加傾向にあります。";
                case ADVICE   -> "【モック】食費の見直しをお勧めします。週の予算を設定してみましょう。";
                case FORECAST -> "【モック】来月の支出は今月より約5%増加する見込みです。";
            };
        }

        String prompt = buildPrompt(summary, adviceType);
        try {
            ChatClient chatClient = chatClientBuilder.build();
            return chatClient.prompt().user(prompt).call().content();
        } catch (Exception e) {
            throw new ExternalApiException("AI分析に失敗しました: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(AiSummaryResponse summary, AdviceType adviceType) {
        PeriodSummaryDto ps = summary.periodSummary();
        StringBuilder sb = new StringBuilder();
        sb.append("家計簿の収支データを提示します。\n");
        sb.append("収入合計: ").append(ps.totalIncome()).append("円\n");
        sb.append("支出合計: ").append(ps.totalExpense()).append("円\n");
        sb.append("収支: ").append(ps.netBalance()).append("円\n");
        sb.append("月平均収入: ").append(ps.avgMonthlyIncome()).append("円\n");
        sb.append("月平均支出: ").append(ps.avgMonthlyExpense()).append("円\n");

        if (!summary.categoryBreakdown().isEmpty()) {
            sb.append("支出カテゴリ（上位3件）:\n");
            summary.categoryBreakdown().stream().limit(3).forEach(c ->
                sb.append("  ").append(c.categoryName())
                  .append(": ").append(c.totalAmount())
                  .append("円 (").append(String.format("%.1f", c.percentage())).append("%)\n"));
        }

        sb.append("\n");
        sb.append(switch (adviceType) {
            case INSIGHT  -> "上記のデータに基づき、収支の傾向と気づきを日本語で300文字程度で分析してください。";
            case ADVICE   -> "上記のデータに基づき、支出を改善するための具体的なアドバイスを日本語で300文字程度で提案してください。";
            case FORECAST -> "上記のデータに基づき、来月の支出予測を日本語で300文字程度で説明してください。";
        });
        return sb.toString();
    }
}
