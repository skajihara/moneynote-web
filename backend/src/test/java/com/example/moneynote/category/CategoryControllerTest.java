package com.example.moneynote.category;

import com.example.moneynote.common.security.JwtTokenProvider;
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

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
// IDE の null 型安全警告を抑制する（実行時は問題なし）
@SuppressWarnings("null")
class CategoryControllerTest {

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
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private String token1;
    private String token2;
    /** user1 の帳簿ID（register 時に生成されたデフォルト帳簿・カテゴリ12件あり） */
    private String ledgerId1;

    @BeforeEach
    void setUp() throws Exception {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        // register 経由で帳簿を作成する（AuthService がデフォルトカテゴリを生成するため）
        ledgerId1 = registerAndGetLedgerId("user1", "user1@example.com");
        createUser("user2", "user2@example.com");
        token1 = jwtTokenProvider.generateAccessToken("user1");
        token2 = jwtTokenProvider.generateAccessToken("user2");
    }

    // =========================================================================
    // GET /api/v1/ledgers/{ledgerId}/categories
    // =========================================================================

    @Test
    void getCategories_returnsDefaultCategories() throws Exception {
        // register 時に AuthService がデフォルトカテゴリ12件を生成する（支出9件＋収入3件）
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(12)));
    }

    @Test
    void getCategories_filterByType_expense() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token1)
                        .param("type", "EXPENSE"))
                .andExpect(status().isOk())
                // デフォルトの支出カテゴリは9件
                .andExpect(jsonPath("$.data", hasSize(9)));
    }

    @Test
    void getCategories_filterByType_income() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token1)
                        .param("type", "INCOME"))
                .andExpect(status().isOk())
                // デフォルトの収入カテゴリは3件
                .andExpect(jsonPath("$.data", hasSize(3)));
    }

    @Test
    void getCategories_otherUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("E403"));
    }

    // =========================================================================
    // POST /api/v1/ledgers/{ledgerId}/categories
    // =========================================================================

    @Test
    void createCategory_success() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryName", "趣味",
                                "categoryType", "EXPENSE"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.categoryName").value("趣味"))
                .andExpect(jsonPath("$.data.categoryType").value("EXPENSE"))
                .andExpect(jsonPath("$.data.categoryId").isNotEmpty());
    }

    @Test
    void createCategory_missingName_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryType", "EXPENSE"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createCategory_missingType_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryName", "趣味"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createCategory_nameTooLong_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryName", "a".repeat(51),
                                "categoryType", "EXPENSE"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createCategory_otherUser_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryName", "不正追加",
                                "categoryType", "EXPENSE"))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // PUT /api/v1/ledgers/{ledgerId}/categories/{categoryId}
    // =========================================================================

    @Test
    void updateCategory_success() throws Exception {
        String categoryId = createCategory(token1, ledgerId1, "旧名", "EXPENSE");

        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId1 + "/categories/" + categoryId)
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryName", "新名"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categoryName").value("新名"));
    }

    @Test
    void updateCategory_otherUser_returns403() throws Exception {
        String categoryId = createCategory(token1, ledgerId1, "カテゴリ", "EXPENSE");

        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId1 + "/categories/" + categoryId)
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryName", "不正更新"))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // DELETE /api/v1/ledgers/{ledgerId}/categories/{categoryId}
    // =========================================================================

    @Test
    void deleteCategory_success() throws Exception {
        String categoryId = createCategory(token1, ledgerId1, "削除対象", "EXPENSE");

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/categories/" + categoryId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk());

        // 削除後は一覧から消える
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId1 + "/categories")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(jsonPath("$.data[*].categoryId", not(hasItem(categoryId))));
    }

    @Test
    void deleteCategory_otherUser_returns403() throws Exception {
        String categoryId = createCategory(token1, ledgerId1, "削除不可", "EXPENSE");

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/categories/" + categoryId)
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteCategory_nullifiesTransactionCategoryId() throws Exception {
        String categoryId = createCategory(token1, ledgerId1, "削除後NULL化対象", "EXPENSE");

        // カテゴリを参照する明細を直接挿入する
        jdbcTemplate.update(
                "INSERT INTO transactions(transaction_id, ledger_id, category_id, transaction_type, amount, transaction_date, is_fixed_origin, created_at, updated_at) " +
                "VALUES (?, ?, ?, 'EXPENSE', 500, '2026-04-01', false, NOW(), NOW())",
                "txn_nullify_test", ledgerId1, categoryId);

        // カテゴリを削除する
        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId1 + "/categories/" + categoryId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk());

        // 明細の category_id が NULL になっていることを確認する
        String catIdInDb = jdbcTemplate.queryForObject(
                "SELECT category_id FROM transactions WHERE transaction_id = ?",
                String.class, "txn_nullify_test");
        org.junit.jupiter.api.Assertions.assertNull(catIdInDb, "カテゴリ削除後に明細のcategory_idがNULLになっていない");
    }

    // =========================================================================
    // PUT /api/v1/ledgers/{ledgerId}/categories/order
    // =========================================================================

    @Test
    void updateCategoryOrder_success() throws Exception {
        String catA = createCategory(token1, ledgerId1, "A", "EXPENSE");
        String catB = createCategory(token1, ledgerId1, "B", "EXPENSE");

        // 順序を入れ替える
        List<Map<String, Object>> orderItems = List.of(
                Map.of("categoryId", catA, "displayOrder", 10),
                Map.of("categoryId", catB, "displayOrder", 5));

        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId1 + "/categories/order")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderItems)))
                .andExpect(status().isOk());
    }

    @Test
    void updateCategoryOrder_otherUser_returns403() throws Exception {
        String catA = createCategory(token1, ledgerId1, "A", "EXPENSE");
        List<Map<String, Object>> orderItems = List.of(
                Map.of("categoryId", catA, "displayOrder", 0));

        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId1 + "/categories/order")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderItems)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private void createUser(String userId, String email) {
        userRepository.save(User.builder()
                .userId(userId)
                .userName("テストユーザー")
                .email(email)
                .passwordHash(passwordEncoder.encode("Password1"))
                .build());
    }

    /**
     * register API でユーザーを登録し、自動生成されたデフォルト帳簿の ID を返す。
     * AuthService がデフォルトカテゴリ12件を生成するため、カテゴリ確認テストで使用する。
     */
    private String registerAndGetLedgerId(String userId, String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userId", userId,
                                "userName", "テストユーザー",
                                "email", email,
                                "password", "Password1"))))
                .andExpect(status().isCreated());
        String token = jwtTokenProvider.generateAccessToken(userId);
        String body = mockMvc.perform(get("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).at("/data/0/ledgerId").asText();
    }

    private String createLedger(String token, String name) throws Exception {
        String body = mockMvc.perform(post("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("ledgerName", name))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).at("/data/ledgerId").asText();
    }

    private String createCategory(String token, String ledgerId,
                                   String name, String type) throws Exception {
        String body = mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryName", name,
                                "categoryType", type))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).at("/data/categoryId").asText();
    }
}
