package com.example.moneynote.transaction;

import com.example.moneynote.common.security.JwtTokenProvider;
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
class TransactionControllerTest {

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
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private String token1;
    private String token2;
    private String ledgerId1;
    private String expCategoryId;  // EXPENSE カテゴリ
    private String incCategoryId;  // INCOME カテゴリ

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");

        // user1 / user2 作成
        User user1 = userRepository.save(User.builder()
                .userId("user1").userName("ユーザー1").email("u1@example.com")
                .passwordHash(passwordEncoder.encode("Pass1")).build());
        userRepository.save(User.builder()
                .userId("user2").userName("ユーザー2").email("u2@example.com")
                .passwordHash(passwordEncoder.encode("Pass1")).build());

        // 帳簿作成
        Ledger ledger = ledgerRepository.save(Ledger.builder()
                .ledgerId(IdGenerator.ledgerId())
                .owner(user1)
                .ledgerName("テスト帳簿")
                .initialBalance(new BigDecimal("100000"))
                .build());
        ledgerId1 = ledger.getLedgerId();

        // オーナー権限付与
        ledgerPermissionRepository.save(LedgerPermission.builder()
                .permissionId(IdGenerator.ledgerPermissionId())
                .ledger(ledger).user(user1)
                .permissionType(PermissionType.ADMIN).build());

        // カテゴリ作成
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

        token1 = jwtTokenProvider.generateAccessToken("user1", "USER");
        token2 = jwtTokenProvider.generateAccessToken("user2", "USER");
    }

    // =========================================================================
    // POST /api/v1/ledgers/{ledgerId}/transactions
    // =========================================================================

    @Test
    void createTransaction_success() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "amount", 3000,
                                "transactionDate", "2026-04-10",
                                "categoryId", expCategoryId,
                                "memo", "昼食"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.transactionId").isNotEmpty())
                .andExpect(jsonPath("$.data.amount").value(3000))
                .andExpect(jsonPath("$.data.categoryName").value("食費"))
                .andExpect(jsonPath("$.data.memo").value("昼食"));
    }

    @Test
    void createTransaction_otherUser_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "amount", 1000,
                                "transactionDate", "2026-04-10",
                                "categoryId", expCategoryId))))
                .andExpect(status().isForbidden());
    }

    @Test
    void createTransaction_zeroAmount_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "amount", 0,
                                "transactionDate", "2026-04-10",
                                "categoryId", expCategoryId))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createTransaction_negativAmount_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "amount", -100,
                                "transactionDate", "2026-04-10",
                                "categoryId", expCategoryId))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createTransaction_categoryTypeMismatch_returns400() throws Exception {
        // EXPENSE 明細に INCOME カテゴリを指定
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "amount", 1000,
                                "transactionDate", "2026-04-10",
                                "categoryId", incCategoryId))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createTransaction_nonexistentCategory_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "amount", 1000,
                                "transactionDate", "2026-04-10",
                                "categoryId", "cat_nonexistent"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    // =========================================================================
    // GET /api/v1/ledgers/{ledgerId}/transactions  一覧・集計
    // =========================================================================

    @Test
    void getTransactions_returnsMonthlyData() throws Exception {
        createTx("EXPENSE", 3000, "2026-04-10", expCategoryId);
        createTx("INCOME",  5000, "2026-04-15", incCategoryId);
        createTx("EXPENSE", 2000, "2026-03-31", expCategoryId); // 前月 → 含まれない

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transactions", hasSize(2)))
                .andExpect(jsonPath("$.data.summary.totalIncome").value(5000))
                .andExpect(jsonPath("$.data.summary.totalExpense").value(3000))
                .andExpect(jsonPath("$.data.summary.netBalance").value(2000));
    }

    @Test
    void getTransactions_dailySummariesCoversAllDays() throws Exception {
        createTx("EXPENSE", 1000, "2026-04-01", expCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isOk())
                // 4月は30日あるので dailySummaries は30件
                .andExpect(jsonPath("$.data.dailySummaries", hasSize(30)));
    }

    @Test
    void getTransactions_filterByType() throws Exception {
        createTx("EXPENSE", 3000, "2026-04-10", expCategoryId);
        createTx("INCOME",  5000, "2026-04-15", incCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4")
                        .param("type", "EXPENSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transactions", hasSize(1)))
                .andExpect(jsonPath("$.data.transactions[0].transactionType").value("EXPENSE"));
    }

    @Test
    void getTransactions_filterByCategory() throws Exception {
        createTx("EXPENSE", 3000, "2026-04-10", expCategoryId);
        createTx("INCOME",  5000, "2026-04-15", incCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("year", "2026").param("month", "4")
                        .param("categoryId", expCategoryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transactions", hasSize(1)))
                .andExpect(jsonPath("$.data.transactions[0].categoryName").value("食費"));
    }

    @Test
    void getTransactions_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token2)
                        .param("year", "2026").param("month", "4"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // GET /api/v1/ledgers/{ledgerId}/balance
    // =========================================================================

    @Test
    void getBalance_calculatesCorrectly() throws Exception {
        // Use dynamic dates so the test stays valid regardless of when it runs
        String prevMonth15 = LocalDate.now().minusMonths(1).withDayOfMonth(15).toString();
        String prevMonth25 = LocalDate.now().minusMonths(1).withDayOfMonth(25).toString();
        String thisMonth5  = LocalDate.now().withDayOfMonth(5).toString();
        String thisMonth10 = LocalDate.now().withDayOfMonth(10).toString();

        createTx("INCOME",  50000, prevMonth15, incCategoryId); // 前月
        createTx("EXPENSE", 30000, prevMonth25, expCategoryId); // 前月
        createTx("INCOME",  80000, thisMonth5,  incCategoryId); // 今月
        createTx("EXPENSE", 20000, thisMonth10, expCategoryId); // 今月

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/balance")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                // initialBalance=100000, totalIncome=130000, totalExpense=50000
                .andExpect(jsonPath("$.data.initialBalance").value(100000))
                .andExpect(jsonPath("$.data.totalIncome").value(130000))
                .andExpect(jsonPath("$.data.totalExpense").value(50000))
                .andExpect(jsonPath("$.data.currentBalance").value(180000))
                // carryOver = 100000 + 50000 - 30000 = 120000
                .andExpect(jsonPath("$.data.carryOver").value(120000));
    }

    @Test
    void getBalance_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/balance")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // GET /api/v1/ledgers/{ledgerId}/transactions/{transactionId}
    // =========================================================================

    @Test
    void getTransaction_success() throws Exception {
        String txId = createTx("EXPENSE", 1500, "2026-04-05", expCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transactionId").value(txId))
                .andExpect(jsonPath("$.data.amount").value(1500));
    }

    @Test
    void getTransaction_notFound_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/txn_nonexistent")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isNotFound());
    }

    @Test
    void getTransaction_otherUser_returns403() throws Exception {
        // 検証6: GET /transactions/{id} も帳簿アクセス制御が機能すること
        String txId = createTx("EXPENSE", 1500, "2026-04-05", expCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId)
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // PUT /api/v1/ledgers/{ledgerId}/transactions/{transactionId}
    // =========================================================================

    @Test
    void updateTransaction_success() throws Exception {
        String txId = createTx("EXPENSE", 1500, "2026-04-05", expCategoryId);

        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId)
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "amount", 2500,
                                "transactionDate", "2026-04-06",
                                "categoryId", expCategoryId,
                                "memo", "更新後"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.amount").value(2500))
                .andExpect(jsonPath("$.data.memo").value("更新後"));
    }

    @Test
    void updateTransaction_otherUser_returns403() throws Exception {
        String txId = createTx("EXPENSE", 1500, "2026-04-05", expCategoryId);

        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId)
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "amount", 999,
                                "transactionDate", "2026-04-06",
                                "categoryId", expCategoryId))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // DELETE /api/v1/ledgers/{ledgerId}/transactions/{transactionId}
    // =========================================================================

    @Test
    void deleteTransaction_single_success() throws Exception {
        String txId = createTx("EXPENSE", 1000, "2026-04-01", expCategoryId);

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId)
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("scope", "SINGLE"))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteTransaction_scopeAll_deletesAllFixedOrigin() throws Exception {
        // isFixedOrigin=true の明細を2件作成し、同じ fixedTransactionId を持たせる
        // 固定費エンティティを直接作る（FixedTransaction は Step7 実装予定のため簡易的に直接DB）
        String fixId = IdGenerator.fixedTransactionId();
        jdbcTemplate.execute(
                "INSERT INTO fixed_transactions (fixed_transaction_id, ledger_id, category_id, " +
                "fixed_name, transaction_type, amount, day_of_month, start_date) VALUES " +
                "('" + fixId + "', '" + ledgerId1 + "', '" + expCategoryId + "', " +
                "'家賃', 'EXPENSE', 80000, 1, '2026-01-01')");

        String txId1 = createFixedTx("EXPENSE", 80000, "2026-02-01", expCategoryId, fixId);
        String txId2 = createFixedTx("EXPENSE", 80000, "2026-03-01", expCategoryId, fixId);
        String txId3 = createFixedTx("EXPENSE", 80000, "2026-04-01", expCategoryId, fixId);

        // txId1 を scope=ALL で削除 → 3件すべて削除される
        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId1)
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("scope", "ALL"))))
                .andExpect(status().isOk());

        // 3件すべて消えていることを確認
        for (String id : new String[]{txId1, txId2, txId3}) {
            mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + id)
                            .header("Authorization", "Bearer " + token1))
                    .andExpect(status().isNotFound());
        }
    }

    @Test
    void deleteTransaction_scopeAll_nonFixedOrigin_deletesSingle() throws Exception {
        // isFixedOrigin=false の場合は scope=ALL でも1件のみ削除される
        String txId = createTx("EXPENSE", 500, "2026-04-10", expCategoryId);

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId)
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("scope", "ALL"))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteTransaction_otherUser_returns403() throws Exception {
        String txId = createTx("EXPENSE", 1000, "2026-04-01", expCategoryId);

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/transactions/" + txId)
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("scope", "SINGLE"))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // GET /api/v1/ledgers/{ledgerId}/transactions/search
    // =========================================================================

    @Test
    void searchTransactions_noParams_returnsAll() throws Exception {
        createTx("EXPENSE", 1000, "2026-03-01", expCategoryId);
        createTx("INCOME",  5000, "2026-04-15", incCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/search")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void searchTransactions_withStartDate_filtersCorrectly() throws Exception {
        createTx("EXPENSE", 1000, "2026-03-01", expCategoryId); // 範囲外
        createTx("EXPENSE", 2000, "2026-04-10", expCategoryId); // 範囲内

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/search")
                        .param("startDate", "2026-04-01")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].amount").value(2000));
    }

    @Test
    void searchTransactions_withEndDate_filtersCorrectly() throws Exception {
        createTx("EXPENSE", 1000, "2026-03-01", expCategoryId); // 範囲内
        createTx("EXPENSE", 2000, "2026-05-01", expCategoryId); // 範囲外

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/search")
                        .param("endDate", "2026-04-30")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].amount").value(1000));
    }

    @Test
    void searchTransactions_withDateRange_filtersCorrectly() throws Exception {
        createTx("EXPENSE", 1000, "2026-03-31", expCategoryId); // 範囲外（前）
        createTx("EXPENSE", 2000, "2026-04-10", expCategoryId); // 範囲内
        createTx("EXPENSE", 3000, "2026-04-30", expCategoryId); // 範囲内
        createTx("EXPENSE", 4000, "2026-05-01", expCategoryId); // 範囲外（後）

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/search")
                        .param("startDate", "2026-04-01")
                        .param("endDate", "2026-04-30")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void searchTransactions_withKeyword_filtersCorrectly() throws Exception {
        // memo 付き明細を直接 DB に登録する
        jdbcTemplate.execute(
                "INSERT INTO transactions (transaction_id, ledger_id, category_id, transaction_type, " +
                "amount, transaction_date, memo, is_fixed_origin) VALUES " +
                "('" + IdGenerator.transactionId() + "', '" + ledgerId1 + "', '" + expCategoryId + "', " +
                "'EXPENSE', 800, '2026-04-05', 'スーパー買い物', false)");
        jdbcTemplate.execute(
                "INSERT INTO transactions (transaction_id, ledger_id, category_id, transaction_type, " +
                "amount, transaction_date, memo, is_fixed_origin) VALUES " +
                "('" + IdGenerator.transactionId() + "', '" + ledgerId1 + "', '" + expCategoryId + "', " +
                "'EXPENSE', 500, '2026-04-06', 'コンビニ', false)");

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/search")
                        .param("keyword", "スーパー")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].amount").value(800));
    }

    @Test
    void searchTransactions_withCategory_filtersCorrectly() throws Exception {
        createTx("EXPENSE", 1000, "2026-04-01", expCategoryId);
        createTx("INCOME",  5000, "2026-04-01", incCategoryId);

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/search")
                        .param("categoryId", expCategoryId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].transactionType").value("EXPENSE"));
    }

    @Test
    void searchTransactions_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/search")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private String createTx(String type, int amount, String date, String categoryId) throws Exception {
        String body = mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", type,
                                "amount", amount,
                                "transactionDate", date,
                                "categoryId", categoryId))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).at("/data/transactionId").asText();
    }

    /** 固定費由来（isFixedOrigin=true）の明細を直接DBに登録する */
    private String createFixedTx(String type, int amount, String date,
                                  String categoryId, String fixedTransactionId) {
        String txId = IdGenerator.transactionId();
        jdbcTemplate.execute(
                "INSERT INTO transactions (transaction_id, ledger_id, category_id, " +
                "fixed_transaction_id, transaction_type, amount, transaction_date, is_fixed_origin) VALUES " +
                "('" + txId + "', '" + ledgerId1 + "', '" + categoryId + "', " +
                "'" + fixedTransactionId + "', '" + type + "', " + amount + ", '" + date + "', true)");
        return txId;
    }
}
