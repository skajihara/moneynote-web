package com.example.moneynote.domain.ledger;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LedgerRepository extends JpaRepository<Ledger, String> {

    List<Ledger> findByOwnerUserIdAndIsActiveTrue(String ownerUserId);
}
