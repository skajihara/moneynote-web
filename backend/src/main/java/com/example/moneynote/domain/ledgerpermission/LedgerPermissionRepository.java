package com.example.moneynote.domain.ledgerpermission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LedgerPermissionRepository extends JpaRepository<LedgerPermission, String> {

    Optional<LedgerPermission> findByLedgerLedgerIdAndUserUserId(String ledgerId, String userId);

    List<LedgerPermission> findByUserUserId(String userId);

    boolean existsByLedgerLedgerIdAndUserUserId(String ledgerId, String userId);

    @Modifying
    @Query("DELETE FROM LedgerPermission lp WHERE lp.ledger.ledgerId = :ledgerId")
    void deleteByLedgerLedgerId(@Param("ledgerId") String ledgerId);

    @Modifying
    @Query("DELETE FROM LedgerPermission lp WHERE lp.user.userId = :userId")
    void deleteByUserUserId(@Param("userId") String userId);
}
