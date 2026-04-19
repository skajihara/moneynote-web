package com.example.moneynote.domain.aiadvicecache;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AiAdviceCacheRepository extends JpaRepository<AiAdviceCache, String> {

    Optional<AiAdviceCache> findByLedgerLedgerIdAndPeriodTypeAndAdviceTypeAndExpiresAtAfter(
            String ledgerId, PeriodType periodType, AdviceType adviceType, LocalDateTime now);

    @Modifying
    @Query("DELETE FROM AiAdviceCache c WHERE c.ledger.ledgerId = :ledgerId")
    void deleteByLedgerLedgerId(@Param("ledgerId") String ledgerId);
}
