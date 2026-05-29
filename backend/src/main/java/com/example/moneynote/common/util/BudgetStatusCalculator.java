package com.example.moneynote.common.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** 予算消化率とステータス（OVER / WARNING / NORMAL）の計算ユーティリティ */
public final class BudgetStatusCalculator {

    /** 予算消化率 100% 以上で OVER */
    public static final double OVER_THRESHOLD    = 100.0;
    /** 予算消化率 80% 以上で WARNING */
    public static final double WARNING_THRESHOLD = 80.0;

    private BudgetStatusCalculator() {}

    /**
     * 予算消化率（%）を計算する。予算額が 0 の場合は 0.0 を返す。
     */
    public static double calcUsageRate(BigDecimal budgetAmount, BigDecimal actual) {
        if (budgetAmount.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return actual.multiply(BigDecimal.valueOf(100))
                     .divide(budgetAmount, 2, RoundingMode.HALF_UP)
                     .doubleValue();
    }

    /**
     * 消化率から OVER / WARNING / NORMAL のいずれかを返す。
     */
    public static String calcStatus(double usageRate) {
        if (usageRate >= OVER_THRESHOLD)    return "OVER";
        if (usageRate >= WARNING_THRESHOLD) return "WARNING";
        return "NORMAL";
    }
}
