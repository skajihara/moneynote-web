# architecture.md - システム構成・技術選定

最終更新: 2026年4月（Step 5 完了時点）

---

## システム概要

**MoneyNote Web** は Web ブラウザから使える家計簿管理アプリ。
スマホアプリ「シンプル家計簿 MoneyNote」の Web 版として、
PC の大画面を活かした 3 ペインレイアウトで操作性を重視した設計とする。

---

## システム構成図

```
┌─────────────────────────────────────────────────────┐
│                  Docker Compose                     │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │  Next.js 14  │    │    Spring Boot 3.4.5      │  │
│  │  TypeScript  │◀──▶│    Java 24                │  │
│  │  Tailwind    │    │    Spring Security + JWT  │  │
│  │  :3000       │    │    Spring AI              │  │
│  └──────────────┘    │    :8080                  │  │
│                      └────────────┬─────────────┘  │
│  ┌──────────────┐                 │                 │
│  │  PostgreSQL  │◀────────────────┤                 │
│  │  16          │                 │                 │
│  │  :5432       │    ┌────────────┴─────────────┐  │
│  └──────────────┘    │  Redis 7                 │  │
│                      │  セッション・キャッシュ    │  │
│  ┌──────────────┐    │  レート制限               │  │
│  │  Mailhog     │    │  :6379                   │  │
│  │  :8025       │    └──────────────────────────┘  │
│  └──────────────┘                                   │
│                           ↕ Claude API（外部）      │
└─────────────────────────────────────────────────────┘
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
| Mailhog | 開発用メールサーバー（無料・ローカル完結） |
| GitHub Actions | CI/CD パイプライン（Step 13 で構築予定） |

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

**採用理由：** 責務が明確で保守性が高い。Spring Boot の標準的な構成であり、
Claude Code が最も迷わず実装できる構成。

### フロントエンド：3ペインレイアウト

```
┌──────────┬──────────────────────┬──────────────┐
│サイドメニュー│  メインコンテンツ    │  サブパネル  │
│（固定）  │  （選択中のページ）   │  （詳細・編集）│
└──────────┴──────────────────────┴──────────────┘
```

**採用理由：** PC の大画面を最大限に活かすため。
画面遷移を最小化してユーザーの操作コストを下げる。
サブパネルで詳細・編集を表示することで
メインコンテンツを見ながら操作できる。

### 認証方式：JWT（アクセストークン + リフレッシュトークン）

```
アクセストークン（15分）→ レスポンスボディで返す → メモリ（Zustand）に保持
リフレッシュトークン（7日）→ HttpOnly Cookie で返す → JS からアクセス不可
```

**採用理由：**
- アクセストークンをメモリに保持することで XSS 攻撃に対して安全
- リフレッシュトークンを HttpOnly Cookie に保持することで JS から盗めない
- SameSite=Strict で CSRF 攻撃を防止

### DB 設計方針

| 方針 | 内容 |
|---|---|
| PK | 全テーブルで文字列型。アプリ側でプレフィックス付き ID を生成 |
| タイプ・区分 | Java 側は Enum・DB 側は VARCHAR |
| 残高計算 | DB に残高カラムを持たず「初期残高 ± 累積収支」でアプリ側が計算 |
| 論理削除 | 帳簿・カテゴリは is_active フラグで論理削除 |
| マイグレーション | Flyway でバージョン管理。V1〜V9 が適用済み |

---

## パッケージ構成

### バックエンド

```
com.example.moneynote
├── common
│   ├── exception      # カスタム例外クラス・GlobalExceptionHandler
│   ├── response       # ApiResponse<T>（統一レスポンスラッパー）
│   ├── security       # JwtTokenProvider・JwtAuthenticationFilter
│   └── util           # IdGenerator
├── config
│   └── SecurityConfig # Spring Security 設定
└── domain
    ├── auth           # 認証 API（Controller・Service・DTO）
    ├── user           # ユーザー Entity・Repository
    ├── ledger         # 帳簿 Entity・Repository・Controller・Service
    ├── ledgerpermission # 帳簿権限 Entity・Repository
    ├── category       # カテゴリ Entity・Repository・Controller・Service
    ├── transaction    # 明細 Entity・Repository（Step 6 で実装）
    ├── fixedtransaction # 固定費 Entity・Repository（Step 9 で実装）
    ├── budget         # 予算 Entity・Repository（Step 9 で実装）
    └── aiadvicecache  # AI キャッシュ Entity・Repository（Step 11 で実装）
```

### フロントエンド

```
src
├── app
│   ├── (auth)         # 認証不要ページ（login・register・password-reset）
│   └── (app)          # 認証必要ページ（3ペインレイアウト）
│       ├── dashboard
│       ├── ledgers/[ledgerId]
│       │   ├── transactions  # Step 6 で実装
│       │   ├── reports       # Step 8 で実装
│       │   ├── categories    # Step 8 で実装
│       │   ├── budget        # Step 9 で実装
│       │   └── ai            # Step 11 で実装
│       └── settings          # Step 12 で実装
├── components
│   ├── layout         # Header・SideMenu・SubPanel
│   ├── ledger         # LedgerCreateModal
│   └── ui             # Toast・共通 UI パーツ
├── lib
│   └── api            # API クライアント（client.ts・auth.ts・ledger.ts）
├── stores             # Zustand ストア（auth・ledger・subPanel・toast）
└── types              # 型定義（Step 6 以降で追加）
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

---

## 開発フロー

```
Claude.ai（設計・方針決定）
    ↓
Claude Code（実装・テスト・動作確認）
    ↓
人間（Gate 1: 設計承認 / Gate 2: テスト確認 / Gate 3: 動作確認）
    ↓
人間（git commit & push）
    ↓
develop へマージ
```

---

## 今後の実装予定

| Step | 内容 | 状態 |
|---|---|---|
| Step 6 | 収支明細 API・カレンダー・一覧画面 | 未着手 |
| Step 7 | ダッシュボード完成 | 未着手 |
| Step 8 | 分析レポート・カテゴリ集計 | 未着手 |
| Step 9 | 予算設定・固定費管理 | 未着手 |
| Step 10 | CSV エクスポート・インポート | 未着手 |
| Step 11 | AI 支出分析・アドバイス | 未着手 |
| Step 12 | 設定・管理画面 | 未着手 |
| Step 13 | セキュリティ強化・CI/CD | 未着手 |
| Step 14 | 品質仕上げ・ドキュメント | 未着手 |
