package com.example.moneynote.fixedtransaction;

import com.example.moneynote.common.security.JwtTokenProvider;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.category.CategoryType;
import com.example.moneynote.domain.fixedtransaction.FixedTransactionRepository;
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
import java.util.HashMap;
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
class FixedTransactionControllerTest {

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
    @Autowired FixedTransactionRepository fixedTransactionRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private String token1;
    private String token2;
    private String ledgerId1;
    private String expCatId;

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
                .categoryName("家賃").categoryType(CategoryType.EXPENSE)
                .displayOrder((short) 1).build());
        expCatId = expCat.getCategoryId();

        categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId()).ledger(ledger)
                .categoryName("給与").categoryType(CategoryType.INCOME)
                .displayOrder((short) 2).build());

        token1 = jwtTokenProvider.generateAccessToken("user1", "USER");
        token2 = jwtTokenProvider.generateAccessToken("user2", "USER");
    }

    // =========================================================================
    // POST /fixed-transactions
    // =========================================================================

    @Test
    void createFixedTransaction_success_and_generates_transactions() throws Exception {
        // 2026-02 〜 2026-04 の 3ヶ月分が生成される
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(
                                "家賃", "EXPENSE", expCatId, 80000, 1,
                                "2026-02-01", "2026-04-30"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.fixedTransactionId").isNotEmpty())
                .andExpect(jsonPath("$.data.fixedName").value("家賃"))
                .andExpect(jsonPath("$.data.amount").value(80000))
                .andExpect(jsonPath("$.data.intervalType").value("MONTHLY"));

        // 3ヶ月分の明細が生成されていること
        var transactions = transactionRepository.findAll();
        assert transactions.size() == 3 : "Expected 3 transactions, got " + transactions.size();
    }

    @Test
    void createFixedTransaction_memo_is_saved_and_copied_to_transactions() throws Exception {
        // memo 付きで固定費を登録
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(
                                "家賃", "EXPENSE", expCatId, 80000, 1,
                                "2026-02-01", "2026-03-31", "毎月1日引き落とし"))))
                .andExpect(status().isCreated())
                // レスポンスに memo が含まれる
                .andExpect(jsonPath("$.data.memo").value("毎月1日引き落とし"));

        // 生成された明細にも memo がコピーされている
        var transactions = transactionRepository.findAll();
        assert transactions.size() == 2 : "Expected 2 transactions, got " + transactions.size();
        transactions.forEach(t -> {
            assert "毎月1日引き落とし".equals(t.getMemo())
                    : "Expected memo to be copied, got: " + t.getMemo();
        });
    }

    @Test
    void createFixedTransaction_type_mismatch_returns400() throws Exception {
        // EXPENSE カテゴリに INCOME 取引種別を指定 → 400
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(
                                "給与", "INCOME", expCatId, 300000, 25,
                                "2026-01-01", "2036-01-01"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createFixedTransaction_no_endDate_returns400() throws Exception {
        // endDate なし → バリデーションエラー
        Map<String, Object> body = new HashMap<>();
        body.put("fixedName", "家賃");
        body.put("transactionType", "EXPENSE");
        body.put("categoryId", expCatId);
        body.put("amount", 80000);
        body.put("dayOfMonth", 1);
        body.put("startDate", "2026-01-01");
        // endDate を含めない

        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createFixedTransaction_endDate_before_startDate_returns400() throws Exception {
        // endDate が startDate より前 → バリデーションエラー
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(
                                "家賃", "EXPENSE", expCatId, 80000, 1,
                                "2026-04-01", "2026-03-31"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createFixedTransaction_otherUser_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(
                                "家賃", "EXPENSE", expCatId, 80000, 1,
                                "2026-01-01", "2036-01-01"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void createFixedTransaction_validation_dayOfMonth_over28_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(
                                "家賃", "EXPENSE", expCatId, 80000, 29,
                                "2026-01-01", "2036-01-01"))))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // GET /fixed-transactions
    // =========================================================================

    @Test
    void getFixedTransactions_returns_all() throws Exception {
        createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2036-01-01");

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].fixedName").value("家賃"));
    }

    @Test
    void getFixedTransactions_filter_ACTIVE() throws Exception {
        // endDate=未来: active
        createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2036-01-01");
        // endDate=過去: expired
        createFixed("電気代", "EXPENSE", expCatId, 5000, 15, "2025-01-01", "2025-12-31");

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].fixedName").value("家賃"));
    }

    @Test
    void getFixedTransactions_filter_EXPIRED() throws Exception {
        createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2036-01-01");
        createFixed("電気代", "EXPENSE", expCatId, 5000, 15, "2025-01-01", "2025-12-31");

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .param("status", "EXPIRED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].fixedName").value("電気代"));
    }

    @Test
    void getFixedTransactions_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // PUT /fixed-transactions/{fixedId}
    // =========================================================================

    @Test
    void updateFixedTransaction_regenerates_transactions() throws Exception {
        // まず登録（2026-01〜2026-04 の 4ヶ月分が生成される）
        String fixedId = createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2026-04-30");
        int before = transactionRepository.findAll().size();
        assert before == 4 : "Expected 4 transactions before update, got " + before;

        // 更新: 金額変更 + 期間短縮（2026-01〜2026-02 の 2ヶ月分）
        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions/" + fixedId)
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(
                                "家賃（更新）", "EXPENSE", expCatId, 85000, 1,
                                "2026-01-01", "2026-02-28"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fixedName").value("家賃（更新）"))
                .andExpect(jsonPath("$.data.amount").value(85000));

        // 全明細が削除されて再生成: 2ヶ月分
        int after = transactionRepository.findAll().size();
        assert after == 2 : "Expected 2 transactions after update, got " + after;
    }

    @Test
    void updateFixedTransaction_otherUser_returns403() throws Exception {
        String fixedId = createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2036-01-01");

        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions/" + fixedId)
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(
                                "家賃", "EXPENSE", expCatId, 80000, 1,
                                "2026-01-01", "2036-01-01"))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // DELETE /fixed-transactions/{fixedId}
    // =========================================================================

    @Test
    void deleteFixedTransaction_also_deletes_transactions() throws Exception {
        String fixedId = createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2026-03-31");
        // 3ヶ月分の明細が存在する
        assert transactionRepository.findAll().size() == 3;

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions/" + fixedId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isNoContent());

        assert fixedTransactionRepository.findById(fixedId).isEmpty();
        assert transactionRepository.findAll().isEmpty();
    }

    @Test
    void deleteFixedTransaction_otherUser_returns403() throws Exception {
        String fixedId = createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2036-01-01");

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions/" + fixedId)
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // POST /fixed-transactions/{fixedId}/generate
    // =========================================================================

    @Test
    void generate_skips_existing_months() throws Exception {
        // 2026-01〜2026-03 の 3ヶ月分を登録
        String fixedId = createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2026-03-31");
        // 再度 generate → 既に3ヶ月全て生成済みなので skippedCount=3, generatedCount=0
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions/" + fixedId + "/generate")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.generatedCount").value(0))
                .andExpect(jsonPath("$.data.skippedCount").value(3));
    }

    @Test
    void generate_otherUser_returns403() throws Exception {
        String fixedId = createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2036-01-01");

        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions/" + fixedId + "/generate")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // interval_type: DAILY
    // =========================================================================

    @Test
    void intervalType_DAILY_generates_every_day() throws Exception {
        // 2026-04-01 〜 2026-04-05: 5日分が生成される
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReqWithInterval(
                                "日次費用", "EXPENSE", expCatId, 100, 1,
                                "2026-04-01", "2026-04-05", "DAILY"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.intervalType").value("DAILY"));

        int count = transactionRepository.findAll().size();
        assert count == 5 : "DAILY: Expected 5 transactions, got " + count;
    }

    @Test
    void intervalType_DAILY_generate_skips_existing_dates() throws Exception {
        String fixedId = createFixedWithInterval(
                "日次費用", "EXPENSE", expCatId, 100, 1,
                "2026-04-01", "2026-04-05", "DAILY");

        // 5日分が既存。再generateでskipped=5, generated=0
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions/" + fixedId + "/generate")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.generatedCount").value(0))
                .andExpect(jsonPath("$.data.skippedCount").value(5));
    }

    // =========================================================================
    // interval_type: WEEKLY
    // =========================================================================

    @Test
    void intervalType_WEEKLY_generates_every_7_days() throws Exception {
        // 2026-04-01(水) から7日ごと: 04-01, 04-08, 04-15, 04-22, 04-29 → 5回
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReqWithInterval(
                                "週次費用", "EXPENSE", expCatId, 500, 1,
                                "2026-04-01", "2026-04-30", "WEEKLY"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.intervalType").value("WEEKLY"));

        int count = transactionRepository.findAll().size();
        assert count == 5 : "WEEKLY: Expected 5 transactions, got " + count;
    }

    // =========================================================================
    // interval_type: BIWEEKLY
    // =========================================================================

    @Test
    void intervalType_BIWEEKLY_generates_every_14_days() throws Exception {
        // 2026-04-01 から14日ごと: 04-01, 04-15, 04-29 → 3回
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReqWithInterval(
                                "隔週費用", "EXPENSE", expCatId, 1000, 1,
                                "2026-04-01", "2026-04-30", "BIWEEKLY"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.intervalType").value("BIWEEKLY"));

        int count = transactionRepository.findAll().size();
        assert count == 3 : "BIWEEKLY: Expected 3 transactions, got " + count;
    }

    // =========================================================================
    // interval_type: BIMONTHLY
    // =========================================================================

    @Test
    void intervalType_BIMONTHLY_generates_every_2_months() throws Exception {
        // 2026-01〜2026-06 (6ヶ月): 2ヶ月ごとなので 01, 03, 05 → 3回
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReqWithInterval(
                                "隔月費用", "EXPENSE", expCatId, 3000, 15,
                                "2026-01-01", "2026-06-30", "BIMONTHLY"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.intervalType").value("BIMONTHLY"));

        int count = transactionRepository.findAll().size();
        assert count == 3 : "BIMONTHLY: Expected 3 transactions, got " + count;
    }

    // =========================================================================
    // interval_type: QUARTERLY
    // =========================================================================

    @Test
    void intervalType_QUARTERLY_generates_every_3_months() throws Exception {
        // 2026-01〜2026-12 (12ヶ月): 3ヶ月ごとなので 01, 04, 07, 10 → 4回
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReqWithInterval(
                                "四半期費用", "EXPENSE", expCatId, 10000, 1,
                                "2026-01-01", "2026-12-31", "QUARTERLY"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.intervalType").value("QUARTERLY"));

        int count = transactionRepository.findAll().size();
        assert count == 4 : "QUARTERLY: Expected 4 transactions, got " + count;
    }

    // =========================================================================
    // interval_type: SEMIANNUAL
    // =========================================================================

    @Test
    void intervalType_SEMIANNUAL_generates_every_6_months() throws Exception {
        // 2026-01〜2026-12 (12ヶ月): 6ヶ月ごとなので 01, 07 → 2回
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReqWithInterval(
                                "半年費用", "EXPENSE", expCatId, 50000, 1,
                                "2026-01-01", "2026-12-31", "SEMIANNUAL"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.intervalType").value("SEMIANNUAL"));

        int count = transactionRepository.findAll().size();
        assert count == 2 : "SEMIANNUAL: Expected 2 transactions, got " + count;
    }

    // =========================================================================
    // interval_type: ANNUAL
    // =========================================================================

    @Test
    void intervalType_ANNUAL_generates_once_per_year() throws Exception {
        // 2026-01〜2028-12 (3年): 12ヶ月ごとなので 2026-01, 2027-01, 2028-01 → 3回
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReqWithInterval(
                                "年次費用", "EXPENSE", expCatId, 120000, 1,
                                "2026-01-01", "2028-12-31", "ANNUAL"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.intervalType").value("ANNUAL"));

        int count = transactionRepository.findAll().size();
        assert count == 3 : "ANNUAL: Expected 3 transactions, got " + count;
    }

    // =========================================================================
    // 後方互換性: intervalType なし → MONTHLY
    // =========================================================================

    @Test
    void createFixedTransaction_no_intervalType_defaults_to_MONTHLY() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(
                                "家賃", "EXPENSE", expCatId, 80000, 1,
                                "2026-01-01", "2026-03-31"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.intervalType").value("MONTHLY"));

        int count = transactionRepository.findAll().size();
        assert count == 3 : "Default MONTHLY: Expected 3 transactions, got " + count;
    }

    // =========================================================================
    // 更新時に intervalType を変更できる
    // =========================================================================

    @Test
    void updateFixedTransaction_can_change_intervalType() throws Exception {
        // MONTHLY で登録: 2026-01〜2026-03 の 3ヶ月分
        String fixedId = createFixed("家賃", "EXPENSE", expCatId, 80000, 1, "2026-01-01", "2026-03-31");
        assert transactionRepository.findAll().size() == 3;

        // QUARTERLY に変更: 2026-01〜2026-12 → 4回に変わる
        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions/" + fixedId)
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReqWithInterval(
                                "家賃", "EXPENSE", expCatId, 80000, 1,
                                "2026-01-01", "2026-12-31", "QUARTERLY"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.intervalType").value("QUARTERLY"));

        int count = transactionRepository.findAll().size();
        assert count == 4 : "After changing to QUARTERLY: Expected 4 transactions, got " + count;
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private Map<String, Object> fixedReq(String name, String type, String catId,
                                          int amount, int day, String start, String end) {
        return fixedReq(name, type, catId, amount, day, start, end, null);
    }

    private Map<String, Object> fixedReq(String name, String type, String catId,
                                          int amount, int day, String start, String end, String memo) {
        Map<String, Object> m = new HashMap<>();
        m.put("fixedName", name);
        m.put("transactionType", type);
        m.put("categoryId", catId);
        m.put("amount", amount);
        m.put("dayOfMonth", day);
        m.put("startDate", start);
        if (end != null) m.put("endDate", end);
        if (memo != null) m.put("memo", memo);
        return m;
    }

    private Map<String, Object> fixedReqWithInterval(String name, String type, String catId,
                                                      int amount, int day,
                                                      String start, String end, String intervalType) {
        Map<String, Object> m = fixedReq(name, type, catId, amount, day, start, end);
        m.put("intervalType", intervalType);
        return m;
    }

    private String createFixed(String name, String type, String catId,
                                int amount, int day, String start, String end) throws Exception {
        var result = mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fixedReq(name, type, catId, amount, day, start, end))))
                .andExpect(status().isCreated())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        return objectMapper.readTree(body).get("data").get("fixedTransactionId").asText();
    }

    private String createFixedWithInterval(String name, String type, String catId,
                                            int amount, int day,
                                            String start, String end, String intervalType) throws Exception {
        var result = mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/fixed-transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                fixedReqWithInterval(name, type, catId, amount, day, start, end, intervalType))))
                .andExpect(status().isCreated())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        return objectMapper.readTree(body).get("data").get("fixedTransactionId").asText();
    }
}
