# CLAUDE.md

## プロジェクト概要
MoneyNote Web - モノレポ（`backend/` Spring Boot 3.x / Java 24、`frontend/` Next.js 14 / TypeScript）
マルチアカウント・マルチ帳簿。PC大画面3ペインレイアウト。

## 技術スタック
**Backend**: Spring Boot 3.x, Java 24, Spring Security+JWT, Spring AI+Claude API, JPA+Hibernate, PostgreSQL 16, Flyway, Redis 7, JUnit5+Testcontainers+MockMvc
**Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand, React Hook Form+Zod, Recharts, Jest+RTL

## ID生成規則（PKはアプリ側生成・文字列型。ユーザーIDのみユーザー入力）
`ldg_` 帳簿 / `lperm_` 帳簿権限 / `cat_` カテゴリ / `txn_` 明細 / `fix_` 固定費 / `bgt_` 予算 / `aic_` AIキャッシュ

## アーキテクチャ原則
1. Controller → Service → Repository を厳守（レイヤー越え禁止）
2. ドメインロジックはServiceに集約
3. 全APIに `/api/v1/` プレフィックス
4. 全 `/api/v1/ledgers/{ledgerId}/*` でDBアクセス制御（権限なし403）
5. AI呼び出しはモック切替対応（`ai.mock=true` で Claude API を回避）

## セキュリティ必須ルール
- BCrypt強度12 / JWT: アクセス15分（Bodyで返す）・リフレッシュ7日（HttpOnly Cookie SameSite=Strict）
- `type=ACCESS` クレーム検証必須（リフレッシュトークンのBearer悪用防止）
- 帳簿アクセスは必ずDBで権限確認。権限なし403
- ログイン失敗: 同一IP 5回で15分ロック（Redis）
- JPQL/CriteriaAPI使用（ネイティブSQL禁止）。機密情報をログ出力禁止
- セキュリティ変更時はコメントに理由を記載

## コーディング規約
**Java例外**: `ResourceNotFoundException(404)` / `AccessDeniedException(403)` / `ValidationException(400)` / `ExternalApiException(502)`
**レスポンス**: `{"data":{...},"error":null,"timestamp":"..."}` / エラー: `{"data":null,"error":{"code":"E001","message":"..."},"timestamp":"..."}`
**TypeScript**: any型禁止 / コンポーネントはアロー関数 / APIクライアントは `lib/api/` に集約

## テスト必須ルール
全ServiceにJUnit5 / DBテストはTestcontainers / MockMvcで全API / 帳簿アクセス制御テスト含む / カバレッジ80%以上 / テストなし実装禁止

## エージェント行動ルール
**会話再開時**: `docs/CURRENT_STATUS.md` の「コンテキストリフレッシュ後の再開手順」を参照して git 状態を確認する
**実装前**: CLAUDE.md → `docs/CURRENT_STATUS.md` → 設計書（`docs/`配下）の順で読む。設計書なしは `/design` で出力し承認を待つ
**AWS作業前**: `docs/aws-guidelines.md` を読み、全ての項目を厳守・遵守すること
**MCP活用**: コード実装・検索時は serena を使う（呼出前に `initial_instructions` 必須）。ライブラリ実装時は context7 で最新ドキュメントを確認する。新規 TODO は GitHub MCP で Issues 登録し `TODO.md` に番号を記録する。詳細: `docs/MCP_GUIDE.md`
**自律実行OK**: ファイル操作 / `./gradlew test` / `npm test` / `docker compose up -d --build` / `seed.ps1`
**禁止**: コミット・プッシュ（人間のみ）/ テストなし実装 / any型（TypeScript）
**マニュアル更新**: 機能の追加・改修を行った場合は、変更した機能に対応する `docs/` 配下のマニュアルページ（GitHub Pages）を必ず更新する
**エラー時**: 原因・影響範囲・修正方針を先に説明してから修正する
**Gate 3後**: `docs/CURRENT_STATUS.md` を更新（完了Stepのステータス・現在の状態・技術的決定事項・注意点）してからコミットへ

## 機密情報管理（必須ルール）

### コミット禁止ファイル・情報
以下は絶対にGitリポジトリにコミットしない。
- .env / .env.* 等の環境変数ファイル
- AWSアクセスキー・シークレットキー
- JWT_SECRET 等のシークレット文字列
- Claude APIキー（CLAUDE_API_KEY）
- DBのパスワード
- SSHキーペア（.pem ファイル）
- AWS認証情報の実値
- .env.env1 / .env.env2 等の機密情報を含む環境変数ファイル

### 作業前の確認（AWS・インフラ作業時）
- 作成・編集するファイルに機密情報が含まれていないか確認する
- .gitignore に対象ファイルが含まれているか確認する
- git add 前に git diff でコミット内容を確認する

### 機密情報の管理場所
- ローカル環境: .env ファイル（.gitignore 済み）
- AWS環境: Secrets Manager または Parameter Store
- CI/CD: GitHub Actions の Secrets
- 機密情報をコードにハードコードしない
- ログに機密情報を出力しない

### AWSリソース操作時の注意
- IAMアクセスキーをコードや設定ファイルに埋め込まない
- SSHキーペア（.pem）をリポジトリに追加しない
- AWSコンソールのスクリーンショットにアクセスキーが写っていないか確認する

## よくある行き詰まり
- Testcontainers失敗 → Docker Desktop起動・WSL2統合確認
- Spring AI エラー → `docker-compose.yml` の `AI_MOCK: "true"` を確認
- Flyway失敗 → `docker compose down -v && docker compose up -d --build`
- CORS/接続エラー → `FRONTEND_URL` 環境変数・バックエンド `:8080` 起動確認

## 起動コマンド
```bash
docker compose up -d --build                                    # 通常起動
powershell -ExecutionPolicy Bypass -File seed.ps1               # DBリセット＋データ投入
docker-compose -f docker-compose.env1.yml up -d --build        # 環境1（AWS EC2）で起動確認
# アクセス: https://localhost | https://localhost/swagger-ui.html | http://localhost:8025
```

## 詳細ドキュメント
- 開発状況・再開手順: `docs/CURRENT_STATUS.md`
- ブランチ戦略・コミット規則: `docs/BRANCH_STRATEGY.md`
- リリース計画: `docs/RELEASE_PLAN.md`
- MCP運用方針・コマンド一覧: `docs/MCP_GUIDE.md`
- AWSリソース作成・運用ガイドライン: `docs/aws-guidelines.md`
- コマンド実装: `.claude/commands/`
