package com.example.moneynote.domain.user;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.user.dto.ChangePasswordRequest;
import com.example.moneynote.domain.user.dto.UpdateProfileRequest;
import com.example.moneynote.domain.user.dto.UpdateThemeRequest;
import com.example.moneynote.domain.user.dto.UserProfileResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserProfileResponse> getProfile(Principal principal) {
        return ApiResponse.success(userService.getProfile(principal.getName()));
    }

    @PutMapping("/me")
    public ApiResponse<UserProfileResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Principal principal) {
        return ApiResponse.success(userService.updateProfile(principal.getName(), request));
    }

    @PutMapping("/me/password")
    public ApiResponse<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Principal principal) {
        userService.changePassword(principal.getName(), request);
        return ApiResponse.success(null);
    }

    @PutMapping("/me/theme")
    public ApiResponse<UserProfileResponse> updateTheme(
            @Valid @RequestBody UpdateThemeRequest request,
            Principal principal) {
        return ApiResponse.success(userService.updateTheme(principal.getName(), request));
    }

    @DeleteMapping("/me")
    public ApiResponse<Void> deleteAccount(Principal principal) {
        userService.deleteAccount(principal.getName());
        return ApiResponse.success(null);
    }
}
