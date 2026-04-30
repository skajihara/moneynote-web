package com.example.moneynote.domain.ai;

import com.example.moneynote.common.response.ApiResponse;
import com.example.moneynote.domain.ai.dto.AiAnalyzeRequest;
import com.example.moneynote.domain.ai.dto.AiAnalyzeResponse;
import com.example.moneynote.domain.ai.dto.AiScoreResponse;
import com.example.moneynote.domain.ai.dto.AiSummaryResponse;
import com.example.moneynote.domain.aiadvicecache.PeriodType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Tag(name = "AI 分析", description = "Claude API を使った支出サマリー・節約スコア・詳細アドバイスの取得")
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @Operation(summary = "AI 収支サマリー取得", description = "指定した期間（MONTHLY/ANNUAL/ALL_TIME）の収支をもとに AI がサマリーを生成する。キャッシュあり（ai_cache テーブル）。AI_MOCK=true でダミーレスポンスを返す。VIEWER 以上の権限が必要。")
    @GetMapping("/summary")
    public ApiResponse<AiSummaryResponse> getSummary(
            @PathVariable String ledgerId,
            @RequestParam PeriodType period,
            Principal principal) {
        return ApiResponse.success(
                aiService.getSummary(ledgerId, period, principal.getName()));
    }

    @Operation(summary = "AI 節約スコア取得", description = "帳簿の支出傾向をもとに AI が節約スコア（0〜100）を算出する。キャッシュあり。VIEWER 以上の権限が必要。")
    @GetMapping("/score")
    public ApiResponse<AiScoreResponse> getScore(
            @PathVariable String ledgerId,
            Principal principal) {
        return ApiResponse.success(
                aiService.getScore(ledgerId, principal.getName()));
    }

    @Operation(summary = "AI 詳細アドバイス取得", description = "指定した期間と adviceType に応じた詳細な節約アドバイスを生成する。キャッシュミス時のみ Claude API を呼び出し、結果をキャッシュする。VIEWER 以上の権限が必要。")
    @PostMapping("/analyze")
    public ApiResponse<AiAnalyzeResponse> analyze(
            @PathVariable String ledgerId,
            @Valid @RequestBody AiAnalyzeRequest request,
            Principal principal) {
        // レート制限は AiService 内でキャッシュミス時のみ適用する
        return ApiResponse.success(
                aiService.analyze(ledgerId, request.period(), request.adviceType(),
                        principal.getName()));
    }
}
