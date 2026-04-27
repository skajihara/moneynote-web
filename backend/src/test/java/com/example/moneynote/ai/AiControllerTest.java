package com.example.moneynote.ai;

import com.example.moneynote.common.security.JwtTokenProvider;
import com.example.moneynote.domain.aiadvicecache.AiAdviceCacheRepository;
import com.example.moneynote.domain.budget.Budget;
import com.example.moneynote.domain.budget.BudgetRepository;
import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.category.CategoryType;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.ledger.LedgerRepository;
import com.example.moneynote.domain.ledgerpermission.LedgerPermission;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import com.example.moneynote.domain.ledgerpermission.PermissionType;
import com.example.moneynote.domain.transaction.TransactionRepository;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
import com.example.moneynote.common.util.IdGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SuppressWarnings("null")
class AiControllerTest {

    @SuppressWarnings("resource")
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("moneynote_test")
            .withUsername("test")
            .withPassword("test");

    @SuppressWarnings("resource")
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }

    @MockBean
    JavaMailSender mailSender;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired LedgerRepository ledgerRepository;
    @Autowired LedgerPermissionRepository ledgerPermissionRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired BudgetRepository budgetRepository;
    @Autowired AiAdviceCacheRepository aiAdviceCacheRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    @Autowired org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    private String token1;
    private String token2;
    private String ledgerId1;
    private String expCategoryId;
    private String incCategoryId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        // AI レート制限キーをリセット（テスト間の干渉を防ぐ）
        var aiKeys = redisTemplate.keys("ai:*");
        if (aiKeys != null && !aiKeys.isEmpty()) {
            redisTemplate.delete(aiKeys);
        }

        User user1 = userRepository.save(User.builder()
                .userId("user1").userName("ユーザー1").email("u1@example.com")
                .passwordHash(passwordEncoder.encode("Pass1")).build());
        userRepository.save(User.builder()
                .userId("user2").userName("ユーザー2").email("u2@example.com")
                .passwordHash(passwordEncoder.encode("Pass1")).build());

        Ledger ledger = ledgerRepository.save(Ledger.builder()
                .ledgerId(IdGenerator.ledgerId())
                .owner(user1)
                .ledgerName("テスト帳簿")
                .initialBalance(new BigDecimal("100000"))
                .build());
        ledgerId1 = ledger.getLedgerId();

        ledgerPermissionRepository.save(LedgerPermission.builder()
                .permissionId(IdGenerator.ledgerPermissionId())
                .ledger(ledger).user(user1)
                .permissionType(PermissionType.ADMIN).build());

        Category expCat = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId())
                .ledger(ledger).categoryName("食費")
                .categoryType(CategoryType.EXPENSE).displayOrder((short) 1).build());
        expCategoryId = expCat.getCategoryId();

        Category incCat = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId())
                .ledger(ledger).categoryName("給与")
                .categoryType(CategoryType.INCOME).displayOrder((short) 2).build());
        incCategoryId = incCat.getCategoryId();

        token1 = jwtTokenProvider.generateAccessToken("user1");
        token2 = jwtTokenProvider.generateAccessToken("user2");
    }

    // =========================================================================
    // GET /ai/summary
    // =========================================================================

    @Test
    void getSummary_oneMonth_returnsSummary() throws Exception {
        LocalDate today = LocalDate.now();
        createTx("EXPENSE", 5000, today.toString(), expCategoryId);
        createTx("INCOME",  200000, today.toString(), incCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/summary")
                        .header("Authorization", "Bearer " + token1)
                        .param("period", "ONE_MONTH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.period").value("ONE_MONTH"))
                .andExpect(jsonPath("$.data.periodSummary.totalIncome").value(200000))
                .andExpect(jsonPath("$.data.periodSummary.totalExpense").value(5000))
                .andExpect(jsonPath("$.data.monthlyTrend", hasSize(1)))
                .andExpect(jsonPath("$.data.categoryBreakdown", hasSize(1)))
                .andExpect(jsonPath("$.data.categoryBreakdown[0].categoryName").value("食費"))
                .andExpect(jsonPath("$.data.categoryBreakdown[0].totalAmount").value(5000))
                .andExpect(jsonPath("$.data.prevPeriodComparison").exists());
    }

    @Test
    void getSummary_threeMonths_returnsSummary() throws Exception {
        LocalDate today = LocalDate.now();
        createTx("EXPENSE", 3000, today.toString(), expCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/summary")
                        .header("Authorization", "Bearer " + token1)
                        .param("period", "THREE_MONTHS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.period").value("THREE_MONTHS"))
                .andExpect(jsonPath("$.data.monthlyTrend", hasSize(3)));
    }

    @Test
    void getSummary_twelveMonths_returnsSummary() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/summary")
                        .header("Authorization", "Bearer " + token1)
                        .param("period", "TWELVE_MONTHS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.period").value("TWELVE_MONTHS"))
                .andExpect(jsonPath("$.data.monthlyTrend", hasSize(12)));
    }

    @Test
    void getSummary_withBudget_returnsBudgetComparison() throws Exception {
        LocalDate today = LocalDate.now();
        Ledger ledger = ledgerRepository.findById(ledgerId1).orElseThrow();
        Category expCat = categoryRepository.findById(expCategoryId).orElseThrow();

        budgetRepository.save(Budget.builder()
                .budgetId(IdGenerator.budgetId())
                .ledger(ledger)
                .category(expCat)
                .year((short) today.getYear())
                .month((short) today.getMonthValue())
                .amount(new BigDecimal("30000")).build());

        createTx("EXPENSE", 10000, today.toString(), expCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/summary")
                        .header("Authorization", "Bearer " + token1)
                        .param("period", "ONE_MONTH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.budgetComparison", hasSize(1)))
                .andExpect(jsonPath("$.data.budgetComparison[0].categoryName").value("食費"))
                .andExpect(jsonPath("$.data.budgetComparison[0].budgetAmount").value(30000))
                .andExpect(jsonPath("$.data.budgetComparison[0].actualAmount").value(10000))
                .andExpect(jsonPath("$.data.budgetComparison[0].status").value("NORMAL"));
    }

    @Test
    void getSummary_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/summary")
                        .header("Authorization", "Bearer " + token2)
                        .param("period", "ONE_MONTH"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // POST /ai/analyze
    // =========================================================================

    @Test
    void analyze_insight_returnsMockText() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH", "adviceType", "INSIGHT"));

        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.adviceType").value("INSIGHT"))
                .andExpect(jsonPath("$.data.adviceText").value(containsString("【モック】")))
                .andExpect(jsonPath("$.data.fromCache").value(false))
                .andExpect(jsonPath("$.data.generatedAt").exists());
    }

    @Test
    void analyze_advice_returnsMockText() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH", "adviceType", "ADVICE"));

        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.adviceType").value("ADVICE"))
                .andExpect(jsonPath("$.data.adviceText").value(containsString("【モック】")));
    }

    @Test
    void analyze_forecast_returnsMockText() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH", "adviceType", "FORECAST"));

        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.adviceType").value("FORECAST"))
                .andExpect(jsonPath("$.data.adviceText").value(containsString("【モック】")));
    }

    @Test
    void analyze_secondCall_returnsFromCache() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH", "adviceType", "INSIGHT"));

        // 1回目
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fromCache").value(false));

        // 2回目: キャッシュから返る
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fromCache").value(true))
                .andExpect(jsonPath("$.data.adviceText").value(containsString("【モック】")));
    }

    @Test
    void analyze_differentAdviceTypes_independentCache() throws Exception {
        String insightBody  = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH", "adviceType", "INSIGHT"));
        String adviceBody   = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH", "adviceType", "ADVICE"));

        // INSIGHT 呼び出し（1回目: rate limit count=1）
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(insightBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fromCache").value(false));

        // rate limit キーをリセットして ADVICE の AI 呼び出しを許可する
        var rateLimitKeys = redisTemplate.keys("ai:analyze:1m:*");
        if (rateLimitKeys != null && !rateLimitKeys.isEmpty()) {
            redisTemplate.delete(rateLimitKeys);
        }

        // ADVICE は別キャッシュ → fromCache=false（INSIGHT のキャッシュは使われない）
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(adviceBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fromCache").value(false));
    }

    @Test
    void analyze_otherUser_returns403() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH", "adviceType", "INSIGHT"));

        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void analyze_missingAdviceType_returns400() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH"));

        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // GET /ai/score
    // =========================================================================

    @Test
    void getScore_returnsScoreWithBreakdown() throws Exception {
        LocalDate today = LocalDate.now();
        createTx("INCOME",  200000, today.toString(), incCategoryId);
        createTx("EXPENSE",  80000, today.toString(), expCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/score")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalScore").isNumber())
                .andExpect(jsonPath("$.data.grade").isString())
                .andExpect(jsonPath("$.data.breakdown.balanceScore").isNumber())
                .andExpect(jsonPath("$.data.breakdown.budgetScore").isNumber())
                .andExpect(jsonPath("$.data.breakdown.savingsScore").isNumber())
                .andExpect(jsonPath("$.data.breakdown.stabilityScore").isNumber())
                .andExpect(jsonPath("$.data.prevMonthScore").isNumber())
                .andExpect(jsonPath("$.data.scoreDiff").isNumber());
    }

    @Test
    void getScore_positiveNetBalance_highBalanceScore() throws Exception {
        LocalDate today = LocalDate.now();
        createTx("INCOME",  300000, today.toString(), incCategoryId);
        createTx("EXPENSE",  50000, today.toString(), expCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/score")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.breakdown.balanceScore").value(25))
                // savingsRate=83%>=20%なのでsavingsScore=25、budgetScore=25（予算未設定）
                // stabilityScoreは3ヶ月の変動次第（過去2ヶ月はデータなし）
                .andExpect(jsonPath("$.data.totalScore").value(greaterThanOrEqualTo(50)));
    }

    @Test
    void getScore_noTransactions_defaultScore() throws Exception {
        // 明細なし: income=0→savingsScore=0, balance=25, budget=25（未設定）, stability=25（変動なし）
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/score")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalScore").isNumber())
                .andExpect(jsonPath("$.data.grade").isString());
    }

    @Test
    void getScore_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/score")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    @Test
    void getScore_withBudget_budgetScoreReflected() throws Exception {
        LocalDate today = LocalDate.now();
        Ledger ledger = ledgerRepository.findById(ledgerId1).orElseThrow();
        Category expCat = categoryRepository.findById(expCategoryId).orElseThrow();

        // 予算 30000 に対して実績 10000 → ~33% → 25点（100%未満）
        budgetRepository.save(Budget.builder()
                .budgetId(IdGenerator.budgetId())
                .ledger(ledger).category(expCat)
                .year((short) today.getYear()).month((short) today.getMonthValue())
                .amount(new BigDecimal("30000")).build());

        createTx("INCOME",  200000, today.toString(), incCategoryId);
        createTx("EXPENSE",  10000, today.toString(), expCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/ai/score")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.breakdown.budgetScore").value(25));
    }

    // =========================================================================
    // Rate limit
    // =========================================================================

    @Test
    void analyze_rateLimitedAfter1Request_returns429() throws Exception {
        // /ai/analyze は 1分1回の制限。キャッシュヒットは制限対象外のため
        // 異なる adviceType（= キャッシュミス確定）で2回呼び出す
        String insightBody = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH", "adviceType", "INSIGHT"));
        String adviceBody = objectMapper.writeValueAsString(
                Map.of("period", "ONE_MONTH", "adviceType", "ADVICE"));

        // 1回目: INSIGHT（キャッシュミス）→ rate limit count=1 → OK
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(insightBody))
                .andExpect(status().isOk());

        // 2回目: ADVICE（キャッシュミス）→ rate limit count=2 > 1 → 429
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/ai/analyze")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(adviceBody))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("E429"))
                .andExpect(header().exists("Retry-After"));
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private void createTx(String type, int amount, String date, String categoryId) {
        jdbcTemplate.execute(
                "INSERT INTO transactions (transaction_id, ledger_id, category_id, " +
                "transaction_type, amount, transaction_date, is_fixed_origin) VALUES " +
                "('" + IdGenerator.transactionId() + "', '" + ledgerId1 + "', '" + categoryId + "', " +
                "'" + type + "', " + amount + ", '" + date + "', false)");
    }
}
