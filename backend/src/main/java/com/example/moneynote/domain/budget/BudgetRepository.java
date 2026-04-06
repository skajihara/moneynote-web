package com.example.moneynote.domain.budget;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, String> {

    List<Budget> findByLedgerLedgerIdAndYearAndMonth(String ledgerId, short year, short month);

    Optional<Budget> findByLedgerLedgerIdAndCategory_CategoryIdAndYearAndMonth(
            String ledgerId, String categoryId, short year, short month);
}
