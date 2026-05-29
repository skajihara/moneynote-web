package com.example.moneynote.domain.csv;

import com.example.moneynote.common.exception.ValidationException;
import com.example.moneynote.common.util.DateConstants;
import com.example.moneynote.common.util.IdGenerator;
import com.example.moneynote.common.validator.LedgerAccessValidator;
import com.example.moneynote.domain.category.Category;
import com.example.moneynote.domain.category.CategoryRepository;
import com.example.moneynote.domain.category.CategoryType;
import com.example.moneynote.domain.csv.dto.CsvErrorRow;
import com.example.moneynote.domain.csv.dto.CsvImportResponse;
import com.example.moneynote.domain.ledger.Ledger;
import com.example.moneynote.domain.transaction.Transaction;
import com.example.moneynote.domain.transaction.TransactionRepository;
import com.example.moneynote.domain.transaction.TransactionType;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PushbackInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CsvService {

    static final String[] CSV_HEADERS = {
        "transaction_id", "ledger_id", "transaction_date", "transaction_type",
        "amount", "category_id", "category_type", "category_name",
        "memo", "is_fixed_origin", "fixed_transaction_id", "created_at"
    };

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final LedgerAccessValidator ledgerAccessValidator;

    // -------------------------------------------------------------------------
    // Export
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public byte[] exportCsv(String ledgerId, String userId,
                             LocalDate startDate, LocalDate endDate,
                             List<String> categoryIds, boolean includeFixed) {

        ledgerAccessValidator.validate(ledgerId, userId);

        LocalDate from = startDate != null ? startDate : DateConstants.MIN_DATE;
        LocalDate to   = endDate   != null ? endDate   : DateConstants.MAX_DATE;

        List<Transaction> transactions = (categoryIds != null && !categoryIds.isEmpty())
                ? transactionRepository.findForExportWithCategories(ledgerId, from, to, categoryIds)
                : transactionRepository.findForExport(ledgerId, from, to);

        if (!includeFixed) {
            transactions = transactions.stream()
                    .filter(t -> !t.isFixedOrigin())
                    .toList();
        }

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            // BOM (UTF-8)
            baos.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});

            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader(CSV_HEADERS)
                    .build();

            try (CSVPrinter printer = new CSVPrinter(
                    new OutputStreamWriter(baos, StandardCharsets.UTF_8), format)) {

                for (Transaction t : transactions) {
                    printer.printRecord(
                            t.getTransactionId(),
                            ledgerId,
                            t.getTransactionDate().toString(),
                            t.getTransactionType().name(),
                            t.getAmount().toPlainString(),
                            t.getCategory() != null ? t.getCategory().getCategoryId() : "",
                            t.getCategory() != null ? t.getCategory().getCategoryType().name() : "",
                            t.getCategory() != null ? t.getCategory().getCategoryName() : "",
                            t.getMemo() != null ? t.getMemo() : "",
                            t.isFixedOrigin(),
                            t.getFixedTransaction() != null ? t.getFixedTransaction().getFixedTransactionId() : "",
                            t.getCreatedAt() != null ? t.getCreatedAt().toString() : ""
                    );
                }
            }

            return baos.toByteArray();

        } catch (IOException e) {
            throw new ValidationException("CSVの生成に失敗しました: " + e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Import
    // -------------------------------------------------------------------------

    @Transactional
    public CsvImportResponse importCsv(String ledgerId, String userId, MultipartFile file) {

        Ledger ledger = ledgerAccessValidator.validateEditorAccess(ledgerId, userId);

        // カテゴリマップを構築 ("name|type" → Category)
        List<Category> existingCategories = categoryRepository
                .findByLedgerLedgerIdAndIsActiveTrueOrderByDisplayOrderAsc(ledgerId);

        Map<String, Category> categoryMap = new HashMap<>();
        for (Category c : existingCategories) {
            categoryMap.put(categoryKey(c.getCategoryName(), c.getCategoryType()), c);
        }

        // 現在の最大 display_order を取得
        int maxOrder = categoryRepository.findMaxDisplayOrderByLedgerId(ledgerId)
                .orElse(0);

        List<String> newCategoriesCreated = new ArrayList<>();
        List<Transaction> toSave = new ArrayList<>();
        List<CsvErrorRow> errorRows = new ArrayList<>();
        int skippedCount = 0;

        try {
            InputStream stripped = stripBom(file.getInputStream());

            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setIgnoreEmptyLines(true)
                    .setTrim(true)
                    .build();

            try (CSVParser parser = new CSVParser(
                    new InputStreamReader(stripped, StandardCharsets.UTF_8), format)) {

                // ヘッダー検証
                if (!isValidHeaders(parser.getHeaderNames())) {
                    throw new ValidationException(
                            "CSVのヘッダーが不正です。正しいフォーマットのファイルをアップロードしてください。");
                }

                int rowNumber = 1; // ヘッダー行を除いた行番号
                for (CSVRecord record : parser) {
                    rowNumber++;
                    try {
                        Transaction tx = parseRow(record, ledger, categoryMap,
                                newCategoriesCreated, maxOrder);
                        // parseRow 内で新カテゴリが追加された場合は maxOrder が増えている
                        maxOrder = categoryMap.values().stream()
                                .mapToInt(c -> (int) c.getDisplayOrder())
                                .max().orElse(maxOrder);
                        toSave.add(tx);
                    } catch (RowValidationException e) {
                        errorRows.add(new CsvErrorRow(rowNumber, e.getMessage()));
                        skippedCount++;
                    }
                }
            }

        } catch (ValidationException e) {
            throw e;
        } catch (IOException e) {
            throw new ValidationException("CSVの読み込みに失敗しました: " + e.getMessage());
        }

        if (!toSave.isEmpty()) {
            transactionRepository.saveAll(toSave);
        }

        return new CsvImportResponse(toSave.size(), skippedCount, newCategoriesCreated, errorRows);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private InputStream stripBom(InputStream in) throws IOException {
        PushbackInputStream pb = new PushbackInputStream(in, 3);
        byte[] bom = new byte[3];
        int read = pb.read(bom, 0, 3);
        if (read == 3
                && (bom[0] & 0xFF) == 0xEF
                && (bom[1] & 0xFF) == 0xBB
                && (bom[2] & 0xFF) == 0xBF) {
            return pb;
        }
        if (read > 0) {
            pb.unread(bom, 0, read);
        }
        return pb;
    }

    private boolean isValidHeaders(List<String> actual) {
        if (actual.size() < CSV_HEADERS.length) return false;
        for (int i = 0; i < CSV_HEADERS.length; i++) {
            if (!CSV_HEADERS[i].equals(actual.get(i))) return false;
        }
        return true;
    }

    private Transaction parseRow(CSVRecord record, Ledger ledger,
                                  Map<String, Category> categoryMap,
                                  List<String> newCategoriesCreated,
                                  int currentMaxOrder) {
        // transaction_date
        LocalDate date;
        try {
            date = LocalDate.parse(record.get("transaction_date"));
        } catch (DateTimeParseException e) {
            throw new RowValidationException("transaction_dateの形式が不正です (YYYY-MM-DD)");
        }

        // transaction_type
        TransactionType type;
        try {
            type = TransactionType.valueOf(record.get("transaction_type"));
        } catch (IllegalArgumentException e) {
            throw new RowValidationException("transaction_typeが不正です (INCOME / EXPENSE)");
        }

        // amount
        BigDecimal amount;
        try {
            amount = new BigDecimal(record.get("amount"));
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RowValidationException("amountは0より大きい値が必要です");
            }
        } catch (NumberFormatException e) {
            throw new RowValidationException("amountが不正な数値です");
        }

        // category_name / category_type
        String catName = record.get("category_name");
        if (catName == null || catName.isBlank()) {
            throw new RowValidationException("category_nameが空です");
        }

        CategoryType catType;
        try {
            catType = CategoryType.valueOf(record.get("category_type"));
        } catch (IllegalArgumentException e) {
            throw new RowValidationException("category_typeが不正です (INCOME / EXPENSE)");
        }

        // transaction_type と category_type の整合性チェック
        CategoryType expectedCatType = type == TransactionType.EXPENSE
                ? CategoryType.EXPENSE : CategoryType.INCOME;
        if (catType != expectedCatType) {
            throw new RowValidationException(
                    "category_type と transaction_type が一致しません");
        }

        // カテゴリ検索 or 自動作成
        String key = categoryKey(catName, catType);
        Category category = categoryMap.computeIfAbsent(key, k -> {
            // 同名カテゴリが存在しない → 新規作成
            int newOrder = currentMaxOrder + 1 + newCategoriesCreated.size();
            Category newCat = Category.builder()
                    .categoryId(IdGenerator.generateUnique("cat_", categoryRepository::existsById))
                    .ledger(ledger)
                    .categoryName(catName)
                    .categoryType(catType)
                    .isDefault(false)
                    .displayOrder((short) newOrder)
                    .build();
            categoryRepository.save(newCat);
            newCategoriesCreated.add(catName);
            return newCat;
        });

        // memo
        String memo = record.get("memo");
        if (memo != null && memo.isBlank()) memo = null;

        return Transaction.builder()
                .transactionId(IdGenerator.generateUnique("txn_", transactionRepository::existsById))
                .ledger(ledger)
                .transactionDate(date)
                .transactionType(type)
                .amount(amount)
                .category(category)
                .memo(memo)
                .isFixedOrigin(false)
                .build();
    }

    private static String categoryKey(String name, CategoryType type) {
        return name + "|" + type.name();
    }

    /** 行バリデーション失敗を表す内部例外 */
    private static class RowValidationException extends RuntimeException {
        RowValidationException(String message) {
            super(message);
        }
    }
}
