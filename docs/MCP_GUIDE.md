# MCP 運用ガイド

## 接続中の MCP サーバー

| MCP | 用途 |
|---|---|
| serena | シンボリック検索・クロスファイル編集（トークン効率化） |
| context7 | 最新ライブラリドキュメントの参照 |
| github | Issue・PR管理 |

## serena

効率向上が見込める場面では必ず活用する。

活用場面:
- frontend/backend 開発・修正・デバッグ・リファクタ
- APIバージョニングとドキュメント化
- プロジェクトアーキテクチャのセットアップ・テスト・CI/CD実装

使い方: タスク開始時に `mcp__serena__initial_instructions` を必ず呼び出す。

## context7

ライブラリの API・設定・バージョン依存の実装時は必ず最新ドキュメントを確認してから実装する。

対象: Spring AI / Next.js / Recharts 等のライブラリを使う実装全般。

## GitHub MCP

- 新しい TODO・改善点は GitHub Issues に登録する（ラベル: enhancement/bug/tech-debt 等）
- コミット前に関連 Issue を確認する
- Issue 番号は TODO.md にも記録する

## Step 内の標準フロー

```
feature ブランチ作成
  → /design（設計書出力・承認待ち）
  → /implement（バックエンド）
  → /frontend（フロントエンド）
  → /review（コードレビュー）
  → /refactor（指摘修正）
  → Gate 3（ブラウザ動作確認）
  → CURRENT_STATUS.md 更新
  → git commit & push（人間が実行、手順は `docs/BRANCH_STRATEGY.md` 参照）
```

## コマンド一覧（`.claude/commands/` 参照）

| コマンド | 使うタイミング |
|---|---|
| `/design` | 実装前の設計書出力（承認後 `docs/step{N}-design.md` として保存） |
| `/implement` | バックエンド実装 |
| `/frontend` | フロントエンド実装 |
| `/review` | コードレビュー |
| `/refactor` | 指摘修正 |
| `/security` | セキュリティ強化・確認 |
| `/test` | カバレッジ不足時 |
| `/ops` | CI構築・エラー解決 |
| `/performance` | N+1・クエリ最適化・再レンダリング診断 |
| `/debug` | エラーログ・スタックトレース解析 |
