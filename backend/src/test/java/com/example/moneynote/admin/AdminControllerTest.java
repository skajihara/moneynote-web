package com.example.moneynote.admin;

import com.example.moneynote.common.security.JwtTokenProvider;
import com.example.moneynote.domain.user.Role;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AdminControllerTest {

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

    private String adminToken;
    private String userToken;

    @BeforeEach
    @SuppressWarnings("null")
    void setUp() throws Exception {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");

        userRepository.save(User.builder()
                .userId("admin")
                .userName("管理者")
                .email("admin@example.com")
                .passwordHash(passwordEncoder.encode("Admin1234!"))
                .role(Role.SYSTEM_ADMIN)
                .isActive(true)
                .build());

        adminToken = loginAndGetToken("admin", "Admin1234!");

        registerUser("user1", "user1@example.com", "Password1!");
        userToken = loginAndGetToken("user1", "Password1!");
    }

    // =========================================================================
    // アクセス制御: 一般ユーザーは /api/v1/admin/** に 403
    // =========================================================================

    @Test
    void listUsers_asNormalUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void createUser_asNormalUser_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "new_user", "password", "Password1!", "role", "USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteUser_asNormalUser_returns403() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/users/user1")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpoint_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // GET /api/v1/admin/users
    // =========================================================================

    @Test
    void listUsers_asAdmin_returnsAllUsers() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].userId").value("admin"))
                .andExpect(jsonPath("$.data[0].role").value("SYSTEM_ADMIN"))
                .andExpect(jsonPath("$.data[0].isActive").value(true));
    }

    // =========================================================================
    // POST /api/v1/admin/users
    // =========================================================================

    @Test
    void createUser_success() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "new_user", "password", "Password1!", "role", "USER")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.userId").value("new_user"))
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.isActive").value(true));

        assertThat(userRepository.findById("new_user")).isPresent();
    }

    @Test
    void createUser_duplicateId_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "user1", "password", "Password1!", "role", "USER")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createUser_invalidRole_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "new_u2", "password", "Password1!", "role", "INVALID")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    @Test
    void createUser_weakPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "new_u3", "password", "weakpass", "role", "USER")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("E400"));
    }

    // =========================================================================
    // PUT /api/v1/admin/users/{userId}/role
    // =========================================================================

    @Test
    void changeRole_success() throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/user1/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("role", "SYSTEM_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("SYSTEM_ADMIN"));
    }

    @Test
    void changeRole_selfChange_returns403() throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/admin/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("role", "USER")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("E403"));
    }

    @Test
    void changeRole_nonexistentUser_returns404() throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/ghost/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("role", "USER")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("E404"));
    }

    // =========================================================================
    // PUT /api/v1/admin/users/{userId}/deactivate
    // =========================================================================

    @Test
    void deactivate_success() throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/user1/deactivate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));

        assertThat(userRepository.findById("user1").get().isActive()).isFalse();
    }

    @Test
    void deactivate_systemAdmin_returns403() throws Exception {
        // SYSTEM_ADMIN は無効化不可
        userRepository.save(userRepository.findById("user1").get().toBuilder()
                .role(Role.SYSTEM_ADMIN).build());

        mockMvc.perform(put("/api/v1/admin/users/user1/deactivate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("E403"));
    }

    @Test
    void deactivate_self_returns403() throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/admin/deactivate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void deactivate_nonexistentUser_returns404() throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/ghost/deactivate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // PUT /api/v1/admin/users/{userId}/activate
    // =========================================================================

    @Test
    void activate_success() throws Exception {
        // まず無効化
        mockMvc.perform(put("/api/v1/admin/users/user1/deactivate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // 有効化
        mockMvc.perform(put("/api/v1/admin/users/user1/activate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(true));

        assertThat(userRepository.findById("user1").get().isActive()).isTrue();
    }

    // =========================================================================
    // DELETE /api/v1/admin/users/{userId}
    // =========================================================================

    @Test
    void deleteUser_success() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/users/user1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(userRepository.findById("user1")).isEmpty();
    }

    @Test
    void deleteUser_systemAdmin_returns403() throws Exception {
        userRepository.save(userRepository.findById("user1").get().toBuilder()
                .role(Role.SYSTEM_ADMIN).build());

        mockMvc.perform(delete("/api/v1/admin/users/user1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("E403"));
    }

    @Test
    void deleteUser_self_returns403() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/users/admin")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteUser_nonexistentUser_returns404() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/users/ghost")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteUser_withPendingDeletion_succeeds() throws Exception {
        // user1 が退会予定に入っている場合も管理者が即時削除できること
        jdbcTemplate.update(
                "INSERT INTO pending_deletion_users(user_id, requested_at) VALUES (?, NOW())", "user1");

        mockMvc.perform(delete("/api/v1/admin/users/user1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(userRepository.findById("user1")).isEmpty();

        // pending_deletion_users からも削除されること
        int pendingCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pending_deletion_users WHERE user_id = ?", Integer.class, "user1");
        assertThat(pendingCount).isEqualTo(0);
    }

    @Test
    void deleteUser_withoutPendingDeletion_succeeds() throws Exception {
        // pending_deletion_users になくても正常に削除できること（既存フローの回帰確認）
        mockMvc.perform(delete("/api/v1/admin/users/user1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(userRepository.findById("user1")).isEmpty();
    }

    // =========================================================================
    // ログイン制御: is_active=false ユーザーは 403
    // =========================================================================

    @Test
    void login_inactiveUser_returns403() throws Exception {
        // user1 を無効化
        User user = userRepository.findById("user1").get();
        userRepository.save(user.toBuilder().isActive(false).build());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "user1", "password", "Password1!")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value("アカウントが無効化されています"));
    }

    @Test
    void login_activeUser_succeeds() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", "user1", "password", "Password1!")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private void registerUser(String userId, String email, String password) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", userId, "userName", userId,
                                "email", email, "password", password)))
                .andExpect(status().isCreated());
    }

    private String loginAndGetToken(String userId, String password) throws Exception {
        var result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("userId", userId, "password", password)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper
                .readTree(result.getResponse().getContentAsString())
                .at("/data/accessToken").asText();
    }

    private String json(String... kvPairs) throws Exception {
        Map<String, String> map = new java.util.LinkedHashMap<>();
        for (int i = 0; i < kvPairs.length; i += 2) {
            map.put(kvPairs[i], kvPairs[i + 1]);
        }
        return objectMapper.writeValueAsString(map);
    }
}
