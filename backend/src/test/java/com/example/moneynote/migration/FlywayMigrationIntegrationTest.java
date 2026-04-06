package com.example.moneynote.migration;

import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.domain.aiadvicecache.*;
import com.example.moneynote.domain.budget.Budget;
import com.example.moneynote.domain.budget.BudgetRepository;
import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.category.CategoryType;
import com.example.moneynote.domain.fixedtransaction.FixedTransaction;
import com.example.moneynote.domain.fixedtransaction.FixedTransactionRepository;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.ledger.LedgerRepository;
import com.example.moneynote.domain.ledgerpermission.LedgerPermission;
import com.example.moneynote.domain.ledgerpermission.LedgerPermissionRepository;
import com.example.moneynote.domain.ledgerpermission.PermissionType;
import com.example.moneynote.domain.transaction.Transaction;
import com.example.moneynote.domain.transaction.TransactionRepository;
import com.example.moneynote.domain.transaction.TransactionType;
import com.example.moneynote.domain.user.User;
import com.example.moneynote.domain.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class FlywayMigrationIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("moneynote_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired UserRepository userRepository;
    @Autowired LedgerRepository ledgerRepository;
    @Autowired LedgerPermissionRepository ledgerPermissionRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired FixedTransactionRepository fixedTransactionRepository;
    @Autowired BudgetRepository budgetRepository;
    @Autowired AiAdviceCacheRepository aiAdviceCacheRepository;

    // -------------------------------------------------------------------------
    // ヘルパー
    // -------------------------------------------------------------------------

    private User savedUser(String userId) {
        return userRepository.save(User.builder()
                .userId(userId)
                .userName("テストユーザー")
                .email(userId + "@example.com")
                .passwordHash("$2a$12$dummyhash")
                .build());
    }

    private Ledger savedLedger(User owner) {
        return ledgerRepository.save(Ledger.builder()
                .ledgerId(IdGenerator.ledgerId())
                .owner(owner)
                .ledgerName("テスト帳簿")
                .build());
    }

    private Category savedCategory(Ledger ledger, CategoryType type) {
        return categoryRepository.save(Category.builder()
                .categoryId(IdGenerator.categoryId())
                .ledger(ledger)
                .categoryName("食費")
                .categoryType(type)
                .build());
    }

    // -------------------------------------------------------------------------
    // マイグレーション基本検証
    // -------------------------------------------------------------------------

    @Test
    void allMigrationsApplySuccessfully() {
        // Flyway が正常完了していればエンティティの保存ができる
        User user = savedUser("migration_test");
        assertThat(userRepository.findById("migration_test")).isPresent();
        userRepository.delete(user);
    }

    // -------------------------------------------------------------------------
    // users テーブル
    // -------------------------------------------------------------------------

    @Test
    void user_saveAndFind() {
        User user = savedUser("user_01");
        User found = userRepository.findById("user_01").orElseThrow();
        assertThat(found.getUserName()).isEqualTo("テストユーザー");
        assertThat(found.getCreatedAt()).isNotNull();
        userRepository.delete(user);
    }

    @Test
    void user_emailUniqueConstraint() {
        User u1 = savedUser("uq_user_1");
        assertThatThrownBy(() -> userRepository.saveAndFlush(User.builder()
                        .userId("uq_user_2")
                        .userName("dup")
                        .email("uq_user_1@example.com")   // 同じメールアドレス
                        .passwordHash("hash")
                        .build()))
                .isInstanceOf(DataIntegrityViolationException.class);
        userRepository.delete(u1);
    }

    // -------------------------------------------------------------------------
    // ledgers テーブル
    // -------------------------------------------------------------------------

    @Test
    void ledger_saveAndFind() {
        User owner = savedUser("ledger_owner");
        Ledger ledger = savedLedger(owner);
        Ledger found = ledgerRepository.findById(ledger.getLedgerId()).orElseThrow();
        assertThat(found.getLedgerName()).isEqualTo("テスト帳簿");
        assertThat(found.getOwner().getUserId()).isEqualTo("ledger_owner");
        ledgerRepository.delete(ledger);
        userRepository.delete(owner);
    }

    @Test
    void ledger_foreignKeyToUser() {
        assertThatThrownBy(() -> ledgerRepository.saveAndFlush(Ledger.builder()
                        .ledgerId(IdGenerator.ledgerId())
                        .owner(User.builder().userId("nonexistent").build())
                        .ledgerName("orphan")
                        .build()))
                .isInstanceOf(Exception.class);
    }

    // -------------------------------------------------------------------------
    // ledger_permissions テーブル
    // -------------------------------------------------------------------------

    @Test
    void ledgerPermission_saveAndFind() {
        User owner = savedUser("lp_owner");
        User member = savedUser("lp_member");
        Ledger ledger = savedLedger(owner);

        LedgerPermission perm = ledgerPermissionRepository.save(LedgerPermission.builder()
                .permissionId(IdGenerator.ledgerPermissionId())
                .ledger(ledger)
                .user(member)
                .permissionType(PermissionType.EDITOR)
                .build());

        assertThat(ledgerPermissionRepository.existsByLedgerLedgerIdAndUserUserId(
                ledger.getLedgerId(), "lp_member")).isTrue();

        ledgerPermissionRepository.delete(perm);
        ledgerRepository.delete(ledger);
        userRepository.delete(member);
        userRepository.delete(owner);
    }

    @Test
    void ledgerPermission_uniqueConstraint() {
        User owner = savedUser("lp_uq_owner");
        User member = savedUser("lp_uq_member");
        Ledger ledger = savedLedger(owner);

        ledgerPermissionRepository.save(LedgerPermission.builder()
                .permissionId(IdGenerator.ledgerPermissionId())
                .ledger(ledger)
                .user(member)
                .permissionType(PermissionType.VIEWER)
                .build());

        assertThatThrownBy(() -> ledgerPermissionRepository.saveAndFlush(LedgerPermission.builder()
                        .permissionId(IdGenerator.ledgerPermissionId())
                        .ledger(ledger)
                        .user(member)
                        .permissionType(PermissionType.ADMIN)
                        .build()))
                .isInstanceOf(DataIntegrityViolationException.class);

        ledgerPermissionRepository.deleteAll(
                ledgerPermissionRepository.findByUserUserId("lp_uq_member"));
        ledgerRepository.delete(ledger);
        userRepository.delete(member);
        userRepository.delete(owner);
    }

    // -------------------------------------------------------------------------
    // categories テーブル
    // -------------------------------------------------------------------------

    @Test
    void category_saveAndFind() {
        User owner = savedUser("cat_owner");
        Ledger ledger = savedLedger(owner);
        Category category = savedCategory(ledger, CategoryType.EXPENSE);

        assertThat(categoryRepository.findByLedgerLedgerIdAndIsActiveTrueOrderByDisplayOrderAsc(
                ledger.getLedgerId())).hasSize(1);

        categoryRepository.delete(category);
        ledgerRepository.delete(ledger);
        userRepository.delete(owner);
    }

    // -------------------------------------------------------------------------
    // fixed_transactions & transactions テーブル（相互参照）
    // -------------------------------------------------------------------------

    @Test
    void fixedTransaction_saveAndFind() {
        User owner = savedUser("ft_owner");
        Ledger ledger = savedLedger(owner);
        Category category = savedCategory(ledger, CategoryType.EXPENSE);

        FixedTransaction ft = fixedTransactionRepository.save(FixedTransaction.builder()
                .fixedTransactionId(IdGenerator.fixedTransactionId())
                .ledger(ledger)
                .category(category)
                .fixedName("家賃")
                .transactionType(TransactionType.EXPENSE)
                .amount(new BigDecimal("80000.00"))
                .dayOfMonth((short) 25)
                .startDate(LocalDate.of(2026, 1, 1))
                .build());

        assertThat(fixedTransactionRepository.findById(ft.getFixedTransactionId())).isPresent();

        fixedTransactionRepository.delete(ft);
        categoryRepository.delete(category);
        ledgerRepository.delete(ledger);
        userRepository.delete(owner);
    }

    @Test
    void transaction_withFixedTransactionFk() {
        User owner = savedUser("txn_ft_owner");
        Ledger ledger = savedLedger(owner);
        Category category = savedCategory(ledger, CategoryType.EXPENSE);

        FixedTransaction ft = fixedTransactionRepository.save(FixedTransaction.builder()
                .fixedTransactionId(IdGenerator.fixedTransactionId())
                .ledger(ledger)
                .fixedName("定期")
                .transactionType(TransactionType.EXPENSE)
                .amount(new BigDecimal("5000.00"))
                .dayOfMonth((short) 1)
                .startDate(LocalDate.now())
                .build());

        Transaction txn = transactionRepository.save(Transaction.builder()
                .transactionId(IdGenerator.transactionId())
                .ledger(ledger)
                .category(category)
                .fixedTransaction(ft)
                .transactionType(TransactionType.EXPENSE)
                .amount(new BigDecimal("5000.00"))
                .transactionDate(LocalDate.now())
                .isFixedOrigin(true)
                .build());

        assertThat(transactionRepository.findById(txn.getTransactionId())
                .orElseThrow().getFixedTransaction().getFixedTransactionId())
                .isEqualTo(ft.getFixedTransactionId());

        transactionRepository.delete(txn);
        fixedTransactionRepository.delete(ft);
        categoryRepository.delete(category);
        ledgerRepository.delete(ledger);
        userRepository.delete(owner);
    }

    // -------------------------------------------------------------------------
    // budgets テーブル
    // -------------------------------------------------------------------------

    @Test
    void budget_uniqueConstraint() {
        User owner = savedUser("bgt_owner");
        Ledger ledger = savedLedger(owner);
        Category category = savedCategory(ledger, CategoryType.EXPENSE);

        budgetRepository.save(Budget.builder()
                .budgetId(IdGenerator.budgetId())
                .ledger(ledger)
                .category(category)
                .year((short) 2026)
                .month((short) 4)
                .amount(new BigDecimal("30000.00"))
                .build());

        assertThatThrownBy(() -> budgetRepository.saveAndFlush(Budget.builder()
                        .budgetId(IdGenerator.budgetId())
                        .ledger(ledger)
                        .category(category)
                        .year((short) 2026)
                        .month((short) 4)
                        .amount(new BigDecimal("50000.00"))
                        .build()))
                .isInstanceOf(DataIntegrityViolationException.class);

        budgetRepository.deleteAll(
                budgetRepository.findByLedgerLedgerIdAndYearAndMonth(
                        ledger.getLedgerId(), (short) 2026, (short) 4));
        categoryRepository.delete(category);
        ledgerRepository.delete(ledger);
        userRepository.delete(owner);
    }

    // -------------------------------------------------------------------------
    // ai_advice_cache テーブル
    // -------------------------------------------------------------------------

    @Test
    void aiAdviceCache_saveAndFind() {
        User owner = savedUser("ai_owner");
        Ledger ledger = savedLedger(owner);

        LocalDateTime now = LocalDateTime.now();
        AiAdviceCache cache = aiAdviceCacheRepository.save(AiAdviceCache.builder()
                .cacheId(IdGenerator.aiAdviceCacheId())
                .ledger(ledger)
                .periodType(PeriodType.ONE_MONTH)
                .adviceType(AdviceType.INSIGHT)
                .adviceText("支出が先月比10%増加しています。")
                .generatedAt(now)
                .expiresAt(now.plusHours(24))
                .build());

        assertThat(aiAdviceCacheRepository
                .findByLedgerLedgerIdAndPeriodTypeAndAdviceTypeAndExpiresAtAfter(
                        ledger.getLedgerId(), PeriodType.ONE_MONTH, AdviceType.INSIGHT, now))
                .isPresent();

        aiAdviceCacheRepository.delete(cache);
        ledgerRepository.delete(ledger);
        userRepository.delete(owner);
    }
}
