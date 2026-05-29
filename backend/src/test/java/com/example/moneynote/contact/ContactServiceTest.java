package com.example.moneynote.contact;

import com.example.moneynote.common.exception.RateLimitException;
import com.example.moneynote.domain.contact.ContactService;
import com.example.moneynote.domain.contact.dto.ContactRequest;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import org.springframework.mail.MailSendException;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class ContactServiceTest {

    @Mock JavaMailSender mailSender;
    @Mock StringRedisTemplate redisTemplate;
    @Mock ValueOperations<String, String> valueOps;
    @Mock UserRepository userRepository;
    @InjectMocks ContactService contactService;

    private User testUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(contactService, "adminAddress", "admin@example.com");
        ReflectionTestUtils.setField(contactService, "fromAddress", "noreply@localhost");
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        testUser = User.builder()
                .userId("user1")
                .userName("テストユーザー")
                .email("user1@example.com")
                .passwordHash("hash")
                .build();
        // レート制限テストでは userRepository が呼ばれないため lenient() を使用する
        lenient().when(userRepository.findById("user1")).thenReturn(Optional.of(testUser));
    }

    private ContactRequest makeRequest(String subject, String body) {
        ContactRequest req = new ContactRequest();
        ReflectionTestUtils.setField(req, "subject", subject);
        ReflectionTestUtils.setField(req, "body", body);
        return req;
    }

    @Test
    void sendContact_success_sendsMailWithCorrectFields() {
        when(valueOps.increment("contact_rate:user1")).thenReturn(1L);

        ContactRequest req = makeRequest("ログインできない", "詳細な内容です");
        contactService.sendContact("user1", req);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(2)).send(captor.capture());
        List<SimpleMailMessage> allMessages = captor.getAllValues();

        SimpleMailMessage adminMail = allMessages.get(0);
        assertThat(adminMail.getTo()).containsExactly("admin@example.com");
        assertThat(adminMail.getSubject()).isEqualTo("【MoneyNote お問い合わせ】ログインできない");
        assertThat(adminMail.getReplyTo()).isEqualTo("user1@example.com");
        assertThat(adminMail.getText()).contains("user1");
        assertThat(adminMail.getText()).contains("テストユーザー");
        assertThat(adminMail.getText()).contains("詳細な内容です");
    }

    @Test
    void sendContact_success_sendsAutoReplyToUser() {
        when(valueOps.increment("contact_rate:user1")).thenReturn(1L);

        contactService.sendContact("user1", makeRequest("ログインできない", "詳細な内容です"));

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(2)).send(captor.capture());
        SimpleMailMessage autoReply = captor.getAllValues().get(1);

        assertThat(autoReply.getTo()).containsExactly("user1@example.com");
        assertThat(autoReply.getSubject()).isEqualTo("【MoneyNote】お問い合わせを受け付けました");
        assertThat(autoReply.getText()).contains("テストユーザー");
        assertThat(autoReply.getText()).contains("ログインできない");
        assertThat(autoReply.getText()).contains("詳細な内容です");
    }

    @Test
    void sendContact_autoReplyFailure_doesNotPreventAdminMail() {
        when(valueOps.increment("contact_rate:user1")).thenReturn(1L);
        doNothing()
                .doThrow(new MailSendException("SES failure"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        assertThatNoException().isThrownBy(
                () -> contactService.sendContact("user1", makeRequest("件名", "本文")));
        verify(mailSender, times(2)).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendContact_firstRequest_setsExpiry() {
        when(valueOps.increment("contact_rate:user1")).thenReturn(1L);

        contactService.sendContact("user1", makeRequest("件名", "本文"));

        verify(redisTemplate).expire(eq("contact_rate:user1"), eq(Duration.ofHours(1)));
    }

    @Test
    void sendContact_subsequentRequest_doesNotResetExpiry() {
        when(valueOps.increment("contact_rate:user1")).thenReturn(3L);

        contactService.sendContact("user1", makeRequest("件名", "本文"));

        verify(redisTemplate, never()).expire(any(), anyLong(), any());
    }

    @Test
    void sendContact_fifthRequest_succeeds() {
        when(valueOps.increment("contact_rate:user1")).thenReturn(5L);

        assertThatNoException().isThrownBy(
                () -> contactService.sendContact("user1", makeRequest("件名", "本文")));
        verify(mailSender, times(2)).send(any(SimpleMailMessage.class));
    }

    @Test
    void sendContact_sixthRequest_throwsRateLimitException() {
        when(valueOps.increment("contact_rate:user1")).thenReturn(6L);

        assertThatThrownBy(() -> contactService.sendContact("user1", makeRequest("件名", "本文")))
                .isInstanceOf(RateLimitException.class)
                .hasMessageContaining("上限");
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }
}
