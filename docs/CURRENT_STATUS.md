# CURRENT_STATUS.md

最終更新: 2026年5月（Issue #33 システム管理者機能 実装完了・テストグリーン）

---

## 完了した Step

| Step | 内容 | 状態 |
|---|---|---|
| Step 1 | プロジェクト雛形 | 完了・develop マージ済み |
| Step 2 | DB設計・マイグレーション | 完了・develop マージ済み |
| Step 3 | 認証 API | 完了・develop マージ済み |
| Step 4 | 認証画面 | 完了・develop マージ済み |
| Step 5 | 帳簿管理 API・フロントエンド | 完了・develop マージ済み |
| Step 6 | 収支明細 API・カレンダー・一覧画面 | 完了・develop マージ済み |
| Step 7 | ダッシュボード完成 | 完了・develop マージ済み |
| Step 8 | 分析レポート・カテゴリ集計 | 完了・develop マージ済み |
| Step 9 | 予算設定・固定費管理 | 完了・develop マージ済み |
| Step 10 | CSVエクスポート・インポート | 完了・develop マージ済み |
| Step 11 | AI支出分析・アドバイス | 完了・develop マージ済み |
| Step 12 | 設定・管理画面 | 完了・develop マージ済み |
| Step 13 | セキュリティリスク対応・エラーハンドリング | 完了・develop マージ済み |
| Step 14 | 設定ファイル最適化・MCP導入 | 完了・develop マージ済み |
| Step 15 | hooks・skills | 完了・develop マージ済み |

---

## 現在の状態

- ISSUES対応中。作業中ブランチ: `feature/issue-33-system-admin`（テストグリーン・コミット待ち）
- 直近完了ブランチ: `feature/issue-22-dark-mode`（develop マージ済み）
- 次の作業: feature/issue-33-system-admin → develop マージ後、次の Issue 対応へ
- リリース済み: v0.5.0（Step 14〜15）

---

## 重要な技術的決定事項（バグ防止のため必読）

| 決定 | 理由 |
|---|---|
| ダークモードは Tailwind `darkMode: 'class'` で実装。`<html>` に `dark` クラスを付与 | システム設定連動・localStorage 永続化・アンチフラッシュのために class 方式が最適 |
| アンチフラッシュスクリプトを root `layout.tsx` の `<head>` にインライン `<script>` で注入 | Next.js App Router の root layout はサーバーコンポーネントのため useEffect 不可。React ハイドレーション前に DOM を操作するためインラインスクリプトが必要 |
| ダークモード状態は `themeStore`（Zustand）で管理。`init()` は DOM から読取り同期 | アンチフラッシュスクリプトが先に DOM を設定するため、ストアは DOM に合わせて後から同期する |
| Recharts チャートの暗色化は `useThemeStore` で `isDark` を取得して JS で色を条件分岐 | Tailwind `dark:` クラスは SVG インラインスタイルには効かないため |
| `<html suppressHydrationWarning>` を付与 | アンチフラッシュスクリプトがサーバー/クライアントで HTML の `class` 属性を変更するためハイドレーションミスマッチ警告を抑制する必要がある |
| 取引検索の `keyword`・`categoryId` は空文字列センチネル値を使用（`= ''` で全件） | Hibernate 6 + PostgreSQL で null String を `lower()` に渡すと bytea 型エラーになるため |
| SYSTEM_ADMIN の権限チェックは `hasAuthority("SYSTEM_ADMIN")` で実装（`hasRole()` 不使用） | `hasRole()` は `ROLE_` プレフィックスを自動付与するため。JWT クレームの role 値と一致させるため `hasAuthority` を使用 |
| JWT アクセストークン生成は `generateAccessToken(userId, role)` の 2 引数シグネチャ | role クレームをトークンに含め、`JwtAuthenticationFilter` で `SimpleGrantedAuthority` として Spring Security に渡す |
| `User` エンティティは `@Builder(toBuilder = true)` を使用 | テストコードで `.toBuilder()` による部分上書きが必要なため |
| `AdminService.deleteUser` は `LedgerCascadeDeleter` でカスケード削除 | 削除ユーザーの帳簿データ（AI キャッシュ→予算→明細→固定費→カテゴリ→権限→帳簿）を安全に物理削除する |
| 管理者は自分自身の deactivate/delete/roleChange 不可。SYSTEM_ADMIN ユーザーも削除/deactivate 不可 | 管理者全員が無効化される事故防止。自己操作ブロックは `@AuthenticationPrincipal` で operatorUserId を取得して比較 |
| `TransactionControllerTest.getBalance_calculatesCorrectly` は `LocalDate.now()` を使った動的日付に修正 | 固定日付 "2026-04-10" が「今月」から「前月」に変わりテストが失敗したため。月をまたいでも正しく動作するよう修正 |
| Docker ビルド時は `next/font/google` を使用しない（CSS システムフォントで代替） | Docker ビルド環境は Google Fonts にアクセスできないためビルド失敗する |
| 帳簿削除の物理削除カスケード順: `ai_cache→budgets→transactions→fixed→categories→perms→ledger` | DB に CASCADE DELETE なし。FK 制約違反を防ぐため順序が重要 |
| OWNER は `ledger_permissions` テーブルに保存しない（DB CHECK は VIEWER/EDITOR/ADMIN のみ） | OWNER は `ledger.owner_user_id` で管理。API レスポンスで仮想的に合成する。二重管理を避けるため |
| `canEdit()` は EDITOR/ADMIN/OWNER 全てで true。FAB・編集ボタンは `canEdit()` で制御 | VIEWER は明細作成・更新・削除の UI を非表示にする。バックエンドでも 403 を返す |
| 固定費の `endDate` は必須（`@NotNull`）。デフォルト10年後 | endDate=null 運用を廃止。バリデーション: endDate > startDate |
| `JWT_SECRET` は `openssl rand -base64 64` で生成した256bit以上の文字列を使用 | CLAUDE.md のセキュリティルール参照。.env.example にも記載済み |

---

## 既知の注意点

1. **コード変更後は必ず `docker compose up -d --build`**（`--build` 省略不可。省略するとイメージが更新されない）
2. **DB リセット**: `docker compose down -v`（ボリュームも削除。seed.ps1 が自動実行）
3. **Flyway 失敗時**: `docker compose down -v && docker compose up -d --build`（ボリューム削除が必須）

---

## コンテキストリフレッシュ後の再開手順

```bash
git branch                    # 現在のブランチ確認
git log --oneline -5          # 直近コミット確認
git status                    # 未コミットファイル確認
cat docs/CURRENT_STATUS.md    # 開発状況確認（このファイル）
```

確認後「コンテキストを復元しました。現在は〇〇ブランチで〇〇の作業中です。」と報告すること。

