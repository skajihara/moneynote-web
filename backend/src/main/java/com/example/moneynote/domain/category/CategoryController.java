package com.example.moneynote.domain.category;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.category.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Tag(name = "カテゴリ", description = "カテゴリの取得・作成・更新・削除・並び替え")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "カテゴリ一覧取得", description = "帳簿のカテゴリ一覧を並び順で返す。type（INCOME/EXPENSE）でフィルタリング可能。VIEWER 以上の権限が必要。")
    @GetMapping
    public ApiResponse<List<CategoryResponse>> getCategories(
            @PathVariable String ledgerId,
            @RequestParam(required = false) CategoryType type,
            Principal principal) {
        return ApiResponse.success(
                categoryService.getCategories(ledgerId, type, principal.getName()));
    }

    @Operation(summary = "カテゴリ作成", description = "新しいカテゴリを作成する。EDITOR 以上の権限が必要。")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryResponse> createCategory(
            @PathVariable String ledgerId,
            @Valid @RequestBody CategoryRequest request,
            Principal principal) {
        return ApiResponse.success(
                categoryService.createCategory(ledgerId, request, principal.getName()));
    }

    @Operation(summary = "カテゴリ並び替え", description = "カテゴリの表示順序を一括更新する。EDITOR 以上の権限が必要。")
    @PutMapping("/order")
    public ApiResponse<Void> updateCategoryOrder(
            @PathVariable String ledgerId,
            @Valid @RequestBody List<CategoryOrderItem> items,
            Principal principal) {
        categoryService.updateCategoryOrder(ledgerId, items, principal.getName());
        return ApiResponse.success(null);
    }

    @Operation(summary = "カテゴリ更新", description = "カテゴリ名・アイコン・タイプを更新する。EDITOR 以上の権限が必要。")
    @PutMapping("/{categoryId}")
    public ApiResponse<CategoryResponse> updateCategory(
            @PathVariable String ledgerId,
            @PathVariable String categoryId,
            @Valid @RequestBody CategoryUpdateRequest request,
            Principal principal) {
        return ApiResponse.success(
                categoryService.updateCategory(ledgerId, categoryId, request, principal.getName()));
    }

    @Operation(summary = "カテゴリ削除", description = "カテゴリを論理削除する（is_active=false）。EDITOR 以上の権限が必要。")
    @DeleteMapping("/{categoryId}")
    public ApiResponse<Void> deleteCategory(
            @PathVariable String ledgerId,
            @PathVariable String categoryId,
            Principal principal) {
        categoryService.deleteCategory(ledgerId, categoryId, principal.getName());
        return ApiResponse.success(null);
    }
}
