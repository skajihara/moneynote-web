package com.example.moneynote.ledger;

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
class LedgerControllerTest {

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

    /** user1 のアクセストークン */
    private String token1;
    /** user2 のアクセストークン（別ユーザー・アクセス制御テスト用） */
    private String token2;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        createUser("user1", "user1@example.com");
        createUser("user2", "user2@example.com");
        token1 = jwtTokenProvider.generateAccessToken("user1");
        token2 = jwtTokenProvider.generateAccessToken("user2");
    }

    // =========================================================================
    // GET /api/v1/ledgers
    // =========================================================================

    @Test
    void getLedgers_returnsList() throws Exception {
        // user1 の帳簿を2件作成する
        createLedger(token1, "家計簿A");
        createLedger(token1, "家計簿B");

        mockMvc.perform(get("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    void getLedgers_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // POST /api/v1/ledgers
    // =========================================================================

    @Test
    void createLedger_success() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ledgerName", "テスト家計簿")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.ledgerName").value("テスト家計簿"))
                .andExpect(jsonPath("$.data.ledgerId").isNotEmpty())
                .andExpect(jsonPath("$.data.ownerUserId").value("user1"));
    }

    @Test
    void createLedger_withAllFields_success() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "ledgerName", "詳細帳簿",
                                "initialBalance", 10000,
                                "startDayOfMonth", 25,
                                "startMonthOfYear", 4))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.initialBalance").value(10000))
                .andExpect(jsonPath("$.data.startDayOfMonth").value(25))
                .andExpect(jsonPath("$.data.startMonthOfYear").value(4));
    }

    @Test
    void createLedger_missingName_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createLedger_nameTooLong_returns400() throws Exception {
        String longName = "a".repeat(101);
        mockMvc.perform(post("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ledgerName", longName)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createLedger_invalidStartDay_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "ledgerName", "帳簿",
                                "startDayOfMonth", 29))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createLedger_noDefaultCategoriesCreated() throws Exception {
        // 案B: POST /api/v1/ledgers ではデフォルトカテゴリを生成しない
        // デフォルトカテゴリは register 時（AuthService）のみ生成する
        String responseBody = mockMvc.perform(post("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ledgerName", "カテゴリ確認帳簿")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String ledgerId = objectMapper.readTree(responseBody).at("/data/ledgerId").asText();

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId + "/categories")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                // 追加帳簿はカテゴリ 0 件
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    // =========================================================================
    // GET /api/v1/ledgers/{ledgerId}
    // =========================================================================

    @Test
    void getLedger_success() throws Exception {
        String ledgerId = createLedger(token1, "詳細テスト");

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ledgerId").value(ledgerId));
    }

    @Test
    void getLedger_otherUser_returns403() throws Exception {
        // user1 の帳簿に user2 がアクセス → 403
        String ledgerId = createLedger(token1, "user1 の帳簿");

        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId)
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("E403"));
    }

    @Test
    void getLedger_notFound_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/nonexistent-id")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("E404"));
    }

    // =========================================================================
    // PUT /api/v1/ledgers/{ledgerId}
    // =========================================================================

    @Test
    void updateLedger_success() throws Exception {
        String ledgerId = createLedger(token1, "更新前");

        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId)
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ledgerName", "更新後")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ledgerName").value("更新後"));
    }

    @Test
    void updateLedger_otherUser_returns403() throws Exception {
        String ledgerId = createLedger(token1, "user1 帳簿");

        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId)
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ledgerName", "不正更新")))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // DELETE /api/v1/ledgers/{ledgerId}
    // =========================================================================

    @Test
    void deleteLedger_success() throws Exception {
        String ledgerId = createLedger(token1, "削除対象");

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk());

        // 削除後は 404
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId)
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteLedger_otherUser_returns403() throws Exception {
        String ledgerId = createLedger(token1, "削除不可帳簿");

        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId)
                        .header("Authorization", "Bearer " + token2))
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

    /** 帳簿を作成して ledgerId を返す。 */
    private String createLedger(String token, String name) throws Exception {
        String responseBody = mockMvc.perform(post("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("ledgerName", name)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(responseBody).at("/data/ledgerId").asText();
    }

    private String json(String... kvPairs) throws Exception {
        Map<String, String> map = new java.util.LinkedHashMap<>();
        for (int i = 0; i < kvPairs.length; i += 2) {
            map.put(kvPairs[i], kvPairs[i + 1]);
        }
        return objectMapper.writeValueAsString(map);
    }
}
