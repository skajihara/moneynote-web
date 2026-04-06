package com.example.moneynote.domain.category;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, String> {

    List<Category> findByLedgerLedgerIdAndIsActiveTrueOrderByDisplayOrderAsc(String ledgerId);

    List<Category> findByLedgerLedgerIdAndCategoryTypeAndIsActiveTrueOrderByDisplayOrderAsc(
            String ledgerId, CategoryType categoryType);
}
