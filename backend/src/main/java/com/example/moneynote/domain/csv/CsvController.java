package com.example.moneynote.domain.csv;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.csv.dto.CsvImportResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Tag(name = "CSV", description = "収支明細の CSV エクスポート・インポート")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/transactions")
@RequiredArgsConstructor
public class CsvController {

    private final CsvService csvService;

    @Operation(summary = "CSV エクスポート", description = "収支明細を CSV ファイルとしてダウンロードする。startDate・endDate・categoryIds・includeFixed でフィルタリング可能。ファイル名は moneynote_YYYYMMDD.csv。VIEWER 以上の権限が必要。")
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @PathVariable String ledgerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) List<String> categoryIds,
            @RequestParam(defaultValue = "true") boolean includeFixed,
            Principal principal) {

        byte[] csv = csvService.exportCsv(ledgerId, principal.getName(),
                startDate, endDate, categoryIds, includeFixed);

        String filename = "moneynote_" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @Operation(summary = "CSV インポート", description = "CSV ファイルをアップロードして収支明細を一括インポートする。multipart/form-data で file フィールドに CSV ファイルを指定する。EDITOR 以上の権限が必要。")
    @PostMapping("/import")
    public ApiResponse<CsvImportResponse> importCsv(
            @PathVariable String ledgerId,
            @RequestParam("file") MultipartFile file,
            Principal principal) {

        return ApiResponse.success(csvService.importCsv(ledgerId, principal.getName(), file));
    }
}
