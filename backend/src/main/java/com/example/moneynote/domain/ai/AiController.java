package com.example.moneynote.domain.ai;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.ai.dto.AiAnalyzeRequest;
import com.example.moneynote.domain.ai.dto.AiAnalyzeResponse;
import com.example.moneynote.domain.ai.dto.AiScoreResponse;
import com.example.moneynote.domain.ai.dto.AiSummaryResponse;
import com.example.moneynote.domain.aiadvicecache.PeriodType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @GetMapping("/summary")
    public ApiResponse<AiSummaryResponse> getSummary(
            @PathVariable String ledgerId,
            @RequestParam PeriodType period,
            Principal principal) {
        return ApiResponse.success(
                aiService.getSummary(ledgerId, period, principal.getName()));
    }

    @GetMapping("/score")
    public ApiResponse<AiScoreResponse> getScore(
            @PathVariable String ledgerId,
            Principal principal) {
        return ApiResponse.success(
                aiService.getScore(ledgerId, principal.getName()));
    }

    @PostMapping("/analyze")
    public ApiResponse<AiAnalyzeResponse> analyze(
            @PathVariable String ledgerId,
            @Valid @RequestBody AiAnalyzeRequest request,
            Principal principal) {
        return ApiResponse.success(
                aiService.analyze(ledgerId, request.period(), request.adviceType(),
                        principal.getName()));
    }
}
