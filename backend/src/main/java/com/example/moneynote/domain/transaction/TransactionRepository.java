package com.example.moneynote.domain.transaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, String> {

    List<Transaction> findByLedgerLedgerIdAndTransactionDateBetweenOrderByTransactionDateDesc(
            String ledgerId, LocalDate from, LocalDate to);

    List<Transaction> findByLedgerLedgerIdOrderByTransactionDateDesc(String ledgerId);

    /**
     * カテゴリ論理削除時に、そのカテゴリを参照する明細の category_id を NULL にする。
     */
    @Modifying
    @Query("UPDATE Transaction t SET t.category = null WHERE t.category.categoryId = :categoryId")
    void nullifyCategoryId(@Param("categoryId") String categoryId);
}
