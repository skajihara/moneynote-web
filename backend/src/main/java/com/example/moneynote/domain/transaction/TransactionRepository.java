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

    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category LEFT JOIN FETCH t.fixedTransaction " +
           "WHERE t.ledger.ledgerId = :ledgerId " +
           "AND t.transactionDate BETWEEN :from AND :to " +
           "ORDER BY t.transactionDate DESC, t.createdAt DESC")
    List<Transaction> findByLedgerIdAndDateRangeWithDetails(
            @Param("ledgerId") String ledgerId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category LEFT JOIN FETCH t.fixedTransaction " +
           "WHERE t.ledger.ledgerId = :ledgerId " +
           "AND t.transactionDate BETWEEN :from AND :to " +
           "AND t.category.categoryId = :categoryId " +
           "ORDER BY t.transactionDate DESC, t.createdAt DESC")
    List<Transaction> findByLedgerIdAndDateRangeAndCategoryWithDetails(
            @Param("ledgerId") String ledgerId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("categoryId") String categoryId);

    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category LEFT JOIN FETCH t.fixedTransaction " +
           "WHERE t.ledger.ledgerId = :ledgerId " +
           "AND t.transactionDate BETWEEN :from AND :to " +
           "AND t.transactionType = :type " +
           "ORDER BY t.transactionDate DESC, t.createdAt DESC")
    List<Transaction> findByLedgerIdAndDateRangeAndTypeWithDetails(
            @Param("ledgerId") String ledgerId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("type") TransactionType type);

    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category LEFT JOIN FETCH t.fixedTransaction " +
           "WHERE t.ledger.ledgerId = :ledgerId " +
           "AND t.transactionDate BETWEEN :from AND :to " +
           "AND t.category.categoryId = :categoryId " +
           "AND t.transactionType = :type " +
           "ORDER BY t.transactionDate DESC, t.createdAt DESC")
    List<Transaction> findByLedgerIdAndDateRangeAndCategoryAndTypeWithDetails(
            @Param("ledgerId") String ledgerId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("categoryId") String categoryId,
            @Param("type") TransactionType type);

    /** 累積残高計算用: 対象帳簿の全明細を取得する */
    List<Transaction> findByLedgerLedgerIdOrderByTransactionDateDesc(String ledgerId);

    /** 前月末まで（carryOver計算）: 指定日未満の全明細を取得する */
    @Query("SELECT t FROM Transaction t WHERE t.ledger.ledgerId = :ledgerId AND t.transactionDate < :date")
    List<Transaction> findByLedgerIdBeforeDate(
            @Param("ledgerId") String ledgerId,
            @Param("date") LocalDate date);

    /** 固定費明細一括削除: 同じ fixedTransactionId の全明細を削除する */
    @Modifying
    @Query("DELETE FROM Transaction t WHERE t.fixedTransaction.fixedTransactionId = :fixedTransactionId")
    void deleteByFixedTransactionId(@Param("fixedTransactionId") String fixedTransactionId);

    /**
     * カテゴリ論理削除時に、そのカテゴリを参照する明細の category_id を NULL にする。
     */
    @Modifying
    @Query("UPDATE Transaction t SET t.category = null WHERE t.category.categoryId = :categoryId")
    void nullifyCategoryId(@Param("categoryId") String categoryId);

    /**
     * 固定費由来の明細のうち指定期間内の既存月を確認するために全明細を返す。
     * (isFixedOrigin=true かつ fixedTransactionId が一致する明細一覧)
     */
    @Query("SELECT t FROM Transaction t WHERE t.fixedTransaction.fixedTransactionId = :fixedTransactionId")
    List<Transaction> findByFixedTransactionId(@Param("fixedTransactionId") String fixedTransactionId);

    /** CSV エクスポート用: 日付昇順で取得する（全カテゴリ） */
    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category LEFT JOIN FETCH t.fixedTransaction " +
           "WHERE t.ledger.ledgerId = :ledgerId " +
           "AND t.transactionDate BETWEEN :from AND :to " +
           "ORDER BY t.transactionDate ASC, t.createdAt ASC")
    List<Transaction> findForExport(
            @Param("ledgerId") String ledgerId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** CSV エクスポート用: 日付昇順で取得する（複数カテゴリフィルタあり） */
    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category LEFT JOIN FETCH t.fixedTransaction " +
           "WHERE t.ledger.ledgerId = :ledgerId " +
           "AND t.transactionDate BETWEEN :from AND :to " +
           "AND t.category.categoryId IN :categoryIds " +
           "ORDER BY t.transactionDate ASC, t.createdAt ASC")
    List<Transaction> findForExportWithCategories(
            @Param("ledgerId") String ledgerId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("categoryIds") List<String> categoryIds);

    /**
     * キーワード・カテゴリ・期間フィルター検索。
     * Hibernate 6 では LocalDate 型パラメータに null を渡すと型解決に失敗するため
     * startDate/endDate は必ずセンチネル値（1900-01-01 / 9999-12-31）を渡す。
     */
    /**
     * Hibernate 6 + PostgreSQL では null String パラメータを lower() に渡すと
     * bytea 型エラーになるため、空文字列センチネル値を使って null チェックを回避する。
     * :keyword = '' で全件、:categoryId = '' で全件を意味する。
     */
    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category LEFT JOIN FETCH t.fixedTransaction " +
           "WHERE t.ledger.ledgerId = :ledgerId " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate " +
           "AND (:categoryId = '' OR (t.category IS NOT NULL AND t.category.categoryId = :categoryId)) " +
           "AND (:keyword = '' OR LOWER(t.memo) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY t.transactionDate DESC, t.createdAt DESC")
    List<Transaction> searchTransactions(
            @Param("ledgerId") String ledgerId,
            @Param("keyword") String keyword,
            @Param("categoryId") String categoryId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    /** アカウント削除用: 帳簿に紐づく全明細を削除する */
    @Modifying
    @Query("DELETE FROM Transaction t WHERE t.ledger.ledgerId = :ledgerId")
    void deleteByLedgerLedgerId(@Param("ledgerId") String ledgerId);
}
