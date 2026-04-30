-- transactions: 帳簿別・日付範囲・カテゴリ別の検索に使用する頻度が高いカラム
CREATE INDEX idx_transactions_ledger_id       ON transactions(ledger_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category_id      ON transactions(category_id);

-- fixed_transactions: 帳簿別一覧取得に使用する
CREATE INDEX idx_fixed_transactions_ledger_id ON fixed_transactions(ledger_id);

-- ledger_permissions: user_id 単独検索（アカウント削除・参加帳簿一覧）はUNIQUE制約では非効率
CREATE INDEX idx_ledger_permissions_user_id ON ledger_permissions(user_id);

-- ai_advice_cache: キャッシュ検索は ledger_id + period_type + advice_type で行う
CREATE INDEX idx_ai_advice_cache_ledger_id ON ai_advice_cache(ledger_id);
