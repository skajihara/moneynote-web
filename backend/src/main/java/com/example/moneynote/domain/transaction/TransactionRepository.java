package com.example.moneynote.domain.transaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, String> {

    List<Transaction> findByLedgerLedgerIdAndTransactionDateBetweenOrderByTransactionDateDesc(
            String ledgerId, LocalDate from, LocalDate to);

    List<Transaction> findByLedgerLedgerIdOrderByTransactionDateDesc(String ledgerId);
}
