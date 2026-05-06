package com.example.moneynote.dashboard;

import com.example.moneynote.common.security.JwtTokenProvider;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SuppressWarnings("null")
class DashboardControllerTest {

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
    @Autowired UserRepository userRepository;
    @Autowired LedgerRepository ledgerRepository;
    @Autowired LedgerPermissionRepository ledgerPermissionRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired BudgetRepository budgetRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private String token1;
    private String token2;
    private String ledgerId1;
    private String expCategoryId;
    private String incCategoryId;
    private String expCategory2Id;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");

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
                .categoryType(CategoryType.EXPENSE).displayOrder((short) 1)
                .color("#FF6384").build());
        expCategoryId = expCat.getCategoryId();

        Category expCat2 = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId())
                .ledger(ledger).categoryName("交通費")
                .categoryType(CategoryType.EXPENSE).displayOrder((short) 2)
                .color("#36A2EB").build());
        expCategory2Id = expCat2.getCategoryId();

        Category incCat = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId())
                .ledger(ledger).categoryName("給与")
                .categoryType(CategoryType.INCOME).displayOrder((short) 3).build());
        incCategoryId = incCat.getCategoryId();

        token1 = jwtTokenProvider.generateAccessToken("user1", "USER");
        token2 = jwtTokenProvider.generateAccessToken("user2", "USER");
    }

    // =========================================================================
    // 正常系
    // =========================================================================

    @Test
    void getDashboard_success_returnsSummary() throws Exception {
        createTx("EXPENSE", 30000, "2026-04-10", expCategoryId);
        createTx("INCOME",  50000, "2026-04-15", incCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/dashboard")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.totalIncome").value(50000))
                .andExpect(jsonPath("$.data.summary.totalExpense").value(30000))
                .andExpect(jsonPath("$.data.summary.netBalance").value(20000))
                // currentBalance = 100000 + 50000 - 30000 = 120000
                .andExpect(jsonPath("$.data.summary.currentBalance").value(120000))
                // carryOver = 100000 (no prior transactions)
                .andExpect(jsonPath("$.data.summary.carryOver").value(100000));
    }

    @Test
    void getDashboard_categoryBreakdown_expenseOnly_descOrder_zeroExcluded() throws Exception {
        // 食費: 30000, 交通費: 10000, 収入カテゴリは除外
        createTx("EXPENSE", 30000, "2026-04-10", expCategoryId);
        createTx("EXPENSE", 10000, "2026-04-12", expCategory2Id);
        createTx("INCOME",  50000, "2026-04-15", incCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/dashboard")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                // 支出カテゴリのみ 2件（収入は除外）
                .andExpect(jsonPath("$.data.categoryBreakdown", hasSize(2)))
                // 金額降順: 食費(30000)が先
                .andExpect(jsonPath("$.data.categoryBreakdown[0].categoryName").value("食費"))
                .andExpect(jsonPath("$.data.categoryBreakdown[0].amount").value(30000))
                .andExpect(jsonPath("$.data.categoryBreakdown[1].categoryName").value("交通費"))
                .andExpect(jsonPath("$.data.categoryBreakdown[1].amount").value(10000))
                // percentage が付いている
                .andExpect(jsonPath("$.data.categoryBreakdown[0].percentage").isNumber())
                // color が付いている
                .andExpect(jsonPath("$.data.categoryBreakdown[0].color").value("#FF6384"));
    }

    @Test
    void getDashboard_categoryBreakdown_empty_whenNoExpense() throws Exception {
        createTx("INCOME", 50000, "2026-04-15", incCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/dashboard")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categoryBreakdown", hasSize(0)));
    }

    @Test
    void getDashboard_budgetStatus_statusCalculation() throws Exception {
        // 食費予算: 50000、実績: 40000 → 80% → WARNING
        // 交通費予算: 20000、実績: 25000 → 125% → OVER
        budgetRepository.save(Budget.builder()
                .budgetId(IdGenerator.ledgerId())
                .ledger(ledgerRepository.findById(ledgerId1).orElseThrow())
                .category(categoryRepository.findById(expCategoryId).orElseThrow())
                .year((short) 2026).month((short) 4)
                .amount(new BigDecimal("50000")).build());
        budgetRepository.save(Budget.builder()
                .budgetId(IdGenerator.ledgerId())
                .ledger(ledgerRepository.findById(ledgerId1).orElseThrow())
                .category(categoryRepository.findById(expCategory2Id).orElseThrow())
                .year((short) 2026).month((short) 4)
                .amount(new BigDecimal("20000")).build());

        createTx("EXPENSE", 40000, "2026-04-10", expCategoryId);
        createTx("EXPENSE", 25000, "2026-04-12", expCategory2Id);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/dashboard")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.budgetStatus", hasSize(2)))
                // 食費: 80% → WARNING
                .andExpect(jsonPath("$.data.budgetStatus[?(@.categoryName=='食費')].status",
                        contains("WARNING")))
                // 交通費: 125% → OVER
                .andExpect(jsonPath("$.data.budgetStatus[?(@.categoryName=='交通費')].status",
                        contains("OVER")));
    }

    @Test
    void getDashboard_budgetStatus_normal() throws Exception {
        // 食費予算: 50000、実績: 10000 → 20% → NORMAL
        budgetRepository.save(Budget.builder()
                .budgetId(IdGenerator.ledgerId())
                .ledger(ledgerRepository.findById(ledgerId1).orElseThrow())
                .category(categoryRepository.findById(expCategoryId).orElseThrow())
                .year((short) 2026).month((short) 4)
                .amount(new BigDecimal("50000")).build());

        createTx("EXPENSE", 10000, "2026-04-10", expCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/dashboard")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.budgetStatus[0].status").value("NORMAL"));
    }

    @Test
    void getDashboard_recentCount_limitsTransactions() throws Exception {
        // 5件の明細を作成
        for (int i = 1; i <= 5; i++) {
            createTx("EXPENSE", 1000 * i, "2026-04-" + String.format("%02d", i), expCategoryId);
        }

        // recentCount=3 で取得
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/dashboard")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4")
                        .param("recentCount", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recentTransactions", hasSize(3)));
    }

    @Test
    void getDashboard_recentCount_defaultIs10() throws Exception {
        // 15件の明細を作成
        for (int i = 1; i <= 15; i++) {
            createTx("EXPENSE", 1000, "2026-04-" + String.format("%02d", Math.min(i, 28)),
                    expCategoryId);
        }

        // recentCount 未指定 → デフォルト10件
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/dashboard")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recentTransactions", hasSize(10)));
    }

    // =========================================================================
    // アクセス制御
    // =========================================================================

    @Test
    void getDashboard_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/dashboard")
                        .header("Authorization", "Bearer " + token2)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isForbidden());
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
