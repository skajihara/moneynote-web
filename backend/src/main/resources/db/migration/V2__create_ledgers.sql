CREATE TABLE ledgers (
    ledger_id           VARCHAR(20)    NOT NULL,
    owner_user_id       VARCHAR(20)    NOT NULL,
    ledger_name         VARCHAR(100)   NOT NULL,
    initial_balance     DECIMAL(15,2)  NOT NULL DEFAULT 0,
    start_day_of_month  SMALLINT       NOT NULL DEFAULT 1,
    start_month_of_year SMALLINT       NOT NULL DEFAULT 1,
    is_active           BOOLEAN        NOT NULL DEFAULT true,
    created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ledgers PRIMARY KEY (ledger_id),
    CONSTRAINT fk_ledgers_owner FOREIGN KEY (owner_user_id) REFERENCES users(user_id),
    CONSTRAINT chk_ledgers_start_day CHECK (start_day_of_month BETWEEN 1 AND 28),
    CONSTRAINT chk_ledgers_start_month CHECK (start_month_of_year BETWEEN 1 AND 12)
);
