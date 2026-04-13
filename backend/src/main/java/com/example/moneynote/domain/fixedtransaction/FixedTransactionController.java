package com.example.moneynote.domain.fixedtransaction;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.fixedtransaction.dto.FixedTransactionRequest;
import com.example.moneynote.domain.fixedtransaction.dto.FixedTransactionResponse;
import com.example.moneynote.domain.fixedtransaction.dto.GenerateResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/fixed-transactions")
@RequiredArgsConstructor
public class FixedTransactionController {

    private final FixedTransactionService fixedTransactionService;

    /** GET /api/v1/ledgers/{ledgerId}/fixed-transactions */
    @GetMapping
    public ApiResponse<List<FixedTransactionResponse>> getFixedTransactions(
            @PathVariable String ledgerId,
            @RequestParam(required = false) String status,
            Principal principal) {
        return ApiResponse.success(
                fixedTransactionService.getFixedTransactions(ledgerId, status, principal.getName()));
    }

    /** POST /api/v1/ledgers/{ledgerId}/fixed-transactions */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<FixedTransactionResponse> createFixedTransaction(
            @PathVariable String ledgerId,
            @RequestBody @Valid FixedTransactionRequest request,
            Principal principal) {
        return ApiResponse.success(
                fixedTransactionService.createFixedTransaction(ledgerId, request, principal.getName()));
    }

    /** PUT /api/v1/ledgers/{ledgerId}/fixed-transactions/{fixedId} */
    @PutMapping("/{fixedId}")
    public ApiResponse<FixedTransactionResponse> updateFixedTransaction(
            @PathVariable String ledgerId,
            @PathVariable String fixedId,
            @RequestBody @Valid FixedTransactionRequest request,
            Principal principal) {
        return ApiResponse.success(
                fixedTransactionService.updateFixedTransaction(ledgerId, fixedId, request, principal.getName()));
    }

    /** DELETE /api/v1/ledgers/{ledgerId}/fixed-transactions/{fixedId} */
    @DeleteMapping("/{fixedId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFixedTransaction(
            @PathVariable String ledgerId,
            @PathVariable String fixedId,
            Principal principal) {
        fixedTransactionService.deleteFixedTransaction(ledgerId, fixedId, principal.getName());
    }

    /** POST /api/v1/ledgers/{ledgerId}/fixed-transactions/{fixedId}/generate */
    @PostMapping("/{fixedId}/generate")
    public ApiResponse<GenerateResult> generateTransactions(
            @PathVariable String ledgerId,
            @PathVariable String fixedId,
            Principal principal) {
        return ApiResponse.success(
                fixedTransactionService.generateTransactions(ledgerId, fixedId, principal.getName()));
    }
}
