package com.example.moneynote.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "ユーザーIDは必須です")
    @Pattern(
        regexp = "^[a-zA-Z0-9_]{3,20}$",
        message = "ユーザーIDは半角英数字・アンダーバーのみ、3〜20文字で入力してください"
    )
    private String userId;

    @NotBlank(message = "ユーザー名は必須です")
    @Size(min = 1, max = 50, message = "ユーザー名は1〜50文字で入力してください")
    private String userName;

    @NotBlank(message = "メールアドレスは必須です")
    @Email(message = "メールアドレスの形式が正しくありません")
    private String email;

    @NotBlank(message = "パスワードは必須です")
    @Pattern(
        regexp = "^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$",
        message = "パスワードは8文字以上で、英字と数字を各1文字以上含めてください"
    )
    private String password;
}
