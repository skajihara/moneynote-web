package com.example.moneynote.common.util;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

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
}
