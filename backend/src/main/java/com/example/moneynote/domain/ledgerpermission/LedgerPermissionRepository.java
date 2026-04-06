package com.example.moneynote.domain.ledgerpermission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LedgerPermissionRepository extends JpaRepository<LedgerPermission, String> {

    Optional<LedgerPermission> findByLedgerLedgerIdAndUserUserId(String ledgerId, String userId);

    List<LedgerPermission> findByUserUserId(String userId);

    boolean existsByLedgerLedgerIdAndUserUserId(String ledgerId, String userId);
}
