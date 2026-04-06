package com.example.moneynote.domain.aiadvicecache;

import com.example.moneynote.domain.ledger.Ledger;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_advice_cache")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAdviceCache {

    @Id
    @Column(name = "cache_id", length = 20)
    private String cacheId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    private Ledger ledger;

    @Enumerated(EnumType.STRING)
    @Column(name = "period_type", length = 20, nullable = false)
    private PeriodType periodType;

    @Enumerated(EnumType.STRING)
    @Column(name = "advice_type", length = 20, nullable = false)
    private AdviceType adviceType;

    @Column(name = "advice_text", nullable = false, columnDefinition = "TEXT")
    private String adviceText;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
