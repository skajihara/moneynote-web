# architecture.md - システム構成・技術選定

最終更新: 2026年4月（Step 15 完了時点）

---

## システム概要

**MoneyNote Web** は Web ブラウザから使える家計簿管理アプリ。
スマホアプリ「シンプル家計簿 MoneyNote」の Web 版として、
PC の大画面を活かした 3 ペインレイアウトで操作性を重視した設計とする。

---

## システム構成図

```
                        ブラウザ
                           │ HTTPS :443 / HTTP :80
┌──────────────────────────▼────────────────────────────────┐
│                      Docker Compose                       │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  nginx（:80 / :443）  ← リバースプロキシ            │  │
│  └─────────────────┬─────────────────┬─────────────────┘  │
│                    ↓                 ↓                    │
│  ┌─────────────────┐  ┌──────────────────────────────┐    │
│  │  Next.js 14     │  │  Spring Boot 3.4.5            │    │
│  │  TypeScript     │  │  Java 24                     │    │
│  │  （内部のみ）   │  │  Spring Security + JWT        │    │
│  └─────────────────┘  │  Spring AI                   │    │
│                        │  （内部のみ）                │    │
│                        └──────────────┬───────────────┘    │
│  ┌─────────────────┐                  │                    │
│  │  PostgreSQL 16  │◀─────────────────┤                    │
│  │  （内部）       │                  │                    │
│  └─────────────────┘  ┌───────────────┴───────────────┐    │
│                        │  Redis 7                      │    │
│  ┌─────────────────┐  │  セッション・キャッシュ        │    │
│  │  Mailhog        │  │  レート制限                   │    │
│  │  :8025（Web UI）│  │  （内部）                     │    │
│  └─────────────────┘  └───────────────────────────────┘    │
│                                                           │
│                            ↕ Claude API（外部）           │
└───────────────────────────────────────────────────────────┘
```

---

## 技術スタック

### バックエンド

| 技術 | バージョン | 用途 |
|---|---|---|
| Java | 24 | 開発言語 |
| Spring Boot | 3.4.5 | アプリケーションフレームワーク |
| Spring Security | 6.x | 認証・認可 |
| Spring Data JPA | — | DB アクセス |
| Spring AI | 1.0.0 GA | Claude API 連携 |
| Hibernate | 6.6.x | ORM |
| PostgreSQL | 16 | メイン DB |
| Flyway | 9.x | DB マイグレーション |
| Redis | 7.x | セッション・キャッシュ・レート制限 |
| Apache Commons CSV | 1.11.0 | CSV 入出力 |
| JJWT | 0.12.6 | JWT 生成・検証 |
| Lombok | 1.18.38 | ボイラープレート削減 |
| Springdoc OpenAPI | 2.5.0 | Swagger UI 自動生成 |
| JUnit5 | — | 単体・結合テスト |
| Testcontainers | — | DB を使った統合テスト |
| Gradle | 8.14 | ビルドツール |

### フロントエンド

| 技術 | バージョン | 用途 |
|---|---|---|
| Next.js | 14 | フレームワーク（App Router） |
| TypeScript | 5.x | 開発言語 |
| Tailwind CSS | 3.x | スタイリング |
| Zustand | 4.x | 状態管理 |
| React Hook Form | — | フォーム管理 |
| Zod | — | バリデーション |
| Recharts | 2.x | グラフ描画 |
| Jest | — | テスト |
| React Testing Library | — | コンポーネントテスト |

### インフラ

| 技術 | 用途 |
|---|---|
| Docker Compose | ローカル開発環境の一括管理 |
| nginx | リバースプロキシ・HTTPS終端 |
| Mailhog | 開発用メールサーバー（ローカル完結） |
| GitHub Actions | CI/CD パイプライン（Step 18 で構築予定） |

---

## アーキテクチャ設計方針

### バックエンド：レイヤードアーキテクチャ

```
Controller（API の入出口・バリデーション）
    ↓
Service（ビジネスロジック）
    ↓
Repository（DB アクセス）
    ↓
Entity（DB テーブルのマッピング）
```

レイヤー越えは禁止（Controller から Repository を直接呼ばない等）。

### フロントエンド：3ペインレイアウト

```
┌──────────┬──────────────────────┬──────────────┐
│サイドメニュー│  メインコンテンツ    │  サブパネル  │
│（固定）  │  （選択中のページ）   │  （詳細・編集）│
└──────────┴──────────────────────┴──────────────┘
```

PC の大画面を最大限に活かし、画面遷移を最小化。
サブパネルで詳細・編集を表示することでメインコンテンツを見ながら操作できる。

### 認証方式：JWT（アクセストークン + リフレッシュトークン）

```
アクセストークン（15分）→ レスポンスボディで返す → メモリ（Zustand）に保持
リフレッシュトークン（7日）→ HttpOnly Cookie で返す → JS からアクセス不可
```

アクセストークンをメモリのみに保持することで XSS に対して安全。
SameSite=Strict で CSRF を防止。

### DB 設計方針

| 方針 | 内容 |
|---|---|
| PK | 全テーブルで文字列型。アプリ側でプレフィックス付き ID を生成 |
| タイプ・区分 | Java 側は Enum・DB 側は VARCHAR |
| 残高計算 | DB に残高カラムを持たず「初期残高 ± 累積収支」でアプリ側が計算 |
| 論理削除 | 帳簿・カテゴリは is_active フラグで論理削除 |
| マイグレーション | Flyway でバージョン管理 |

---

## パッケージ構成

### バックエンド

```
com.example.moneynote
├── common
│   ├── exception      # カスタム例外クラス・GlobalExceptionHandler
│   ├── ratelimit      # Redis レート制限（ログイン失敗 5 回 / 15 分ロック）
│   ├── response       # ApiResponse<T>（統一レスポンスラッパー）
│   ├── security       # JwtTokenProvider・JwtAuthenticationFilter
│   ├── util           # IdGenerator
│   └── validator      # LedgerAccessValidator（帳簿アクセス制御）
├── config             # SecurityConfig・RedisConfig・Spring AI 設定 等
└── domain
    ├── ai             # AI 支出アドバイス（Controller・Service・DTO）
    ├── aiadvicecache  # AI キャッシュ（Entity・Repository）
    ├── auth           # 認証 API（Controller・Service・DTO）
    ├── budget         # 予算（Controller・Service・Repository・Entity・DTO）
    ├── category       # カテゴリ（Controller・Service・Repository・Entity・DTO）
    ├── csv            # CSV エクスポート・インポート（Controller・Service・DTO）
    ├── dashboard      # ダッシュボード（Controller・Service・DTO）
    ├── fixedtransaction # 固定費（Controller・Service・Repository・Entity・DTO）
    ├── ledger         # 帳簿（Controller・Service・Repository・Entity・DTO）
    ├── ledgerpermission # 帳簿権限（Entity・Repository）
    ├── report         # 分析レポート（Controller・Service・DTO）
    ├── transaction    # 明細（Controller・Service・Repository・Entity・DTO）
    └── user           # ユーザー（Entity・Repository・DTO）
```

### フロントエンド

```
src
├── app
│   ├── (auth)                   # 認証不要ページ
│   │   ├── login
│   │   ├── register
│   │   └── password-reset
│   │       └── confirm
│   └── (app)                    # 認証必要ページ（3ペインレイアウト）
│       ├── dashboard
│       ├── ledgers/[ledgerId]
│       │   ├── transactions
│       │   ├── reports
│       │   ├── categories
│       │   ├── budget
│       │   └── ai
│       └── settings
├── components
│   ├── budget
│   ├── charts
│   ├── csv
│   ├── fixed
│   ├── layout        # Header・SideMenu・SubPanel
│   ├── ledger
│   ├── settings
│   ├── transaction
│   └── ui
├── lib
│   └── api           # API クライアント（client.ts・auth.ts・各ドメイン）
├── stores            # Zustand ストア（auth・ledger・subPanel・toast 等）
└── types             # 型定義
```

---

## セキュリティ設計

| 脅威 | 対策 |
|---|---|
| XSS | アクセストークンをメモリのみに保持（LocalStorage に保存しない） |
| CSRF | SameSite=Strict Cookie・JWT 認証（CSRF トークン不要） |
| SQLインジェクション | JPQL・CriteriaAPI を使用（ネイティブ SQL 禁止） |
| ブルートフォース | ログイン失敗5回で15分ロック（Redis で管理） |
| 不正アクセス | 帳簿アクセス制御（LedgerAccessValidator）で全 API を保護 |
| パスワード漏洩 | BCrypt 強度12でハッシュ化 |
| トークン盗用 | リフレッシュトークンは HttpOnly Cookie で JS からアクセス不可 |
