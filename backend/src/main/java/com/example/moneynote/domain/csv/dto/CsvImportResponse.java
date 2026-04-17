package com.example.moneynote.domain.csv.dto;

import java.util.List;

public record CsvImportResponse(
        int importedCount,
        int skippedCount,
        List<String> newCategoriesCreated,
        List<CsvErrorRow> errorRows) {}
