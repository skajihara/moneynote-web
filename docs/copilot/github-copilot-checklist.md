# GitHub Copilot 習得チェックリスト

MoneyNote Web でのハンズオンを通じて確認すべきスキル・設定・注意点の一覧。

---

## セットアップ

- [ ] GitHub Copilot 拡張機能をインストールした
- [ ] GitHub アカウントでサインイン済み（タイトルバーのプロジェクト名横にアイコンが表示されている）
- [ ] `.github/copilot-instructions.md` を作成した（プロジェクトルールを記載済み）
- [ ] セマンティックインデックスを構築した（`Ctrl+Shift+P` → `Chat: コードベース セマンティック インデックスの構築`）
- [ ] `Auto Accept Delay` を `0`（手動承認）に設定した（`Ctrl+,` → `Chat › Editing: Auto Accept Delay`）
- [ ] `Next Edit Suggestions` を有効化した（`Ctrl+,` → `github.copilot.nextEditSuggestions.enabled: true`）

---

## 基本操作スキル

### インライン補完（Ghost Text）
- [ ] `Tab` で補完を確定できる
- [ ] `Alt+]` / `Alt+[` で候補を切り替えられる
- [ ] `Ctrl+→` で 1 単語だけ確定できる
- [ ] `Alt+\` で手動呼び出しできる
- [ ] コメントを先に書くと補完精度が上がることを確認した
- [ ] `//` コメントは補完トリガーになるが `/** */` Javadoc は出にくいことを理解した

### インラインチャット（Ctrl+I）
- [ ] コードを選択して `Ctrl+I` でインラインチャットを開ける
- [ ] Diff プレビューを確認してから Accept / Discard できる
- [ ] `/doc` で Javadoc を生成できる
- [ ] TypeScript 型から Zod スキーマを生成できる

### Copilot Chat（サイドバー）
- [ ] `Ctrl+Alt+I` またはタイトルバーアイコンでチャットを開ける
- [ ] Ask / Plan / Agent のモードを切り替えられる
- [ ] `#file` でファイルを文脈に追加できる
- [ ] `#editor` で開いているファイルを渡せる
- [ ] `#selection` で選択範囲を渡せる
- [ ] `#terminalOutput` でターミナルの出力を解析させられる
- [ ] `#codebase` で Ask モードからコードベース横断検索できる

### Agent モード
- [ ] Agent モードでワークスペース全体を参照した実装依頼ができる
- [ ] セマンティックインデックス構築後に精度が上がることを確認した
- [ ] 不要なコンテキストが混入しても指示したファイルが優先されることを理解した

---

## スラッシュコマンド一覧（チャット入力欄で `/` を入力）

### よく使うコマンド
| コマンド | 用途 |
|---------|------|
| `/doc` | ドキュメント・Javadoc を生成 |
| `/explain` | コードの説明 |
| `/fix` | バグ・エラーを修正 |
| `/tests` | ユニットテストを生成 |
| `/setupTests` | テストフレームワークを設定 |
| `/plan` | 実装計画を作成（Plan モードを開く）|
| `/new` | 新しいファイル・プロジェクトのスキャフォールド |
| `/search` | 検索クエリを生成 |
| `/clear` | チャット履歴をクリア |
| `/compact` | 長い会話を要約して継続 |
| `/startDebugging` | デバッグ設定を生成して起動 |

### 上級コマンド
| コマンド | 用途 |
|---------|------|
| `/yolo` または `/autoApprove` | すべてのツール呼び出しを自動承認（危険：慎重に使う）|
| `/fork` | 現在の会話を独立したスレッドに分岐 |
| `/instructions` | `copilot-instructions.md` を開く・編集 |
| `/create-prompt` | カスタムプロンプトファイルを生成 |
| `/create-agent` | カスタムエージェントを定義 |

---

## コンテキスト変数（# 記法）完全版

### ファイル・コード参照
| 記法 | 意味 |
|------|------|
| `#file パス` | 特定ファイルの内容を渡す |
| `#editor` | 開いているファイル全体 |
| `#selection` | 現在の選択範囲 |
| `#terminalOutput` | ターミナルの出力 |
| `#codebase` | コードベース全体をセマンティック検索 |

### ツール・アクション
| 記法 | 意味 |
|------|------|
| `#web` | Web コンテンツを取得 |
| `#browser` | 統合ブラウザを操作（実験的）|
| `#search` | ファイル・コードを検索 |
| `#read` | ファイルを読み込む |
| `#edit` | ファイルを編集 |
| `#execute` | コードを実行 |

### GitHub 連携
| 記法 | 意味 |
|------|------|
| `#githubRepo` | GitHub リポジトリ情報を参照 |
| `#githubTextSearch` | GitHub 上でテキスト検索 |
| `#todos` | コードベースの TODO を抽出 |

> `@workspace` は最新版では非表示。Agent モードがワークスペース全体を自動参照するため不要になった。

---

## チャット参加者（@ 記法）

| 変数 | 意味 | 使いどころ |
|------|------|-----------|
| `@github` | GitHub リポジトリ・PR・Issue を参照 | PR の状況確認、Issue の調査 |
| `@vscode` | VSCode の設定・拡張機能 API | 設定変更、拡張機能の使い方 |
| `@terminal` | ターミナルのシェル操作 | コマンドの説明、エラー解析 |

---

## MCP サーバーの設定と実践

Copilot の Agent モードを外部ツール（DB・ブラウザ・API 等）と連携させる機能。

### 設定ファイルの場所

```
.vscode/
└── mcp.json   ← ワークスペース共有（git 管理可）
```

または `Ctrl+Shift+P` → `MCP: Open User Configuration`（ユーザー全体に適用）

> **重要**: Claude Code で設定済みの Serena・context7 は Copilot でも自動的に使える。VSCode の MCP 設定は両者で共有される。

### 設定フォーマット（`.vscode/mcp.json`）

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@microsoft/mcp-server-playwright"]
    }
  }
}
```

### 使い方（Agent モードで）

1. Agent モードに切り替える
2. チャット入力欄の「**Configure tools**」アイコンをクリック
3. 使いたい MCP ツールを ON にする
4. 指示を入力すると Copilot が MCP ツールを呼び出す

### 実検証で判明した動作特性

| MCP ツール | 自動で使われるか | 使うには |
|-----------|----------------|---------|
| 組み込み（grep・search 等） | ✓ 自律的に使う | 指示不要 |
| Serena（シンボル検索） | △ 使わないことが多い | 「serena を使って」と明示する |
| context7（ドキュメント取得） | △ 使わないことが多い | 「context7 を使って」と明示する |

> **Claude Code との違い**: Claude Code は `CLAUDE.md` の指示で MCP を自律的に使うが、
> Copilot は明示的に指定しないと使わない傾向がある。

### 自動化のコツ：`copilot-instructions.md` に追記する

`.github/copilot-instructions.md` に以下を書いておくと毎回指定しなくて済む：

```markdown
## MCP ツールの使用方針
- ライブラリの実装・API 調査時は必ず context7 で最新ドキュメントを確認する
- コードのシンボル検索・参照調査は serena を使う
```

### MCP チェックリスト

- [ ] `.vscode/mcp.json` を作成した
- [ ] Agent モードの「Configure tools」で使いたい MCP が表示されている
- [ ] context7 を明示的に呼び出して最新ドキュメントを取得できた
- [ ] Serena を明示的に呼び出してシンボル検索できた
- [ ] `copilot-instructions.md` に MCP 使用方針を追記した（自動化）

---

## 重要な設定（初回必須）

| 設定 | 値 | 場所 |
|------|----|------|
| Auto Accept Delay | `0`（手動承認） | `Ctrl+,` → Chat › Editing |
| Next Edit Suggestions | 有効 | `Ctrl+,` → nextEditSuggestions |
| セマンティックインデックス | 構築済み | `Ctrl+Shift+P` |
| copilot-instructions.md | 作成済み | `.github/` |
| MCP サーバー（任意） | 設定済み | `.vscode/mcp.json` |

---

## 注意点・落とし穴

| 状況 | 対策 |
|------|------|
| `/** */` Javadoc 形式だと Ghost Text が出にくい | 実装の意図は `//` コメントで書く |
| Spring Data JPA のメソッド名がコンパイルエラー | Copilot は命名規則から推測するだけ。Repository に定義があるか必ず確認する |
| `/doc` で生成した Javadoc の内容が不正確 | `@throws` の例外クラスなどは業務知識で検証が必要 |
| Agent モードが変更を即時適用した | `Auto Accept Delay` を `0` に設定する |
| copilot-instructions.md の効果が薄い | 暗黙ルール（例外クラス名・レスポンス形式）ほど効果が大きい。コードを見れば分かるルールは効果が薄い |
| 生成コードにセキュリティ問題がある可能性 | BCrypt 強度・JWT クレーム検証・JPQL 使用などプロジェクトルールと照合する |
| 日本語で聞いたのに英語で返ってくる | 「日本語で回答してください」と付け加える |
| `/yolo` を使ったら意図しないファイルが変更された | 通常は使わない。使う場合は git でスナップショットを取ってから |

---

## Claude Code との使い分け判断基準

| これをやりたい | 使うツール |
|--------------|-----------|
| 日常的なコード補完・タイピング | Copilot（Ghost Text）|
| 1 箇所のリファクタリング・型変換 | Copilot（Ctrl+I）|
| エラー原因の調査 | Copilot Chat（`#terminalOutput`）|
| テスト生成（単発） | Copilot Chat（`/tests`）|
| GitHub PR・Issue の調査 | Copilot Chat（`@github`）|
| 新機能の設計 | Claude Code（/design）|
| 複数ファイルにまたがる大規模実装 | Claude Code（/implement）|
| Flyway マイグレーション作成 | Claude Code（db-migration スキル）|
| Git 操作（commit/push） | 手動（両者とも不可）|

---

## モデル選択の目安

| モデル | 向く場面 |
|--------|---------|
| Auto（デフォルト） | 普段使いはこれで OK |
| Claude Haiku 4.5 | 軽量・高速。Pro プランで利用可 |
| Claude Sonnet 4.6 | 大きなファイル解析・設計相談（要アップグレード）|
| GPT-4.1 | バランス型。Pro プランで利用可 |

---

*作成日: 2026-05-31 | ハンズオン実施後に更新*
