# 開発ガイド

最終更新: 2026年5月（Issue #21 ドキュメント最新化）

---

## ブランチ戦略

詳細は [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md) を参照。

```
main    ← 安定版のみ。直接コミット禁止
develop ← 開発統合ブランチ。PRまたは --no-ff でマージ
 └── feature/issue-{番号}-{内容}   （バグ修正・機能改善）
 └── feature/step{番号}-{内容}     （新機能ステップ）
```

### コミットメッセージ規則

```
feat:     新機能
fix:      バグ修正
test:     テスト追加・修正
refactor: リファクタリング
docs:     ドキュメント更新
chore:    設定・依存関係更新
```

---

## ID 生成規則

PK はアプリ側で生成する文字列型。ユーザー ID のみユーザー入力値。

| プレフィックス | エンティティ |
|---|---|
| `ldg_` | 帳簿 |
| `lperm_` | 帳簿権限 |
| `cat_` | カテゴリ |
| `txn_` | 収支明細 |
| `fix_` | 固定費 |
| `bgt_` | 予算 |
| `aic_` | AI キャッシュ |

---

## Java コーディング規約

### レイヤー構成

```
Controller（入出力・バリデーション）
    ↓
Service（ビジネスロジック）
    ↓
Repository（DB アクセス）
    ↓
Entity（DB マッピング）
```

- **レイヤー越え禁止**: Controller から Repository を直接呼ばない
- **ドメインロジックは Service に集約**
- **JPQL / CriteriaAPI のみ使用**（ネイティブ SQL 禁止）

### 例外クラス

| 例外 | HTTP ステータス | 用途 |
|---|---|---|
| `ResourceNotFoundException` | 404 | リソース未検出 |
| `AccessDeniedException` | 403 | 権限不足 |
| `ValidationException` | 400 | バリデーションエラー |
| `ExternalApiException` | 502 | Claude API 等の外部 API エラー |

### セキュリティコーディングルール

- BCrypt 強度 12 でパスワードハッシュ化
- JWT `type=ACCESS` クレーム検証必須
- 帳簿アクセスは必ず `LedgerAccessValidator` でチェック
- 機密情報（パスワード・トークン）のログ出力禁止
- セキュリティ変更には必ずコメントで理由を記載

### Swagger アノテーション

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

`@io.swagger.v3.oas.annotations.responses.ApiResponse` はアプリの `ApiResponse` と名前衝突するため完全修飾名で使用するか省略して description に記載する。

---

## TypeScript コーディング規約

- **`any` 型禁止**（`unknown` + 型ガードを使う）
- コンポーネントはアロー関数で定義
- API クライアントは `src/lib/api/` に集約
- Zustand ストアは `src/stores/` に集約
- `src/types/` に共通型定義

### コンポーネント設計

```
src/components/
├── layout/      # Header・SideMenu・SubPanel（全画面共通）
├── ui/          # 汎用 UI 部品（Button・Toast 等）
└── {domain}/    # 各ドメインのコンポーネント
```

### 状態管理

- サーバーデータ: API 呼び出しはコンポーネント内の `useState` + `useEffect`（SWR/React Query 未使用）
- グローバル状態: Zustand ストア（`authStore`・`ledgerStore`・`subPanelStore`・`toastStore`）

---

## テスト方針

### バックエンド

- **全 Service に JUnit5 テスト必須**
- **DB テストは Testcontainers**（実際の PostgreSQL を起動してテスト）
- **MockMvc で全 API エンドポイントをテスト**
- **帳簿アクセス制御テスト必須**（OWNER・EDITOR・VIEWER・無権限の 4 ケース）
- カバレッジ目標: 80% 以上

```bash
./gradlew test                  # 全テスト
./gradlew test --tests "*.LedgerServiceTest"  # 特定テスト
```

### フロントエンド

- **全コンポーネントに RTL テスト推奨**（最低限: 表示確認・主要インタラクション）
- Zustand ストアは `setState` で直接セットアップ
- API 呼び出しは `jest.mock('@/lib/api/...')` でモック

```bash
cd frontend && npm test         # 全テスト
```

---

## よくある行き詰まりと対処法

| 症状 | 原因 | 対処 |
|---|---|---|
| Testcontainers が起動しない | Docker Desktop 未起動 | Docker Desktop を起動・WSL2 統合確認 |
| Spring AI エラー | Claude API キー設定ミス | `docker-compose.yml` の `AI_MOCK: "true"` を確認 |
| Flyway マイグレーション失敗 | スキーマが壊れた | `docker compose down -v && docker compose up -d --build` |
| CORS・接続エラー | フロントエンドの API URL 設定ミス | `FRONTEND_URL` 環境変数・バックエンド `:8080` 起動確認 |
| `canEdit()` が false になる | Zustand ストアに `ledgers: []` | テストの `beforeEach` で `ledgers` に適切な値をセット |
| `lower()` に bytea エラー | Hibernate 6 + PG で null String | `keyword`・`categoryId` は空文字列 `''` センチネルを使用 |
| Docker ビルドでフォントエラー | Google Fonts に接続できない | `next/font/google` 使用禁止。CSS システムフォントで代替 |

---

## 起動コマンド早見表

```bash
# 通常起動
docker compose up -d --build

# DB リセット＋シードデータ投入
docker compose down -v
powershell -ExecutionPolicy Bypass -File seed.ps1

# 本番プロファイルで動作確認
SPRING_PROFILES_ACTIVE=prod docker compose up -d --build

# バックエンドテスト
./gradlew test

# フロントエンドテスト
cd frontend && npm test
```

---

## ドキュメント最新化ルール

**機能追加・変更・バグ修正のたびに以下を更新すること:**

- 新規 API エンドポイント → `docs/api-overview.md` + Controller に Swagger アノテーション追加
- DB スキーマ変更 → `docs/architecture.md` の DB 設計方針確認
- 技術的決定事項 → `docs/CURRENT_STATUS.md` の「重要な技術的決定事項」テーブルに追記
- Issue 完了時 → `TODO.md` を更新・GitHub Issue をクローズ
