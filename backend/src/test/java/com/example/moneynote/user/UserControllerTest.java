package com.example.moneynote.user;

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

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SuppressWarnings("null")
class UserControllerTest {

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

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        createUser("user1", "user1@example.com", "Password1");
        createUser("user2", "user2@example.com", "Password2");
        token1 = jwtTokenProvider.generateAccessToken("user1");
        token2 = jwtTokenProvider.generateAccessToken("user2");
    }

    // =========================================================================
    // GET /api/v1/users/me
    // =========================================================================

    @Test
    void getProfile_success() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId", is("user1")))
                .andExpect(jsonPath("$.data.email", is("user1@example.com")));
    }

    @Test
    void getProfile_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // PUT /api/v1/users/me
    // =========================================================================

    @Test
    void updateProfile_success() throws Exception {
        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userName", "新しい名前",
                                "email", "new@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userName", is("新しい名前")))
                .andExpect(jsonPath("$.data.email", is("new@example.com")));
    }

    @Test
    void updateProfile_duplicateEmail_returns400() throws Exception {
        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userName", "名前",
                                "email", "user2@example.com"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", notNullValue()));
    }

    @Test
    void updateProfile_invalidEmail_returns400() throws Exception {
        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userName", "名前",
                                "email", "not-an-email"))))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // PUT /api/v1/users/me/password
    // =========================================================================

    @Test
    void changePassword_success() throws Exception {
        mockMvc.perform(put("/api/v1/users/me/password")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "Password1",
                                "newPassword", "NewPass99"))))
                .andExpect(status().isOk());
    }

    @Test
    void changePassword_wrongCurrentPassword_returns401() throws Exception {
        mockMvc.perform(put("/api/v1/users/me/password")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "WrongPassword",
                                "newPassword", "NewPass99"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void changePassword_samePassword_returns400() throws Exception {
        mockMvc.perform(put("/api/v1/users/me/password")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "Password1",
                                "newPassword", "Password1"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void changePassword_tooShort_returns400() throws Exception {
        mockMvc.perform(put("/api/v1/users/me/password")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "Password1",
                                "newPassword", "abc"))))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // PUT /api/v1/users/me/theme
    // =========================================================================

    @Test
    void updateTheme_success() throws Exception {
        mockMvc.perform(put("/api/v1/users/me/theme")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "themeColor", "#3B82F6"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.themeColor", is("#3B82F6")));
    }

    // =========================================================================
    // DELETE /api/v1/users/me
    // =========================================================================

    @Test
    void deleteAccount_success() throws Exception {
        mockMvc.perform(delete("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk());

        // 削除後は user1 が存在しないこと
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteAccount_unauthenticated_returns401() throws Exception {
        mockMvc.perform(delete("/api/v1/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteAccount_cascadesRelatedData() throws Exception {
        // register 経由でデフォルト帳簿＋カテゴリを作成する
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userId", "user3",
                                "userName", "テストユーザー3",
                                "email", "user3@example.com",
                                "password", "Password3"))))
                .andExpect(status().isCreated());
        String token3 = jwtTokenProvider.generateAccessToken("user3");

        // 帳簿IDとカテゴリIDを取得する
        String ledgerBody = mockMvc.perform(get("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token3))
                .andReturn().getResponse().getContentAsString();
        String ledgerId = objectMapper.readTree(ledgerBody).at("/data/0/ledgerId").asText();

        String catBody = mockMvc.perform(get("/api/v1/ledgers/" + ledgerId + "/categories")
                        .header("Authorization", "Bearer " + token3))
                .andReturn().getResponse().getContentAsString();
        String categoryId = objectMapper.readTree(catBody).at("/data/0/categoryId").asText();

        // 明細を1件挿入する
        jdbcTemplate.update(
                "INSERT INTO transactions(transaction_id, ledger_id, category_id, transaction_type, amount, transaction_date, is_fixed_origin, created_at, updated_at) " +
                "VALUES (?, ?, ?, 'EXPENSE', 1000, '2026-04-01', false, NOW(), NOW())",
                "txn_account_cascade", ledgerId, categoryId);

        // アカウント削除
        mockMvc.perform(delete("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token3))
                .andExpect(status().isOk());

        // ユーザーが消えていること
        org.junit.jupiter.api.Assertions.assertFalse(
                userRepository.existsById("user3"), "user3 が削除されていない");

        // 帳簿が消えていること
        int ledgerCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledgers WHERE ledger_id = ?", Integer.class, ledgerId);
        org.junit.jupiter.api.Assertions.assertEquals(0, ledgerCount, "帳簿が削除されていない");

        // 明細が消えていること
        int txCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM transactions WHERE ledger_id = ?", Integer.class, ledgerId);
        org.junit.jupiter.api.Assertions.assertEquals(0, txCount, "明細が削除されていない");

        // カテゴリが消えていること
        int catCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM categories WHERE ledger_id = ?", Integer.class, ledgerId);
        org.junit.jupiter.api.Assertions.assertEquals(0, catCount, "カテゴリが削除されていない");
    }

    @Test
    void deleteAccount_doesNotAffectOtherUser() throws Exception {
        // user1 を削除しても user2 のプロフィールは取得できること
        mockMvc.perform(delete("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId", is("user2")));
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private void createUser(String userId, String email, String password) {
        userRepository.save(User.builder()
                .userId(userId)
                .userName("テストユーザー")
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .build());
    }
}
