# CURRENT_STATUS.md

最終更新: 2026年5月（Step 19 完了・admin バグ修正 develop マージ済み）

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
| Step 16 | UX改善・セキュリティドキュメント整備 | 完了・main マージ済み |
| Step 17 | 環境1デプロイ（EC2 + Docker Compose） | 完了・main マージ済み（v1.0.0） |
| Step 18 | CI/CD パイプライン構築（GitHub Actions + ECR） | 完了・main マージ済み（v1.1.0） |
| Step 19 | 環境2構築（EC2 + Docker Compose） | 完了・main マージ済み（v1.2.0） |

---

## 現在の状態

- Step 19 完了・main マージ済み（v1.2.0）。次は Step 20（環境1を3層構成へ移行）
- admin バグ修正（Issue #54）を develop にマージ済み。次回 main マージ時に env1/env2 へ反映
- Step 18 の主な内容（`feature/step18-cicd`）:
  - `.github/workflows/ci-cd.yml` 新規作成（test → build-and-push → deploy の3ジョブ）
  - ECR（ecr-ka-moneynote-backend / ecr-ka-moneynote-frontend）に Docker イメージをプッシュ
  - SSM Run Command で EC2 に自動デプロイ（git pull → secrets-fetch → docker compose pull → up）
  - `docs/aws-design/aws-deploy-design-v4.md` 新規作成（VPC 共用制約を反映）
- Step 19 の主な内容（develop 直コミット）:
  - `scripts/secrets-fetch.sh`: env2 ALB DNS 名を実際の値に更新
  - `.github/workflows/ci-cd.yml`: deploy ジョブの if 条件を develop + main 両方に拡張
  - AMI（env1 スナップショット）から env2 EC2 を起動し main ブランチで動作確認済み
- リリース済み: v1.0.0（Step 17）・v1.1.0（Step 18）・v1.2.0（Step 19）

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
| Next.js standalone ランタイムに `node_modules/.bin/` は存在しない。`-H 0.0.0.0` フラグ不可 | standalone ビルドは `server.js` を `node` で直接起動。バインドアドレスは `HOSTNAME=0.0.0.0` 環境変数で制御する |
| env1/env2 のヘルスチェックは `/actuator/health` を使用（`/v3/api-docs` 不可） | nginx.prod.conf は `/actuator/` を backend に転送するが `/v3/api-docs` は frontend（Next.js）に転送されるため |
| `secrets-fetch.sh` は `python3 -c "import sys,json; print(list(json.load(sys.stdin).values())[0])"` で値を抽出 | Secrets Manager は `{"key":"value"}` 形式の JSON を返すため、生の文字列ではなく値だけを取り出す必要がある |
| `docker compose -f docker-compose.env1.yml --env-file .env.env1 up -d --build` が env1 の起動コマンド | `--env-file` がないと compose ファイル内の `${DB_PASSWORD}` 等の変数が解決できずエラーになる |
| application-env1.yml / application-env2.yml: `ai.mock=true`・Swagger 有効・DEBUG ログ・`app.cookie.secure: true`・`security.hsts.enabled: true` | 本番相当環境での動作確認のため Swagger を残す。HSTS と Secure Cookie は ALB の X-Forwarded-Proto を受けて Spring 側で有効化 |
| `loading \|\| !data` パターンは禁止。`loading` / `isError` / `data` の3状態に分離する | データnull時に「読み込み中...」が永続表示されるバグを防ぐため |
| 共通UIコンポーネント: `LoadingSpinner`・`EmptyState`・`ErrorState` を `components/ui/` に配置 | 全画面で一貫したローディング/空/エラー表示を実現。`LoadingSpinner` は `compact` prop で小型化可能 |
| fetch関数は try/catch/finally 必須。catch で `setIsError(true)`、finally で `setLoading(false)` | エラー時にローディングが解除されずUIが止まるバグを防ぐため |
| `reportLoading` の初期値は `true`（reports/page.tsx） | `false` 始まりだと初回レンダーで一瞬 ErrorState が表示されるフラッシュが発生するため |
| `useUserOnly` フックは `boolean` を返し、呼び出し元が `if (isAdmin) return null` で子コンポーネントをブロックする | `useEffect` のみのリダイレクトでは子コンポーネントが一瞬レンダリングされ API コールが走るため。`admin/page.tsx` と同様の二重防御パターン |
| SSM Run Command は root で実行されるため `HOME` 未設定。デプロイコマンド先頭に `export HOME=/root` が必要 | git credential や Docker 設定が HOME 依存のため。ci-cd.yml の SSM パラメータに含めること |
| 会社の AWS アカウントは VPC が 1人1つの制約あり。env1・env2 は `VPC_ka_moneynote_01` を共用 | env2 専用の VPC・IGW は作成不可。サブネット CIDR を env1 と重複しないよう設計（10.0.5-8.x/24 for env2） |
| env2 EC2 は env1 AMI から起動（Docker・git・リポジトリ込み）。起動直後は env1 コンテナが動いている可能性あり | AMI 作成前に env1 コンテナを停止するか、env2 起動後に docker compose down してから deploy する |

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

