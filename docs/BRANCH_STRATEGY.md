# ブランチ戦略・コミット規則

## ブランチ構成

```
main      ← 完成・安定版のみ。直接コミット禁止
develop   ← 開発の統合ブランチ。各Stepのマージ先
 └── feature/step{番号}-{内容}      # 新規 Step（大機能）
 └── feature/issue-{番号}-{内容}    # Issue 対応（改善・バグ修正）
```

例:
- `feature/step16-quality-improvements`
- `feature/issue-33-system-admin`

タグのタイミング（v0.1.0〜v1.4.0）は `docs/RELEASE_PLAN.md` を参照。

## 運用フロー

```bash
# 1. feature ブランチを切る
git checkout develop
git checkout -b feature/issue-{番号}-{内容}

# 2. 実装・テスト・Gate 3（ブラウザ動作確認）まで進める

# 3. develop へマージ
git checkout develop
git merge --no-ff feature/issue-{番号}-{内容}
git branch -d feature/issue-{番号}-{内容}
git push origin develop

# 4. 複数Stepが安定したら main へマージ
git checkout main
git merge --no-ff develop
git tag v0.x.0
git push origin main --tags
```

## コミットメッセージ規則

```
feat:     新機能の追加
fix:      バグ修正
test:     テストの追加・修正
refactor: リファクタリング
docs:     ドキュメントの更新
chore:    設定ファイル・依存関係の更新
```

例: `feat: Add JWT authentication API` / `fix: Fix ledger access control bug`
