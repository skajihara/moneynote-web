package com.example.moneynote.domain.fixedtransaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FixedTransactionRepository extends JpaRepository<FixedTransaction, String> {

    List<FixedTransaction> findByLedgerLedgerIdAndIsActiveTrueOrderByFixedNameAsc(String ledgerId);
}
