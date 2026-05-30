# MoneyNote Web - GitHub Copilot Instructions

## プロジェクト概要
マルチアカウント・マルチ帳簿対応の Web 版家計簿管理アプリ。
モノレポ構成: backend/（Spring Boot 3.x / Java 24）、frontend/（Next.js 14 / TypeScript）

## バックエンド（Java / Spring Boot）ルール

### アーキテクチャ
- Controller → Service → Repository の厳守（レイヤー越え禁止）
- 全 API に `/api/v1/` プレフィックス
- 全 `/api/v1/ledgers/{ledgerId}/*` は DB アクセス制御必須（権限なし 403）

### ID 生成規則（アプリ側生成・String 型）
- 帳簿: `ldg_` / 帳簿権限: `lperm_` / カテゴリ: `cat_`
- 明細: `txn_` / 固定費: `fix_` / 予算: `bgt_` / AIキャッシュ: `aic_`

### 例外クラス（必ずこれを使う）
- ResourceNotFoundException → 404
- AccessDeniedException → 403
- ValidationException → 400
- ExternalApiException → 502

### レスポンス形式
- 成功: `{"data":{...},"error":null,"timestamp":"..."}`
- エラー: `{"data":null,"error":{"code":"E001","message":"..."},"timestamp":"..."}`

### セキュリティ
- BCrypt 強度 12
- JWT: アクセス 15 分（Body）・リフレッシュ 7 日（HttpOnly Cookie SameSite=Strict）
- JPQL / CriteriaAPI のみ使用（ネイティブ SQL 禁止）
- 機密情報をログ出力禁止

### テスト
- 全 Service に JUnit5
- DB テストは Testcontainers
- MockMvc で全 API テスト
- 帳簿アクセス制御テスト必須
- テストなし実装禁止

## フロントエンド（TypeScript / Next.js 14）ルール

### コーディング
- any 型禁止（型安全を徹底する）
- コンポーネントはアロー関数
- API クライアントは `lib/api/` に集約
- Zustand でグローバル状態管理
- React Hook Form + Zod でフォームバリデーション

### テスト
- Jest + React Testing Library
- カバレッジ 80% 以上

## AI 機能
- `ai.mock=true` で Claude API を回避（開発中はモック使用）

## 禁止事項
- TypeScript の any 型
- ネイティブ SQL（バックエンド）
- テストなしの実装
- 機密情報のハードコード

## MCP ツールの使用方針
- ライブラリの実装・API 調査時は必ず context7 で最新ドキュメントを確認する
- コードのシンボル検索・参照調査は serena を使う（find_symbol・find_referencing_symbols）
