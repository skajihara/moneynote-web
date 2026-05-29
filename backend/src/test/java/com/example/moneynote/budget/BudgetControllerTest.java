package com.example.moneynote.budget;

import com.example.moneynote.common.security.JwtTokenProvider;
import com.example.moneynote.common.util.IdGenerator;
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
class BudgetControllerTest {

    @SuppressWarnings("resource")
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("moneynote_test").withUsername("test").withPassword("test");

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

    @MockBean JavaMailSender mailSender;

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired LedgerRepository ledgerRepository;
    @Autowired LedgerPermissionRepository ledgerPermissionRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired BudgetRepository budgetRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private String token1;
    private String token2;
    private String ledgerId1;
    private String expCatId;
    private String incCatId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");

        User user1 = userRepository.save(User.builder()
                .userId("user1").userName("U1").email("u1@example.com")
                .passwordHash(passwordEncoder.encode("Pass1")).build());
        userRepository.save(User.builder()
                .userId("user2").userName("U2").email("u2@example.com")
                .passwordHash(passwordEncoder.encode("Pass1")).build());

        Ledger ledger = ledgerRepository.save(Ledger.builder()
                .ledgerId(IdGenerator.ledgerId()).owner(user1)
                .ledgerName("テスト帳簿").initialBalance(new BigDecimal("100000")).build());
        ledgerId1 = ledger.getLedgerId();

        ledgerPermissionRepository.save(LedgerPermission.builder()
                .permissionId(IdGenerator.ledgerPermissionId())
                .ledger(ledger).user(user1).permissionType(PermissionType.ADMIN).build());

        Category expCat = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId()).ledger(ledger)
                .categoryName("食費").categoryType(CategoryType.EXPENSE)
                .displayOrder((short) 1).build());
        expCatId = expCat.getCategoryId();

        Category incCat = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId()).ledger(ledger)
                .categoryName("給与").categoryType(CategoryType.INCOME)
                .displayOrder((short) 2).build());
        incCatId = incCat.getCategoryId();

        token1 = jwtTokenProvider.generateAccessToken("user1", "USER");
        token2 = jwtTokenProvider.generateAccessToken("user2", "USER");
    }

    // =========================================================================
    // GET /budgets
    // =========================================================================

    @Test
    void getBudgets_empty() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void getBudgets_returns_registered_budgets() throws Exception {
        createBudget(expCatId, 2026, 4, 30000);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].categoryName").value("食費"))
                .andExpect(jsonPath("$.data[0].budgetAmount").value(30000))
                .andExpect(jsonPath("$.data[0].actualAmount").value(0))
                .andExpect(jsonPath("$.data[0].status").value("NORMAL"));
    }

    @Test
    void getBudgets_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token2)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isForbidden());
    }

    @Test
    void getBudgets_categoryDeleted_true_when_category_is_inactive() throws Exception {
        createBudget(expCatId, 2026, 4, 30000);

        // カテゴリを論理削除する
        Category cat = categoryRepository.findById(expCatId).orElseThrow();
        cat.setActive(false);
        categoryRepository.save(cat);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].categoryDeleted").value(true));
    }

    @Test
    void getBudgets_categoryDeleted_false_when_category_is_active() throws Exception {
        createBudget(expCatId, 2026, 4, 30000);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].categoryDeleted").value(false));
    }

    // =========================================================================
    // POST /budgets (upsert)
    // =========================================================================

    @Test
    void upsertBudget_create_success() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", expCatId,
                                "year", 2026, "month", 4,
                                "amount", 50000))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.budgetId").isNotEmpty())
                .andExpect(jsonPath("$.data.categoryName").value("食費"))
                .andExpect(jsonPath("$.data.budgetAmount").value(50000))
                .andExpect(jsonPath("$.data.status").value("NORMAL"));
    }

    @Test
    void upsertBudget_update_existing() throws Exception {
        createBudget(expCatId, 2026, 4, 30000);

        // 同じ categoryId・year・month で再登録 → 更新される
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", expCatId,
                                "year", 2026, "month", 4,
                                "amount", 60000))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.budgetAmount").value(60000));

        // DB に1件のみ
        var budgets = budgetRepository.findByLedgerLedgerIdAndYearAndMonth(ledgerId1, (short) 2026, (short) 4);
        assert budgets.size() == 1;
    }

    @Test
    void upsertBudget_income_category_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", incCatId,
                                "year", 2026, "month", 4,
                                "amount", 50000))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void upsertBudget_amountExceedsMax_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", expCatId,
                                "year", 2026, "month", 4,
                                "amount", 1000000000))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void upsertBudget_otherUser_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", expCatId,
                                "year", 2026, "month", 4,
                                "amount", 50000))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 予算 status 計算
    // =========================================================================

    @Test
    void getBudgets_status_NORMAL_when_under80pct() throws Exception {
        createBudget(expCatId, 2026, 4, 10000);
        createTx("EXPENSE", 7000, "2026-04-10", expCatId);  // 70%

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(jsonPath("$.data[0].status").value("NORMAL"))
                .andExpect(jsonPath("$.data[0].actualAmount").value(7000))
                .andExpect(jsonPath("$.data[0].remainingAmount").value(3000));
    }

    @Test
    void getBudgets_status_WARNING_when_80to99pct() throws Exception {
        createBudget(expCatId, 2026, 4, 10000);
        createTx("EXPENSE", 9000, "2026-04-10", expCatId);  // 90%

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(jsonPath("$.data[0].status").value("WARNING"));
    }

    @Test
    void getBudgets_status_OVER_when_100pct_or_more() throws Exception {
        createBudget(expCatId, 2026, 4, 10000);
        createTx("EXPENSE", 12000, "2026-04-10", expCatId);  // 120%

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(jsonPath("$.data[0].status").value("OVER"))
                .andExpect(jsonPath("$.data[0].remainingAmount").value(-2000));
    }

    // =========================================================================
    // DELETE /budgets/{budgetId}
    // =========================================================================

    @Test
    void deleteBudget_success() throws Exception {
        String budgetId = createBudget(expCatId, 2026, 4, 30000);

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/budgets/" + budgetId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isNoContent());

        assert budgetRepository.findById(budgetId).isEmpty();
    }

    @Test
    void deleteBudget_otherUser_returns403() throws Exception {
        String budgetId = createBudget(expCatId, 2026, 4, 30000);

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/budgets/" + budgetId)
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // GET /budgets/heatmap
    // =========================================================================

    @Test
    void getHeatmap_returnsMonthsDescending() throws Exception {
        // 当月と先月に予算を設定
        createBudget(expCatId, 2026, 4, 30000);
        createBudget(expCatId, 2026, 3, 25000);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets/heatmap")
                        .header("Authorization", "Bearer " + token1)
                        .param("months", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))  // 3ヶ月分
                .andExpect(jsonPath("$.data[0].yearMonth").exists())   // 最新月が先頭
                .andExpect(jsonPath("$.data[0].budgets").isArray());
    }

    @Test
    void getHeatmap_statusReflectsActual() throws Exception {
        java.time.YearMonth ym = java.time.YearMonth.now();
        createBudget(expCatId, ym.getYear(), ym.getMonthValue(), 10000);
        createTx("EXPENSE", 12000, ym.atDay(10).toString(), expCatId); // 120% → OVER

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets/heatmap")
                        .header("Authorization", "Bearer " + token1)
                        .param("months", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].budgets[0].status").value("OVER"))
                .andExpect(jsonPath("$.data[0].budgets[0].actualAmount").value(12000));
    }

    @Test
    void getHeatmap_emptyMonth_returnsEmptyBudgets() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets/heatmap")
                        .header("Authorization", "Bearer " + token1)
                        .param("months", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].budgets", hasSize(0)));
    }

    @Test
    void getHeatmap_defaultMonths_returns12() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets/heatmap")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(12)));
    }

    @Test
    void getHeatmap_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/budgets/heatmap")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private String createBudget(String categoryId, int year, int month, int amount) {
        Category cat = categoryRepository.findById(categoryId).orElseThrow();
        Ledger ledger = ledgerRepository.findById(ledgerId1).orElseThrow();
        Budget budget = budgetRepository.save(Budget.builder()
                .budgetId(IdGenerator.budgetId()).ledger(ledger).category(cat)
                .year((short) year).month((short) month)
                .amount(new BigDecimal(amount)).build());
        return budget.getBudgetId();
    }

    private void createTx(String type, int amount, String date, String categoryId) {
        jdbcTemplate.execute(
                "INSERT INTO transactions (transaction_id, ledger_id, category_id, " +
                "transaction_type, amount, transaction_date, is_fixed_origin) VALUES " +
                "('" + IdGenerator.transactionId() + "', '" + ledgerId1 + "', '" + categoryId + "', " +
                "'" + type + "', " + amount + ", '" + date + "', false)");
    }
}
