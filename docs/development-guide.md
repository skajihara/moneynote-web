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

## GitHub Secrets の設定

以下の Secrets を GitHub リポジトリに設定すること。
Settings → Secrets and variables → Actions → New repository secret

| Secret名 | 内容 |
|---|---|
| AWS_ROLE_ARN | IAM_R_ka_moneynote_02 の ARN |
| AWS_REGION | ap-northeast-1 |
| ECR_REGISTRY | {AWSアカウントID}.dkr.ecr.ap-northeast-1.amazonaws.com |
| EC2_INSTANCE_ID_ENV1 | 環境1の EC2 インスタンス ID |
| EC2_INSTANCE_ID_ENV2 | 環境2の EC2 インスタンス ID（Step 19 構築後） |

---

## 初期データのログイン情報

`seed.ps1`（Windows）または `seed.sh`（Linux/EC2）を実行すると以下のアカウントが作成される。

| ユーザーID | パスワード | 備考 |
|---|---|---|
| `admin` | `Admin1234!` | システム管理者（`/admin` アクセス可） |
| `user_normal` | `Password123!` | 正常系ユーザー |
| `user_over_budget` | `Password123!` | 予算超過ユーザー |
| `user_no_data` | `Password123!` | データなしユーザー |
| `user_minus_balance` | `Password123!` | 残高マイナスユーザー |
| `user_other` | `Password123!` | 別ユーザー（アクセス禁止確認用） |

---

## ドキュメント最新化ルール

機能追加・変更・バグ修正のたびに以下を更新すること:

- 新規 API エンドポイント → `docs/api-overview.md` に追記 + Controller に Swagger アノテーション追加
- 技術的決定事項 → `docs/CURRENT_STATUS.md` の「重要な技術的決定事項」テーブルに追記
- Issue 完了時 → `TODO.md` を更新・GitHub Issue をクローズ
