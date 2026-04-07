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
2. docs/CURRENT_STATUS.md を読んで現在の開発状況を把握する
3. 実装対象の設計書（docs/配下）を読む
4. 設計書がない場合は /design コマンドで設計書を先に出力し承認を待つ

### 実装時のルール
- 機能や画面の区分ごと・意味的・目的が類似したファイルはまとめて変更する
- 実装とテストは必ずセットで作成する
- 不明点があれば実装を止めて質問リストを出力する
- エラー発生時: 原因・影響範囲・修正方針を先に説明してから修正する
- Gate 3（動作確認）完了・コミット前に docs/CURRENT_STATUS.md を更新する
  更新内容:
    - 完了した Step のステータスを更新する
    - 現在の状態セクションを更新する
    - 新たな技術的決定事項があれば追記する
    - 新たな注意点があれば追記する

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

---

## ブランチ戦略（Git Flow）

### ブランチ構成
```
main      ← 完成・安定版のみ。直接コミット禁止
develop   ← 開発の統合ブランチ。各Stepのマージ先
 └── feature/step{番号}-{内容を英語で簡潔に}
```

### ブランチ命名規則
```
feature/step1-project-scaffold
feature/step2-db-migration
feature/step3-auth-api
feature/step4-auth-frontend
feature/step5-ledger
...
```

### 運用フロー
```
1. develop から feature ブランチを切る
   git checkout develop
   git checkout -b feature/step{番号}-{内容}

2. Claude Code で実装・テスト・動作確認を進める

3. Gate 3（ブラウザ動作確認）完了後に develop へマージ
   git checkout develop
   git merge --no-ff feature/step{番号}-{内容}
   git branch -d feature/step{番号}-{内容}
   git push origin develop

4. 複数Stepが安定したら main へマージしてタグを打つ
   git checkout main
   git merge --no-ff develop
   git tag v0.x.0
   git push origin main --tags
```

### main へのマージタイミング（目安）
```
v0.1.0 ← Step 1〜4 完了（認証・帳簿が動く状態）
v0.2.0 ← Step 5〜7 完了（明細・ダッシュボードが動く状態）
v0.3.0 ← Step 8〜10 完了（レポート・予算・CSVが動く状態）
v1.0.0 ← Step 11〜14 完了（AI・設定・品質仕上げ）
```

### コミットメッセージの規則
```
feat: 新機能の追加
fix: バグ修正
test: テストの追加・修正
refactor: リファクタリング
docs: ドキュメントの更新
chore: 設定ファイル・依存関係の更新

例:
feat: Add JWT authentication API
fix: Fix ledger access control bug
test: Add transaction service unit tests
```

---

## カスタムコマンドの活用・連携フロー

### Step 内の標準的な進め方
```
【Step 開始】feature ブランチを切る
    │
    ▼
/design（アーキテクト）
    設計書・ER図・API仕様を出力
    │
    ▼
【Gate 1：設計を確認して「OK」と入力】
    │
    ├──→ バックエンドがある場合
    │        /implement（バックエンドエンジニア）
    │            Entity・Service・Controller・テストを実装
    │            ./gradlew test を自動実行してグリーン確認
    │
    ├──→ フロントエンドがある場合
    │        /frontend（フロントエンドエンジニア）
    │            コンポーネント・ページ・APIクライアントを実装
    │            npm test を自動実行してグリーン確認
    │
    ▼
【Gate 2：テストがグリーンか確認】
    │
    ▼
/review（シニアレビュアー）
    Critical・Major・Minor の指摘リストを出力
    │
    ▼
【Critical・Major があれば】
    /refactor（リファクタエンジニア）
        指摘箇所を修正・テスト再実行
    │
    ▼
【Gate 3：ブラウザで動作確認】
    seed.sh でリセットして再確認
    │
    ▼
【人間が git commit & push → develop へマージ】
    │
    ▼
【次の Step へ】
```

### その他のロールの使いどころ
| コマンド | 使うタイミング |
|---|---|
| `/security` | Step 13（セキュリティ強化）または気になった時 |
| `/test` | カバレッジが足りないと気づいた時 |
| `/ops` | エラーが解決できない時・CI構築・ドキュメント生成時 |

---

## コンテキストリフレッシュ後の再開手順
/compact 実行後または会話を再開する際は以下を必ず実行すること:
```bash
# 1. 現在のブランチを確認する
git branch

# 2. 直近のコミット履歴を確認する
git log --oneline -5

# 3. 未コミットファイルを確認する
git status

# 4. 現在の開発状況を確認する
cat docs/CURRENT_STATUS.md
```

確認完了後「コンテキストを復元しました。現在は〇〇ブランチで〇〇の作業中です。」と報告すること。
