package com.example.moneynote.csv;

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
import org.springframework.mock.web.MockMultipartFile;
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
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SuppressWarnings("null")
class CsvControllerTest {

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
    private String expCategoryId;
    private String incCategoryId;

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
    // GET /export  エクスポート
    // =========================================================================

    @Test
    void export_empty_returnsBomAndHeaderOnly() throws Exception {
        byte[] body = mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/export")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")))
                .andExpect(header().string("Content-Disposition", containsString("attachment")))
                .andReturn().getResponse().getContentAsByteArray();

        // BOM チェック
        assertThat(body[0] & 0xFF).isEqualTo(0xEF);
        assertThat(body[1] & 0xFF).isEqualTo(0xBB);
        assertThat(body[2] & 0xFF).isEqualTo(0xBF);

        // BOM の後に CSV ヘッダー行がある
        String content = new String(body, 3, body.length - 3, StandardCharsets.UTF_8);
        assertThat(content).startsWith("transaction_id,ledger_id,transaction_date");
    }

    @Test
    void export_withTransactions_containsData() throws Exception {
        createTx("EXPENSE", 3000, "2026-04-10", expCategoryId, "昼食");
        createTx("INCOME", 50000, "2026-04-15", incCategoryId, null);

        byte[] body = mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/export")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        String content = new String(body, 3, body.length - 3, StandardCharsets.UTF_8);
        String[] lines = content.split("\r\n|\n");
        assertThat(lines).hasSizeGreaterThanOrEqualTo(3);
        assertThat(content).contains("EXPENSE");
        assertThat(content).contains("INCOME");
        assertThat(content).contains("昼食");
    }

    @Test
    void export_filterByDateRange_returnsFiltered() throws Exception {
        createTx("EXPENSE", 1000, "2026-03-31", expCategoryId, null);
        createTx("EXPENSE", 2000, "2026-04-10", expCategoryId, null);
        createTx("EXPENSE", 3000, "2026-05-01", expCategoryId, null);

        byte[] body = mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/export")
                        .header("Authorization", "Bearer " + token1)
                        .param("startDate", "2026-04-01")
                        .param("endDate", "2026-04-30"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        String content = new String(body, 3, body.length - 3, StandardCharsets.UTF_8);
        assertThat(content).contains("2026-04-10");
        assertThat(content).doesNotContain("2026-03-31");
        assertThat(content).doesNotContain("2026-05-01");
    }

    @Test
    void export_filterByCategoryIds_returnsFiltered() throws Exception {
        createTx("EXPENSE", 1000, "2026-04-10", expCategoryId, null);
        createTx("INCOME", 50000, "2026-04-15", incCategoryId, null);

        byte[] body = mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/export")
                        .header("Authorization", "Bearer " + token1)
                        .param("categoryIds", expCategoryId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        String content = new String(body, 3, body.length - 3, StandardCharsets.UTF_8);
        assertThat(content).contains("食費");
        assertThat(content).doesNotContain("給与");
    }

    @Test
    void export_includeFixed_false_excludesFixedOrigin() throws Exception {
        // 通常明細を1件追加
        createTx("EXPENSE", 1000, "2026-04-10", expCategoryId, null);

        // 固定費由来明細を直接DBに挿入
        String fixId = IdGenerator.fixedTransactionId();
        jdbcTemplate.execute(
                "INSERT INTO fixed_transactions (fixed_transaction_id, ledger_id, category_id, " +
                "fixed_name, transaction_type, amount, day_of_month, start_date, end_date) VALUES " +
                "('" + fixId + "', '" + ledgerId1 + "', '" + expCategoryId + "', " +
                "'家賃', 'EXPENSE', 80000, 1, '2026-01-01', '2030-12-31')");

        String fixedTxId = IdGenerator.transactionId();
        jdbcTemplate.execute(
                "INSERT INTO transactions (transaction_id, ledger_id, category_id, " +
                "fixed_transaction_id, transaction_type, amount, transaction_date, is_fixed_origin) VALUES " +
                "('" + fixedTxId + "', '" + ledgerId1 + "', '" + expCategoryId + "', " +
                "'" + fixId + "', 'EXPENSE', 80000, '2026-04-01', true)");

        // includeFixed=false でエクスポート
        byte[] body = mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/export")
                        .header("Authorization", "Bearer " + token1)
                        .param("includeFixed", "false"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        String content = new String(body, 3, body.length - 3, StandardCharsets.UTF_8);
        // 通常明細のみ（1件）
        String[] dataLines = content.split("\r\n|\n");
        // ヘッダー + 1データ行
        assertThat(dataLines).hasSizeGreaterThanOrEqualTo(2);
        assertThat(content).doesNotContain(fixedTxId);
    }

    @Test
    void export_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/transactions/export")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // POST /import  インポート
    // =========================================================================

    @Test
    void import_validCsv_importsSuccessfully() throws Exception {
        String csv = buildCsvWithBom(
                csvRow("食費", "EXPENSE", "2026-04-10", "3000", "昼食"),
                csvRow("給与", "INCOME", "2026-04-15", "50000", "")
        );

        MockMultipartFile file = new MockMultipartFile(
                "file", "test.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/v1/ledgers/" + ledgerId1 + "/transactions/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importedCount").value(2))
                .andExpect(jsonPath("$.data.skippedCount").value(0))
                .andExpect(jsonPath("$.data.newCategoriesCreated").isEmpty())
                .andExpect(jsonPath("$.data.errorRows").isEmpty());

        assertThat(transactionRepository.findByLedgerLedgerIdOrderByTransactionDateDesc(ledgerId1))
                .hasSize(2);
    }

    @Test
    void import_exportThenReimport_roundtrip() throws Exception {
        createTx("EXPENSE", 5000, "2026-04-10", expCategoryId, "テスト");

        byte[] exportedBytes = mockMvc.perform(
                        get("/api/v1/ledgers/" + ledgerId1 + "/transactions/export")
                                .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        MockMultipartFile file = new MockMultipartFile(
                "file", "roundtrip.csv", "text/csv", exportedBytes);

        mockMvc.perform(multipart("/api/v1/ledgers/" + ledgerId1 + "/transactions/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importedCount").value(1))
                .andExpect(jsonPath("$.data.skippedCount").value(0))
                .andExpect(jsonPath("$.data.newCategoriesCreated").isEmpty());

        // 元の1件 + インポートで1件 = 合計2件
        assertThat(transactionRepository.findByLedgerLedgerIdOrderByTransactionDateDesc(ledgerId1))
                .hasSize(2);
    }

    @Test
    void import_badHeaders_returns400() throws Exception {
        String csv = "wrong_col1,wrong_col2\nvalue1,value2\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "bad.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/v1/ledgers/" + ledgerId1 + "/transactions/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void import_badRows_returnsErrorRows() throws Exception {
        String csv = buildCsvWithBom(
                csvRow("食費", "EXPENSE", "not-a-date", "1000", ""),  // 不正日付
                csvRow("食費", "EXPENSE", "2026-04-10", "0", ""),     // amount=0
                csvRow("食費", "EXPENSE", "2026-04-10", "1000", "")   // 正常行
        );

        MockMultipartFile file = new MockMultipartFile(
                "file", "bad_rows.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/v1/ledgers/" + ledgerId1 + "/transactions/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importedCount").value(1))
                .andExpect(jsonPath("$.data.skippedCount").value(2))
                .andExpect(jsonPath("$.data.errorRows", hasSize(2)));
    }

    @Test
    void import_newCategoryName_autoCreatesCategory() throws Exception {
        // 帳簿に存在しないカテゴリ名でインポート → 自動作成される
        String csv = buildCsvWithBom(
                csvRow("交通費", "EXPENSE", "2026-04-10", "500", "電車代"),
                csvRow("副業", "INCOME", "2026-04-15", "30000", "")
        );

        MockMultipartFile file = new MockMultipartFile(
                "file", "new_cat.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/v1/ledgers/" + ledgerId1 + "/transactions/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importedCount").value(2))
                .andExpect(jsonPath("$.data.skippedCount").value(0))
                .andExpect(jsonPath("$.data.newCategoriesCreated", hasSize(2)))
                .andExpect(jsonPath("$.data.newCategoriesCreated", hasItem("交通費")))
                .andExpect(jsonPath("$.data.newCategoriesCreated", hasItem("副業")));

        // カテゴリが新規作成されていること
        assertThat(categoryRepository
                .findByLedgerLedgerIdAndCategoryNameAndCategoryTypeAndIsActiveTrue(
                        ledgerId1, "交通費", CategoryType.EXPENSE))
                .isPresent();
        assertThat(categoryRepository
                .findByLedgerLedgerIdAndCategoryNameAndCategoryTypeAndIsActiveTrue(
                        ledgerId1, "副業", CategoryType.INCOME))
                .isPresent();
    }

    @Test
    void import_sameCategoryImportedTwice_createsOnlyOnce() throws Exception {
        // 同じカテゴリ名が2行あっても1回だけ作成される
        String csv = buildCsvWithBom(
                csvRow("交通費", "EXPENSE", "2026-04-10", "500", ""),
                csvRow("交通費", "EXPENSE", "2026-04-11", "300", "")
        );

        MockMultipartFile file = new MockMultipartFile(
                "file", "dup_cat.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/v1/ledgers/" + ledgerId1 + "/transactions/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importedCount").value(2))
                .andExpect(jsonPath("$.data.newCategoriesCreated", hasSize(1)));
    }

    @Test
    void import_invalidCategoryType_skipsRow() throws Exception {
        // category_type が不正な行
        String csv = buildCsvWithBom(
                csvRow("食費", "EXPENSE", "2026-04-10", "1000", "")
        );
        // category_type を壊す
        String broken = csv.replace("EXPENSE,食費", "BADTYPE,食費");

        MockMultipartFile file = new MockMultipartFile(
                "file", "bad_cat.csv", "text/csv", broken.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/v1/ledgers/" + ledgerId1 + "/transactions/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importedCount").value(0))
                .andExpect(jsonPath("$.data.skippedCount").value(1))
                .andExpect(jsonPath("$.data.errorRows", hasSize(1)));
    }

    @Test
    void import_otherUser_returns403() throws Exception {
        String csv = buildCsvWithBom(
                csvRow("食費", "EXPENSE", "2026-04-10", "1000", "")
        );
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/v1/ledgers/" + ledgerId1 + "/transactions/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private void createTx(String type, int amount, String date, String categoryId, String memo)
            throws Exception {
        var params = new java.util.HashMap<String, Object>();
        params.put("transactionType", type);
        params.put("amount", amount);
        params.put("transactionDate", date);
        params.put("categoryId", categoryId);
        if (memo != null) params.put("memo", memo);

        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/transactions")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(params)))
                .andExpect(status().isCreated());
    }

    /** CSV の1行分のデータを組み立てる（category_name+type でマッチング） */
    private String csvRow(String categoryName, String txType,
                           String date, String amount, String memo) {
        // transaction_id, ledger_id, transaction_date, transaction_type,
        // amount, category_id, category_type, category_name, memo, is_fixed_origin,
        // fixed_transaction_id, created_at
        String catType = txType.equals("EXPENSE") ? "EXPENSE" : "INCOME";
        return String.join(",",
                "txn_dummy001",
                ledgerId1,
                date,
                txType,
                amount,
                "",            // category_id (インポート時は無視)
                catType,
                categoryName,
                memo,
                "false",
                "",
                "2026-04-10T00:00:00"
        );
    }

    private String buildCsvWithBom(String... dataRows) {
        String header = String.join(",",
                "transaction_id", "ledger_id", "transaction_date", "transaction_type",
                "amount", "category_id", "category_type", "category_name",
                "memo", "is_fixed_origin", "fixed_transaction_id", "created_at");
        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        sb.append(header).append("\n");
        for (String row : dataRows) {
            sb.append(row).append("\n");
        }
        return sb.toString();
    }
}
