package com.example.moneynote.domain.ledger;

import com.example.moneynote.domain.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ledgers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ledger {

    @Id
    @Column(name = "ledger_id", length = 20)
    private String ledgerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @Column(name = "ledger_name", length = 100, nullable = false)
    private String ledgerName;

    @Column(name = "initial_balance", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal initialBalance = BigDecimal.ZERO;

    @Column(name = "start_day_of_month", nullable = false)
    @Builder.Default
    private short startDayOfMonth = 1;

    @Column(name = "start_month_of_year", nullable = false)
    @Builder.Default
    private short startMonthOfYear = 1;

    @Column(name = "theme_color", length = 30)
    private String themeColor;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }
}
