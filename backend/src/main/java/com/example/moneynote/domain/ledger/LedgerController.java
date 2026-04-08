package com.example.moneynote.domain.ledger;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.ledger.dto.LedgerRequest;
import com.example.moneynote.domain.ledger.dto.LedgerResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ledgers")
@RequiredArgsConstructor
public class LedgerController {

    private final LedgerService ledgerService;

    @GetMapping
    public ApiResponse<List<LedgerResponse>> getLedgers(Principal principal) {
        return ApiResponse.success(ledgerService.getLedgers(principal.getName()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<LedgerResponse> createLedger(
            @Valid @RequestBody LedgerRequest request,
            Principal principal) {
        return ApiResponse.success(ledgerService.createLedger(request, principal.getName()));
    }

    @GetMapping("/{ledgerId}")
    public ApiResponse<LedgerResponse> getLedger(
            @PathVariable String ledgerId,
            Principal principal) {
        return ApiResponse.success(ledgerService.getLedger(ledgerId, principal.getName()));
    }

    @PutMapping("/{ledgerId}")
    public ApiResponse<LedgerResponse> updateLedger(
            @PathVariable String ledgerId,
            @Valid @RequestBody LedgerRequest request,
            Principal principal) {
        return ApiResponse.success(ledgerService.updateLedger(ledgerId, request, principal.getName()));
    }

    @DeleteMapping("/{ledgerId}")
    public ApiResponse<Void> deleteLedger(
            @PathVariable String ledgerId,
            Principal principal) {
        ledgerService.deleteLedger(ledgerId, principal.getName());
        return ApiResponse.success(null);
    }
}
