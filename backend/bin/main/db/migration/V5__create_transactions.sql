-- fixed_transaction_id の外部キー制約は V9 で追加する（V6 との相互参照を避けるため）
CREATE TABLE transactions (
    transaction_id      VARCHAR(20)   NOT NULL,
    ledger_id           VARCHAR(20)   NOT NULL,
    category_id         VARCHAR(20),
    fixed_transaction_id VARCHAR(20),
    transaction_type    VARCHAR(20)   NOT NULL,
    amount              DECIMAL(15,2) NOT NULL,
    transaction_date    DATE          NOT NULL,
    memo                VARCHAR(500),
    is_fixed_origin     BOOLEAN       NOT NULL DEFAULT false,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_transactions PRIMARY KEY (transaction_id),
    CONSTRAINT fk_transactions_ledger   FOREIGN KEY (ledger_id)   REFERENCES ledgers(ledger_id),
    CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT chk_transactions_type CHECK (transaction_type IN ('INCOME', 'EXPENSE'))
);
