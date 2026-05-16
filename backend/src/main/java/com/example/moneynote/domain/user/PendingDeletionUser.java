package com.example.moneynote.domain.user;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "pending_deletion_users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingDeletionUser {

    @Id
    @Column(name = "user_id", nullable = false, length = 20)
    private String userId;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt;

    @PrePersist
    void prePersist() {
        if (requestedAt == null) {
            requestedAt = OffsetDateTime.now();
        }
    }
}
