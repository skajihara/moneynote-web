package com.example.moneynote.domain.fixedtransaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface FixedTransactionRepository extends JpaRepository<FixedTransaction, String> {

    List<FixedTransaction> findByLedgerLedgerIdAndIsActiveTrueOrderByFixedNameAsc(String ledgerId);

    /** 全件（isActive に関わらず）取得する */
    List<FixedTransaction> findByLedgerLedgerIdOrderByFixedNameAsc(String ledgerId);

    /** 終了日が過去（expired）のもの: endDate < today */
    @Query("SELECT f FROM FixedTransaction f WHERE f.ledger.ledgerId = :ledgerId " +
           "AND f.endDate IS NOT NULL AND f.endDate < :today ORDER BY f.fixedName ASC")
    List<FixedTransaction> findExpiredByLedgerId(
            @Param("ledgerId") String ledgerId,
            @Param("today") LocalDate today);

    /** 有効なもの: endDate が NULL または endDate >= today */
    @Query("SELECT f FROM FixedTransaction f WHERE f.ledger.ledgerId = :ledgerId " +
           "AND (f.endDate IS NULL OR f.endDate >= :today) ORDER BY f.fixedName ASC")
    List<FixedTransaction> findActiveByLedgerId(
            @Param("ledgerId") String ledgerId,
            @Param("today") LocalDate today);

    @Modifying
    @Query("DELETE FROM FixedTransaction f WHERE f.ledger.ledgerId = :ledgerId")
    void deleteByLedgerLedgerId(@Param("ledgerId") String ledgerId);
}
