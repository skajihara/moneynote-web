# API 仕様概要

最終更新: 2026年5月（Issue #21 ドキュメント最新化）

---

## 認証方式

### JWT（アクセストークン + リフレッシュトークン）

| トークン | 有効期限 | 保管場所 |
|---|---|---|
| アクセストークン | 15 分 | レスポンスボディ → Zustand（メモリ） |
| リフレッシュトークン | 7 日 | HttpOnly Cookie（SameSite=Strict, Path=/api/v1/auth） |

- アクセストークンのみ `Authorization: Bearer <token>` ヘッダーで送信
- JWT クレームに `type=ACCESS` を含め、リフレッシュトークンの Bearer 悪用を防止
- ログイン失敗：同一 IP 5 回で 15 分ロック（Redis 管理）

---

## 共通レスポンス形式

### 成功時

```json
{
  "data": { ... },
  "error": null,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### エラー時

```json
{
  "data": null,
  "error": {
    "code": "E001",
    "message": "エラーメッセージ"
  },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

## エラーコード一覧

| HTTP | コード | 説明 |
|---|---|---|
| 400 | E400 | バリデーションエラー |
| 401 | E401 | 認証エラー（トークン無効・期限切れ） |
| 403 | E403 | 権限エラー（帳簿アクセス制御・操作権限不足） |
| 404 | E404 | リソース未検出 |
| 429 | E429 | レート制限超過（AI 分析・ログイン失敗） |
| 502 | E502 | 外部 API エラー（Claude API） |
| 500 | E500 | サーバー内部エラー |

---

## 帳簿アクセス制御

`/api/v1/ledgers/{ledgerId}/*` のすべてのエンドポイントは `LedgerAccessValidator` でアクセス制御を行う。

| 操作 | 必要権限 |
|---|---|
| 参照（GET） | VIEWER 以上 |
| 作成・更新・削除 | EDITOR 以上 |
| カテゴリ管理・予算設定・固定費管理 | EDITOR 以上 |
| メンバー管理（招待・変更・削除） | ADMIN 以上 |
| 帳簿削除 | OWNER のみ |

権限階層: `OWNER > ADMIN > EDITOR > VIEWER`

---

## エンドポイント一覧

### 認証 `/api/v1/auth`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| POST | /register | ユーザー登録 | 不要 |
| POST | /login | ログイン（アクセストークン返却・リフレッシュトークン Cookie セット） | 不要 |
| POST | /logout | ログアウト（Cookie クリア） | 要認証 |
| POST | /refresh | アクセストークン更新（Cookie のリフレッシュトークン使用） | Cookie |
| POST | /password-reset/request | パスワードリセットメール送信 | 不要 |
| POST | /password-reset/confirm | パスワードリセット確定 | 不要 |

---

### ユーザー `/api/v1/users`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | /me | プロフィール取得 | 要認証 |
| PUT | /me | プロフィール更新 | 要認証 |
| PUT | /me/password | パスワード変更 | 要認証 |
| PUT | /me/theme | テーマカラー更新 | 要認証 |
| DELETE | /me | アカウント削除 | 要認証 |

---

### 帳簿 `/api/v1/ledgers`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | / | 帳簿一覧（自分が参加している全帳簿） | 要認証 |
| POST | / | 帳簿作成 | 要認証 |
| GET | /{ledgerId} | 帳簿詳細 | VIEWER 以上 |
| PUT | /{ledgerId} | 帳簿更新 | OWNER |
| DELETE | /{ledgerId} | 帳簿削除（カスケード物理削除） | OWNER |

---

### 帳簿メンバー `/api/v1/ledgers/{ledgerId}/members`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | / | メンバー一覧 | VIEWER 以上 |
| POST | / | メンバー招待 | ADMIN 以上 |
| PUT | /{userId} | 権限変更 | ADMIN 以上 |
| DELETE | /{userId} | メンバー削除 | ADMIN 以上 |

---

### ダッシュボード `/api/v1/ledgers/{ledgerId}`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | /dashboard | ダッシュボード（残高・収支・最近の明細） | VIEWER 以上 |

クエリパラメータ: `year`, `month`, `recentCount`（デフォルト 10）

---

### 収支明細 `/api/v1/ledgers/{ledgerId}/transactions`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | / | 月次明細一覧（`year`, `month` 必須） | VIEWER 以上 |
| POST | / | 明細作成 | EDITOR 以上 |
| GET | /search | 明細検索（`keyword`, `categoryId`, `startDate`, `endDate`） | VIEWER 以上 |
| GET | /{transactionId} | 明細詳細 | VIEWER 以上 |
| PUT | /{transactionId} | 明細更新 | EDITOR 以上 |
| DELETE | /{transactionId} | 明細削除 | EDITOR 以上 |
| GET | /export | CSV エクスポート（`startDate`, `endDate`, `categoryIds`, `includeFixed`） | VIEWER 以上 |
| POST | /import | CSV インポート（`multipart/form-data`） | EDITOR 以上 |

残高取得: `GET /api/v1/ledgers/{ledgerId}/balance`

> **注意**: `keyword`・`categoryId` の検索は空文字列センチネル値で全件検索（Hibernate 6 + PostgreSQL の null 型問題回避）

---

### カテゴリ `/api/v1/ledgers/{ledgerId}/categories`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | / | カテゴリ一覧（`type`: INCOME/EXPENSE） | VIEWER 以上 |
| POST | / | カテゴリ作成 | EDITOR 以上 |
| PUT | /order | 並び替え | EDITOR 以上 |
| PUT | /{categoryId} | カテゴリ更新 | EDITOR 以上 |
| DELETE | /{categoryId} | カテゴリ削除（論理削除） | EDITOR 以上 |
| GET | /summary | 月次カテゴリ別集計 | VIEWER 以上 |
| GET | /summary/annual | 年間カテゴリ別集計 | VIEWER 以上 |
| GET | /summary/all-time | 全期間カテゴリ別集計 | VIEWER 以上 |
| GET | /{categoryId}/transactions | カテゴリ別明細 + 月別推移 | VIEWER 以上 |

---

### レポート `/api/v1/ledgers/{ledgerId}/reports`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | /monthly | 月次レポート（収支・カテゴリ集計） | VIEWER 以上 |
| GET | /annual | 年間レポート（月別推移） | VIEWER 以上 |
| GET | /balance-history | 残高推移（全期間月別） | VIEWER 以上 |

---

### 予算 `/api/v1/ledgers/{ledgerId}/budgets`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | / | 予算一覧（`year`, `month` 必須） | VIEWER 以上 |
| POST | / | 予算作成・更新（upsert） | EDITOR 以上 |
| GET | /heatmap | 予算達成率ヒートマップ（`months`: 1〜24） | VIEWER 以上 |
| DELETE | /{budgetId} | 予算削除 | EDITOR 以上 |

---

### 固定費 `/api/v1/ledgers/{ledgerId}/fixed-transactions`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | / | 固定費一覧（`status`: active/inactive） | VIEWER 以上 |
| POST | / | 固定費作成 | EDITOR 以上 |
| PUT | /{fixedId} | 固定費更新 | EDITOR 以上 |
| DELETE | /{fixedId} | 固定費削除 | EDITOR 以上 |
| POST | /{fixedId}/generate | 固定費から明細生成 | EDITOR 以上 |

> `endDate` は必須・デフォルト 10 年後。`endDate > startDate` バリデーション有り。

---

### AI 分析 `/api/v1/ledgers/{ledgerId}/ai`

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | /summary | AI 収支サマリー（`period`: MONTHLY/ANNUAL/ALL_TIME） | VIEWER 以上 |
| GET | /score | AI 節約スコア | VIEWER 以上 |
| POST | /analyze | AI 詳細アドバイス（`period`, `adviceType`） | VIEWER 以上 |

- キャッシュあり（`ai_cache` テーブル）
- モックモード: `AI_MOCK=true` で Claude API を呼ばずにダミーレスポンスを返す
