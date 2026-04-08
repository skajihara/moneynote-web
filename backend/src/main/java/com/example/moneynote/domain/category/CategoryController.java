package com.example.moneynote.domain.category;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.category.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ApiResponse<List<CategoryResponse>> getCategories(
            @PathVariable String ledgerId,
            @RequestParam(required = false) CategoryType type,
            Principal principal) {
        return ApiResponse.success(
                categoryService.getCategories(ledgerId, type, principal.getName()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryResponse> createCategory(
            @PathVariable String ledgerId,
            @Valid @RequestBody CategoryRequest request,
            Principal principal) {
        return ApiResponse.success(
                categoryService.createCategory(ledgerId, request, principal.getName()));
    }

    @PutMapping("/order")
    public ApiResponse<Void> updateCategoryOrder(
            @PathVariable String ledgerId,
            @Valid @RequestBody List<CategoryOrderItem> items,
            Principal principal) {
        categoryService.updateCategoryOrder(ledgerId, items, principal.getName());
        return ApiResponse.success(null);
    }

    @PutMapping("/{categoryId}")
    public ApiResponse<CategoryResponse> updateCategory(
            @PathVariable String ledgerId,
            @PathVariable String categoryId,
            @Valid @RequestBody CategoryUpdateRequest request,
            Principal principal) {
        return ApiResponse.success(
                categoryService.updateCategory(ledgerId, categoryId, request, principal.getName()));
    }

    @DeleteMapping("/{categoryId}")
    public ApiResponse<Void> deleteCategory(
            @PathVariable String ledgerId,
            @PathVariable String categoryId,
            Principal principal) {
        categoryService.deleteCategory(ledgerId, categoryId, principal.getName());
        return ApiResponse.success(null);
    }
}
