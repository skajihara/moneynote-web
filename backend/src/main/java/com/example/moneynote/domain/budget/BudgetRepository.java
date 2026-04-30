package com.example.moneynote.domain.budget;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, String> {

    @Query("SELECT b FROM Budget b JOIN FETCH b.category " +
           "WHERE b.ledger.ledgerId = :ledgerId AND b.year = :year AND b.month = :month")
    List<Budget> findByLedgerLedgerIdAndYearAndMonth(
            @Param("ledgerId") String ledgerId, @Param("year") short year, @Param("month") short month);

    Optional<Budget> findByLedgerLedgerIdAndCategory_CategoryIdAndYearAndMonth(
            String ledgerId, String categoryId, short year, short month);

    @Modifying
    @Query("DELETE FROM Budget b WHERE b.ledger.ledgerId = :ledgerId")
    void deleteByLedgerLedgerId(@Param("ledgerId") String ledgerId);
}
