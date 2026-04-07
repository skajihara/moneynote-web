CREATE TABLE fixed_transactions (
    fixed_transaction_id VARCHAR(20)   NOT NULL,
    ledger_id            VARCHAR(20)   NOT NULL,
    category_id          VARCHAR(20),
    fixed_name           VARCHAR(100)  NOT NULL,
    transaction_type     VARCHAR(20)   NOT NULL,
    amount               DECIMAL(15,2) NOT NULL,
    day_of_month         SMALLINT      NOT NULL,
    start_date           DATE          NOT NULL,
    end_date             DATE,
    is_active            BOOLEAN       NOT NULL DEFAULT true,
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_fixed_transactions PRIMARY KEY (fixed_transaction_id),
    CONSTRAINT fk_fixed_transactions_ledger   FOREIGN KEY (ledger_id)   REFERENCES ledgers(ledger_id),
    CONSTRAINT fk_fixed_transactions_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT chk_fixed_transactions_type       CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
    CONSTRAINT chk_fixed_transactions_day CHECK (day_of_month BETWEEN 1 AND 28)
);
