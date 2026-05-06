package com.example.moneynote.category;

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
class CategoryReportControllerTest {

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
    private String expCat1Id;
    private String expCat2Id;
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

        Category expCat1 = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId()).ledger(ledger)
                .categoryName("食費").categoryType(CategoryType.EXPENSE)
                .color("#FF6384").displayOrder((short) 1).build());
        expCat1Id = expCat1.getCategoryId();

        Category expCat2 = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId()).ledger(ledger)
                .categoryName("交通費").categoryType(CategoryType.EXPENSE)
                .color("#36A2EB").displayOrder((short) 2).build());
        expCat2Id = expCat2.getCategoryId();

        Category incCat = categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId()).ledger(ledger)
                .categoryName("給与").categoryType(CategoryType.INCOME)
                .displayOrder((short) 3).build());
        incCatId = incCat.getCategoryId();

        token1 = jwtTokenProvider.generateAccessToken("user1", "USER");
        token2 = jwtTokenProvider.generateAccessToken("user2", "USER");
    }

    // =========================================================================
    // GET /categories/summary
    // =========================================================================

    @Test
    void getCategorySummary_allTypes_amountDesc_zeroExcluded() throws Exception {
        createTx("EXPENSE", 30000, "2026-04-10", expCat1Id);  // 食費
        createTx("EXPENSE", 10000, "2026-04-12", expCat2Id);  // 交通費
        createTx("INCOME",  50000, "2026-04-15", incCatId);   // 給与

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                // 3カテゴリ全て返る（0円は除外されないが今回全て>0）
                .andExpect(jsonPath("$.data", hasSize(3)))
                // 金額降順: 給与(50000)が先
                .andExpect(jsonPath("$.data[0].categoryName").value("給与"))
                .andExpect(jsonPath("$.data[0].amount").value(50000))
                .andExpect(jsonPath("$.data[1].categoryName").value("食費"))
                .andExpect(jsonPath("$.data[2].categoryName").value("交通費"));
    }

    @Test
    void getCategorySummary_filterByExpense() throws Exception {
        createTx("EXPENSE", 30000, "2026-04-10", expCat1Id);
        createTx("EXPENSE", 10000, "2026-04-12", expCat2Id);
        createTx("INCOME",  50000, "2026-04-15", incCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4")
                        .param("type", "EXPENSE"))
                .andExpect(status().isOk())
                // EXPENSE のみ 2件
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].categoryType").value("EXPENSE"))
                .andExpect(jsonPath("$.data[1].categoryType").value("EXPENSE"));
    }

    @Test
    void getCategorySummary_zeroAmountExcluded() throws Exception {
        // expCat2 に明細なし → 結果から除外される
        createTx("EXPENSE", 30000, "2026-04-10", expCat1Id);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].categoryName").value("食費"));
    }

    @Test
    void getCategorySummary_percentageIsCorrect() throws Exception {
        // 食費30000 / 支出合計40000 = 75%
        createTx("EXPENSE", 30000, "2026-04-10", expCat1Id);
        createTx("EXPENSE", 10000, "2026-04-12", expCat2Id);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4")
                        .param("type", "EXPENSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].percentage").value(75.0))
                .andExpect(jsonPath("$.data[1].percentage").value(25.0));
    }

    @Test
    void getCategorySummary_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary")
                        .header("Authorization", "Bearer " + token2)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // GET /categories/{categoryId}/transactions
    // =========================================================================

    @Test
    void getCategoryTransactions_success() throws Exception {
        createTx("EXPENSE", 15000, "2026-04-10", expCat1Id);
        createTx("EXPENSE",  5000, "2026-04-20", expCat1Id);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/" + expCat1Id + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                // カテゴリ情報
                .andExpect(jsonPath("$.data.category.categoryId").value(expCat1Id))
                .andExpect(jsonPath("$.data.category.categoryName").value("食費"))
                // 直近12ヶ月のトレンド
                .andExpect(jsonPath("$.data.monthlyTrend", hasSize(12)))
                // 当月の明細
                .andExpect(jsonPath("$.data.transactions", hasSize(2)));
    }

    @Test
    void getCategoryTransactions_monthlyTrend_12months() throws Exception {
        // 2025-05 〜 2026-04 が返る
        createTx("EXPENSE", 10000, "2025-05-10", expCat1Id);
        createTx("EXPENSE", 20000, "2026-04-10", expCat1Id);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/" + expCat1Id + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.monthlyTrend", hasSize(12)))
                // 最初のキー: "2025-05"
                .andExpect(jsonPath("$.data.monthlyTrend[0].month").value("2025-05"))
                .andExpect(jsonPath("$.data.monthlyTrend[0].amount").value(10000))
                // 最後のキー: "2026-04"
                .andExpect(jsonPath("$.data.monthlyTrend[11].month").value("2026-04"))
                .andExpect(jsonPath("$.data.monthlyTrend[11].amount").value(20000));
    }

    @Test
    void getCategoryTransactions_emptyMonths_areZero() throws Exception {
        // 2026-04 のみデータあり
        createTx("EXPENSE", 20000, "2026-04-10", expCat1Id);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/" + expCat1Id + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                // データのない月は 0
                .andExpect(jsonPath("$.data.monthlyTrend[0].amount").value(0));
    }

    @Test
    void getCategoryTransactions_noMonth_returnsFullYear() throws Exception {
        // 年間モード: 1月・6月・12月の明細がすべて返る
        createTx("EXPENSE", 10000, "2026-01-10", expCat1Id);
        createTx("EXPENSE", 20000, "2026-06-15", expCat1Id);
        createTx("EXPENSE", 30000, "2026-12-20", expCat1Id);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/" + expCat1Id + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026"))
                .andExpect(status().isOk())
                // トレンドは12ヶ月（1月〜12月）
                .andExpect(jsonPath("$.data.monthlyTrend", hasSize(12)))
                .andExpect(jsonPath("$.data.monthlyTrend[0].month").value("2026-01"))
                .andExpect(jsonPath("$.data.monthlyTrend[11].month").value("2026-12"))
                // 全月の明細が返る
                .andExpect(jsonPath("$.data.transactions", hasSize(3)));
    }

    @Test
    void getCategoryTransactions_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/" + expCat1Id + "/transactions")
                        .header("Authorization", "Bearer " + token2)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // GET /categories/summary/annual
    // =========================================================================

    @Test
    void getAnnualCategorySummary_amountDesc() throws Exception {
        // 2026年分: 食費30000 + 10000 = 40000, 交通費15000, 給与200000
        createTx("EXPENSE", 30000, "2026-01-10", expCat1Id);
        createTx("EXPENSE", 10000, "2026-06-15", expCat1Id);
        createTx("EXPENSE", 15000, "2026-09-20", expCat2Id);
        createTx("INCOME",  200000, "2026-03-25", incCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary/annual")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                // 金額降順: 給与(200000)が先
                .andExpect(jsonPath("$.data[0].categoryName").value("給与"))
                .andExpect(jsonPath("$.data[0].amount").value(200000))
                .andExpect(jsonPath("$.data[1].categoryName").value("食費"))
                .andExpect(jsonPath("$.data[1].amount").value(40000))
                .andExpect(jsonPath("$.data[2].categoryName").value("交通費"));
    }

    @Test
    void getAnnualCategorySummary_filterByExpense() throws Exception {
        createTx("EXPENSE", 30000, "2026-02-10", expCat1Id);
        createTx("INCOME",  50000, "2026-04-15", incCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary/annual")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026")
                        .param("type", "EXPENSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].categoryType").value("EXPENSE"));
    }

    @Test
    void getAnnualCategorySummary_excludesOtherYears() throws Exception {
        createTx("EXPENSE", 20000, "2025-12-31", expCat1Id);  // 前年分は除外
        createTx("EXPENSE", 10000, "2026-01-01", expCat1Id);  // 当年分のみ

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary/annual")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].amount").value(10000));
    }

    @Test
    void getAnnualCategorySummary_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary/annual")
                        .header("Authorization", "Bearer " + token2)
                        .param("year", "2026"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // GET /categories/summary/all-time
    // =========================================================================

    @Test
    void getAllTimeCategorySummary_spansMultipleYears() throws Exception {
        createTx("EXPENSE", 20000, "2024-06-10", expCat1Id);
        createTx("EXPENSE", 30000, "2025-03-15", expCat1Id);
        createTx("INCOME",  100000, "2026-01-20", incCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary/all-time")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                // 食費: 20000+30000=50000, 給与: 100000
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].categoryName").value("給与"))
                .andExpect(jsonPath("$.data[0].amount").value(100000))
                .andExpect(jsonPath("$.data[1].categoryName").value("食費"))
                .andExpect(jsonPath("$.data[1].amount").value(50000));
    }

    @Test
    void getAllTimeCategorySummary_filterByType() throws Exception {
        createTx("EXPENSE", 20000, "2024-06-10", expCat1Id);
        createTx("INCOME",  100000, "2026-01-20", incCatId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary/all-time")
                        .header("Authorization", "Bearer " + token1)
                        .param("type", "EXPENSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].categoryType").value("EXPENSE"));
    }

    @Test
    void getAllTimeCategorySummary_empty_returnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary/all-time")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void getAllTimeCategorySummary_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories/summary/all-time")
                        .header("Authorization", "Bearer " + token2))
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
