# CLAUDE.md - エージェントへの憲法

## このファイルの目的
Claude Code がこのプロジェクトで自律的に開発を進めるための
ルール・方針・文脈を定義する。
全ての作業の前にこのファイルを読み、全ての方針に従うこと。

---

## プロジェクト概要
MoneyNote Web - Web版家計簿管理アプリ（モノレポ構成）
マルチアカウント・マルチ帳簿対応。PC大画面を活かした3ペインレイアウト。

## リポジトリ構成（モノレポ）
- backend/   ← Spring Boot 3.x / Java 24
- frontend/  ← Next.js 14 / TypeScript

---

## 技術スタック

### Backend
- Spring Boot 3.x / Java 24
- Spring Security + JWT
  - アクセストークン: 15分
  - リフレッシュトークン: 7日（Redis で管理）
- Spring AI + Claude API（モック切替対応）
- Spring Data JPA + Hibernate + PostgreSQL 16
- Flyway（DBマイグレーション）
- Redis 7（セッション・キャッシュ・レート制限）
- Apache Commons CSV
- JUnit5 + Testcontainers + MockMvc

### Frontend
- Next.js 14 / TypeScript / Tailwind CSS
- Zustand（状態管理）
- React Hook Form + Zod（フォーム・バリデーション）
- Recharts（グラフ）
- Jest + React Testing Library

---

## ID生成規則
全テーブルのPKは文字列型。アプリ側で以下のプレフィックス付き一意文字列を生成する。
ただしユーザーIDのみ、ユーザーが任意に入力する（例: tanaka_01）。
- 帳簿:          ldg_{12桁}
- 帳簿権限:      lperm_{12桁}
- カテゴリ:      cat_{12桁}
- 明細:          txn_{12桁}
- 固定費:        fix_{12桁}
- 予算:          bgt_{12桁}
- AIキャッシュ:  aic_{12桁}

---

## アーキテクチャ原則
1. レイヤードアーキテクチャを厳守: Controller → Service → Repository
2. ドメインロジックはServiceに集約（Controller・Repositoryに書かない）
3. 全APIは /api/v1/ プレフィックスを付ける
4. 全 /api/v1/ledgers/{ledgerId}/* エンドポイントで帳簿アクセス制御を実装する
5. AIの呼び出しはモック切替可能にする（application-dev.yml の ai.mock=true）

---

## セキュリティ必須ルール
- パスワード: BCrypt 強度12でハッシュ化
- JWT: アクセストークン15分 / リフレッシュトークン7日
  - アクセストークンはレスポンスボディで返す
  - リフレッシュトークンはHttpOnly・SameSite=Strictのcookieで返す
- 帳簿アクセス: ログインユーザーが帳簿の権限を持つか必ずDBで検証。権限なしは403を返す
- ログイン失敗: 同一IPから5回失敗で15分ロック（Redisで管理）
- SQLインジェクション: JPQLまたはCriteriaAPIを使用（ネイティブSQL禁止）
- 機密情報（パスワード・トークン）をログに出力しない
- セキュリティ変更時は理由をコメントに記載する

---

## コーディング規約

### Java
- クラス名: UpperCamelCase
- メソッド名・変数名: lowerCamelCase
- 定数: UPPER_SNAKE_CASE
- パッケージ: com.example.moneynote.{layer}.{domain}
- 例外: カスタム例外クラスを使う（RuntimeException直接使用禁止）
  - ResourceNotFoundException（404）
  - AccessDeniedException（403）
  - ValidationException（400）
  - ExternalApiException（502）
- レスポンス形式: { "data": {...}, "error": null, "timestamp": "..." }
- エラー形式: { "data": null, "error": { "code": "E001", "message": "..." }, "timestamp": "..." }
- タイプ・区分はJava側Enum / DB側VARCHARで管理する

### TypeScript
- any型の使用禁止
- コンポーネント: アロー関数で定義
- ESLint + Prettier の設定に従う
- APIクライアント: lib/api/ に集約

---

## テスト必須ルール
- 全Serviceクラスに対してJUnit5テストを作成する
- DBを使うテストはTestcontainersを使用する
- MockMvcで全APIエンドポイントのテストを作成する
- テストには帳簿アクセス制御（他ユーザーが403になること）を含める
- テストカバレッジ目標: 80%以上
- テストなしの実装は行わない

---

## エージェントの自律的な行動ルール

### 自律的に実行してよい操作（確認不要）
- ファイルの読み書き・作成・削除
- ./gradlew build / ./gradlew test の実行
- npm run build / npm test / npm run lint の実行
- docker compose up -d / docker compose down の実行
- seed.sh の実行

### 実装前に必ず行うこと
1. このファイル（CLAUDE.md）を読む
2. 実装対象の設計書（docs/配下）を読む
3. 設計書がない場合は /design コマンドで設計書を先に出力し承認を待つ

### 実装時のルール
- 機能や画面の区分ごと・意味的・目的が類似したファイルはまとめて変更する
- 実装とテストは必ずセットで作成する
- 不明点があれば実装を止めて質問リストを出力する
- エラー発生時: 原因・影響範囲・修正方針を先に説明してから修正する

### やってはいけないこと
- コミット・プッシュ（人間が行う）
- 設計書がない状態での実装開始
- テストなしの実装
- any型の使用（TypeScript）

---

## ローカル環境の起動方法
```bash
docker compose up -d          # 全サービス起動
./seed.sh                     # テストデータ投入・リセット
# フロント:    http://localhost:3000
# API/Swagger: http://localhost:8080/swagger-ui.html
# メール:      http://localhost:8025
```

---

## よくある行き詰まりと対処法

### Testcontainersでテストが失敗する場合
→ Docker Desktopが起動しているか確認。WSL2統合が有効か確認。

### Spring AI / Claude APIでエラーが出る場合
→ application-dev.yml の ai.mock=true に変更してモックで代替する。

### Flywayマイグレーションが失敗する場合
→ docker compose down -v でボリュームを削除してから docker compose up -d で再起動する。

### フロントエンドでAPI接続エラーが出る場合
→ CORS設定を確認。バックエンドが :8080 で起動しているか確認。
