package com.example.moneynote.auth;

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
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AuthControllerTest {

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
    @Autowired StringRedisTemplate redisTemplate;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        // FK 制約を CASCADE で全テーブルをリセット
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        // Redis のレート制限・リセットトークンをクリア
        for (String pattern : new String[]{"login:fail:*", "refresh:*", "password_reset:*", "password_reset_user:*", "pwd_reset:req:*", "account_deletion_cancel:*", "email_change:*", "email_change_user:*"}) {
            var keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        }
    }

    // =========================================================================
    // M-6: セキュリティレスポンスヘッダー
    // =========================================================================

    @Test
    void securityHeaders_presentOnAuthenticatedResponse() throws Exception {
        // M-6: 認証済みレスポンスにセキュリティヘッダーが含まれること
        createUser("header_user", "header@example.com");
        var loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "header_user", "password", "Password1!")))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andReturn();

        // アクセストークンを使った認証済みレスポンスでも同様に含まれること
        String accessToken = objectMapper
                .readTree(loginResult.getResponse().getContentAsString())
                .at("/data/accessToken").asText();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    @Test
    void securityHeaders_presentOnUnauthenticatedResponse() throws Exception {
        // M-6: 401 レスポンスにもセキュリティヘッダーが含まれること
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/v1/ledgers"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    // =========================================================================
    // POST /api/v1/auth/register
    // =========================================================================

    @Test
    void register_success() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "test_user1",
                                      "userName", "テストユーザー",
                                      "email", "test1@example.com",
                                      "password", "Password1!")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.error").doesNotExist());

        assertThat(userRepository.findById("test_user1")).isPresent();
    }

    @Test
    void register_duplicateUserId_returns400() throws Exception {
        createUser("dup_user", "dup@example.com");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "dup_user",
                                      "userName", "重複ユーザー",
                                      "email", "other@example.com",
                                      "password", "Password1!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void register_duplicateEmail_returns400() throws Exception {
        createUser("user_a", "shared@example.com");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "user_b",
                                      "userName", "別ユーザー",
                                      "email", "shared@example.com",
                                      "password", "Password1!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void register_invalidUserId_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "ab",                   // 2文字: 短すぎ
                                      "userName", "テスト",
                                      "email", "val@example.com",
                                      "password", "Password1!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void register_weakPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "valid_user",
                                      "userName", "テスト",
                                      "email", "weak@example.com",
                                      "password", "onlyletters")))    // 数字なし
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    // =========================================================================
    // POST /api/v1/auth/login
    // =========================================================================

    @Test
    void login_success() throws Exception {
        createUser("login_user", "login@example.com");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "login_user", "password", "Password1!")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(header().exists("Set-Cookie"));
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        createUser("auth_user", "auth@example.com");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "auth_user", "password", "WrongPass9")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("E401"));
    }

    @Test
    void login_nonexistentUser_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "ghost_user", "password", "Password1!")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("E401"));
    }

    @Test
    void login_lockoutAfter5Failures_returns429() throws Exception {
        createUser("lock_user", "lock@example.com");

        // 5回失敗させる
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json("userId", "lock_user", "password", "WrongPass9")));
        }

        // 6回目: ロックされて 429
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "lock_user", "password", "WrongPass9")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("E429"));
    }

    // =========================================================================
    // POST /api/v1/auth/refresh
    // =========================================================================

    @Test
    void refresh_success() throws Exception {
        createUser("refresh_user", "refresh@example.com");

        // ログインしてリフレッシュトークンを Cookie に取得
        var loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "refresh_user", "password", "Password1!")))
                .andExpect(status().isOk())
                .andReturn();

        String setCookieHeader = loginResult.getResponse().getHeader("Set-Cookie");
        assertThat(setCookieHeader).contains("refreshToken=");

        String refreshToken = extractCookieValue(setCookieHeader, "refreshToken");

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void refresh_withoutCookie_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("E401"));
    }

    @Test
    void refresh_withAccessToken_returns401() throws Exception {
        // C-1 補完: アクセストークン（type=ACCESS）をリフレッシュ Cookie として使用しても 401 になること
        createUser("access_as_refresh", "accessasrefresh@example.com");

        var loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "access_as_refresh", "password", "Password1!")))
                .andExpect(status().isOk())
                .andReturn();

        // レスポンスボディからアクセストークン（type=ACCESS）を取得
        String accessToken = objectMapper
                .readTree(loginResult.getResponse().getContentAsString())
                .at("/data/accessToken").asText();
        assertThat(accessToken).as("アクセストークンが取得できること").isNotBlank();

        // アクセストークンをリフレッシュトークン Cookie として送信 → type=REFRESH でないため 401
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", accessToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("E401"));
    }

    // =========================================================================
    // POST /api/v1/auth/logout
    // =========================================================================

    @Test
    void logout_success() throws Exception {
        createUser("logout_user", "logout@example.com");

        // ログイン
        var loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "logout_user", "password", "Password1!")))
                .andReturn();

        String accessToken = objectMapper
                .readTree(loginResult.getResponse().getContentAsString())
                .at("/data/accessToken").asText();

        // ログアウト（認証ヘッダー付き）
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // ログアウト後のリフレッシュは失敗する
        String setCookieHeader = loginResult.getResponse().getHeader("Set-Cookie");
        String refreshToken = extractCookieValue(setCookieHeader, "refreshToken");

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", refreshToken)))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // POST /api/v1/auth/password-reset/request & confirm
    // =========================================================================

    @Test
    void passwordReset_fullFlow() throws Exception {
        createUser("reset_user", "reset@example.com");

        // リセット申請（メールが存在しなくても 200 を返す）
        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "reset@example.com")))
                .andExpect(status().isOk());

        // Redis からトークンを取得して確認（テスト専用）
        var keys = redisTemplate.keys("password_reset:*");
        assertThat(keys).isNotNull().isNotEmpty();
        String resetToken = keys.iterator().next().replace("password_reset:", "");

        // C-3: パスワードリセットに新ポリシー準拠パスワードを使用
        mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("token", resetToken, "newPassword", "NewPass1!")))
                .andExpect(status().isOk());

        // 新しいパスワードでログインできる
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "reset_user", "password", "NewPass1!")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());

        // 確認完了後に逆引きキーも削除されていること
        assertThat(redisTemplate.opsForValue().get("password_reset_user:reset_user")).isNull();
    }

    @Test
    void passwordReset_nonexistentEmail_returns200() throws Exception {
        // ユーザー列挙攻撃対策: 存在しないメールアドレスでも 200 を返す
        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "nobody@example.com")))
                .andExpect(status().isOk());
    }

    @Test
    void passwordReset_invalidToken_returns404() throws Exception {
        // C-3: ポリシー準拠パスワードで無効トークンをテスト
        mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("token", "invalid-token-xyz", "newPassword", "NewPass1!")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("E404"));
    }

    @Test
    void passwordReset_weakPassword_returns400() throws Exception {
        // C-3: パスワードリセット経由でも弱いパスワード ("password") を拒否すること
        createUser("reset_weak", "resetweak@example.com");

        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "resetweak@example.com")))
                .andExpect(status().isOk());

        var keys = redisTemplate.keys("password_reset:*");
        assertThat(keys).isNotNull().isNotEmpty();
        String resetToken = keys.iterator().next().replace("password_reset:", "");

        // "password" は大文字・数字・記号なし → ポリシー違反 → 400
        mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("token", resetToken, "newPassword", "password")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void passwordReset_secondRequestInvalidatesFirstToken() throws Exception {
        // 再申請時に1回目のトークンが無効化されること
        createUser("reissue_user", "reissue@example.com");

        // 1回目の申請
        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "reissue@example.com")))
                .andExpect(status().isOk());

        var keys1 = redisTemplate.keys("password_reset:*");
        assertThat(keys1).isNotNull().hasSize(1);
        String firstToken = keys1.iterator().next().replace("password_reset:", "");

        // 2回目の申請（1回目のトークンが無効化される）
        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "reissue@example.com")))
                .andExpect(status().isOk());

        // 1回目のトークンは Redis から削除されていること
        assertThat(redisTemplate.opsForValue().get("password_reset:" + firstToken))
                .as("1回目のトークンが無効化されていること").isNull();

        // 2回目のトークンのみ有効であること
        var keys2 = redisTemplate.keys("password_reset:*");
        assertThat(keys2).isNotNull().hasSize(1);
        String secondToken = keys2.iterator().next().replace("password_reset:", "");
        assertThat(secondToken).isNotEqualTo(firstToken);

        // 2回目のトークンでリセットできること
        mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("token", secondToken, "newPassword", "NewPass1!")))
                .andExpect(status().isOk());
    }

    @Test
    void passwordReset_rateLimitedAfter5Requests_returns429() throws Exception {
        // ユーザー単位で 1 時間 5 回の制限。存在しないメールではカウントされないため実ユーザーで確認する
        createUser("rate_limit_user", "ratelimit@example.com");

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/password-reset/request")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json("email", "ratelimit@example.com")))
                    .andExpect(status().isOk());
        }

        // 6回目: 429 + Retry-After
        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "ratelimit@example.com")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("E429"))
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    void refreshToken_cannotAuthenticateApiEndpoint_returns401() throws Exception {
        // C-1: ログインして取得したリフレッシュトークンを Bearer として使っても 401 になること
        createUser("token_type_user", "tokentype@example.com");

        // 実際にログインして Cookie からリフレッシュトークンを取得する
        var loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "token_type_user", "password", "Password1!")))
                .andExpect(status().isOk())
                .andReturn();

        String setCookieHeader = loginResult.getResponse().getHeader("Set-Cookie");
        String refreshToken = extractCookieValue(setCookieHeader, "refreshToken");
        assertThat(refreshToken).as("リフレッシュトークンが Cookie に含まれること").isNotBlank();

        // リフレッシュトークン（type=REFRESH）を Authorization: Bearer として使用 → 401
        // JwtAuthenticationFilter が type=ACCESS のみ通過させるため
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + refreshToken))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // PUT /api/v1/users/me + POST /api/v1/auth/email-change/confirm
    // =========================================================================

    @Test
    void emailChange_fullFlow() throws Exception {
        createUser("ec_user", "original@example.com");
        String token = jwtTokenProvider.generateAccessToken("ec_user", "USER");

        // メールアドレス変更申請: email は即時反映されない
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userName", "テストユーザー", "email", "changed@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email", org.hamcrest.Matchers.is("original@example.com")));

        // Redis からトークンを取得（email_change_user: を除外）
        var keys = redisTemplate.keys("email_change:*");
        assertThat(keys).isNotNull();
        String changeToken = keys.stream()
                .filter(k -> !k.startsWith("email_change_user:"))
                .findFirst().orElseThrow()
                .replace("email_change:", "");

        // 確認リンクをクリック
        mockMvc.perform(post("/api/v1/auth/email-change/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("token", changeToken)))
                .andExpect(status().isOk());

        // メールアドレスが更新されていること
        var updated = userRepository.findById("ec_user").orElseThrow();
        assertThat(updated.getEmail()).isEqualTo("changed@example.com");

        // 確認後に Redis キーが削除されていること
        assertThat(redisTemplate.opsForValue().get("email_change_user:ec_user")).isNull();
    }

    @Test
    void emailChange_invalidToken_returns404() throws Exception {
        mockMvc.perform(post("/api/v1/auth/email-change/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("token", "invalid-token-xyz")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("E404"));
    }

    @Test
    void emailChange_secondRequestInvalidatesFirst() throws Exception {
        createUser("ec_reissue", "ec_reissue@example.com");
        String token = jwtTokenProvider.generateAccessToken("ec_reissue", "USER");

        // 1回目の申請
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userName", "テストユーザー", "email", "first@example.com")))
                .andExpect(status().isOk());

        var keys1 = redisTemplate.keys("email_change:*");
        assertThat(keys1).isNotNull();
        String firstToken = keys1.stream()
                .filter(k -> !k.startsWith("email_change_user:"))
                .findFirst().orElseThrow()
                .replace("email_change:", "");

        // 2回目の申請（1回目のトークンが無効化される）
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userName", "テストユーザー", "email", "second@example.com")))
                .andExpect(status().isOk());

        // 1回目のトークンは無効化されていること
        assertThat(redisTemplate.opsForValue().get("email_change:" + firstToken))
                .as("1回目のトークンが無効化されていること").isNull();

        // 2回目のトークンのみ有効であること
        var keys2 = redisTemplate.keys("email_change:*");
        assertThat(keys2).isNotNull();
        String secondToken = keys2.stream()
                .filter(k -> !k.startsWith("email_change_user:"))
                .findFirst().orElseThrow()
                .replace("email_change:", "");
        assertThat(secondToken).isNotEqualTo(firstToken);

        // 2回目のトークンで変更確定できること
        mockMvc.perform(post("/api/v1/auth/email-change/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("token", secondToken)))
                .andExpect(status().isOk());

        assertThat(userRepository.findById("ec_reissue").orElseThrow().getEmail())
                .isEqualTo("second@example.com");
    }

    // =========================================================================
    // POST /api/v1/auth/account-deletion/cancel
    // =========================================================================

    @Test
    void accountDeletionCancel_success() throws Exception {
        createUser("cancel_user", "cancel@example.com");

        // 削除依頼: DELETE /api/v1/users/me
        String accessToken = jwtTokenProvider.generateAccessToken("cancel_user", "USER");
        mockMvc.perform(delete("/api/v1/users/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // is_active=false になっていること
        User u = userRepository.findById("cancel_user").orElseThrow();
        assertThat(u.isActive()).isFalse();

        // Redis からキャンセルトークンを取得する
        String cancelToken = null;
        var keys = redisTemplate.keys("account_deletion_cancel:*");
        assertThat(keys).as("キャンセルトークンが Redis に保存されていること").isNotEmpty();
        for (String key : keys) {
            String val = redisTemplate.opsForValue().get(key);
            if ("cancel_user".equals(val)) {
                cancelToken = key.replace("account_deletion_cancel:", "");
                break;
            }
        }
        assertThat(cancelToken).as("cancel_user のキャンセルトークンが見つかること").isNotBlank();

        // キャンセル
        mockMvc.perform(post("/api/v1/auth/account-deletion/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("token", cancelToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.nullValue()));

        // is_active=true に復元されること
        User restored = userRepository.findById("cancel_user").orElseThrow();
        assertThat(restored.isActive()).isTrue();

        // pending_deletion_users から削除されること
        int pendingCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pending_deletion_users WHERE user_id = ?", Integer.class, "cancel_user");
        assertThat(pendingCount).isEqualTo(0);
    }

    @Test
    void accountDeletionCancel_invalidToken_returns404() throws Exception {
        mockMvc.perform(post("/api/v1/auth/account-deletion/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("token", "invalid-token-xyz")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message").value("キャンセルリンクが無効または期限切れです"));
    }

    @Test
    void accountDeletionCancel_missingToken_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/account-deletion/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private void createUser(String userId, String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", userId,
                                      "userName", "テストユーザー",
                                      "email", email,
                                      "password", "Password1!")))
                .andExpect(status().isCreated());
    }

    private String json(String... kvPairs) throws Exception {
        Map<String, String> map = new java.util.LinkedHashMap<>();
        for (int i = 0; i < kvPairs.length; i += 2) {
            map.put(kvPairs[i], kvPairs[i + 1]);
        }
        return objectMapper.writeValueAsString(map);
    }

    private String extractCookieValue(String setCookieHeader, String cookieName) {
        if (setCookieHeader == null) return "";
        for (String part : setCookieHeader.split(";")) {
            part = part.trim();
            if (part.startsWith(cookieName + "=")) {
                return part.substring(cookieName.length() + 1);
            }
        }
        return "";
    }
}
