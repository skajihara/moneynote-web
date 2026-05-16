package com.example.moneynote.user;

import com.example.moneynote.common.security.JwtTokenProvider;
import com.example.moneynote.domain.user.AccountDeletionBatchService;
import com.example.moneynote.domain.user.PendingDeletionUser;
import com.example.moneynote.domain.user.PendingDeletionUserRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SuppressWarnings("null")
class AccountDeletionBatchServiceTest {

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
    @Autowired PendingDeletionUserRepository pendingDeletionUserRepository;
    @Autowired AccountDeletionBatchService batchService;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired StringRedisTemplate redisTemplate;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        var keys = redisTemplate.keys("account_deletion_cancel:*");
        if (keys != null && !keys.isEmpty()) redisTemplate.delete(keys);
    }

    @Test
    void processDeletions_deletesUserAndRelatedData() throws Exception {
        // register でデフォルト帳簿・カテゴリを作成する
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userId", "batch_user",
                                "userName", "バッチテストユーザー",
                                "email", "batch@example.com",
                                "password", "Password1"))))
                .andExpect(status().isCreated());
        String token = jwtTokenProvider.generateAccessToken("batch_user", "USER");

        // 帳簿IDを取得する
        String ledgerBody = mockMvc.perform(get("/api/v1/ledgers")
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        String ledgerId = objectMapper.readTree(ledgerBody).at("/data/0/ledgerId").asText();

        // pending_deletion_users に手動で登録する（バッチ対象）
        pendingDeletionUserRepository.save(
                PendingDeletionUser.builder().userId("batch_user").build());
        // is_active=false にする（削除依頼済みを模倣）
        User user = userRepository.findById("batch_user").orElseThrow();
        user.setActive(false);
        userRepository.save(user);

        // バッチを手動実行する
        batchService.processDeletions();

        // users から物理削除されること
        assertThat(userRepository.existsById("batch_user")).isFalse();

        // pending_deletion_users から削除されること
        assertThat(pendingDeletionUserRepository.existsById("batch_user")).isFalse();

        // 帳簿・カテゴリがカスケード削除されること
        int ledgerCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledgers WHERE ledger_id = ?", Integer.class, ledgerId);
        assertThat(ledgerCount).isEqualTo(0);

        int catCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM categories WHERE ledger_id = ?", Integer.class, ledgerId);
        assertThat(catCount).isEqualTo(0);
    }

    @Test
    void processDeletions_emptyQueue_doesNothing() {
        // pending が0件の場合はエラーにならないこと
        batchService.processDeletions();
        assertThat(pendingDeletionUserRepository.count()).isEqualTo(0);
    }

    @Test
    void processDeletions_multipleUsers() throws Exception {
        // 複数ユーザーが pending に入っている場合
        for (int i = 1; i <= 3; i++) {
            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "userId", "multi_user" + i,
                                    "userName", "マルチユーザー" + i,
                                    "email", "multi" + i + "@example.com",
                                    "password", "Password1"))))
                    .andExpect(status().isCreated());
            pendingDeletionUserRepository.save(
                    PendingDeletionUser.builder().userId("multi_user" + i).build());
        }

        batchService.processDeletions();

        for (int i = 1; i <= 3; i++) {
            assertThat(userRepository.existsById("multi_user" + i))
                    .as("multi_user" + i + " が削除されていない").isFalse();
        }
        assertThat(pendingDeletionUserRepository.count()).isEqualTo(0);
    }
}
