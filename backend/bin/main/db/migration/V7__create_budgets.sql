CREATE TABLE budgets (
    budget_id   VARCHAR(20)   NOT NULL,
    ledger_id   VARCHAR(20)   NOT NULL,
    category_id VARCHAR(20)   NOT NULL,
    year        SMALLINT      NOT NULL,
    month       SMALLINT      NOT NULL,
    amount      DECIMAL(15,2) NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_budgets PRIMARY KEY (budget_id),
    CONSTRAINT fk_budgets_ledger   FOREIGN KEY (ledger_id)   REFERENCES ledgers(ledger_id),
    CONSTRAINT fk_budgets_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT uq_budgets UNIQUE (ledger_id, category_id, year, month),
    CONSTRAINT chk_budgets_month CHECK (month BETWEEN 1 AND 12)
);
