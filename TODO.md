# TODO.md - 将来エンハンス・改善管理

最終更新: 2026年4月（Issue #1 完了）

---

## 優先度：高

| ID | Issue | カテゴリ | 機能・内容 | 概要 |
|---|---|---|---|---|
| T-003 | [#3](https://github.com/skajihara/moneynote-web/issues/3) | UI/UX | サブパネルの幅を可変にする | 明細編集などのサブパネル幅をドラッグで変更できるようにする。コンテンツのサイズもレスポンシブ対応する |
| T-004 | [#4](https://github.com/skajihara/moneynote-web/issues/4) | UI/UX | 検索をサイドメニューに移動 | 設定画面の検索タブをサイドメニューの独立ページに移動する。他の画面と同様に明細一覧表示・編集・削除ができること |
| T-005 | [#5](https://github.com/skajihara/moneynote-web/issues/5) | 機能 | レポートページの拡張 | 全期間を対象とした残高推移折れ線グラフ・全期間レポートを追加する |
| T-006 | [#6](https://github.com/skajihara/moneynote-web/issues/6) | 機能 | 予算とレポートのページ統合検討 | 予算が左・レポートが右の2カラムレイアウトで統合することを検討する |
| T-007 | [#7](https://github.com/skajihara/moneynote-web/issues/7) | 機能 | 固定費の登録間隔機能 | 毎日・毎週・隔週・毎月・隔月・四半期・半年・毎年の間隔を選択できるようにする |
| T-008 | [#8](https://github.com/skajihara/moneynote-web/issues/8) | 機能 | 帳簿共有機能 | ledger_permissions テーブルを活用。オーナーが他ユーザーに閲覧/編集/管理権限を付与する |
| T-012 | [#12](https://github.com/skajihara/moneynote-web/issues/12) | インフラ | AWSデプロイ Phase 1（EC2） | EC2 + Docker Compose で初回デプロイ。RDS・ElastiCache・SES への接続切り替えを含む（Step 17） |
| T-013 | [#13](https://github.com/skajihara/moneynote-web/issues/13) | インフラ | GitHub Actions CI/CD構築 | テスト自動実行・Docker イメージビルド・EC2 への自動デプロイ（Step 18） |
| T-014 | [#14](https://github.com/skajihara/moneynote-web/issues/14) | インフラ | ECS Fargate 移行 | ECR + ECS Fargate への移行（Step 19） |
| T-015 | [#15](https://github.com/skajihara/moneynote-web/issues/15) | インフラ | SESによるメール送受信 | AWS SES を使った本番メール送信・問い合わせ受付（Step 21） |
| T-029 | [#32](https://github.com/skajihara/moneynote-web/issues/32) | インフラ | nginx/LB で X-Forwarded-For を信頼プロキシ限定に設定 | 本番アーキテクチャ確定後に nginx.conf または Spring の forwarded-headers-strategy で制限する |
| T-030 | [#33](https://github.com/skajihara/moneynote-web/issues/33) | インフラ | JWT_SECRET を本番用強度に更新・ローテーション手順の整備 | openssl rand -base64 64 で生成した256bit以上の文字列を Secrets Manager で管理する |
| T-031 | [#34](https://github.com/skajihara/moneynote-web/issues/34) | インフラ | 本番 CD パイプラインで COOKIE_SECURE=true を設定 | CI/CD（T-013）に COOKIE_SECURE=true の環境変数設定を追加する |
| T-032 | [#35](https://github.com/skajihara/moneynote-web/issues/35) | インフラ | Secrets Manager 等によるクレデンシャル管理の導入 | JWT_SECRET・CLAUDE_API_KEY 等の機密情報を AWS Secrets Manager で管理する（Step 21） |

---

## 優先度：中

| ID | Issue | カテゴリ | 機能・内容 | 概要 |
|---|---|---|---|---|
| T-016 | [#16](https://github.com/skajihara/moneynote-web/issues/16) | 機能 | 予算超過メール通知 | 予算 100% 超過時に登録メールアドレスへ通知メールを送信する |
| T-017 | [#17](https://github.com/skajihara/moneynote-web/issues/17) | 機能 | 固定費の一時停止 | fixed_transactions.is_active フラグを活用して一時停止・再開を可能にする |
| T-018 | [#18](https://github.com/skajihara/moneynote-web/issues/18) | 機能 | 週次・日次サマリー | 週・日単位での集計レポートを追加 |
| T-019 | [#19](https://github.com/skajihara/moneynote-web/issues/19) | 機能 | データインポート（他アプリ） | MoneyForward・Zaim 等のエクスポート CSV に対応したインポート機能 |
| T-020 | [#20](https://github.com/skajihara/moneynote-web/issues/20) | ドキュメント | GitHub Pages によるマニュアル整備 | 暗黙の仕様・注意点・全画面へのリンクを含むマニュアルを GitHub Pages で公開する |
| T-021 | [#21](https://github.com/skajihara/moneynote-web/issues/21) | ドキュメント | 仕様書・ドキュメントの最新化 | 設計書・API仕様書・アーキテクチャ図を最新の実装に合わせて更新する |
| T-022 | [#22](https://github.com/skajihara/moneynote-web/issues/22) | UI/UX | ダークモード | テーマカラーに加えてダークモードを追加 |
| T-023 | [#23](https://github.com/skajihara/moneynote-web/issues/23) | UI/UX | 多言語対応（英語） | next-intl を使った i18n 対応。言語設定をアカウント設定に追加 |
| T-024 | [#24](https://github.com/skajihara/moneynote-web/issues/24) | 機能 | PWA 対応 | オフライン閲覧・ホーム画面追加対応 |

---

## 優先度：低（アイデア）

| ID | Issue | カテゴリ | 機能・内容 | 概要 |
|---|---|---|---|---|
| T-025 | [#25](https://github.com/skajihara/moneynote-web/issues/25) | 機能 | 目標貯蓄機能 | 貯蓄目標を設定して進捗をグラフで表示する |
| T-026 | [#26](https://github.com/skajihara/moneynote-web/issues/26) | 機能 | 領収書・レシート画像添付 | 明細に画像を添付できる機能（S3 連携） |
| T-027 | [#27](https://github.com/skajihara/moneynote-web/issues/27) | 機能 | 問い合わせメール受付 | アプリ内から問い合わせメールを送受信できる機能 |
| T-028 | [#28](https://github.com/skajihara/moneynote-web/issues/28) | アーキテクチャ | 認証サーバ・WebAPIサーバの別コンテナ化 | 認証サーバと WebAPI サーバを別コンテナとして設計・実装する（学習目的） |

---

## 技術的負債

| ID | Issue | 内容 | 優先度 |
|---|---|---|---|
| TD-001 | [#29](https://github.com/skajihara/moneynote-web/issues/29) | フロントエンドのテストカバレッジが低い画面がある | 中 |
| TD-002 | [#30](https://github.com/skajihara/moneynote-web/issues/30) | Docker ビルドが毎回時間がかかる（Gradle キャッシュの最適化余地あり） | 低 |
| TD-003 | [#31](https://github.com/skajihara/moneynote-web/issues/31) | application.yml・application-prod.yml の整合性確認が必要 | 高 |
| TD-004 | [#36](https://github.com/skajihara/moneynote-web/issues/36) | Redis レート制限を固定ウィンドウからスライディングウィンドウへ変更（バースト対策） | 中 |

---

## 完了した TODO

| ID | [#Num](URL) | カテゴリ | 内容 | ブランチ |
|---|---|---|---|---|
| T-009 | [#9](https://github.com/skajihara/moneynote-web/issues/9)  | 品質 | ID重複時の再生成ロジック確認 | feature/issue-9-id-regeneration |
| T-010 | [#10](https://github.com/skajihara/moneynote-web/issues/10) | 品質 | レイヤードアーキテクチャ遵守の確認 | feature/issue-10-layered-arch |
| T-011 | [#11](https://github.com/skajihara/moneynote-web/issues/11) | 品質 | SQLパフォーマンス最適化 | feature/issue-11-sql-performance |
| T-002 | [#2](https://github.com/skajihara/moneynote-web/issues/2) | UI/UX | 円グラフの凡例を右側に表示 | feature/issue-2-pie-chart-legend |
| T-001 | [#1](https://github.com/skajihara/moneynote-web/issues/1) | UI/UX | レスポンシブ対応（文字崩れ修正） | feature/issue-1-responsive |
