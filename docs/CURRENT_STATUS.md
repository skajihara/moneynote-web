# CURRENT_STATUS.md - 現在の開発状況

## 最終更新
2026年4月（Step 9 完了時点）

---

## 完了した Step

| Step | 内容 | ブランチ | 状態 |
|---|---|---|---|
| Step 1 | プロジェクト雛形 | feature/step1-project-scaffold | 完了・develop マージ済み |
| Step 2 | DB設計・マイグレーション | feature/step2-db-migration | 完了・develop マージ済み |
| Step 3 | 認証 API | feature/step3-auth-api | 完了・develop マージ済み |
| Step 4 | 認証画面 | feature/step4-auth-frontend | 完了・develop マージ済み |
| Step 5 | 帳簿管理 API・フロントエンド | feature/step5-ledger | 完了・develop マージ済み |
| Step 6 | 収支明細 API・カレンダー・一覧画面 | feature/step6-transaction | 完了・develop マージ済み |
| Step 7 | ダッシュボード完成 | feature/step7-dashboard | 完了・develop マージ済み |
| Step 8 | 分析レポート・カテゴリ集計 | feature/step8-reports | 完了・develop マージ済み |
| Step 9 | 予算設定・固定費管理 | feature/step9-budget-fixed | 完了・develop マージ済み |

## 現在の状態
- 現在のブランチ: develop
- 次の作業: Step 10（CSVエクスポート・インポート）
- リリース済み: v0.1.0（Step 1〜4）

---

## 重要な技術的決定事項

| 決定内容 | 理由 |
|---|---|
| Java 24 を採用（企画書は Java 21） | 開発 PC に Java 24 がインストール済みのため |
| Gradle 8.14 を採用 | Java 24 対応のため（8.8 では非対応） |
| Spring Boot 3.4.5 を採用 | Java 24 の ASM 対応のため |
| Spring AI 1.0.0 GA を採用 | スターター名が spring-ai-starter-model-anthropic に変更 |
| npm install を使用（npm ci ではなく） | package-lock.json が存在しないため |
| メール送信ホスト名は mailhog（localhost ではなく） | Docker コンテナ間通信のため |
| 未認証リクエストに AuthenticationEntryPoint で 401 を返す | Spring Security デフォルトは 403 を返すため明示的に設定 |
| LedgerAccessValidator をコンポーネントとして共通化 | 全帳簿エンドポイントのアクセス制御を一元管理するため |
| CategoryType の変更は PUT /categories/{id} では不可 | 変更すると既存明細の分類が変わるため |
| POST /api/v1/ledgers ではカテゴリを自動生成しない | 追加帳簿は用途が異なるケースが多いため。register 時のみ生成する |
| seed.ps1 は UTF-8 BOM付きで保存 | PowerShell 5.1 での日本語文字化け対策 |
| TransactionService.createTransaction では accessValidator.validate() の戻り値（Ledger）を再利用 | DB の二重アクセスを避けるため |
| DELETE /transactions/{id} のリクエストボディに scope フィールドを設ける | SINGLE/ALL の切り替えを明示的に表現するため |
| フロントエンドの通貨フォーマット `toLocaleString('ja-JP', {style:'currency'})` は JSDOM で全角円記号を出力する | テストでは `/3,000/` などの regex で検証する |
| Recharts の ResponsiveContainer はテストで jsdom モック対象 | JSDOM は ResizeObserver を持たないため |
| ダッシュボード API は GET /api/v1/ledgers/{ledgerId}/dashboard として TransactionController と分離し DashboardController に実装 | 責務分離のため |
| CategoryReportController を CategoryController と別クラスで同じ base path に定義 | GET /summary と GET /{categoryId}/transactions が既存の PUT/DELETE と競合しないため Spring MVC が正しくルーティングできる |
| CategoryType → TransactionType の変換は `TransactionType.valueOf(type.name())` | 両 Enum は同名の値 INCOME/EXPENSE を持つため |
| CategorySummary（report.ts）と CategoryBreakdown（dashboard.ts）は同一形状 | CategoryPieChart の再利用のため `as unknown as CategoryBreakdown[]` でキャスト |
| カテゴリ別集計はレポートページ（月別・年別タブ）に統合 | 独立したカテゴリページは削除。サイドメニューからも除去 |
| 収入系カラーは text-green-600 / #16A34A、支出系は text-red-500 / #EF4444 に統一 | アプリ全体で緑=収入・赤=支出の配色に統一するため |
| 年間カテゴリ別集計 API: GET /categories/summary/annual?year= | 月次集計メソッドをリファクタリングしてプライベートヘルパー buildCategorySummary を共用 |
| SummaryCards に carryOver? prop を追加 | レポートページで繰り越しをサマリーカードと同じ行に表示するため |
| 円グラフの開始点を12時に統一 | UI の一貫性のため |
| 予算の upsert は POST /budgets で実現（既存レコードがあれば更新、なければ作成） | EXPENSE カテゴリのみ対象。ステータスは NORMAL(<80%)・WARNING(80-99%)・OVER(>=100%) |
| 固定費削除は transactionRepository.deleteByFixedTransactionId → fixedRepository.delete の順 | 参照整合性違反を防ぐため |
| 固定費の明細生成は startDate〜endDate のループ（endDate は必須） | endDate が必須化されたため null チェック不要 |
| dayOfMonth は max=28 に制限 | 月末日（28/29/30/31）の変動を避けるため。実際の日付は `Math.min(dayOfMonth, ym.lengthOfMonth())` で調整 |
| FixedScopeDialog の「全件削除」を廃止し「設定ページへ誘導」に変更 | 誤操作による全件削除を防ぐため。固定費の変更は設定ページ（/settings?tab=fixed）で行う |
| 設定ページ（/settings）を新規作成し固定費タブを実装 | FixedTransactionList と FixedTransactionForm を再利用可能コンポーネントとして実装 |
| 固定費の endDate を必須化（@NotNull）・デフォルト10年後 | endDate=null 運用をやめ、seed.ps1 でも startDate+10年を明示設定。バリデーション: endDate > startDate |
| V10 マイグレーションで既存レコードの end_date=NULL を start_date+10年に更新 | 必須化前の既存データを正規化するため |
| 固定費の終了日を必須化・デフォルト10年後 | 期間不明の固定費も明細生成範囲を明確にするため |
| 固定費編集=全明細削除→再生成 | データの一貫性を保つため |
| 固定費のメモを明細にコピー | 固定費由来の明細の識別を容易にするため |
| 固定費の登録間隔機能はTODO | 実装の複雑さからStep 9の範囲を超えるため |

---

## 重要なファイルパス

### バックエンド

- 認証 API: backend/src/main/java/com/example/moneynote/domain/auth/
- 帳簿 API: backend/src/main/java/com/example/moneynote/domain/ledger/
- カテゴリ API: backend/src/main/java/com/example/moneynote/domain/category/
- 明細 API: backend/src/main/java/com/example/moneynote/domain/transaction/
- ダッシュボード API: backend/src/main/java/com/example/moneynote/domain/dashboard/
- 予算 API: backend/src/main/java/com/example/moneynote/domain/budget/
- 固定費 API: backend/src/main/java/com/example/moneynote/domain/fixedtransaction/
- アクセス制御: backend/src/main/java/com/example/moneynote/common/validator/LedgerAccessValidator.java
- 共通例外: backend/src/main/java/com/example/moneynote/common/exception/
- 共通レスポンス: backend/src/main/java/com/example/moneynote/common/response/
- JWT 設定: backend/src/main/java/com/example/moneynote/common/security/
- DB マイグレーション: backend/src/main/resources/db/migration/
- アプリ設定: backend/src/main/resources/application.yml

### フロントエンド

- 認証画面: frontend/src/app/(auth)/
- アプリ画面: frontend/src/app/(app)/
- ダッシュボードページ: frontend/src/app/(app)/dashboard/
- 明細ページ: frontend/src/app/(app)/ledgers/[ledgerId]/transactions/
- レポートページ: frontend/src/app/(app)/ledgers/[ledgerId]/reports/
- 予算ページ: frontend/src/app/(app)/ledgers/[ledgerId]/budget/
- 設定ページ: frontend/src/app/(app)/settings/ （固定費タブあり）
- カテゴリ集計: レポートページに統合済み（独立ページ廃止）
- API クライアント: frontend/src/lib/api/ （budget.ts, fixed.ts 追加）
- 型定義: frontend/src/types/ （budget.ts, fixed.ts 追加）
- Zustand ストア: frontend/src/stores/
- 共通コンポーネント: frontend/src/components/
  - レイアウト: frontend/src/components/layout/
  - 帳簿: frontend/src/components/ledger/
  - 明細: frontend/src/components/transaction/
  - グラフ: frontend/src/components/charts/
  - 予算: frontend/src/components/budget/
  - 固定費: frontend/src/components/fixed/ （FixedTransactionList.tsx, FixedTransactionForm.tsx）
  - UI汎用: frontend/src/components/ui/

---

## 既知の注意点

1. コード変更後は docker compose up -d --build が必要
   （docker compose up -d だけではイメージが更新されない）

2. seed.ps1 は Step 6（収支明細 API）完了後に完全動作する

3. DB リセットが必要な場合は docker compose down -v を使う
   （-v オプションでボリュームも削除される）

4. Flyway マイグレーション失敗時は docker compose down -v の後に up --build を実行する

5. PUT /api/v1/ledgers/{ledgerId}/categories/order はパス設計上、
   /{categoryId} より前に定義する必要がある（Spring MVC のルーティング順序）

6. user_no_data はログイン後に帳簿0件でモーダルが表示されるユーザー。
   seed.ps1 で register 後に自動生成された帳簿を DELETE で削除している。

7. 固定費の明細生成は冪等ではない（既存月はスキップ）。
   PUT /fixed-transactions/{id} では一旦全削除して再生成するため、
   手動で編集した明細も上書きされる点に注意。

8. 固定費の endDate は必須（@NotNull）。
   フロントエンドのデフォルト値は登録日から10年後を設定することを推奨。
   seed.ps1 では startDate + 10年を計算して設定している。

---

## ブランチ戦略

- main: v0.1.0 タグ済み
- develop: Step 1〜8 マージ済み
- feature/step7-dashboard: Step 9 実装済み（テストグリーン）

### 次回の作業手順（Gate 3 完了後）
```bash
git checkout develop
git checkout -b feature/step10-csv
git push origin feature/step10-csv
```

---

## Step 完了時の更新ルール

このファイルは各 Step の Gate 3（動作確認）完了・コミット前に更新する。

更新内容:
- 完了した Step のステータスを更新する
- 現在の状態セクションを更新する
- 新たな技術的決定事項があれば追記する
- 新たな注意点があれば追記する
