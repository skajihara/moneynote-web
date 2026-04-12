package com.example.moneynote.report;

import com.example.moneynote.common.security.JwtTokenProvider;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.category.CategoryType;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.ledger.LedgerRepository;
import com.example.moneynote.domain.ledgerpermission.LedgerPermission;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import com.example.moneynote.domain.ledgerpermission.PermissionType;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SuppressWarnings("null")
class ReportControllerTest {

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
    @Autowired UserRepository userRepository;
    @Autowired LedgerRepository ledgerRepository;
    @Autowired LedgerPermissionRepository ledgerPermissionRepository;
    @Autowired CategoryRepository categoryRepository;
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
                .categoryName("食費").categoryType(CategoryType.EXPENSE).displayOrder((short) 1).build());
        expCatId = expCat.getCategoryId();

        Category incCat = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId()).ledger(ledger)
                .categoryName("給与").categoryType(CategoryType.INCOME).displayOrder((short) 2).build());
        incCatId = incCat.getCategoryId();

        token1 = jwtTokenProvider.generateAccessToken("user1");
        token2 = jwtTokenProvider.generateAccessToken("user2");
    }

    // =========================================================================
    // 月別レポート
    // =========================================================================

    @Test
    void getMonthlyReport_success() throws Exception {
        createTx("INCOME",  50000, "2026-04-15", incCatId);
        createTx("EXPENSE", 30000, "2026-04-10", expCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/monthly")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.year").value(2026))
                .andExpect(jsonPath("$.data.month").value(4))
                .andExpect(jsonPath("$.data.totalIncome").value(50000))
                .andExpect(jsonPath("$.data.totalExpense").value(30000))
                .andExpect(jsonPath("$.data.netBalance").value(20000))
                // carryOver: 月初前の残高 = 100000（前月の明細なし）
                .andExpect(jsonPath("$.data.carryOver").value(100000))
                // currentBalance: 100000 + 50000 - 30000 = 120000
                .andExpect(jsonPath("$.data.currentBalance").value(120000));
    }

    @Test
    void getMonthlyReport_prevMonthComparison() throws Exception {
        // 前月（3月）: 収入40000, 支出20000
        createTx("INCOME",  40000, "2026-03-15", incCatId);
        createTx("EXPENSE", 20000, "2026-03-10", expCatId);
        // 当月（4月）: 収入50000, 支出30000
        createTx("INCOME",  50000, "2026-04-15", incCatId);
        createTx("EXPENSE", 30000, "2026-04-10", expCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/monthly")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                // 前月比収入差額: 50000 - 40000 = 10000
                .andExpect(jsonPath("$.data.prevMonthComparison.incomeChange").value(10000))
                // 前月比支出差額: 30000 - 20000 = 10000
                .andExpect(jsonPath("$.data.prevMonthComparison.expenseChange").value(10000))
                // 前月比収入変化率: 10000/40000*100 = 25.0
                .andExpect(jsonPath("$.data.prevMonthComparison.incomeChangeRate").value(25.0))
                // 前月比支出変化率: 10000/20000*100 = 50.0
                .andExpect(jsonPath("$.data.prevMonthComparison.expenseChangeRate").value(50.0));
    }

    @Test
    void getMonthlyReport_prevYearComparison() throws Exception {
        // 前年同月（2025年4月）: 収入30000, 支出25000
        createTx("INCOME",  30000, "2025-04-10", incCatId);
        createTx("EXPENSE", 25000, "2025-04-20", expCatId);
        // 当月（2026年4月）: 収入60000, 支出25000
        createTx("INCOME",  60000, "2026-04-15", incCatId);
        createTx("EXPENSE", 25000, "2026-04-10", expCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/monthly")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                // 前年比収入差額: 60000 - 30000 = 30000
                .andExpect(jsonPath("$.data.prevYearComparison.incomeChange").value(30000))
                // 前年比支出差額: 25000 - 25000 = 0
                .andExpect(jsonPath("$.data.prevYearComparison.expenseChange").value(0));
    }

    @Test
    void getMonthlyReport_prevPeriodNoData_rateIsZero() throws Exception {
        // 前月・前年のデータなし → 変化率は 0.0
        createTx("INCOME", 50000, "2026-04-15", incCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/monthly")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.prevMonthComparison.incomeChangeRate").value(0.0))
                .andExpect(jsonPath("$.data.prevYearComparison.incomeChangeRate").value(0.0));
    }

    @Test
    void getMonthlyReport_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/monthly")
                        .header("Authorization", "Bearer " + token2)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 年別レポート
    // =========================================================================

    @Test
    void getAnnualReport_success_12months() throws Exception {
        createTx("INCOME",  50000, "2026-01-15", incCatId);
        createTx("EXPENSE", 30000, "2026-06-10", expCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/annual")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.year").value(2026))
                // 12ヶ月分のデータが返る
                .andExpect(jsonPath("$.data.months", hasSize(12)))
                .andExpect(jsonPath("$.data.balanceHistory", hasSize(12)));
    }

    @Test
    void getAnnualReport_emptyMonths_areZero() throws Exception {
        // 2026年4月のみデータあり
        createTx("INCOME", 50000, "2026-04-15", incCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/annual")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026"))
                .andExpect(status().isOk())
                // 1月（データなし）: totalIncome = 0
                .andExpect(jsonPath("$.data.months[0].totalIncome").value(0))
                .andExpect(jsonPath("$.data.months[0].totalExpense").value(0))
                // 4月: totalIncome = 50000
                .andExpect(jsonPath("$.data.months[3].totalIncome").value(50000));
    }

    @Test
    void getAnnualReport_annualSummary() throws Exception {
        createTx("INCOME",  120000, "2026-01-15", incCatId);
        createTx("INCOME",   80000, "2026-06-10", incCatId);
        createTx("EXPENSE",  50000, "2026-03-20", expCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/annual")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.annualSummary.totalIncome").value(200000))
                .andExpect(jsonPath("$.data.annualSummary.totalExpense").value(50000))
                .andExpect(jsonPath("$.data.annualSummary.netBalance").value(150000));
    }

    @Test
    void getAnnualReport_balanceHistory_isRunningBalance() throws Exception {
        // initialBalance=100000, 1月に収入50000
        createTx("INCOME", 50000, "2026-01-15", incCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/annual")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026"))
                .andExpect(status().isOk())
                // 1月末残高: 100000 + 50000 = 150000
                .andExpect(jsonPath("$.data.balanceHistory[0].balance").value(150000))
                // 2月以降変化なし: 150000
                .andExpect(jsonPath("$.data.balanceHistory[1].balance").value(150000));
    }

    @Test
    void getAnnualReport_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/reports/annual")
                        .header("Authorization", "Bearer " + token2)
                        .param("year", "2026"))
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
