package com.example.moneynote.domain.category;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, String> {

    List<Category> findByLedgerLedgerIdAndIsActiveTrueOrderByDisplayOrderAsc(String ledgerId);

    List<Category> findByLedgerLedgerIdAndCategoryTypeAndIsActiveTrueOrderByDisplayOrderAsc(
            String ledgerId, CategoryType categoryType);

    /** インポート時のカテゴリ名マッチング用 */
    Optional<Category> findByLedgerLedgerIdAndCategoryNameAndCategoryTypeAndIsActiveTrue(
            String ledgerId, String categoryName, CategoryType categoryType);

    /** インポート時の display_order 最大値取得用 */
    @Query("SELECT MAX(c.displayOrder) FROM Category c WHERE c.ledger.ledgerId = :ledgerId")
    Optional<Integer> findMaxDisplayOrderByLedgerId(@Param("ledgerId") String ledgerId);
}
