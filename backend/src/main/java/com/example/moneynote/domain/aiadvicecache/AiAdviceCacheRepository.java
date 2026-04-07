package com.example.moneynote.domain.aiadvicecache;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AiAdviceCacheRepository extends JpaRepository<AiAdviceCache, String> {

    Optional<AiAdviceCache> findByLedgerLedgerIdAndPeriodTypeAndAdviceTypeAndExpiresAtAfter(
            String ledgerId, PeriodType periodType, AdviceType adviceType, LocalDateTime now);
}
