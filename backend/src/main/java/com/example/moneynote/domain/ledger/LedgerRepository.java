package com.example.moneynote.domain.ledger;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LedgerRepository extends JpaRepository<Ledger, String> {

    List<Ledger> findByOwnerUserIdAndIsActiveTrue(String ownerUserId);

    /**
     * ユーザーがアクセス可能な帳簿（所有またはアクセス権限あり）を取得する。
     */
    @Query("SELECT l FROM Ledger l WHERE l.isActive = true AND " +
           "(l.owner.userId = :userId OR EXISTS " +
           "(SELECT lp FROM LedgerPermission lp WHERE lp.ledger = l AND lp.user.userId = :userId)) " +
           "ORDER BY l.createdAt ASC")
    List<Ledger> findAccessibleLedgers(@Param("userId") String userId);

    List<Ledger> findByOwnerUserId(String ownerUserId);
}
