package com.example.moneynote.domain.ledger.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@NoArgsConstructor
public class LedgerRequest {

    @NotBlank(message = "帳簿名は必須です")
    @Size(min = 1, max = 100, message = "帳簿名は1〜100文字で入力してください")
    private String ledgerName;

    /** 省略可・デフォルト 0 */
    private BigDecimal initialBalance;

    /** 省略可・デフォルト 1・1〜28 */
    @Min(value = 1, message = "開始日は1〜28の範囲で入力してください")
    @Max(value = 28, message = "開始日は1〜28の範囲で入力してください")
    private Integer startDayOfMonth;

    /** 省略可・デフォルト 1・1〜12 */
    @Min(value = 1, message = "開始月は1〜12の範囲で入力してください")
    @Max(value = 12, message = "開始月は1〜12の範囲で入力してください")
    private Integer startMonthOfYear;
}
