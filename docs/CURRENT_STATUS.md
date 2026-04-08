# CURRENT_STATUS.md - 現在の開発状況

## 最終更新
2026年4月（Step 5 完了時点）

---

## 完了した Step

| Step | 内容 | ブランチ | 状態 |
|---|---|---|---|
| Step 1 | プロジェクト雛形 | feature/step1-project-scaffold | 完了・develop マージ済み |
| Step 2 | DB設計・マイグレーション | feature/step2-db-migration | 完了・develop マージ済み |
| Step 3 | 認証 API | feature/step3-auth-api | 完了・develop マージ済み |
| Step 4 | 認証画面 | feature/step4-auth-frontend | 完了・develop マージ済み |
| Step 5 | 帳簿管理 API・フロントエンド | feature/step5-ledger | 完了・develop マージ済み |

## 現在の状態
- 現在のブランチ: develop
- 次の作業: Step 6（収支明細 API・カレンダー・一覧画面）
- リリース済み: v0.1.0（Step 1〜4）

---

## 重要な技術的決定事項

| 決定内容 | 理由 |
|---|---|
| Java 24 を採用（企画書は Java 21） | 開発 PC に Java 24 がインストール済みのため |
| Gradle 8.14 を採用 | Java 24 対応のため（8.8 では非対応） |
| Spring Boot 3.4.5 を採用 | Java 24 の ASM 対応のため |
| Spring AI 1.0.0 GA を採用 | スターター名が spring-ai-starter-model-anthropic に変更 |
| npm install を使用（npm ci ではなく） | package-lock.json が存在しないため |
| メール送信ホスト名は mailhog（localhost ではなく） | Docker コンテナ間通信のため |
| 未認証リクエストに AuthenticationEntryPoint で 401 を返す | Spring Security デフォルトは 403 を返すため明示的に設定 |
| LedgerAccessValidator をコンポーネントとして共通化 | 全帳簿エンドポイントのアクセス制御を一元管理するため |
| CategoryType の変更は PUT /categories/{id} では不可 | 変更すると既存明細の分類が変わるため |
| POST /api/v1/ledgers ではカテゴリを自動生成しない | 追加帳簿は用途が異なるケースが多いため。register 時のみ生成する |
| seed.ps1 は UTF-8 BOM付きで保存 | PowerShell 5.1 での日本語文字化け対策 |

---

## 重要なファイルパス

### バックエンド

- 認証 API: backend/src/main/java/com/example/moneynote/domain/auth/
- 帳簿 API: backend/src/main/java/com/example/moneynote/domain/ledger/
- カテゴリ API: backend/src/main/java/com/example/moneynote/domain/category/
- アクセス制御: backend/src/main/java/com/example/moneynote/common/validator/LedgerAccessValidator.java
- 共通例外: backend/src/main/java/com/example/moneynote/common/exception/
- 共通レスポンス: backend/src/main/java/com/example/moneynote/common/response/
- JWT 設定: backend/src/main/java/com/example/moneynote/common/security/
- DB マイグレーション: backend/src/main/resources/db/migration/
- アプリ設定: backend/src/main/resources/application.yml

### フロントエンド

- 認証画面: frontend/src/app/(auth)/
- アプリ画面: frontend/src/app/(app)/
- API クライアント: frontend/src/lib/api/
- Zustand ストア: frontend/src/stores/
- 共通コンポーネント: frontend/src/components/
  - レイアウト: frontend/src/components/layout/ （Header.tsx, SideMenu.tsx）
  - 帳簿: frontend/src/components/ledger/ （LedgerCreateModal.tsx）

---

## 既知の注意点

1. コード変更後は docker compose up -d --build が必要
   （docker compose up -d だけではイメージが更新されない）

2. seed.ps1 は Step 5（帳簿管理 API）完了後に完全動作する
   （現時点では帳簿・明細系 API が未実装のため途中で止まる）

3. DB リセットが必要な場合は docker compose down -v を使う
   （-v オプションでボリュームも削除される）

4. Flyway マイグレーション失敗時は docker compose down -v の後に up --build を実行する

5. PUT /api/v1/ledgers/{ledgerId}/categories/order はパス設計上、
   /{categoryId} より前に定義する必要がある（Spring MVC のルーティング順序）

---

## ブランチ戦略

- main: v0.1.0 タグ済み
- develop: Step 1〜4 マージ済み
- feature/step5-ledger: Step 5 実装済み（テストグリーン）

### 次回の作業手順
```bash
# Step 5 を develop にマージ
git checkout develop
git merge --no-ff feature/step5-ledger
git push origin develop

# Step 6 の feature ブランチを作成
git checkout -b feature/step6-transaction
git push origin feature/step6-transaction
```

---

## Step 完了時の更新ルール

このファイルは各 Step の Gate 3（動作確認）完了・コミット前に更新する。

更新内容:
- 完了した Step のステータスを更新する
- 現在の状態セクションを更新する
- 新たな技術的決定事項があれば追記する
- 新たな注意点があれば追記する
