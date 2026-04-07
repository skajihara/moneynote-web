package com.example.moneynote.domain.ledgerpermission;

import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "ledger_permissions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_ledger_permissions",
        columnNames = {"ledger_id", "user_id"}
    )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerPermission {

    @Id
    @Column(name = "permission_id", length = 20)
    private String permissionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    private Ledger ledger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission_type", length = 20, nullable = false)
    private PermissionType permissionType;

    @Column(name = "granted_at", nullable = false)
    private LocalDateTime grantedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @PrePersist
    private void prePersist() {
        if (grantedAt == null) {
            grantedAt = LocalDateTime.now();
        }
    }
}
