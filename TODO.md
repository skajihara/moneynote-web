# TODO.md - 将来エンハンス・改善管理
最終更新: 2026年5月（T-040〜T-043 クローズ・T-044〜T-046・TD-005〜TD-007 追加・T-045・T-044・T-046・TD-005〜TD-007 クローズ：リポジトリ公開前監査より）

---

## 優先度：高

| ID | Issue | カテゴリ | 機能・内容 | 概要 |
|---|---|---|---|---|
| T-029 | [#32](https://github.com/skajihara/moneynote-web/issues/32) | インフラ | nginx/LB で X-Forwarded-For を信頼プロキシ限定に設定 | 本番アーキテクチャ確定後に nginx.conf または Spring の forwarded-headers-strategy で制限する |
| T-030 | [#33](https://github.com/skajihara/moneynote-web/issues/33) | インフラ | JWT_SECRET を本番用強度に更新・ローテーション手順の整備 | openssl rand -base64 64 で生成した256bit以上の文字列を Secrets Manager で管理する |
| T-028 | [#28](https://github.com/skajihara/moneynote-web/issues/28) | アーキテクチャ | EC2 上に OAuth2 サーバを構築して OAuth 認証を導入 | Keycloak を EC2 に構築し OAuth 2.0 / OIDC に移行。dev プロファイルは既存 JWT 認証を維持し、env1/env2 プロファイルのみ Keycloak 認証に切り替える |

---

## 優先度：中

| ID | Issue | カテゴリ | 機能・内容 | 概要 |
|---|---|---|---|---|
| T-039 | [#58](https://github.com/skajihara/moneynote-web/issues/58) | インフラ | AWS ロギング・モニタリング基盤の構築（CloudWatch + Grafana） | 構造化ログ（JSON）+ CloudWatch Agent + Micrometer によるメトリクス収集・Grafana ダッシュボード・CloudWatch Alarms → Slack 通知 |
| T-023 | [#23](https://github.com/skajihara/moneynote-web/issues/23) | UI/UX | 多言語対応（英語） | next-intl を使った i18n 対応。言語設定をアカウント設定に追加 |
| T-024 | [#24](https://github.com/skajihara/moneynote-web/issues/24) | 機能 | PWA 対応 | オフライン閲覧・ホーム画面追加対応 |

---

## 優先度：低（アイデア）

| ID | Issue | カテゴリ | 機能・内容 | 概要 |
|---|---|---|---|---|
| T-026 | [#26](https://github.com/skajihara/moneynote-web/issues/26) | 機能 | 領収書・レシート画像添付 | 明細に画像を添付できる機能（S3 連携） |

---

## 技術的負債

（未対応の技術的負債なし）

---

## 対応しない TODO

| ID | Issue | カテゴリ | 機能・内容 | 理由 |
|---|---|---|---|---|
| T-017 | [#17](https://github.com/skajihara/moneynote-web/issues/17) | 機能 | 固定費の一時停止 | 固定費は期間指定一括登録のため一時停止の概念なし |
| T-019 | [#19](https://github.com/skajihara/moneynote-web/issues/19) | 機能 | データインポート（他アプリ） | 現状対応予定なし |
| T-016 | [#16](https://github.com/skajihara/moneynote-web/issues/16) | 機能 | 予算超過メール通知 | ダッシュボードで予算超過を視覚的に確認できるため、メール通知の追加価値が薄い |
| T-018 | [#18](https://github.com/skajihara/moneynote-web/issues/18) | 機能 | 週次・日次サマリー | カレンダービュー（日次）と月次レポートで十分な粒度があり、追加の週次・日次集計ページは情報重複になる |
| T-025 | [#25](https://github.com/skajihara/moneynote-web/issues/25) | 機能 | 目標貯蓄機能 | 貯金管理（目的別・期間・進捗）は家計簿の本分から外れる。収入・支出の記録と分析に特化する |
| T-036 | - | アーキテクチャ | Next.js SSR（サーバーサイドレンダリング）への移行 | 全ページが `'use client'` の完全 SPA 構成であり accessToken をメモリのみで管理する設計が SSR と根本的に相容れない。移行には認証設計の見直し・50 ファイル以上の改修が必要でコストがメリットを上回るため現時点では対応しない |
| T-044 | [#106](https://github.com/skajihara/moneynote-web/issues/106) | セキュリティ | 本番環境で Swagger UI が認証なしで外部公開されている | ポートフォリオ用途では Swagger 公開が望ましい。制限が必要な場合は ALB SG で対応。コード変更不要 |
| T-046 | [#108](https://github.com/skajihara/moneynote-web/issues/108) | リファクタ | 大型コンポーネントの分割（ReportsContent / AdminPage / TransactionEditForm） | 安定稼働中で回帰リスクがコストに見合わない。機能追加のタイミングで自然に分割する |

---

## 完了した TODO

| ID | Issue | カテゴリ | 内容 | ブランチ |
|---|---|---|---|---|
| T-009 | [#9](https://github.com/skajihara/moneynote-web/issues/9)  | 品質 | ID重複時の再生成ロジック確認 | feature/issue-9-id-regeneration |
| T-010 | [#10](https://github.com/skajihara/moneynote-web/issues/10) | 品質 | レイヤードアーキテクチャ遵守の確認 | feature/issue-10-layered-arch |
| T-011 | [#11](https://github.com/skajihara/moneynote-web/issues/11) | 品質 | SQLパフォーマンス最適化 | feature/issue-11-sql-performance |
| T-002 | [#2](https://github.com/skajihara/moneynote-web/issues/2) | UI/UX | 円グラフの凡例を右側に表示 | feature/issue-2-pie-chart-legend |
| T-007 | [#7](https://github.com/skajihara/moneynote-web/issues/7) | 機能 | 固定費の登録間隔機能 | feature/issue-7-recurring-interval |
| T-005 | [#5](https://github.com/skajihara/moneynote-web/issues/5) | 機能 | レポートページの拡張 | feature/issue-5-report-expansion |
| T-001 | [#1](https://github.com/skajihara/moneynote-web/issues/1) | UI/UX | レスポンシブ対応（文字崩れ修正） | feature/issue-1-responsive |
| T-006 | [#6](https://github.com/skajihara/moneynote-web/issues/6) | 機能 | 予算とレポートのページ統合 | feature/issue-6-budget-report-layout |
| T-003 | [#3](https://github.com/skajihara/moneynote-web/issues/3) | UI/UX | サブパネルの幅を可変にする | feature/issue-3-resizable-panel |
| T-004 | [#4](https://github.com/skajihara/moneynote-web/issues/4) | UI/UX | 検索・固定費・CSVをサイドメニューに移動 | feature/issue-4-search-sidemenu |
| T-008 | [#8](https://github.com/skajihara/moneynote-web/issues/8) | 機能 | 帳簿共有機能 | feature/issue-8-ledger-share |
| T-021 | [#21](https://github.com/skajihara/moneynote-web/issues/21) | ドキュメント | 仕様書・ドキュメントの最新化 | feature/issue-21-documentation |
| T-022 | [#22](https://github.com/skajihara/moneynote-web/issues/22) | UI/UX | ダークモード | feature/issue-22-dark-mode |
| T-033 | [#37](https://github.com/skajihara/moneynote-web/issues/37) | 機能 | システム管理者機能 | feature/issue-33-system-admin |
| T-020 | [#20](https://github.com/skajihara/moneynote-web/issues/20) | ドキュメント | GitHub Pages によるマニュアル整備 | feature/issue-20-github-pages |
| T-012 | [#12](https://github.com/skajihara/moneynote-web/issues/12) | インフラ | AWSデプロイ Step 17（EC2 + Docker Compose 環境1構築） | feature/step17-aws-deploy |
| T-032 | [#35](https://github.com/skajihara/moneynote-web/issues/35) | インフラ | Secrets Manager によるクレデンシャル管理の導入 | feature/step17-aws-deploy |
| T-037 | [#40](https://github.com/skajihara/moneynote-web/issues/40) | 機能 | アカウント削除の日次バッチ化・メールキャンセル対応 | feature/issue-40-account-deletion-batch |
| T-027 | [#27](https://github.com/skajihara/moneynote-web/issues/27) | 機能 | 問い合わせメール受付 | feature/issue-40-account-deletion-batch |
| T-013 | [#13](https://github.com/skajihara/moneynote-web/issues/13) | インフラ | GitHub Actions CI/CD構築 | feature/step18-cicd |
| T-034 | [#38](https://github.com/skajihara/moneynote-web/issues/38) | インフラ | 環境2構築（EC2 + Docker Compose） | develop |
| T-038 | [#54](https://github.com/skajihara/moneynote-web/issues/54) | バグ修正 | 管理者アカウントのサイドメニュー・ルート保護修正 | feature/issue-54-admin-bugs |
| T-014 | [#14](https://github.com/skajihara/moneynote-web/issues/14) | インフラ | 環境1を3層構成（RDS・ElastiCache）に移行 | feature/step20-3tier-migration |
| T-031 | [#34](https://github.com/skajihara/moneynote-web/issues/34) | インフラ | 本番 CD パイプラインで COOKIE_SECURE=true を設定 | application-env1/env2.yml のハードコードで対応済み |
| T-035 | [#39](https://github.com/skajihara/moneynote-web/issues/39) | インフラ | 環境2を3層構成（RDS・ElastiCache）に移行 | feature/step21-env2-3tier-migration |
| T-015 | [#15](https://github.com/skajihara/moneynote-web/issues/15) | インフラ | SES・Secrets Manager本格活用 | feature/step22-ses-integration |
| TD-002 | [#30](https://github.com/skajihara/moneynote-web/issues/30) | 技術的負債 | Docker ビルドキャッシュ最適化（Gradle・npm・Next.js） | feature/issue-30-docker-build-cache |
| TD-003 | [#31](https://github.com/skajihara/moneynote-web/issues/31) | 技術的負債 | application.yml・application-env1/env2.yml 整合性確認・修正 | feature/issue-31-yml-consistency |
| TD-004 | [#36](https://github.com/skajihara/moneynote-web/issues/36) | 技術的負債 | Redis レート制限を固定ウィンドウからスライディングウィンドウへ変更（バースト対策） | feature/issue-36-sliding-window-rate-limit |
| TD-001 | [#29](https://github.com/skajihara/moneynote-web/issues/29) | 技術的負債 | フロントエンドのテストカバレッジを80%以上に改善 | feature/issue-29-frontend-test-coverage |
| T-040 | [#98](https://github.com/skajihara/moneynote-web/issues/98) | UI/UX | 予算一覧で削除済みカテゴリを「カテゴリが削除されました」バッジで表示 | feature/issue-98-budget-deleted-category |
| T-041 | [#99](https://github.com/skajihara/moneynote-web/issues/99) | 機能 | お問い合わせ送信時に送信者へ自動返信メールを送る | feature/issue-99-contact-auto-reply |
| T-042 | [#100](https://github.com/skajihara/moneynote-web/issues/100) | UI/UX | 大きい金額入力時のアプリ全体の表示崩れ調査・対応 | feature/issue-100-amount-overflow |
| T-043 | [#101](https://github.com/skajihara/moneynote-web/issues/101) | UI/UX | バリデーションエラーの詳細をユーザーに分かりやすく伝える | feature/issue-101-validation-messages |
| T-044 | [#106](https://github.com/skajihara/moneynote-web/issues/106) | セキュリティ | 本番環境で Swagger UI が認証なしで外部公開されている | 対応しない（ポートフォリオ用途のため公開維持） |
| T-045 | [#107](https://github.com/skajihara/moneynote-web/issues/107) | バグ | AiService.analyze() で accessValidator.validate() が2回呼び出されている | fix/pre-release-audit-cleanup |
| T-046 | [#108](https://github.com/skajihara/moneynote-web/issues/108) | リファクタ | 大型コンポーネントの分割（ReportsContent / AdminPage / TransactionEditForm） | 対応しない（機能追加タイミングで対応） |
| TD-005 | [#109](https://github.com/skajihara/moneynote-web/issues/109) | リファクタ | 予算ステータス計算ロジックを3 Service から共通ユーティリティに集約 | fix/pre-release-audit-cleanup |
| TD-006 | [#110](https://github.com/skajihara/moneynote-web/issues/110) | リファクタ | 日付センチネル値の不整合・共通定数化 | fix/pre-release-audit-cleanup |
| TD-007 | [#111](https://github.com/skajihara/moneynote-web/issues/111) | リファクタ | コードクリーンアップ（単字変数・マジックナンバー・Tailwind重複クラス） | fix/pre-release-audit-cleanup |
