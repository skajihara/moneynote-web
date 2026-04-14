package com.example.moneynote.domain.csv;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.csv.dto.CsvImportResponse;
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

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/transactions")
@RequiredArgsConstructor
public class CsvController {

    private final CsvService csvService;

    // -----------------------------------------------------------------------
    // GET /api/v1/ledgers/{ledgerId}/transactions/export  CSVエクスポート
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // POST /api/v1/ledgers/{ledgerId}/transactions/import  CSVインポート
    // -----------------------------------------------------------------------

    @PostMapping("/import")
    public ApiResponse<CsvImportResponse> importCsv(
            @PathVariable String ledgerId,
            @RequestParam("file") MultipartFile file,
            Principal principal) {

        return ApiResponse.success(csvService.importCsv(ledgerId, principal.getName(), file));
    }
}
