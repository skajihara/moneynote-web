# GitHub Copilot チュートリアル（MoneyNote Web 版）

**対象者**: Claude Code に慣れた開発者が GitHub Copilot を次の案件で即戦力として使えるようになるための実践ガイド  
**ゴール**: Copilot の重要機能を MoneyNote Web のコードで体験し、Claude Code との使い分けを確立する

---

## はじめに — Claude Code と Copilot の使い分け

まず「Copilot は Claude Code の下位互換」ではなく、**得意領域が異なるツール**だと理解することが重要。

| 観点 | Claude Code | GitHub Copilot |
|------|-------------|----------------|
| 動作環境 | ターミナル（CLI）| VS Code エディタ（IDE統合）|
| 強み | 大規模タスクの自律実行・設計 | 高速インライン補完・エディタ内チャット |
| コスト | Pro $20〜/月、Max $200/月 | Free プランあり、Pro $10/月〜 |
| GitHub 連携 | MCP 経由 | PR レビュー・Issue 駆動開発がネイティブ |
| 向くシーン | 複雑な設計・大規模リファクタリング | 日常コーディング・テスト補完・小改修 |

```
┌─────────────────────────────────────────────────────┐
│  Copilot の3つの使い方                               │
│                                                     │
│  ① インライン補完     コード入力中に自動表示          │
│     （Ghost Text）   Tab で確定                     │
│                                                     │
│  ② インラインチャット  Ctrl+I で選択箇所を直接編集    │
│     （Inline Chat）  Diff プレビューで確認してから適用│
│                                                     │
│  ③ サイドバーチャット  Ctrl+Alt+I で会話しながら調査  │
│     （Copilot Chat） @workspace / #file で文脈付与  │
└─────────────────────────────────────────────────────┘
```

---

## Part 1: セットアップ（15分）

### 1-1. VS Code に Copilot をインストール

1. `Ctrl+Shift+X` で拡張機能パネルを開く
2. `GitHub Copilot` を検索（公式発行元: GitHub）
3. **GitHub Copilot** をインストール（Copilot Chat も同時に入る）
4. VS Code 右下のステータスバーに Copilot アイコン（✓）が表示されれば完了

### 1-2. GitHub アカウントでサインイン

1. ステータスバーの Copilot アイコンをクリック → `Sign in to GitHub`
2. ブラウザが開くのでデバイスコードを入力して認可
3. VS Code に戻ると自動認証される

**プランについて**

| プラン | 月額 | インライン補完 | チャット |
|--------|------|--------------|--------|
| Free | 無料 | 2,000回/月 | 50回/月 |
| Pro | $10 | 無制限 | 無制限 |

次の案件で本格利用するなら **Pro** 推奨。Free は動作確認・試用に十分。

### 1-3. MoneyNote Web で動作確認

```bash
cd /path/to/moneynote-web
code .
```

`CategoryService.java` を開き、クラスの末尾に以下を入力する：

```java
// 帳簿IDでカテゴリ数を取得する
```

グレーのゴースト文字が出れば OK。

---

## Part 2: 絶対に覚える3機能

### 機能①: インライン補完（Ghost Text）

**一番使う機能。コードを書いていると自動で提案が出る。**

#### 操作キー

| 操作 | キー |
|------|------|
| 補完を確定 | `Tab` |
| 補完を消す | `Escape` |
| 次の候補 | `Alt+]` |
| 前の候補 | `Alt+[` |
| 1 単語だけ確定 | `Ctrl+→` |
| 手動で呼び出す | `Alt+\` |

#### 補完精度を上げる3つのコツ

**コツ1: コメントを先に書く（コメントドリブン）**

```java
// 帳簿IDと日付範囲で明細一覧を取得し、カテゴリ別に集計する
public Map<String, BigDecimal> summarizeByCategory(  // ← ここで Tab
```

**コツ2: 命名を具体的にする**

```java
// 良い例（意図が伝わる）
List<Category> findByLedgerIdAndType(String ledgerId, CategoryType type)

// 悪い例（補完が曖昧になる）
List<Category> find(String id, String type)
```

**コツ3: 既存コードの命名規則を踏襲する**  
同じファイル内の他のメソッドが `accessValidator.validate()` を使っていれば、
新しいメソッドでも自動的に同じパターンを補完してくれる。

---

### 機能②: Copilot Chat（サイドバーチャット）

**エディタを離れずに質問・実装依頼ができる。**

#### 開き方

`Ctrl+Alt+I`（Windows）または左サイドバーの Copilot アイコン

#### 3つのモード

| モード | 説明 | いつ使う |
|--------|------|---------|
| **Ask** | 質問・調査のみ（コード変更しない） | 構造を理解したい、設計を聞きたい |
| **Edit** | コード生成・編集を提案 | 実装を進めたい |
| **Agent** | 複数ファイルを自律的に探索・編集 | 複雑なタスク全体を任せたい |

#### コンテキスト変数：@変数（スコープ指定）

| 変数 | 意味 | 使いどころ |
|------|------|-----------|
| `@workspace` | プロジェクト全体のファイル構造・コード | アーキテクチャ質問、横断的な調査 |
| `@vscode` | VSCode 設定・拡張機能 | 設定の変更、拡張機能の使い方 |
| `@terminal` | ターミナルの直近出力 | ビルドエラー・テスト失敗の解析 |

#### コンテキスト変数：#参照（特定コード）

| 記法 | 意味 |
|------|------|
| `#file パス` | ファイル全体を含める |
| `#editor` | 今開いているファイル全体 |
| `#selection` | 現在の選択範囲 |
| `#terminalOutput` | ターミナルの出力 |
| `#codebase` | コードベース検索（限定的） |

#### MoneyNote Web での活用例

```
# プロジェクト構造を把握する
@workspace このプロジェクトのバックエンドレイヤー構成を説明してください

# ファイルを指定して質問
#file backend/src/main/java/com/example/moneynote/domain/ledger/LedgerService.java
このサービスの帳簿アクセス権限チェックはどこで行われていますか？

# 複数ファイルを参照して比較
#file backend/src/main/java/.../TransactionController.java
#file backend/src/main/java/.../TransactionService.java
Controller と Service の責務分担は適切ですか？

# テスト失敗を解析する
#terminalOutput
このテスト失敗の原因と修正方法を教えてください

# 実装を依頼する（プロジェクトルールを添えると精度UP）
@workspace #file:TransactionService.java
このサービスに帳簿ID・カテゴリID・日付範囲で絞り込む findByFilters メソッドを追加して。
JPQL を使い、ResourceNotFoundException を使うこと。
```

---

### 機能③: インラインチャット（Inline Chat）

**コードの特定箇所を選択して、その場で AI に指示できる。最もエディタ親和性が高い機能。**

#### 使い方

1. 修正したいコードを**選択**（なくても可）
2. `Ctrl+I` でインラインチャットを開く
3. 自然言語で指示を入力して `Enter`
4. **Diff プレビューを確認** → `Accept` or `Discard`

#### MoneyNote Web での活用例

```java
// CategoryService.java の createCategory メソッドを選択して Ctrl+I
「このメソッドに Javadoc コメントを日本語で追加してください（@param/@return/@throws）」
```

```java
// TransactionRepository.java のクエリメソッドを選択して Ctrl+I
「N+1 問題を防ぐよう @EntityGraph または JOIN FETCH を使って最適化してください」
```

```typescript
// frontend/src/types/budget.ts の Budget 型を選択して Ctrl+I
「この型から Zod バリデーションスキーマを生成してください。数値は正の値のみ許可してください」
```

#### ポイント

- 変更は **Diff 形式で表示**されるので、適用前に確認できる（誤生成を防ぐ安全装置）
- 複数の候補が出ることがある（`Alt+]` で切り替え）
- 細かい 1 箇所の変更・リファクタリングに最適

---

## Part 3: プロジェクト最適化 — `copilot-instructions.md`

**Copilot を MoneyNote Web 専用 AI に育てる最重要設定ファイル。**  
CLAUDE.md に相当する Copilot 向けの指示ファイル。作成しておくと、毎回「JPQL 使って」「any 型禁止で」と言わなくて済む。

### 3-1. ファイルを作成する場所

```
moneynote-web/
└── .github/
    └── copilot-instructions.md   ← このファイルを新規作成
```

### 3-2. MoneyNote Web 用テンプレート

`.github/copilot-instructions.md` に以下の内容で作成する：

```markdown
# MoneyNote Web - GitHub Copilot Instructions

## プロジェクト概要
マルチアカウント・マルチ帳簿対応の Web 版家計簿管理アプリ。
モノレポ構成: backend/（Spring Boot 3.x / Java 24）、frontend/（Next.js 14 / TypeScript）

## バックエンド（Java / Spring Boot）ルール

### アーキテクチャ
- Controller → Service → Repository の厳守（レイヤー越え禁止）
- 全 API に `/api/v1/` プレフィックス
- 全 `/api/v1/ledgers/{ledgerId}/*` は DB アクセス制御必須（権限なし 403）

### ID 生成規則（アプリ側生成・String 型）
- 帳簿: `ldg_` / 帳簿権限: `lperm_` / カテゴリ: `cat_`
- 明細: `txn_` / 固定費: `fix_` / 予算: `bgt_` / AIキャッシュ: `aic_`

### 例外クラス（必ずこれを使う）
- ResourceNotFoundException → 404
- AccessDeniedException → 403
- ValidationException → 400
- ExternalApiException → 502

### レスポンス形式
- 成功: `{"data":{...},"error":null,"timestamp":"..."}`
- エラー: `{"data":null,"error":{"code":"E001","message":"..."},"timestamp":"..."}`

### セキュリティ
- BCrypt 強度 12
- JWT: アクセス 15 分（Body）・リフレッシュ 7 日（HttpOnly Cookie SameSite=Strict）
- JPQL / CriteriaAPI のみ使用（ネイティブ SQL 禁止）
- 機密情報をログ出力禁止

### テスト
- 全 Service に JUnit5
- DB テストは Testcontainers
- MockMvc で全 API テスト
- 帳簿アクセス制御テスト必須
- テストなし実装禁止

## フロントエンド（TypeScript / Next.js 14）ルール

### コーディング
- any 型禁止（型安全を徹底する）
- コンポーネントはアロー関数
- API クライアントは `lib/api/` に集約
- Zustand でグローバル状態管理
- React Hook Form + Zod でフォームバリデーション

### テスト
- Jest + React Testing Library
- カバレッジ 80% 以上

## AI 機能
- `ai.mock=true` で Claude API を回避（開発中はモック使用）

## 禁止事項
- TypeScript の any 型
- ネイティブ SQL（バックエンド）
- テストなしの実装
- 機密情報のハードコード
```

### 3-3. 効果の確認

設定後に Copilot Chat でこう聞いてみる：

```
新しい帳簿エンドポイント POST /api/v1/ledgers/{ledgerId}/tags の
Service メソッドのスケルトンを書いて
```

→ `ResourceNotFoundException` や `accessValidator.validate()` を使い、JPQL で書いたコードが出れば成功。

---

## Part 4: 実践演習（Copilot 機能の学習）

### 演習1: コメントドリブン補完を体験する（10分）

**目標**: Ghost Text の精度がコメントの質で変わることを体験する。

**Step 1: コメントなしで試す**

`CategoryService.java` の末尾に以下をそのまま入力して、出てくる補完を確認する：

```java
public long count(
```

→ 引数の意味が分からないため、汎用的な補完が出る。

**Step 2: コメントありで試す**

同じ場所に今度はコメントを先に書く：

```java
// 指定した帳簿に紐づくアクティブなカテゴリの件数を返す
public long countActiveCategories(
```

→ `String ledgerId` が引数として補完され、`categoryRepository` を使った実装まで提案される。

**Step 3: 別候補を確認する**

`Tab` で確定せず `Alt+]` を押して候補を切り替えてみる。同じメソッドでも実装方針が複数ある。

> **気づき**: コメントは「自分のための記録」ではなく「Copilot へのプロンプト」でもある。

---

### 演習2: /doc で Javadoc を一括強化する（10分）

**目標**: スラッシュコマンド `/doc` の使い方を習得する。

**Step 1: 対象メソッドを開く**

`CategoryService.java` の `createCategory` メソッド（47行目付近）を見ると、
1 行だけのコメント `/** カテゴリを作成する。*/` しかない。

**Step 2: チャットで /doc を実行する**

メソッド全体を選択して、Copilot Chat に以下を入力：

```
/doc
@param・@return・@throws を含む Javadoc を日本語で書いてください
```

**Step 3: Diff を確認して Accept**

生成された Javadoc を確認し、内容が正確かチェックしてから Accept する。

> **注意**: `/doc` は構造を生成するが、ビジネスロジックの説明は文脈から推測される。
> 必ず内容を読んで正確かを確認すること。自動生成＝正しいではない。

**Step 4: 同様に `deleteCategory` にも適用する**

`/doc` コマンドは繰り返し使いやすい。削除メソッドにも同様に試してみる。

---

### 演習3: copilot-instructions.md の効果を Before/After で比較する（15分）

**目標**: プロジェクト指示ファイルがどれだけ補完品質を変えるかを体感する。

**Step 1: instructions ファイルがない状態で質問（Before）**

Copilot Chat を開き、以下を入力する：

```
新しい Service メソッドのスケルトンを書いて。
帳簿ID を受け取って、そこに関連するデータを取得する処理。
```

→ 汎用的な Spring Service の書き方が出る。例外クラスは `RuntimeException` や `NotFoundException` など、このプロジェクト固有ではないものが使われるはず。

出てきたコードを一時的にメモしておく（コピーしてテキストファイルに貼るなど）。

**Step 2: `.github/copilot-instructions.md` を作成する**

Part 3 のテンプレートを使って `.github/copilot-instructions.md` を作成する。

**Step 3: 同じ質問をもう一度（After）**

チャット履歴をクリア（`/clear`）してから、全く同じ質問を入力する：

```
新しい Service メソッドのスケルトンを書いて。
帳簿ID を受け取って、そこに関連するデータを取得する処理。
```

**Step 4: Before/After を比較する**

| 確認ポイント | Before | After（期待値）|
|-------------|--------|--------------|
| 例外クラス | `RuntimeException` 等 | `ResourceNotFoundException` |
| DB アクセス | ネイティブSQLも出る場合あり | JPQL のみ |
| 権限チェック | なし | `accessValidator.validate()` |
| メソッド構造 | 汎用的 | MoneyNote のレイヤー規則に沿う |

> **気づき**: `copilot-instructions.md` は「毎回プロンプトに書かなくて済む CLAUDE.md」。
> プロジェクト固有ルールは最初に書いておくと以降の全チャットに効く。

---

### 演習4: TypeScript 型から Zod スキーマをインラインチャットで生成する（10分）

**目標**: インラインチャット（Ctrl+I）を TypeScript の型変換タスクに活用する。

**Step 1: 対象ファイルを開く**

`frontend/src/types/budget.ts` を開く。

```typescript
export type CreateBudgetRequest = {
  categoryId: string;
  year: number;
  month: number;
  amount: number;
};
```

**Step 2: 型定義を選択してインラインチャットを起動**

`CreateBudgetRequest` の型定義全体を選択（`type CreateBudgetRequest = { ... }` の行から閉じ括弧まで）して `Ctrl+I`。

**Step 3: 以下を入力する**

```
この型から Zod バリデーションスキーマを生成してください。
- amount は正の整数のみ
- year は 2000〜2100 の範囲
- month は 1〜12 の範囲
```

**Step 4: 生成結果を確認する**

期待する出力例：

```typescript
import { z } from 'zod';

export const createBudgetRequestSchema = z.object({
  categoryId: z.string(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.number().int().positive(),
});

export type CreateBudgetRequest = z.infer<typeof createBudgetRequestSchema>;
```

**Step 5: 生成されたスキーマが既存コードと整合しているか確認する**

`frontend/src/lib/api/` 配下の budget 関連 API クライアントを開き、この型が正しく使えるかチェックする。

> **注意**: 生成されたスキーマはコンパイルは通ることが多いが、実際のバリデーション要件（例：`categoryId` が `cat_` で始まる必要がある、など）は業務知識があってはじめて判断できる。盲目的に Accept しない。

---

## Part 5: 知っておくと便利な発展機能

### Copilot Edits（複数ファイル一括編集）

1 回の指示で複数ファイルにまたがる変更を生成する機能。

**開き方**: `Ctrl+Shift+M` または Chat パネル上部の「Edits」タブ

**手順**:
1. 変更したいファイルを「Add Files」でリストに追加
2. 指示を入力して `Enter`
3. 各ファイルの Diff を確認
4. 「Accept All」または個別に「Accept / Discard」

**MoneyNote Web での例**:

```
以下のファイルで、Category に `iconColor` フィールド（String型、任意）を追加してください：
- CategoryDto.java
- CategoryRequest.java
- CategoryMapper.java
```

**注意点**:
- 変更量が多いほど精度が落ちる → **小さく分けて実行**するのが現実的
- テストファイルには自動で反映されないことが多い → 別途 `/test` で生成
- 生成結果は必ずレビューしてから適用（無条件の Accept All は禁物）

---

### Next Edit Suggestions（次の編集提案）

コードを編集すると、**次に変更すべき箇所を自動でハイライト**してくれる機能。

**例**: `BudgetResponse.java` に新フィールドを追加すると、
それを使っている `BudgetService.java` の該当箇所をハイライトして修正を提案してくれる。

**有効化**: `設定（Ctrl+,）` → `github.copilot.nextEditSuggestions.enabled: true`

---

### モデル選択

Copilot Chat の入力欄付近にモデルセレクターが表示される（バージョン・プランにより異なる）。

| モデル | 特徴 | 向いているタスク |
|--------|------|----------------|
| **GPT-4o** (OpenAI) | バランス型。デフォルト | 汎用的なコード生成・質問 |
| **Claude Sonnet** (Anthropic) | 長文コンテキスト・推論に強い | 大きなファイル解析、設計相談 |
| **o3 mini** (OpenAI) | 複雑な推論特化 | アルゴリズム・数学的ロジック |
| **Gemini** (Google) | コード補完に強み | インライン補完向け |

> Claude Code ユーザーへ: Copilot 上でも Anthropic Claude が選択できるが、
> モデル切り替えの柔軟性（Haiku / Sonnet / Opus）は Claude Code の方が高い。

---

### Copilot Coding Agent（Issue 駆動・発展機能）

GitHub.com 上の Issue に `@github-copilot` をアサインすると、
Copilot が自律的にコードを書いて PR を作成してくれる機能。

**MoneyNote Web での活用イメージ**:

```
Issue タイトル: バリデーションエラーメッセージの日本語化

本文:
@github-copilot
frontend/src/lib/validations/ 配下の Zod スキーマのエラーメッセージを
日本語に統一してください。
- any 型は使わないこと
- 既存のテストが通ること
```

> Claude Code ほどコンテキスト理解力が高くないため、**小規模・単純なタスク向き**。
> CLAUDE.md の禁止事項（ネイティブSQL禁止など）は Issue 本文に明記する必要がある。

---

## Part 6: Claude Code との比較＆併用フロー

### 機能比較表

| 機能 | Claude Code | GitHub Copilot | 備考 |
|------|:-----------:|:--------------:|------|
| インライン補完 | ○ | ◎ | Copilot の方が応答が速い |
| ファイル編集（1 ファイル） | ◎ | ◎ | 同等 |
| 複数ファイル一括編集 | ◎ | ○ | Claude Code の方が自律度高い |
| CLI 実行（テスト・ビルド） | ◎ | ✗ | Copilot は不可 |
| カスタムスキル（/implement 等） | ◎ | ✗ | Copilot には固定コマンドのみ |
| MCP サーバー連携 | ◎ | ✗ | Copilot には MCP なし |
| コミット・プッシュ | ✗（人間のみ） | ✗ | 両者とも手動 |
| スケジュール実行 | ○ | ✗ | Claude Code のみ |
| コードベース全体検索 | ◎（Serena） | △（@workspace） | Serena の方が精度高い |
| GitHub PR/Issue 連携 | △（MCP 経由） | ◎（ネイティブ） | Copilot の方が統合度高い |
| ターミナル統合 | △ | ○ | Copilot は @terminal で解析可 |
| プロジェクト指示ファイル | CLAUDE.md | copilot-instructions.md | 両方に書くのが理想 |
| 学習コスト | 高い | 低い | Copilot の方がシンプル |

### 推奨する併用フロー（MoneyNote Web）

```
【新機能実装（Step 規模）】
Claude Code（ターミナル）
  ├── /design で設計
  ├── /implement で実装
  └── Gate 1→2→3 でレビュー・承認

【日常コーディング】
Copilot（VS Code）
  ├── Ghost Text でタイピング速度UP
  ├── Ctrl+I でその場リファクタリング
  ├── /tests でテスト生成
  └── #terminalOutput でエラー解析

【PR 前セルフレビュー】
Copilot Chat
  └── #editor でセルフレビュー
      （セキュリティ・JPQL・例外処理チェック）
```

**セルフレビュー用プロンプト（コピペして使う）**:

```
#editor
このコードをレビューしてください。
- セキュリティ問題はないか（SQLインジェクション・認証漏れ等）
- JPQL を使っているか（ネイティブ SQL になっていないか）
- 例外処理は ResourceNotFoundException / AccessDeniedException を適切に使っているか
- ログに機密情報が含まれていないか
```

---

## 付録A: ショートカット早見表

| 操作 | Windows |
|------|---------|
| Copilot Chat（サイドバー）を開く | `Ctrl+Alt+I` |
| インラインチャットを開く | `Ctrl+I` |
| 補完を確定 | `Tab` |
| 次の補完候補 | `Alt+]` |
| 前の補完候補 | `Alt+[` |
| 1 単語だけ補完 | `Ctrl+→` |
| 補完を手動呼び出し | `Alt+\` |
| 補完を消す | `Escape` |
| クイックフィックス（電球メニュー） | `Ctrl+.` |
| Copilot Edits を開く | `Ctrl+Shift+M` |

> キーバインドの変更: `Ctrl+K Ctrl+S` → 「copilot」で検索

---

## 付録B: よくある落とし穴と対策

| 落とし穴 | 対策 |
|---------|------|
| Copilot が的外れな補完を出す | `Escape` で消してコメントを追加してから再入力 |
| @workspace の回答が浅い | `#file` で具体的なファイルを指定して補完する |
| 生成テストがコンパイルエラーになる | `@workspace` で既存テストのパターンを確認してから再生成 |
| 複数ファイル編集で一部反映されない | Edits は小さい単位に分ける。未反映ファイルは手動で適用 |
| Copilot が DB スキーマを知らない | `#file` で Flyway マイグレーションファイルを参照させる |
| セキュリティ問題のあるコードが生成される | 生成コードは必ずレビュー。BCrypt 強度 12・JWT クレーム検証等と照合する |
| 日本語で聞いたが英語で返ってくる | 「日本語で回答してください」と付け加える |
| プロジェクトルールが守られない | `copilot-instructions.md` が作成されているか確認する |

---

## 付録C: Copilot が苦手なことの代替手段

| Copilot が苦手なこと | 代替手段 |
|--------------------|---------|
| テスト実行・CI 確認 | `./gradlew test` を手動実行 / Claude Code に依頼 |
| Git 操作（commit/push） | 手動（CLAUDE.md ルール：人間のみ） |
| 複雑な設計・アーキテクチャ策定 | Claude Code の `/design` スキル |
| Flyway マイグレーション作成 | Claude Code の `db-migration` スキル |
| 大規模リファクタリング | Claude Code の `/refactor` スキル |
| コードベース全体のシンボル検索 | Claude Code 上で Serena MCP を使う |
| Docker・インフラ操作 | Claude Code の `/ops` スキル |

---

## まとめ：Copilot を使いこなすための3原則

1. **`copilot-instructions.md` を先に作る**  
   MoneyNote Web のルール（any 禁止・JPQL 必須・例外クラス等）を書いておくと、
   毎回説明しなくて済む。これが Copilot の品質を大きく左右する。

2. **`#` で文脈を渡す**  
   「なんとなく聞く」より `#file` `#editor` `#terminalOutput` を使った方が
   的確な回答が返ってくる。

3. **コメントを先に書く習慣をつける**  
   Claude Code との最大の違いはリアルタイムの補完提案。
   コメントを先に書くと補完精度が劇的に上がる。

---

*最終更新: 2026-05-30*  
*ブランチ: feature/github-copilot-tutorial*
