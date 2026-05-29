# 監査レポート

作成日: 2026-05-29  
対象ブランチ: develop  
追記: 2026-05-29（MCP設定・クレデンシャル追加調査）

---

## 観点1: 個人情報・クレデンシャル

| 深刻度 | ファイル | 内容 | 修正提案 |
|---|---|---|---|
| ~~高~~ **修正済** | `backend/src/main/resources/db/migration/V2__dml.sql` | 管理者ユーザーの初期パスワード `admin1234` がコメントで平文記載、BCryptハッシュ値（`$2a$12$db62H9PxPj...`）がコミット済み。Flyway マイグレーションは env1/env2 本番環境でも全て実行されるため、既知パスワードの管理者アカウントが本番DBに作成される | コメントの平文パスワードを削除済み（`fix/pre-release-audit-cleanup`）。BCryptハッシュは残存するため本番環境では起動後に必ずパスワードを変更すること |
| ~~高~~ **修正済** | `backend/src/main/resources/application-env1.yml`, `application-env2.yml` | 本番AWS環境（env1・env2プロファイル）で `org.hibernate.orm.jdbc.bind: TRACE` が有効。このログレベルはSQLバインドパラメータを全て出力するため、パスワードハッシュ・メールアドレス・トークン等の機密データがCloudWatchログに漏洩するリスクがある | env1/env2/dev 全プロファイルから `org.hibernate.orm.jdbc.bind: TRACE` を削除済み（`fix/pre-release-audit-cleanup`） |
| 中 | `backend/src/main/resources/application-env1.yml`, `application-env2.yml` | 本番AWS環境で Swagger UI が有効（`springdoc.swagger-ui.enabled: true`）。`SecurityConfig.java` では `swaggerEnabled` が true のとき `/swagger-ui/**` を `permitAll` にするため、本番APIドキュメントが認証なしで外部公開される | `CURRENT_STATUS.md` に「本番相当環境での動作確認のため Swagger を残す」と明記されており意図的な設計。ALB のセキュリティグループで IP 制限することを推奨 |
| 低 | `backend/src/main/resources/application.yml` | `app.mail.admin-address` のデフォルト値が `admin@example.com`、`app.mail.from` が `noreply@localhost`。本番環境では環境変数で上書きされるため実害なし | 問題なし（デフォルト値は開発用プレースホルダーとして適切） |
| ~~中~~ **修正済** | `scripts/secrets-fetch.sh` (line 46, 61) | ALB の DNS 名が実値でハードコード（`alb-ka-moneynote-01-567525932...`, `alb-ka-moneynote-02-1066046470...`）。認証情報ではないが、リポジトリを public にすると攻撃者が直接ターゲットを特定できる。なお AWS アカウント ID は `aws sts get-caller-identity` で動的取得されておりハードコードなし | RDS/ElastiCache と同様に `aws elbv2 describe-load-balancers` で動的取得するよう変更済み（`fix/pre-release-audit-cleanup`） |
| 情報 | `.mcp.json` | GitHub PAT の実値（`ghp_...`）が含まれているが、`.gitignore` の48行目に登録済みであり `git ls-files` で未追跡・`git log --all -S "ghp_"` で履歴にも存在しないことを確認済み | 問題なし（コミットされていない） |
| 情報 | `.mcp.json.example` | `YOUR_GITHUB_PAT_HERE` プレースホルダーのみ。実値なし | 問題なし |
| 情報 | `backend/src/test/resources/application-test.yml` | `api-key: sk-ant-api03-test` はテスト用ダミー文字列であり実在しない API キー | 問題なし |
| 情報 | `nginx/certs/localhost.pem`, `nginx/certs/localhost-key.pem` | ファイルがローカルに存在するが `.gitignore` に `nginx/certs/*.pem` が設定されており、`git ls-files` で未追跡であることを確認済み | 問題なし |
| 情報 | `.env` ファイル | ローカルに `.env` が存在するが git 追跡外であることを確認済み | 問題なし |
| 情報 | `TODO.md`, `.github/workflows/` | `skajihara` というGitHubユーザー名が複数箇所に記載されているが、これはリポジトリのオーナー名であり公開情報 | 問題なし |

---

## 観点2: 不要なファイル・コード

| 深刻度 | ファイル | 内容 | 修正提案 |
|---|---|---|---|
| 問題なし | - | `console.log` はフロントエンドの非テストファイル（`frontend/src/**/*.{ts,tsx}`）に存在しない | - |
| 問題なし | - | `System.out.println` はバックエンドの非テストファイルに存在しない | - |
| 問題なし | - | TODO/FIXME コメントはソースコード内に存在しない（`TODO.md` で GitHub Issues として管理済み） | - |
| 低 | `frontend/src/app/(app)/ledgers/[ledgerId]/ai/page.tsx` (line 136, 238) | Tailwind CSSクラスの重複記述: `dark:text-gray-500 dark:text-gray-500` が2箇所に存在する（機能的影響なし） | 重複クラスを削除する |

---

## 観点3: 命名

| 深刻度 | ファイル | 内容 | 修正提案 |
|---|---|---|---|
| 低 | `frontend/src/app/(app)/ledgers/[ledgerId]/ai/page.tsx` (line 163-164) | `predictNext` 関数内の変数 `m`（傾き）と `b`（切片）が数学的慣例ではあるが、コード可読性上は不明瞭 | `slope` / `intercept` にリネームすることを検討する |
| 低 | `frontend/src/components/budget/BudgetPanel.tsx` (line 29, 31) | `getPastMonths` 内のローカル変数 `d`（現在日付）と `t`（ループ内の月）が単字変数。スコープが狭いため実害は低い | `today` / `targetDate` 等のより説明的な名前を検討する |
| 低 | `frontend/src/components/transaction/TransactionList.tsx` (line 21) | ループ変数 `t` が `Transaction` オブジェクト。スコープが狭いため実害は低い | `tx` または `transaction` にリネームすることを検討する |
| 低 | `frontend/src/app/(app)/dashboard/page.tsx` (line 101) | `handleEdit` の引数 `_tx` はno-opを示すアンダースコアプレフィックスの使い方として適切だが、コメントにその意図が記載されている | 問題なし（コメントで説明済み） |
| 情報 | `backend/src/main/java/.../ai/AiService.java` (line 223-227, 411-421) | lambda内変数 `b`（Budget）はローカルスコープが明確なため実害なし | 問題なし |

---

## 観点4: 設計思想違反

| 深刻度 | ファイル | 内容 | 修正提案 |
|---|---|---|---|
| 問題なし | - | 全 Controller は Service のみを注入し、Repository を直接注入しているケースなし | - |
| 問題なし | - | 全 API は `/api/v1/` プレフィックスを持つ | - |
| 問題なし | - | 全帳簿スコープ API は Service 層で `accessValidator.validate(ledgerId, userId)` を呼び出しており、DB権限確認が実装されている | - |
| 問題なし | - | `nativeQuery = true` または `createNativeQuery` の使用は存在しない | - |
| 問題なし | - | TypeScript `any` 型の使用（非テストファイル）は検出されなかった | - |
| 中 | `backend/src/main/java/.../ai/AiService.java` (line 294, 320) | `analyze()` メソッド内で `accessValidator.validate(ledgerId, userId)` が2回呼ばれている。1回目（line 294）は認可チェックのみで戻り値を使用せず、2回目（line 320）はキャッシュ保存用の `Ledger` オブジェクト取得のため。不必要なDB往復が発生する | 1回目の呼び出しを削除し、2回目で取得した `Ledger` を使うよう統合する（または `getSummary` 内の validate 結果を再利用する） |
| ~~低~~ **修正済** | `backend/src/main/resources/application-dev.yml` | `org.hibernate.orm.jdbc.bind: TRACE` がDEV環境でも設定されている。このログはSQLバインドパラメータ（パスワードハッシュ等）を出力するため、開発ログに機密情報が含まれる可能性がある | env1/env2 と同時に削除済み（`fix/pre-release-audit-cleanup`） |

---

## 観点5: リファクタ候補

| 深刻度 | ファイル | 内容 | 修正提案 |
|---|---|---|---|
| 高 | `backend/src/main/java/.../ai/AiService.java` (line 188-277), `backend/src/main/java/.../dashboard/DashboardService.java` (line 122-148), `backend/src/main/java/.../budget/BudgetService.java` (line 145-156) | 予算消化率の計算（実績金額 / 予算金額 × 100）および OVER/WARNING/NORMAL ステータス判定ロジックが3つのServiceに重複している（`BudgetService`, `DashboardService`, `AiService`）。ビジネスルール変更時（例: WARNING 閾値を80%から75%に変更）に3箇所を修正する必要がある | 共通ユーティリティクラス `BudgetStatusCalculator` を作成し、ステータス計算ロジックと閾値定数を集約する |
| 中 | `frontend/src/app/(app)/ledgers/[ledgerId]/ai/page.tsx` (495行, うち `TrendAnalysis` コンポーネント150行) | `TrendAnalysis` コンポーネントが150行あり、1ヶ月・3ヶ月・12ヶ月のグラフロジックを全て包含している | グラフタイプ別の sub-component（`ComparisonBarChart`, `TrendLineChart`）に分割することを検討する |
| 中 | `frontend/src/app/(app)/ledgers/[ledgerId]/reports/page.tsx` (651行, うち `ReportsContent` コンポーネント387行) | `ReportsContent` が387行の大型コンポーネントで、月次・年次・全期間の3タブのレンダリングロジックを全て保持している | タブ別コンポーネント（`MonthlyTabContent`, `AnnualTabContent`, `AllTimeTabContent`）に分割することを検討する |
| 中 | `frontend/src/components/transaction/TransactionEditForm.tsx` (コンポーネント本体 277行) | 1つのフォームコンポーネントに入力フィールド・バリデーション・送信ロジックが全て集約されており、コンポーネントが大きくなっている | 上限150行を超えているため、フォームパーツを分割することを検討する |
| 中 | `frontend/src/app/(app)/admin/page.tsx` (394行) | 管理者画面コンポーネントが394行で、ユーザー一覧・フィルタリング・確認ダイアログ・作成フォームの全UIを1ファイルに含む | `UserTable`, `UserCreateForm`, `ConfirmDialog` 等のサブコンポーネントへの分割を検討する |
| 低 | `backend/src/main/java/.../ai/AiService.java` (line 188-277) | `buildBreakdown` メソッドが約90行で、4つのスコア計算（収支バランス・予算達成率・貯蓄率・支出安定度）を1メソッドに集約している | 各スコア計算をプライベートヘルパーメソッド（`calcBalanceScore`, `calcBudgetScore` 等）に分割することを検討する |
| 低 | `backend/src/main/java/.../csv/CsvService.java` (line 219-303), `backend/src/main/java/.../transaction/TransactionService.java` (line 242-244) | 日付範囲のセンチネル値（`LocalDate.of(1900, 1, 1)`, `LocalDate.of(2999, 12, 31)`）が複数箇所に重複定義されている。2ヶ所で異なる年（CsvService は2999年、TransactionService は9999年）を使用している不整合がある | 共通定数として定義する（例: `DateSentinel.MIN_DATE`, `DateSentinel.MAX_DATE`）|
| 低 | `backend/src/main/java/.../ai/AiService.java` (line 230, 242, 273) | スコア計算の閾値（`120.0`, `80.0`, `20.0`, `0.5`）がマジックナンバーとしてコード内に散在している | プライベート定数または `ScoreConfig` クラスとして定義する |

---

## サマリー

- ~~高深刻度: 2件~~ → **修正済み 2件**（`fix/pre-release-audit-cleanup`）
- 中深刻度: 6件（追加調査で+1）→ うち **修正済み 1件**、残り 5件
- 低深刻度: 8件 → うち **修正済み 1件**（dev TRACE ログ）、残り 7件
- 情報: 8件（追加調査で+4）
- 問題なし（観点内小項目）: 多数

### 修正済み一覧（`fix/pre-release-audit-cleanup`）
| 項目 | ファイル |
|---|---|
| V2 migration コメントの平文パスワード削除 | `db/migration/V2__dml.sql` |
| 本番 Hibernate TRACE ログ削除 | `application-env1.yml`, `application-env2.yml` |
| 開発 Hibernate TRACE ログ削除 | `application-dev.yml` |
| ALB DNS 名のハードコード → AWS CLI 動的取得 | `scripts/secrets-fetch.sh` |

### 残存対応リスト（要別途判断）

1. **[中] 本番環境で Swagger UI が認証なし公開** → [#106](https://github.com/skajihara/moneynote-web/issues/106) T-044  
   `CURRENT_STATUS.md` に意図的設計として記載済み。ALB セキュリティグループでの IP 制限を推奨。

2. **[中] `AiService.analyze()` で `accessValidator.validate()` が2回呼び出される** → [#107](https://github.com/skajihara/moneynote-web/issues/107) T-045  
   不要な DB 往復。テストを含む修正が必要なため別 Issue として対応。

3. **[中] `ReportsContent` 387行 / `AdminPage` 394行 / `TransactionEditForm` 277行** → [#108](https://github.com/skajihara/moneynote-web/issues/108) T-046  
   リファクタリングは別 Issue として計画的に対応。

4. **[低] 予算ステータス計算ロジックが3 Service に重複** → [#109](https://github.com/skajihara/moneynote-web/issues/109) TD-005  
   `BudgetService`, `DashboardService`, `AiService`。共通ユーティリティ化は別 Issue として対応。

5. **[低] 日付センチネル値の不整合**（`CsvService`: 2999年 vs `TransactionService`: 9999年）→ [#110](https://github.com/skajihara/moneynote-web/issues/110) TD-006  
   共通定数化は別 Issue として対応。

6. **[低] コードクリーンアップ**（単字変数・マジックナンバー・Tailwind重複クラス）→ [#111](https://github.com/skajihara/moneynote-web/issues/111) TD-007  
   まとめて対応。

### クレデンシャル追加調査結果（MCP含む）

| 調査対象 | 結果 |
|---|---|
| `.mcp.json`（GitHub PAT `ghp_...`） | `.gitignore` 登録済み・git 未追跡・履歴にも存在しない → **安全** |
| AWS アクセスキー（`AKIA...`） | 全ファイル・全 git 履歴で未検出 → **安全** |
| AWS アカウント ID（12桁） | docs 内は `123456789012` の例示のみ。CI/CD は Secrets 参照 → **安全** |
| Claude API キー（`sk-ant-...`） | `.env.example` はプレースホルダー。`application-test.yml` はダミー → **安全** |
| `.env` / `.pem` ファイル | git 未追跡を確認 → **安全** |
| ALB DNS 名 | `secrets-fetch.sh` に実値あり → **中深刻度（上記3番）** |
