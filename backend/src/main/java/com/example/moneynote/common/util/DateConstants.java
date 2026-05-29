package com.example.moneynote.common.util;

import java.time.LocalDate;

/** 日付範囲のセンチネル値（「全期間」を表す最小・最大日付） */
public final class DateConstants {

    public static final LocalDate MIN_DATE = LocalDate.of(1900, 1, 1);
    public static final LocalDate MAX_DATE = LocalDate.of(9999, 12, 31);

    private DateConstants() {}
}
