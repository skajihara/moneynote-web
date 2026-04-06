package com.example.moneynote.common.util;

import java.security.SecureRandom;

public final class IdGenerator {

    private static final String CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int SUFFIX_LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    private IdGenerator() {}

    private static String generate(String prefix) {
        StringBuilder sb = new StringBuilder(prefix.length() + SUFFIX_LENGTH);
        sb.append(prefix);
        for (int i = 0; i < SUFFIX_LENGTH; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    public static String ledgerId()            { return generate("ldg_"); }
    public static String ledgerPermissionId()  { return generate("lperm_"); }
    public static String categoryId()          { return generate("cat_"); }
    public static String transactionId()       { return generate("txn_"); }
    public static String fixedTransactionId()  { return generate("fix_"); }
    public static String budgetId()            { return generate("bgt_"); }
    public static String aiAdviceCacheId()     { return generate("aic_"); }
}
