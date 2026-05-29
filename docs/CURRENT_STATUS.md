# CURRENT_STATUS.md

最終更新: 2026年5月（Step 22 完了・main マージ済み v1.5.0）、TD-001〜TD-004 完了・T-040・T-041 完了・T-042 作業中

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
| Step 20 | 環境1を3層構成に移行（RDS・ElastiCache） | 完了・develop マージ済み（v1.3.0） |
| Step 21 | 環境2を3層構成に移行（RDS・ElastiCache） | 完了・main マージ済み（v1.4.0） |
| Step 22 | 既存メール機能の SES 連携 | 完了・main マージ済み（v1.5.0） |

---

## 現在の状態

- T-042 作業中（`feature/issue-100-amount-overflow`）。BE/FE バリデーション上限追加・CSS 表示崩れ修正完了、テストグリーン
- T-041 完了（`feature/issue-99-contact-auto-reply`）。PR #103 作成済み
- T-040 完了（`feature/issue-98-budget-deleted-category`）。PR #102 作成済み
- TD-001〜TD-004 完了 PRマージ済み
- Step 22 完了（`feature/step22-ses-integration`）。main マージ済み（v1.5.0）
- Step 22 の主な内容:
  - `scripts/secrets-fetch.sh`: `get_secret_key` 関数を追加し `moneynote/ses-smtp`（username/password）・`moneynote/ses-from-address` を取得。`MAIL_HOST=localhost` を `email-smtp.ap-northeast-1.amazonaws.com:587` に変更
  - `application-env1/2.yml`: SMTP 認証（username/password/starttls）と `app.mail.from` を追加
  - `application.yml`: `app.mail.from: ${MAIL_FROM:noreply@localhost}` のデフォルト値を追加（ローカル起動維持）
  - `ContactService` / `AuthService` / `UserService`: `fromAddress` フィールドを追加し `SimpleMailMessage.setFrom()` を呼び出し
  - `ContactServiceTest`: `ReflectionTestUtils.setField(contactService, "fromAddress", ...)` を追加
  - パスワードリセット再申請時に旧トークンを無効化（Redis リバースマッピングパターン）
  - メールアドレス変更に確認フロー追加（変更後アドレスに確認メール送信・30分 TTL・旧リンク無効化）
  - アカウント削除キャンセルリンクの有効期限表示を日時形式（例: 2026/05/27 23:59:59）に変更
  - ユーザー入力値の表示オーバーフロー修正（確認ダイアログ: `break-all`、一覧・ヘッダ: `truncate`）
  - パスワードポリシーをアプリ全体で統一（8文字・英大・英小・数字・記号 `!@#$%^&*`）
- Step 21 完了・main マージ済み（v1.4.0）
- Step 21 の主な内容（`feature/step21-env2-3tier-migration`）:
  - Protected サブネット（SBN_11・SBN_12）を追加し EC2_02 を AMI 経由で移動
  - NAT Gateway は NGW_ka_moneynote_01 を env1・env2 で共用
  - RDS（RDS-ka-moneynote-02・PostgreSQL 16）・ElastiCache（ELC-ka-moneynote-02・Redis 7）を構築
  - サブネットグループ（SNG_02・SNG_04）は env2 専用（SBN_07・SBN_08 使用）
  - `docker-compose.env2.yml` から db・redis コンテナを削除（マネージドサービスへ移行）
  - `scripts/secrets-fetch.sh`: env2 で RDS/ElastiCache エンドポイントを AWS CLI で動的取得
  - `application-env2.yml`: `spring.data.redis.ssl.enabled: true`（ElastiCache TLS 対応）
  - GitHub Secret `EC2_INSTANCE_ID_ENV2` を新 EC2 のインスタンス ID に更新
- リリース済み: v1.0.0（Step 17）・v1.1.0（Step 18）・v1.2.0（Step 19）・v1.3.0（Step 20）・v1.4.0（Step 21）・v1.5.0（Step 22）

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
| Amazon Linux 2023 は systemd-resolved を使用し `/etc/resolv.conf` が存在しない | Docker コンテナが VPC 内 DNS（ElastiCache 等）を解決できない。`/etc/docker/daemon.json` に `{"dns": ["10.0.0.2"]}` を設定して Docker を再起動すること（10.0.0.2 は VPC CIDR base+2） |
| ElastiCache（elc-ka-moneynote-01）は AUTH 有効（認証デフォルトユーザーアクセス）・TLS 有効 | 当初 AUTH 無効設計だったが AWSコンソールで無効化不可だったため AUTH 有効のまま運用。REDIS_PASSWORD を Secrets Manager（`moneynote/env1/redis-password`）で管理 |
| EC2 上で psql から RDS に接続する際は `~/.postgresql/` ディレクトリを削除する必要がある | AMI 由来のクライアント証明書が存在するとSSL証明書エラーが発生し、非暗号化フォールバック後に RDS が拒否する |
| CI/CD（SSM Run Command）が root で実行後、ssm-user で git 操作するとパーミションエラーになる | `sudo chown -R ssm-user:ssm-user /home/ssm-user/moneynote-web` で所有者を戻すこと |
| env2 の NAT Gateway は NGW_ka_moneynote_01（env1）を共用。RTB_11・RTB_12 のデフォルトルートを NGW_01 に向ける | 1人1VPC制約でリソース節約。env2 の Protected サブネット（SBN_11・SBN_12）からの外部通信も NGW_01 経由 |
| `docker compose up` は compose ファイルから削除されたコンテナを自動停止しない | Step 21 移行後に旧 db・redis コンテナが残存。`docker stop` / `docker rm` で手動削除が必要 |
| env2 EC2 は env1 AMI から起動。AMI 作成時点のコードが古い場合は CI/CD の `git reset --hard` で更新される | AMI 作成タイミングによっては旧 docker-compose.env2.yml が含まれる。CI/CD 完了まで旧コンテナ構成で動く |
| SES SMTP 認証情報は Secrets Manager `moneynote/ses-smtp`（username/password）・`moneynote/ses-from-address`（from_address）で管理 | `secrets-fetch.sh` の `get_secret_key` 関数でキー名指定取得。`moneynote/ses-smtp` は2キー入りのため `get_secret` では取得不可 |
| `management.health.mail.enabled: false` のまま運用（env1/env2）。SES 接続確認後に `true` に変更 | SES 認証失敗時に `/actuator/health` が DOWN になり CI/CD が止まるリスクがある。接続テスト後に有効化する |
| SES サンドボックスモードでは検証済みアドレス以外に送信不可 | パスワードリセット・アカウント削除メールはユーザーアドレスへ送信するため、サンドボックス解除申請（AWS Support）が必要 |
| パスワードリセット再申請時は旧トークンを無効化（Redis `password_reset_user:{userId}` リバースマッピング） | 旧リンクをクリックしてもパスワードを変更できないようにするため。confirm 時にもリバースキーを削除する |
| メールアドレス変更確認フロー: `updateProfile` でメール変更時は即時更新せず確認メールを送信し、`/auth/email-change/confirm` でトークン検証後に更新 | 任意アドレスへの乗っ取り防止。Redis に `email_change:{token}` と `email_change_user:{userId}` の2キーを 30 分 TTL で保持し、再申請時に旧トークンを無効化する |
| `/email-change/confirm` は Next.js middleware の `PUBLIC_PATHS` に追加（認証不要） | 未ログイン状態でメールリンクをクリックした際に `/login` へリダイレクトされないようにするため |
| アカウント削除キャンセルリンクの有効期限は当日の 23:59:59 JST（`LocalDate.now(ZoneId.of("Asia/Tokyo"))` で算出） | ユーザーが「本日中」より具体的な日時を把握できるようにするため。JVM の TimeZone に依存しないよう ZoneId を明示 |
| `backend/Dockerfile`: `COPY build.gradle settings.gradle ./` → `gradle dependencies` → `COPY . .` → `gradle bootJar` の順に分離し、`--mount=type=cache,target=/root/.gradle` で Gradle キャッシュを永続化 | ソース変更時に依存関係の再ダウンロードを防ぐ。BuildKit のキャッシュマウントにより Docker ビルドを繰り返しても `~/.gradle` キャッシュが保持される（TD-002 対応） |
| `frontend/Dockerfile`: `npm ci` に `--mount=type=cache,target=/root/.npm`、`npm run build` に `--mount=type=cache,target=/app/.next/cache` を追加 | npm キャッシュと Next.js インクリメンタルコンパイルキャッシュをビルド間で永続化。`package*.json` の分離は既存済み（TD-002 対応） |
| `spring.mail.host` / `spring.mail.port` は `application.yml` で `${MAIL_HOST:mailhog}` / `${MAIL_PORT:1025}` として環境変数化（デフォルト: mailhog/1025） | ハードコードでは Docker 外での起動時に上書き不可。env1/env2 は MAIL_HOST/MAIL_PORT 環境変数で上書きされるため profile 側の host/port 重複オーバーライドを削除（TD-003 対応） |
| ログインレート制限のキーは `loginAttempt:{ip}`（旧: `login:fail:{ip}`）。パスワードリセットは `pwd_reset:req:{userId}` のまま | TD-004 でスライディングウィンドウに移行。テストの `setUp()` で `loginAttempt:*` をクリアすること |
| `AiRateLimiter` / `AuthService` のレート制限は Redis Sorted Set（ZADD + ZREMRANGEBYSCORE + ZCARD）でスライディングウィンドウを実装 | 固定ウィンドウはウィンドウ境界付近でバースト攻撃（2N リクエスト）が可能。スライディングウィンドウで防ぐ（TD-004 対応） |
| フロントエンドテストカバレッジ: 95.58% Stmts / 83.11% Branch / 80.25% Funcs（2026年5月時点） | TD-001 対応。`lib/api/` 全ファイルに単体テスト追加（apiClient モック）、`themeStore`・`periodUtils`・`BudgetPanel`・`LedgerMemberPanel`・`TransactionEditForm`・`LedgerCreateModal` のテストを追加・拡充 |

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

