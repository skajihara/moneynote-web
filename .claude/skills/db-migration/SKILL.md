---
name: db-migration
description: DBマイグレーションファイルを作成する時に使用する
---

# DB マイグレーションパターン集

## 重要ルール

- **ブランチポリシー**: `feature/*` または `fix/*` ブランチではマイグレーションファイルの編集・追加は自由に行ってよい。`develop`・`main` への直接編集は避けること（Hook が警告を表示する）
- **既存ファイルは編集しない**: Flyway は適用済みファイルの checksum を記録する。変更するとエラーで起動不能になる。新しいテーブル・カラム追加は必ず新ファイルで行う

---

## 命名規則

```
V{次の番号}__{snake_case_description}.sql
```

**現在の最大番号を確認してから次の番号を使うこと。**

```bash
# 現在の最大番号を確認する
ls backend/src/main/resources/db/migration/ | sort | tail -5
```

**現在の最新:** V12（`V12__add_theme_color_to_ledgers.sql`）
→ 次のファイルは `V13__xxx.sql`

**命名例:**
```
V13__create_notifications.sql
V14__add_interval_to_fixed_transactions.sql
V15__add_index_transactions_date.sql
```

---

## カラム型選定基準

| 用途 | 型 | 例 |
|---|---|---|
| PK（ID） | `VARCHAR(20) NOT NULL` | `txn_abc123` |
| 名前・タイトル | `VARCHAR(100) NOT NULL` | 帳簿名・カテゴリ名 |
| メモ・説明文 | `VARCHAR(500)` | NULL 許可 |
| 金額 | `DECIMAL(15,2) NOT NULL` | 9999999999999.99 まで |
| 日付 | `DATE NOT NULL` | `2026-04-01` |
| 日時 | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` | 作成日時・更新日時 |
| 真偽値 | `BOOLEAN NOT NULL DEFAULT false` | is_active, is_fixed_origin |
| 区分（Enum） | `VARCHAR(20) NOT NULL` + CHECK 制約 | INCOME/EXPENSE |
| テーマカラー | `VARCHAR(30)` | `#4A90D9`。NULL 許可 |

---

## 制約命名規則

```sql
CONSTRAINT pk_{table}            PRIMARY KEY ({column})
CONSTRAINT fk_{table}_{ref}      FOREIGN KEY ({col}) REFERENCES {ref_table}({col})
CONSTRAINT uq_{table}_{col}      UNIQUE ({column})
CONSTRAINT chk_{table}_{col}     CHECK ({column} IN ('VALUE1', 'VALUE2'))
```

---

## テーブル作成の基本構造

```sql
CREATE TABLE example_items (
    item_id         VARCHAR(20)   NOT NULL,
    ledger_id       VARCHAR(20)   NOT NULL,
    item_name       VARCHAR(100)  NOT NULL,
    amount          DECIMAL(15,2) NOT NULL,
    item_date       DATE          NOT NULL,
    item_type       VARCHAR(20)   NOT NULL,
    memo            VARCHAR(500),
    is_active       BOOLEAN       NOT NULL DEFAULT true,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_example_items PRIMARY KEY (item_id),
    CONSTRAINT fk_example_items_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(ledger_id),
    CONSTRAINT chk_example_items_type CHECK (item_type IN ('TYPE_A', 'TYPE_B'))
);
```

---

## カラムコメントの書き方

PostgreSQL の `COMMENT ON` 構文で日本語説明を付与する。

```sql
-- テーブルコメント
COMMENT ON TABLE example_items IS '例示用アイテムテーブル';

-- カラムコメント
COMMENT ON COLUMN example_items.item_id    IS 'アイテムID（プレフィックス: itm_）';
COMMENT ON COLUMN example_items.ledger_id  IS '帳簿ID（外部キー）';
COMMENT ON COLUMN example_items.item_name  IS 'アイテム名（最大100文字）';
COMMENT ON COLUMN example_items.amount     IS '金額（DECIMAL 15桁 2小数点）';
COMMENT ON COLUMN example_items.item_type  IS '種別（TYPE_A: 種別A, TYPE_B: 種別B）';
COMMENT ON COLUMN example_items.is_active  IS '有効フラグ（false: 論理削除）';
COMMENT ON COLUMN example_items.created_at IS '作成日時';
COMMENT ON COLUMN example_items.updated_at IS '更新日時';
```

---

## 既存テーブルへのカラム追加

### NULL 許可カラムの追加（シンプル）

```sql
ALTER TABLE ledgers ADD COLUMN theme_color VARCHAR(30);
```

### NOT NULL カラムの追加（DEFAULT 値が必要）

既存行がある場合は DEFAULT を付けて追加し、後でデフォルト値の適用を確認する。

```sql
-- 1. DEFAULT 付きで追加（既存行に値が入る）
ALTER TABLE fixed_transactions ADD COLUMN interval_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY';

-- 2. 特定の既存行を更新する必要がある場合
UPDATE fixed_transactions SET interval_type = 'MONTHLY' WHERE interval_type IS NULL;

-- 3. DEFAULT を削除する場合（NULL を後から禁止する場合など）
ALTER TABLE fixed_transactions ALTER COLUMN interval_type DROP DEFAULT;
```

### NULL 許可 → NOT NULL への変更

```sql
-- 1. 既存 NULL 行を UPDATE してから制約を追加する
UPDATE fixed_transactions SET end_date = start_date + INTERVAL '10 years' WHERE end_date IS NULL;
ALTER TABLE fixed_transactions ALTER COLUMN end_date SET NOT NULL;
```

---

## インデックスの追加

```sql
-- 単一カラム
CREATE INDEX idx_transactions_ledger_id ON transactions(ledger_id);

-- 複合インデックス（検索条件の順番に合わせる）
CREATE INDEX idx_transactions_ledger_date ON transactions(ledger_id, transaction_date);

-- 部分インデックス（特定条件のみ）
CREATE INDEX idx_categories_active ON categories(ledger_id) WHERE is_active = true;
```

---

## 外部キー追加（相互参照がある場合は後から追加）

V6 と V9 の例のように、相互参照する場合はテーブル作成後に ALTER で追加する。

```sql
-- V{n+1}__add_xxx_fk.sql
ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_fixed
    FOREIGN KEY (fixed_transaction_id) REFERENCES fixed_transactions(fixed_transaction_id);
```

---

## マイグレーション作成チェックリスト

- [ ] `ls db/migration/ | sort | tail -5` で最大番号を確認した
- [ ] ファイル名は `V{n}__{snake_case}.sql`（n は最大番号 + 1）
- [ ] PK に `NOT NULL` がついている
- [ ] FK 制約の命名が `fk_{table}_{ref}` になっている
- [ ] CHECK 制約で Enum 値を制限している（区分カラムの場合）
- [ ] `created_at`, `updated_at` が `DEFAULT CURRENT_TIMESTAMP` になっている
- [ ] `COMMENT ON TABLE / COLUMN` で説明を付与した
- [ ] 既存ファイルを編集していない
