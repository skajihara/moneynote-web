# TODO.md - 将来エンハンス・改善管理

最終更新: 2026年5月（Issue #38・#39 追加・#12〜#15 更新）

---

## 優先度：高

| ID | Issue | カテゴリ | 機能・内容 | 概要 |
|---|---|---|---|---|
| T-012 | [#12](https://github.com/skajihara/moneynote-web/issues/12) | インフラ | AWSデプロイ Step 17（EC2 + Docker Compose 環境1構築） | EC2 + Docker Compose で環境1の初回デプロイ。PostgreSQL・Redis は Docker Compose 上で動かす（Step 17） |
| T-013 | [#13](https://github.com/skajihara/moneynote-web/issues/13) | インフラ | GitHub Actions CI/CDパイプライン構築 | テスト自動実行・SSM Send Command で EC2 へ自動デプロイ。IAM OIDC でアクセスキー不要（Step 18） |
| T-034 | [#38](https://github.com/skajihara/moneynote-web/issues/38) | インフラ | 環境2構築（EC2 + Docker Compose） | 環境1と同構成で環境2を構築。main ブランチを本番相当テスト環境にデプロイ（Step 19） |
| T-014 | [#14](https://github.com/skajihara/moneynote-web/issues/14) | インフラ | 環境1を3層構成（RDS・ElastiCache）に移行 | EC2 上の PostgreSQL・Redis を RDS・ElastiCache に移行。VPC を3層構成（Public・Protected・Private）に拡張（Step 20） |
| T-035 | [#39](https://github.com/skajihara/moneynote-web/issues/39) | インフラ | 環境2を3層構成（RDS・ElastiCache）に移行 | Step 20（T-014）と同手順を環境2に適用（Step 21） |
| T-015 | [#15](https://github.com/skajihara/moneynote-web/issues/15) | インフラ | SES・Secrets Manager本格活用 | AWS SES による本番メール送信有効化・Secrets Manager で全機密情報を集約（Step 22） |
| T-029 | [#32](https://github.com/skajihara/moneynote-web/issues/32) | インフラ | nginx/LB で X-Forwarded-For を信頼プロキシ限定に設定 | 本番アーキテクチャ確定後に nginx.conf または Spring の forwarded-headers-strategy で制限する |
| T-030 | [#33](https://github.com/skajihara/moneynote-web/issues/33) | インフラ | JWT_SECRET を本番用強度に更新・ローテーション手順の整備 | openssl rand -base64 64 で生成した256bit以上の文字列を Secrets Manager で管理する |
| T-031 | [#34](https://github.com/skajihara/moneynote-web/issues/34) | インフラ | 本番 CD パイプラインで COOKIE_SECURE=true を設定 | CI/CD（T-013）に COOKIE_SECURE=true の環境変数設定を追加する |
| T-032 | [#35](https://github.com/skajihara/moneynote-web/issues/35) | インフラ | Secrets Manager 等によるクレデンシャル管理の導入 | JWT_SECRET・CLAUDE_API_KEY 等の機密情報を AWS Secrets Manager で管理する（Step 22） |

---

## 優先度：中

| ID | Issue | カテゴリ | 機能・内容 | 概要 |
|---|---|---|---|---|
| T-016 | [#16](https://github.com/skajihara/moneynote-web/issues/16) | 機能 | 予算超過メール通知 | 予算 100% 超過時に登録メールアドレスへ通知メールを送信する |
| T-018 | [#18](https://github.com/skajihara/moneynote-web/issues/18) | 機能 | 週次・日次サマリー | 週・日単位での集計レポートを追加 |
| T-023 | [#23](https://github.com/skajihara/moneynote-web/issues/23) | UI/UX | 多言語対応（英語） | next-intl を使った i18n 対応。言語設定をアカウント設定に追加 |
| T-024 | [#24](https://github.com/skajihara/moneynote-web/issues/24) | 機能 | PWA 対応 | オフライン閲覧・ホーム画面追加対応 |

---

## 優先度：低（アイデア）

| ID | Issue | カテゴリ | 機能・内容 | 概要 |
|---|---|---|---|---|
| T-025 | [#25](https://github.com/skajihara/moneynote-web/issues/25) | 機能 | 目標貯蓄機能 | 貯蓄目標を設定して進捗をグラフで表示する |
| T-026 | [#26](https://github.com/skajihara/moneynote-web/issues/26) | 機能 | 領収書・レシート画像添付 | 明細に画像を添付できる機能（S3 連携） |
| T-027 | [#27](https://github.com/skajihara/moneynote-web/issues/27) | 機能 | 問い合わせメール受付 | アプリ内から問い合わせメールを送受信できる機能 |
| T-028 | [#28](https://github.com/skajihara/moneynote-web/issues/28) | アーキテクチャ | EC2 上に OAuth2 サーバを構築して OAuth 認証を導入 | EC2 に OAuth2 認証サーバ（Authorization Server）を設計・構築し、既存の JWT 認証を OAuth2 フローに移行する（学習目的） |

---

## 技術的負債

| ID | Issue | 内容 | 優先度 |
|---|---|---|---|
| TD-001 | [#29](https://github.com/skajihara/moneynote-web/issues/29) | フロントエンドのテストカバレッジが低い画面がある | 中 |
| TD-002 | [#30](https://github.com/skajihara/moneynote-web/issues/30) | Docker ビルドが毎回時間がかかる（Gradle キャッシュの最適化余地あり） | 低 |
| TD-003 | [#31](https://github.com/skajihara/moneynote-web/issues/31) | application.yml・application-env1.yml・application-env2.yml の整合性確認が必要 | 高 |
| TD-004 | [#36](https://github.com/skajihara/moneynote-web/issues/36) | Redis レート制限を固定ウィンドウからスライディングウィンドウへ変更（バースト対策） | 中 |

---

## 対応しない TODO

| ID | Issue | カテゴリ | 機能・内容 | 理由 |
|---|---|---|---|---|
| T-017 | [#17](https://github.com/skajihara/moneynote-web/issues/17) | 機能 | 固定費の一時停止 | 固定費は期間指定一括登録のため一時停止の概念なし |
| T-019 | [#19](https://github.com/skajihara/moneynote-web/issues/19) | 機能 | データインポート（他アプリ） | 現状対応予定なし |

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
