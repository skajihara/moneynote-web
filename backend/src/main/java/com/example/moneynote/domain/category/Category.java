package com.example.moneynote.domain.category;

import com.example.moneynote.domain.ledger.Ledger;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "categories")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    @Column(name = "category_id", length = 20)
    private String categoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    private Ledger ledger;

    @Column(name = "category_name", length = 50, nullable = false)
    private String categoryName;

    @Enumerated(EnumType.STRING)
    @Column(name = "category_type", length = 20, nullable = false)
    private CategoryType categoryType;

    @Column(name = "icon", length = 10)
    private String icon;

    @Column(name = "color", length = 30)
    private String color;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private short displayOrder = 0;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private boolean isDefault = false;

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
