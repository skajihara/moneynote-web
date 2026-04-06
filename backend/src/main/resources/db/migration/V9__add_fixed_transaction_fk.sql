-- transactions.fixed_transaction_id の外部キー制約を後から追加（V5/V6 の相互参照解消）
ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_fixed
        FOREIGN KEY (fixed_transaction_id) REFERENCES fixed_transactions(fixed_transaction_id);
