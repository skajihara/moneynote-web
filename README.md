# MoneyNote Web

Web ブラウザから使える家計簿管理アプリ。

> ⚠️ **このリポジトリはポートフォリオ目的で公開しています。閲覧・参照は自由ですが、コードの複製・転載・改変・流用を禁止します。**

---

## 技術スタック

| 領域 | 技術 |
|---|---|
| バックエンド | Spring Boot 3.4.5 / Java 24 / Spring Security + JWT / Spring AI (Claude API) |
| DB | PostgreSQL 16 / Flyway / Redis 7 |
| フロントエンド | Next.js 14 (App Router) / TypeScript / Tailwind CSS / Zustand / Recharts |
| インフラ（ローカル） | Docker Compose / nginx (HTTPS) / Mailhog |
| インフラ（AWS） | AWS EC2 / ALB / RDS (PostgreSQL 16) / ElastiCache (Redis 7) / ECR / Secrets Manager |
| CI/CD | GitHub Actions（テスト → ECR ビルド → SSM デプロイ） ※現在はテストのみ有効 |
| テスト | JUnit5 / Testcontainers / MockMvc / Jest / React Testing Library |

---

## ローカル環境構築

### 前提条件

- Docker Desktop（WSL2 統合有効）
- Node.js 20+
- mkcert（HTTPS ローカル証明書）

### 1. 証明書セットアップ（初回のみ）

```powershell
powershell -ExecutionPolicy Bypass -File setup-ssl.ps1
```

### 2. 環境変数ファイルの準備

```bash
cp .env.example .env
# .env を編集して JWT_SECRET 等を設定
```

`.env.example` に記載のキーに従い、`JWT_SECRET` は `openssl rand -base64 64` で生成した値を使用すること。

### 3. Docker 起動

```bash
docker compose up -d --build
```

### 4. 動作確認

| URL | 説明 |
|---|---|
| https://localhost | アプリ本体 |
| https://localhost/swagger-ui.html | Swagger UI |
| http://localhost:8025 | Mailhog（開発用メール確認） |

### 5. テストデータ投入（オプション）

```powershell
powershell -ExecutionPolicy Bypass -File seed.ps1
```

---

## テスト実行

### バックエンド

```bash
./gradlew test
# または特定クラスのみ
./gradlew test --tests "com.example.moneynote.domain.auth.*"
```

> Docker Desktop が起動していること（Testcontainers が PostgreSQL コンテナを起動するため）

### フロントエンド

```bash
cd frontend
npm test            # 全テスト（watch なし）
npm test -- --watch # ウォッチモード
```

---

## ブランチ戦略

```
main    ← 安定版のみ。直接コミット禁止
develop ← 開発統合ブランチ
 └── feature/issue-{番号}-{内容}
 └── feature/step{番号}-{内容}
```

詳細は [docs/BRANCH_STRATEGY.md](docs/BRANCH_STRATEGY.md) を参照。

---

## 操作マニュアル

エンドユーザー向けマニュアルは GitHub Pages で公開しています。

- **URL**: https://skajihara.github.io/moneynote-web-manual/

## ドキュメント（開発者向け）

| ドキュメント | 内容 |
|---|---|
| [docs/architecture.md](docs/architecture.md) | システム構成・技術選定・レイヤー設計 |
| [docs/api-overview.md](docs/api-overview.md) | API 仕様一覧・認証方式・エラーコード |
| [docs/development-guide.md](docs/development-guide.md) | 開発規約・テスト方針・よくある問題 |
| [docs/BRANCH_STRATEGY.md](docs/BRANCH_STRATEGY.md) | Git ブランチ運用・コミットメッセージ規則 |
| [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) | 現在の開発状況・再開手順 |
| [docs/aws-design/](docs/aws-design/) | AWS インフラ設計書 |

---

## スクリーンショット

<!-- TODO: ダッシュボード、収支明細、レポート画面のスクリーンショットをここに追加 -->

---

## AWS インフラについて

> **[2026年5月] AWS インフラは削除済みです。**
>
> ポートフォリオ公開にあたりコスト最適化のため、EC2・RDS・ElastiCache・ALB 等の AWS リソースを削除しました。
> インフラ設計・構築・CI/CD パイプラインの実装内容は [docs/aws-design/](docs/aws-design/) に記録しています。
> ローカル環境での動作確認は上記「ローカル環境構築」の手順で可能です。

---

## 運用方針

- 機能追加・バグ修正のたびに `docs/` 配下の該当ドキュメントを最新化する
- 新規エンドポイント追加時は `docs/api-overview.md` への追記と Swagger アノテーション追加を必ず行う
- DB スキーマ変更時は `docs/architecture.md` のDB設計方針を確認する
