package com.example.moneynote.domain.admin;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.admin.dto.AdminChangeRoleRequest;
import com.example.moneynote.domain.admin.dto.AdminCreateUserRequest;
import com.example.moneynote.domain.admin.dto.AdminUserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ApiResponse<List<AdminUserResponse>> listUsers() {
        return ApiResponse.success(adminService.listUsers());
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return ApiResponse.success(adminService.createUser(request));
    }

    @PutMapping("/users/{userId}/role")
    public ApiResponse<AdminUserResponse> changeRole(
            @PathVariable String userId,
            @Valid @RequestBody AdminChangeRoleRequest request,
            @AuthenticationPrincipal String operatorUserId) {
        return ApiResponse.success(adminService.changeRole(userId, operatorUserId, request));
    }

    @PutMapping("/users/{userId}/activate")
    public ApiResponse<AdminUserResponse> activate(
            @PathVariable String userId,
            @AuthenticationPrincipal String operatorUserId) {
        return ApiResponse.success(adminService.activate(userId, operatorUserId));
    }

    @PutMapping("/users/{userId}/deactivate")
    public ApiResponse<AdminUserResponse> deactivate(
            @PathVariable String userId,
            @AuthenticationPrincipal String operatorUserId) {
        return ApiResponse.success(adminService.deactivate(userId, operatorUserId));
    }

    @DeleteMapping("/users/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(
            @PathVariable String userId,
            @AuthenticationPrincipal String operatorUserId) {
        adminService.deleteUser(userId, operatorUserId);
    }
}
