package com.example.moneynote.domain.category;

import com.example.moneynote.common.exception.ResourceNotFoundException;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.category.dto.*;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.transaction.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// Lombok @Builder の戻り値に対する IDE の Null 型安全警告を抑制する（実行時は問題なし）
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerAccessValidator accessValidator;

    /**
     * カテゴリ一覧を取得する。type が指定された場合はフィルタリングする。
     */
    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories(String ledgerId, CategoryType type, String userId) {
        accessValidator.validate(ledgerId, userId);

        List<Category> categories;
        if (type != null) {
            categories = categoryRepository
                    .findByLedgerLedgerIdAndCategoryTypeAndIsActiveTrueOrderByDisplayOrderAsc(
                            ledgerId, type);
        } else {
            categories = categoryRepository
                    .findByLedgerLedgerIdAndIsActiveTrueOrderByDisplayOrderAsc(ledgerId);
        }
        return categories.stream().map(CategoryResponse::from).toList();
    }

    /**
     * カテゴリを作成する。
     */
    @Transactional
    public CategoryResponse createCategory(String ledgerId, CategoryRequest request, String userId) {
        Ledger ledger = accessValidator.validateAdminAccess(ledgerId, userId);

        // 現在の最大 display_order の次を設定する
        List<Category> existing = categoryRepository
                .findByLedgerLedgerIdAndIsActiveTrueOrderByDisplayOrderAsc(ledgerId);
        short nextOrder = existing.isEmpty()
                ? (short) 0
                : (short) (existing.get(existing.size() - 1).getDisplayOrder() + 1);

        Category category = Category.builder()
                .categoryId(IdGenerator.generateUnique("cat_", categoryRepository::existsById))
                .ledger(ledger)
                .categoryName(request.getCategoryName())
                .categoryType(request.getCategoryType())
                .icon(request.getIcon())
                .color(request.getColor())
                .displayOrder(nextOrder)
                .build();

        return CategoryResponse.from(categoryRepository.save(category));
    }

    /**
     * カテゴリ情報を更新する（categoryType の変更は不可）。
     */
    @Transactional
    public CategoryResponse updateCategory(String ledgerId, String categoryId,
                                           CategoryUpdateRequest request, String userId) {
        accessValidator.validateAdminAccess(ledgerId, userId);

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("カテゴリが見つかりません"));

        category.setCategoryName(request.getCategoryName());
        if (request.getIcon() != null) {
            category.setIcon(request.getIcon());
        }
        if (request.getColor() != null) {
            category.setColor(request.getColor());
        }

        return CategoryResponse.from(categoryRepository.save(category));
    }

    /**
     * カテゴリを論理削除する。
     * そのカテゴリに明細が存在する場合も削除可能とし、明細の category_id を NULL にする。
     */
    @Transactional
    public void deleteCategory(String ledgerId, String categoryId, String userId) {
        accessValidator.validateAdminAccess(ledgerId, userId);

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("カテゴリが見つかりません"));

        // 明細の category_id を NULL にする
        transactionRepository.nullifyCategoryId(categoryId);

        category.setActive(false);
        categoryRepository.save(category);
    }

    /**
     * display_order を一括更新する。
     */
    @Transactional
    public void updateCategoryOrder(String ledgerId, List<CategoryOrderItem> items, String userId) {
        accessValidator.validateAdminAccess(ledgerId, userId);

        for (CategoryOrderItem item : items) {
            Category category = categoryRepository.findById(item.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "カテゴリが見つかりません: " + item.getCategoryId()));
            category.setDisplayOrder(item.getDisplayOrder().shortValue());
            categoryRepository.save(category);
        }
    }
}
