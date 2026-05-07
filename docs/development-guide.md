# 開発ガイド

最終更新: 2026年5月

---

## Swagger アノテーション

全エンドポイントに `@Tag`・`@Operation` を付与すること。

```java
@Tag(name = "帳簿", description = "帳簿の作成・取得・更新・削除")
@RestController
public class LedgerController {

    @Operation(summary = "帳簿一覧取得", description = "ログインユーザーが参加している全帳簿を返す")
    @GetMapping
    public ApiResponse<List<LedgerResponse>> getLedgers(...) { ... }
}
```

`@io.swagger.v3.oas.annotations.responses.ApiResponse` はアプリの `ApiResponse` と名前衝突するため完全修飾名で使用するか、省略して description に記載する。

---

## テスト Tips

- **`canEdit()` が false になる** → テストの `beforeEach` で `useLedgerStore.setState({ ledgers: [{ ... }] })` に帳簿を入れること（空配列だと権限判定が false になる）

---

## ドキュメント最新化ルール

機能追加・変更・バグ修正のたびに以下を更新すること:

- 新規 API エンドポイント → `docs/api-overview.md` に追記 + Controller に Swagger アノテーション追加
- 技術的決定事項 → `docs/CURRENT_STATUS.md` の「重要な技術的決定事項」テーブルに追記
- Issue 完了時 → `TODO.md` を更新・GitHub Issue をクローズ
