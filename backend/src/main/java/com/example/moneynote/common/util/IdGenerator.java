package com.example.moneynote.common.util;

import com.example.moneynote.common.exception.IdGenerationException;

import java.security.SecureRandom;
import java.util.function.Predicate;

public final class IdGenerator {

    private static final String CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int SUFFIX_LENGTH = 12;
    private static final int DEFAULT_MAX_RETRIES = 5;
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

    /**
     * 重複チェック付きID生成。existsCheck が true を返す限り最大 maxRetries 回再試行する。
     * 超過時は IdGenerationException をスローする。
     */
    public static String generateUnique(String prefix, Predicate<String> existsCheck, int maxRetries) {
        for (int attempt = 0; attempt < maxRetries; attempt++) {
            String id = generate(prefix);
            if (!existsCheck.test(id)) {
                return id;
            }
        }
        throw new IdGenerationException(
                "ID生成に失敗しました（最大リトライ回数超過）: prefix=" + prefix);
    }

    public static String generateUnique(String prefix, Predicate<String> existsCheck) {
        return generateUnique(prefix, existsCheck, DEFAULT_MAX_RETRIES);
    }

    public static String ledgerId()            { return generate("ldg_"); }
    public static String ledgerPermissionId()  { return generate("lperm_"); }
    public static String categoryId()          { return generate("cat_"); }
    public static String transactionId()       { return generate("txn_"); }
    public static String fixedTransactionId()  { return generate("fix_"); }
    public static String budgetId()            { return generate("bgt_"); }
    public static String aiAdviceCacheId()     { return generate("aic_"); }
}
