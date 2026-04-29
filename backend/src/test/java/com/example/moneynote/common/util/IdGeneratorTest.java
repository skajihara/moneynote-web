package com.example.moneynote.common.util;

import com.example.moneynote.common.exception.IdGenerationException;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdGeneratorTest {

    @Test
    void ledgerId_hasCorrectPrefixAndLength() {
        String id = IdGenerator.ledgerId();
        assertThat(id).startsWith("ldg_");
        assertThat(id).hasSize(4 + 12);
    }

    @Test
    void ledgerPermissionId_hasCorrectPrefixAndLength() {
        String id = IdGenerator.ledgerPermissionId();
        assertThat(id).startsWith("lperm_");
        assertThat(id).hasSize(6 + 12);
    }

    @Test
    void categoryId_hasCorrectPrefixAndLength() {
        String id = IdGenerator.categoryId();
        assertThat(id).startsWith("cat_");
        assertThat(id).hasSize(4 + 12);
    }

    @Test
    void transactionId_hasCorrectPrefixAndLength() {
        String id = IdGenerator.transactionId();
        assertThat(id).startsWith("txn_");
        assertThat(id).hasSize(4 + 12);
    }

    @Test
    void fixedTransactionId_hasCorrectPrefixAndLength() {
        String id = IdGenerator.fixedTransactionId();
        assertThat(id).startsWith("fix_");
        assertThat(id).hasSize(4 + 12);
    }

    @Test
    void budgetId_hasCorrectPrefixAndLength() {
        String id = IdGenerator.budgetId();
        assertThat(id).startsWith("bgt_");
        assertThat(id).hasSize(4 + 12);
    }

    @Test
    void aiAdviceCacheId_hasCorrectPrefixAndLength() {
        String id = IdGenerator.aiAdviceCacheId();
        assertThat(id).startsWith("aic_");
        assertThat(id).hasSize(4 + 12);
    }

    @Test
    void generatedIds_areUnique() {
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            ids.add(IdGenerator.ledgerId());
        }
        assertThat(ids).hasSize(1000);
    }

    @Test
    void generatedId_containsOnlyLowercaseAlphanumericAndPrefix() {
        String id = IdGenerator.ledgerId();
        String suffix = id.substring("ldg_".length());
        assertThat(suffix).matches("[a-z0-9]{12}");
    }

    @Test
    void generateUnique_returnsIdWhenNoCollision() {
        String id = IdGenerator.generateUnique("ldg_", _id -> false);
        assertThat(id).startsWith("ldg_");
        assertThat(id).hasSize(4 + 12);
    }

    @Test
    void generateUnique_retriesAndSucceedsAfterCollisions() {
        // 最初の2回は衝突、3回目に成功するケース
        AtomicInteger callCount = new AtomicInteger(0);
        String id = IdGenerator.generateUnique("ldg_", _id -> callCount.incrementAndGet() <= 2);
        assertThat(id).startsWith("ldg_");
        assertThat(callCount.get()).isEqualTo(3);
    }

    @Test
    void generateUnique_throwsIdGenerationExceptionAfterMaxRetries() {
        // 常に衝突する（existsCheck が常に true）
        assertThatThrownBy(() -> IdGenerator.generateUnique("ldg_", _id -> true))
                .isInstanceOf(IdGenerationException.class)
                .hasMessageContaining("ID生成に失敗しました")
                .hasMessageContaining("ldg_");
    }

    @Test
    void generateUnique_respectsMaxRetriesParameter() {
        AtomicInteger callCount = new AtomicInteger(0);
        int maxRetries = 3;
        assertThatThrownBy(() ->
                IdGenerator.generateUnique("cat_", _id -> { callCount.incrementAndGet(); return true; }, maxRetries))
                .isInstanceOf(IdGenerationException.class);
        assertThat(callCount.get()).isEqualTo(maxRetries);
    }
}
