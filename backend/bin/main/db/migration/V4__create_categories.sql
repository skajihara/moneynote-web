CREATE TABLE categories (
    category_id     VARCHAR(20)  NOT NULL,
    ledger_id       VARCHAR(20)  NOT NULL,
    category_name   VARCHAR(50)  NOT NULL,
    category_type   VARCHAR(20)  NOT NULL,
    icon            VARCHAR(10),
    color           VARCHAR(30),
    display_order   SMALLINT     NOT NULL DEFAULT 0,
    is_default      BOOLEAN      NOT NULL DEFAULT false,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_categories PRIMARY KEY (category_id),
    CONSTRAINT fk_categories_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(ledger_id),
    CONSTRAINT chk_categories_type CHECK (category_type IN ('INCOME', 'EXPENSE'))
);
