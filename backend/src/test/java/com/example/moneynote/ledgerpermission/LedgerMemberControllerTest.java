package com.example.moneynote.ledgerpermission;

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

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SuppressWarnings("null")
class LedgerMemberControllerTest {

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

    /** owner ユーザーのトークン */
    private String ownerToken;
    /** ADMIN 権限メンバーのトークン */
    private String adminToken;
    /** EDITOR 権限メンバーのトークン */
    private String editorToken;
    /** VIEWER 権限メンバーのトークン */
    private String viewerToken;
    /** 帳簿に所属しないユーザーのトークン */
    private String outsiderToken;

    /** テスト用帳簿ID */
    private String ledgerId;

    @BeforeEach
    void setUp() throws Exception {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");

        // ユーザー作成
        createUser("owner1", "owner1@example.com");
        createUser("admin1", "admin1@example.com");
        createUser("editor1", "editor1@example.com");
        createUser("viewer1", "viewer1@example.com");
        createUser("outsider", "outsider@example.com");

        ownerToken   = jwtTokenProvider.generateAccessToken("owner1", "USER");
        adminToken   = jwtTokenProvider.generateAccessToken("admin1", "USER");
        editorToken  = jwtTokenProvider.generateAccessToken("editor1", "USER");
        viewerToken  = jwtTokenProvider.generateAccessToken("viewer1", "USER");
        outsiderToken = jwtTokenProvider.generateAccessToken("outsider", "USER");

        // owner1 が帳簿を作成する
        ledgerId = createLedger(ownerToken, "共有テスト帳簿");

        // メンバーを直接DB登録する
        insertPermission(ledgerId, "admin1",  "ADMIN");
        insertPermission(ledgerId, "editor1", "EDITOR");
        insertPermission(ledgerId, "viewer1", "VIEWER");
    }

    // =========================================================================
    // GET /api/v1/ledgers/{ledgerId}/members
    // =========================================================================

    @Test
    void getMembers_owner_returnsList() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                // オーナー + admin1 + editor1 + viewer1 = 4件
                .andExpect(jsonPath("$.data", hasSize(4)))
                .andExpect(jsonPath("$.data[0].permissionType").value("OWNER"))
                .andExpect(jsonPath("$.data[0].userId").value("owner1"));
    }

    @Test
    void getMembers_viewer_canRead() throws Exception {
        // VIEWER もメンバー一覧を閲覧可能
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(4)));
    }

    @Test
    void getMembers_outsider_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // POST /api/v1/ledgers/{ledgerId}/members
    // =========================================================================

    @Test
    void addMember_owner_success() throws Exception {
        createUser("newuser1", "newuser1@example.com");
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("userId", "newuser1", "permissionType", "EDITOR"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.userId").value("newuser1"))
                .andExpect(jsonPath("$.data.permissionType").value("EDITOR"));
    }

    @Test
    void addMember_admin_success() throws Exception {
        createUser("newuser2", "newuser2@example.com");
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("userId", "newuser2", "permissionType", "VIEWER"))))
                .andExpect(status().isCreated());
    }

    @Test
    void addMember_editor_returns403() throws Exception {
        // EDITOR は招待不可
        createUser("newuser3", "newuser3@example.com");
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("userId", "newuser3", "permissionType", "VIEWER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void addMember_viewer_returns403() throws Exception {
        createUser("newuser4", "newuser4@example.com");
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("userId", "newuser4", "permissionType", "VIEWER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void addMember_duplicateUser_returns409() throws Exception {
        // editor1 はすでにメンバー
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("userId", "editor1", "permissionType", "ADMIN"))))
                .andExpect(status().isConflict());
    }

    @Test
    void addMember_ownerPermission_returns400() throws Exception {
        createUser("newuser5", "newuser5@example.com");
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("userId", "newuser5", "permissionType", "OWNER"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addMember_outsider_returns403() throws Exception {
        createUser("newuser6", "newuser6@example.com");
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("userId", "newuser6", "permissionType", "VIEWER"))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // PUT /api/v1/ledgers/{ledgerId}/members/{userId}
    // =========================================================================

    @Test
    void updateMember_owner_success() throws Exception {
        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId + "/members/editor1")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("permissionType", "ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.permissionType").value("ADMIN"));
    }

    @Test
    void updateMember_admin_success() throws Exception {
        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId + "/members/viewer1")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("permissionType", "EDITOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.permissionType").value("EDITOR"));
    }

    @Test
    void updateMember_editor_returns403() throws Exception {
        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId + "/members/viewer1")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("permissionType", "EDITOR"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateMember_notFound_returns404() throws Exception {
        mockMvc.perform(put("/api/v1/ledgers/" + ledgerId + "/members/nonexistent")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("permissionType", "VIEWER"))))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // DELETE /api/v1/ledgers/{ledgerId}/members/{userId}
    // =========================================================================

    @Test
    void removeMember_owner_success() throws Exception {
        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId + "/members/viewer1")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk());

        // 削除後は3件（OWNER + admin1 + editor1）
        mockMvc.perform(get("/api/v1/ledgers/" + ledgerId + "/members")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(jsonPath("$.data", hasSize(3)));
    }

    @Test
    void removeMember_admin_success() throws Exception {
        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId + "/members/viewer1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void removeMember_editor_returns403() throws Exception {
        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId + "/members/viewer1")
                        .header("Authorization", "Bearer " + editorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void removeMember_owner_returns400() throws Exception {
        // OWNERは削除不可
        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId + "/members/owner1")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void removeMember_notFound_returns404() throws Exception {
        mockMvc.perform(delete("/api/v1/ledgers/" + ledgerId + "/members/nonexistent")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // 既存アクセス制御テスト: VIEWER は明細変更不可
    // =========================================================================

    @Test
    void createTransaction_viewer_returns403() throws Exception {
        // viewer1 が明細追加しようとすると 403
        // カテゴリが存在しないためカテゴリIDはダミーでよい（権限チェックが先に通る）
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/transactions")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "categoryId", "cat_dummy",
                                "amount", 1000,
                                "transactionDate", "2026-04-01"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void createTransaction_editor_succeeds_when_category_exists() throws Exception {
        // EDITOR は明細追加可能（カテゴリなしで 400 になるが 403 ではない）
        mockMvc.perform(post("/api/v1/ledgers/" + ledgerId + "/transactions")
                        .header("Authorization", "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "transactionType", "EXPENSE",
                                "categoryId", "cat_dummy",
                                "amount", 1000,
                                "transactionDate", "2026-04-01"))))
                // 403 ではなく 404 (カテゴリ未存在) または 400 になること
                .andExpect(result ->
                    org.junit.jupiter.api.Assertions.assertNotEquals(
                        403, result.getResponse().getStatus(),
                        "EDITORは明細作成で403になってはいけない"));
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

    private String createLedger(String token, String name) throws Exception {
        String body = mockMvc.perform(post("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("ledgerName", name))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).at("/data/ledgerId").asText();
    }

    private void insertPermission(String ledgerId, String userId, String permType) {
        jdbcTemplate.update(
                "INSERT INTO ledger_permissions(permission_id, ledger_id, user_id, permission_type, granted_at) "
                        + "VALUES (?, ?, ?, ?, NOW())",
                "lperm_" + userId, ledgerId, userId, permType);
    }
}
