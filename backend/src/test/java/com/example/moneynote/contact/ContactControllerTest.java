package com.example.moneynote.contact;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SuppressWarnings("null")
class ContactControllerTest {

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
    @Autowired StringRedisTemplate redisTemplate;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private String token;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        // Redis のレート制限キーをクリア
        for (String pattern : new String[]{"contact_rate:*"}) {
            var keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        }

        User user = User.builder()
                .userId("user1")
                .userName("テストユーザー")
                .email("user1@example.com")
                .passwordHash(passwordEncoder.encode("Password1!"))
                .build();
        userRepository.save(user);
        token = jwtTokenProvider.generateAccessToken("user1", "USER");
    }

    // =========================================================================
    // POST /api/v1/contact
    // =========================================================================

    @Test
    void sendContact_success() throws Exception {
        mockMvc.perform(post("/api/v1/contact")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "subject", "ログインできない",
                                "body", "詳細な内容をここに記述します"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void sendContact_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "subject", "件名",
                                "body", "本文"
                        ))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sendContact_emptySubject_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/contact")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "subject", "",
                                "body", "本文"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendContact_emptyBody_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/contact")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "subject", "件名",
                                "body", ""
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendContact_subjectTooLong_returns400() throws Exception {
        String longSubject = "a".repeat(101);
        mockMvc.perform(post("/api/v1/contact")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "subject", longSubject,
                                "body", "本文"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendContact_bodyTooLong_returns400() throws Exception {
        String longBody = "a".repeat(2001);
        mockMvc.perform(post("/api/v1/contact")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "subject", "件名",
                                "body", longBody
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendContact_rateLimitExceeded_returns429() throws Exception {
        // 5回送信して制限に達させる
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/contact")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "subject", "件名" + i,
                                    "body", "本文"
                            ))))
                    .andExpect(status().isOk());
        }
        // 6回目は 429
        mockMvc.perform(post("/api/v1/contact")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "subject", "6回目",
                                "body", "本文"
                        ))))
                .andExpect(status().isTooManyRequests());
    }
}
